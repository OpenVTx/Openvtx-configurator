import type { Serial } from "@/serial/serial";

export enum VTXType {
  Unknown = "UNKNOWN",
  Tramp = "TRAMP",
  SmartAudio = "SA",
}

const MAX_TRIES = 10;
const RST_MAGIC = ["R".charCodeAt(0), "S".charCodeAt(0), "T".charCodeAt(0)];

export class OpenVTX {
  private constructor(private serial: Serial) {}

  public static async resetToBootloader(serial: Serial, vtxType: VTXType) {
    const ovtx = new OpenVTX(serial);

    const typesToTry =
      vtxType == VTXType.Unknown
        ? [VTXType.SmartAudio, VTXType.Tramp]
        : [vtxType];

    for (const t of typesToTry) {
      switch (t) {
        case VTXType.Tramp: {
          await ovtx.serial.connect({
            baudRate: 9600,
          });
          break;
        }
        case VTXType.SmartAudio: {
          await ovtx.serial.connect({
            baudRate: 4800,
            stopBits: 2,
          });
          break;
        }
      }

      await ovtx.tryReset(t);
    }
  }

  private async tryReset(vtxType: VTXType) {
    const bootloaderSeq = this.bootloaderSeq(vtxType);

    let tries = 0;
    while (tries <= MAX_TRIES) {
      if (tries == MAX_TRIES) {
        throw new Error("unable to communicate with bootloader");
      }

      await new Promise((r) => setTimeout(r, 150));
      await this.serial.write(bootloaderSeq);
      await new Promise((r) => setTimeout(r, 50));
      await this.serial.flush();

      const seq = String.fromCharCode(...(await this.serial.read(3)));
      if (seq == "CCC") {
        break;
      }

      tries++;
    }
  }

  private bootloaderSeq(vtxType: VTXType) {
    let payload: Uint8Array;

    switch (vtxType) {
      case VTXType.Tramp: {
        payload = new Uint8Array(16);
        payload[0] = 0x0f;
        payload[1] = RST_MAGIC[0];
        payload[2] = RST_MAGIC[1];
        payload[3] = RST_MAGIC[2];
        payload[14] = payload.subarray(1).reduce((p, v) => (p += v), 0) & 0xff;
        break;
      }
      case VTXType.SmartAudio: {
        payload = Uint8Array.from([
          0x0,
          0xaa,
          0x55,
          (0x78 << 1) & 0xff,
          0x03,
          ...RST_MAGIC,
          0xc3,
        ]);
        break;
      }
      default:
        throw new Error("invalid vtxType");
    }

    return payload;
  }
}
