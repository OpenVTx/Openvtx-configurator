import { VTXType } from "./../serial/openvtx";
import { MSPPassthrough } from "./../serial/msp";
import { Serial } from "@/serial/serial";
import { defineStore } from "pinia";
import { OpenVTX } from "@/serial/openvtx";
import { Log } from "@/log";

function onError(err: unknown) {
  Log.error("serial", err);
}

export const useFlashStore = defineStore({
  id: "flash",
  state: () => ({}),
  actions: {
    async connect() {
      const serial = new Serial(onError);
      try {
        Log.info("flash", "attempting msp passthrough");
        let vtxType = VTXType.Unknown;
        try {
          vtxType = await MSPPassthrough.enable(serial);
        } catch (err) {
          Log.warn("flash", "passthrough failed");
          Log.debug("flash", err);
        }
        Log.info("flash", "deteted vtx type", vtxType);

        Log.info("flash", "attempting to reboot into bootloader");
        await OpenVTX.resetToBootloader(serial, vtxType);
        Log.info("flash", "deteted bootloader");
      } finally {
        serial.close();
      }
    },
  },
});
