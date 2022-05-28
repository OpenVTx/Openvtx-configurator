import { VTXType } from "./../serial/openvtx";
import { MSPPassthrough } from "./../serial/msp";
import { Serial } from "@/serial/serial";
import { defineStore } from "pinia";
import { OpenVTX } from "@/serial/openvtx";
import { Log } from "@/log";

export const useFlashStore = defineStore({
  id: "flash",
  state: () => ({}),
  actions: {
    async connect() {
      const serial = new Serial();
      try {
        let vtxType = VTXType.SmartAudio;
        try {
          vtxType = await MSPPassthrough.enable(serial);
        } catch (err) {
          Log.warn("flash", err);
        }
        Log.info("flash", "deteted", vtxType);

        const ovtx = await OpenVTX.create(serial, vtxType);
        ovtx.resetToBootloader();
      } finally {
        serial.close();
      }
    },
  },
});
