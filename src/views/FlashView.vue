<template>
  <div class="columns">
    <div class="column is-half is-offset-one-quarter">
      <!-- form fields start -->
      <div class="field is-horizontal">
        <div class="field-label is-medium">
          <label class="label">Source</label>
        </div>
        <div class="field-body">
          <div class="field">
            <div class="control">
              <div class="select is-medium">
                <select v-model="mode">
                  <option v-for="o in modeOptions" :key="o">{{ o }}</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="field is-horizontal" v-if="mode == 'Local'">
        <div class="field-label is-medium">
          <label class="label">File</label>
        </div>
        <div class="field-body">
          <div class="field">
            <div
              class="file is-boxed is-medium"
              :class="{ 'has-name': firmwareFile }"
            >
              <label class="file-label">
                <input
                  class="file-input"
                  type="file"
                  v-on:change="updateFile()"
                  ref="file"
                />
                <span class="file-cta">
                  <span class="file-icon">
                    <i class="fas fa-upload"></i>
                  </span>
                  <span class="file-label"> Choose a file… </span>
                </span>
                <span v-if="firmwareFile" class="file-name">
                  {{ firmwareFile.name }}
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>
      <!-- form fields end -->
    </div>
  </div>

  <div class="box">
    <h3>Log</h3>
    <pre style="height: 30vh">{{ logLines.join("\n") }}</pre>
  </div>

  <div class="level">
    <div class="level-left"></div>

    <div class="level-right">
      <div class="level-item">
        <button
          class="button is-medium is-primary"
          :disabled="!canFlash"
          v-on:click="flash()"
        >
          Flash
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { useLogStore } from "@/stores/log";
import { mapState } from "pinia";
import { defineComponent } from "vue";
import { VTXType } from "./../serial/openvtx";
import { MSPPassthrough } from "./../serial/msp";
import { Serial } from "@/serial/serial";
import { OpenVTX } from "@/serial/openvtx";
import { Log } from "@/log";

function readFile(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", (event) => {
      resolve(event?.target?.result as ArrayBuffer);
    });
    reader.addEventListener("error", reject);
    reader.readAsArrayBuffer(file);
  });
}

async function flashFile(serial: Serial, firmware: Uint8Array) {
  Log.debug("flash", firmware);

  Log.info("flash", "attempting msp passthrough");
  let vtxType = VTXType.Unknown;
  try {
    vtxType = await MSPPassthrough.enable(serial);
    Log.info("flash", "deteted vtx type", vtxType);
  } catch (err) {
    Log.warn("flash", "passthrough failed");
    Log.debug("flash", err);
  }

  Log.info("flash", "attempting to reboot into bootloader");
  await OpenVTX.resetToBootloader(serial, vtxType);
  Log.info("flash", "deteted bootloader");
}

export default defineComponent({
  data() {
    return {
      mode: "Local",
      modeOptions: ["Release", "Local"],
      firmwareFile: undefined as File | undefined,
    };
  },
  computed: {
    ...mapState(useLogStore, ["logLines"]),
    canFlash() {
      if (this.mode == "Local" && this.firmwareFile) {
        return true;
      }
      return false;
    },
  },
  methods: {
    onSerialError(err: unknown) {
      Log.error("serial", err);
    },
    updateFile() {
      const fileInput = this.$refs.file as HTMLInputElement;
      if (fileInput.files && fileInput.files.length) {
        this.firmwareFile = fileInput.files[0];
      } else {
        this.firmwareFile = undefined;
      }
    },
    async flash() {
      if (!this.firmwareFile) {
        return;
      }

      const serial = await Serial.request(this.onSerialError.bind(this));
      if (!serial) {
        return;
      }

      try {
        const file = await readFile(this.firmwareFile);
        await flashFile(serial, new Uint8Array(file));
      } finally {
        serial.close();
      }
    },
  },
});
</script>
