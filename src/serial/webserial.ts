import { serial, SerialPort as PolyfillSerialPort } from "web-serial-polyfill";

export type WebSerialPort = SerialPort | PolyfillSerialPort;

export function getWebSerial() {
  if (navigator.serial) {
    return navigator.serial;
  }
  return serial;
}
