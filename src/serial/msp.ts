import { ArrayReader, ArrayWriter } from "./util";
import type { Serial } from "@/serial/serial";
import semver from "semver";
import { VTXType } from "./openvtx";

export enum MSPCmd {
  MSP_API_VERSION = 1,
  MSP_FC_VARIANT = 2,
  MSP_FC_VERSION = 3,

  MSP_CF_SERIAL_CONFIG = 54,

  MSP_SET_PASSTHROUGH = 245,

  MSP2_COMMON_SERIAL_CONFIG = 0x1009,
}

const MSP_PASSTHROUGH_SERIAL_ID = 0xfd;

export enum MSPVariants {
  BETAFLIGHT = "BTFL",
  INAV = "INAV",
  QUICKSILVER = "QUIC",
}

export interface MSPPacket {
  cmd: MSPCmd;
  payload: number[];
}

interface MSPPassthroughConfig {
  minVersion: string;
  serialEntrySize?: number;
  functions: { [x: number]: VTXType };
}

export const MSP_PASSTHROUGH_CONFIG: {
  [key in MSPVariants]: MSPPassthroughConfig;
} = {
  [MSPVariants.BETAFLIGHT]: {
    minVersion: ">=4.2.0",
    functions: {
      [1 << 11]: VTXType.SmartAudio,
      [1 << 13]: VTXType.Tramp,
    },
  },
  [MSPVariants.INAV]: {
    minVersion: ">=3.0.0",
    serialEntrySize: 9,
    functions: {
      [1 << 11]: VTXType.SmartAudio,
      [1 << 12]: VTXType.Tramp,
    },
  },
  [MSPVariants.QUICKSILVER]: {
    minVersion: ">=todo",
    functions: {
      // TODO
      [1 << 0]: VTXType.SmartAudio,
      [1 << 1]: VTXType.Tramp,
    },
  },
};

const MSP_MAGIC = ["$".charCodeAt(0), "X".charCodeAt(0)];
const MSR_DIR_OUT = "<".charCodeAt(0);
const MSR_DIR_IN = ">".charCodeAt(0);

export class MSP {
  private constructor(private serial: Serial) {}

  public static async create(serial: Serial): Promise<MSP> {
    const msp = new MSP(serial);
    await msp.serial.connect({
      baudRate: 115200,
    });
    return msp;
  }

  public async send(cmd: MSPCmd, ...args: number[]): Promise<MSPPacket> {
    const packet = this.buildPacket(cmd, args);

    this.serial.write(packet);
    this.serial.flush();

    const magic = await this.serial.read(2);
    if (magic[0] != MSP_MAGIC[0] || magic[1] != MSP_MAGIC[1]) {
      throw new Error("msp invalid header");
    }

    if ((await this.serial.readByte()) != MSR_DIR_IN) {
      throw new Error("msp invalid direction");
    }

    let chksum = 0;

    //flag
    chksum = this.crc8DvbS2(chksum, await this.serial.readByte());

    {
      const cmdLo = await this.serial.readByte();
      chksum = this.crc8DvbS2(chksum, cmdLo);

      const cmdHi = await this.serial.readByte();
      chksum = this.crc8DvbS2(chksum, cmdHi);

      if (((cmdHi << 8) | cmdLo) != cmd) {
        throw new Error("msp invalid cmd");
      }
    }

    const lenghtLo = await this.serial.readByte();
    chksum = this.crc8DvbS2(chksum, lenghtLo);

    const lenghtHi = await this.serial.readByte();
    chksum = this.crc8DvbS2(chksum, lenghtHi);

    const length = (lenghtHi << 8) | lenghtLo;
    const payload = await this.serial.read(length);
    for (let i = 0; i < payload.length; i++) {
      chksum = this.crc8DvbS2(chksum, payload[i]);
    }

    if ((await this.serial.readByte()) != chksum) {
      throw new Error("msp invalid chksum");
    }

    return {
      cmd,
      payload,
    };
  }

  private buildPacket(cmd: MSPCmd, args: number[]): Uint8Array {
    const writer = new ArrayWriter();

    writer.writeUint8s(MSP_MAGIC);
    writer.writeUint8(MSR_DIR_OUT);
    writer.writeUint8(0); // flag
    writer.writeUint16(cmd);
    writer.writeUint16(args.length);
    writer.writeUint8s(args);

    let chksum = 0;
    for (let i = 3; i < writer.length; i++) {
      chksum = this.crc8DvbS2(chksum, writer.get(i));
    }
    writer.writeUint8(chksum);

    return writer.array();
  }

  private crc8DvbS2(crc: number, byte: number): number {
    crc ^= byte;

    for (let i = 0; i < 8; i++) {
      if (crc & 0x80) {
        crc = ((crc << 1) ^ 0xd5) % 256;
      } else {
        crc = (crc << 1) % 256;
      }
    }

    return crc;
  }
}

export class MSPPassthrough {
  private variant?: MSPVariants;

  private get config() {
    return MSP_PASSTHROUGH_CONFIG[this.variant || MSPVariants.BETAFLIGHT];
  }

  private constructor(private msp: MSP) {}

  private async readSerialConfig() {
    const config = await this.msp.send(MSPCmd.MSP2_COMMON_SERIAL_CONFIG);
    const reader = new ArrayReader(Uint8Array.from(config.payload));

    let entryCount = 0;
    let entrySize = 0;

    if (this.config.serialEntrySize) {
      entrySize = this.config?.serialEntrySize;
      entryCount = reader.remaining() / entrySize;
    } else {
      entryCount = reader.readUint8();
      entrySize = reader.remaining() / entryCount;
    }

    for (let i = 0; i < entryCount; i++) {
      const ident = reader.readUint8();
      const func = reader.readUint32();

      // ident (uint8) + func (uint32)
      reader.advance(entrySize - 5);

      if (this.config.functions[func]) {
        return {
          ident,
          type: this.config.functions[func],
        };
      }
    }

    return undefined;
  }

  private async enable() {
    const version = await this.msp.send(MSPCmd.MSP_API_VERSION);
    if (version.payload[1] < 1 || version.payload[2] < 42) {
      throw new Error("unsupported msp version");
    }

    const fcVariant = await this.msp.send(MSPCmd.MSP_FC_VARIANT);
    const variantStr = String.fromCharCode(...fcVariant.payload);
    if (!Object.values(MSPVariants).some((v: string) => v == variantStr)) {
      throw new Error("unsupported msp variant " + variantStr);
    }
    this.variant = <MSPVariants>variantStr;

    const fcVersion = await this.msp.send(MSPCmd.MSP_FC_VERSION);
    const fcSemVer = fcVersion.payload.map((n) => "" + n).join(".");
    if (!semver.satisfies(fcSemVer, this.config.minVersion)) {
      throw new Error("unsupported msp version " + fcSemVer);
    }

    const port = await this.readSerialConfig();
    if (!port) {
      throw new Error("no matching serial port found");
    }

    const passthrough = await this.msp.send(
      MSPCmd.MSP_SET_PASSTHROUGH,
      MSP_PASSTHROUGH_SERIAL_ID,
      port.ident
    );

    if (passthrough.payload[0] != 1) {
      throw new Error("msp passthrough failed");
    }

    return port.type;
  }

  public static async enable(serial: Serial) {
    const msp = await MSP.create(serial);
    const passthrough = new MSPPassthrough(msp);
    return await passthrough.enable();
  }
}
