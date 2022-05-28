import { MSPPassthrough } from "./../serial/msp";
import { Serial } from "@/serial/serial";
import { defineStore } from "pinia";

export const useFlashStore = defineStore({
  id: "flash",
  state: () => ({}),
  actions: {
    async connect() {
      const serial = new Serial();

      try {
        await MSPPassthrough.enable(serial);
      } finally {
        serial.close();
      }
    },
  },
});
