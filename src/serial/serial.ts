import { Log } from "@/log";
import { getWebSerial, type WebSerialPort } from "./webserial";
import { AsyncQueue } from "./async";
import { printUint8Array } from "./util";

const WebSerial = getWebSerial();

const SERIAL_FILTERS = [
  { usbVendorId: 0x0483, usbProductId: 0x5740 }, // stm32
];

const SERIAL_BUFFER_SIZE = 8192;

export interface SerialConfig {
  baudRate: number;
  dataBits?: number | undefined;
  stopBits?: number | undefined;
}

export class Serial {
  private shouldRun = false;

  private queue = new AsyncQueue();

  private port!: WebSerialPort;

  private writer?: WritableStreamDefaultWriter<Uint8Array>;
  private reader?: ReadableStreamDefaultReader<Uint8Array>;

  private constructor(private onErrorCallback?: (err: unknown) => void) {}

  public static async request(
    onErrorCallback?: (err: unknown) => void
  ): Promise<Serial | undefined> {
    const serial = new Serial(onErrorCallback);
    try {
      serial.port = await WebSerial.requestPort({
        filters: SERIAL_FILTERS,
      });
    } catch (err) {
      serial.close();
      Log.warn("serial", err);
      return undefined;
    }
    return serial;
  }

  public async connect(config: SerialConfig): Promise<void> {
    try {
      if (this.shouldRun) {
        await this.close();
      }
      await this._connectPort(config);
    } catch (err) {
      await this.close();
      throw err;
    }
  }

  private async _connectPort(config: SerialConfig) {
    this.queue = new AsyncQueue();

    await this.port.open({
      ...config,
      bufferSize: SERIAL_BUFFER_SIZE,
      flowControl: "none",
    });

    this.writer = await this.port?.writable?.getWriter();
    this.reader = await this.port?.readable?.getReader();

    this.shouldRun = true;
    this.startReading();
  }

  public async close() {
    this.queue.close();
    this.shouldRun = false;

    if (this.reader) {
      try {
        await this.reader.cancel();
        await this.reader.releaseLock();
      } catch (err) {
        Log.warn("serial", err);
      }
    }

    if (this.writer) {
      try {
        await this.writer.close();
        await this.writer.releaseLock();
      } catch (err) {
        Log.warn("serial", err);
      }
    }

    try {
      await this.port?.close();
    } catch (err) {
      Log.warn("serial", err);
    }

    this.reader = undefined;
    this.writer = undefined;
  }

  public flush() {
    this.queue.reset();
  }

  public async write(array: Uint8Array) {
    if (this.writer) {
      Log.trace("serial", "write", printUint8Array(array));
      await this.writer.write(array);
    }
  }

  public readByte(): Promise<number> {
    return this.queue.pop();
  }

  public read(size: number, timeout?: number): Promise<number[]> {
    return this.queue.read(size, timeout);
  }

  public async readMirror(data: Uint8Array) {
    for (let i = 0; i < data.byteLength; i++) {
      const response = await this.readByte();
      if (response != data[i]) {
        return response;
      }
    }
    return await this.readByte();
  }

  private async startReading() {
    while (this.shouldRun) {
      try {
        if (!this.reader) {
          throw new Error("serial reader is null");
        }
        const { value, done } = await this.reader.read();
        if (done) {
          break;
        }
        if (value.length) {
          Log.trace("serial", "read", printUint8Array(value));
          this.queue.write(value);
        }
      } catch (e) {
        Log.warning("serial", e);
        this.close();
        if (this.onErrorCallback) {
          this.onErrorCallback(e);
        }
      }
    }
  }
}
