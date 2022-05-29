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
                <select v-model="mode" :disabled="flashInProgress">
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
                  :disabled="flashInProgress"
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
    <pre style="height: 30vh" ref="log">{{ logLines.join("\n") }}</pre>
  </div>

  <div class="level">
    <div class="level-left">
      <div class="level-item">
        <div style="width: 50vw">
          <progress
            v-if="progress"
            class="progress is-primary is-medium"
            :value="progress"
            max="100"
          >
            {{ progress }}%
          </progress>
        </div>
      </div>
    </div>

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
import { XModem } from "@/serial/xmodem";
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

async function flashFile(
  serial: Serial,
  firmware: Uint8Array,
  progressCallback: (p: number) => void
) {
  Log.info("flash", "attempting msp passthrough");
  let vtxType = VTXType.Unknown;
  try {
    vtxType = await MSPPassthrough.enable(serial);
    Log.info("flash", "detected vtx type", vtxType);
  } catch (err) {
    Log.warn("flash", "passthrough failed");
    Log.debug("flash", err);
  }

  Log.info("flash", "attempting to reboot into bootloader");
  await OpenVTX.resetToBootloader(serial, vtxType);
  Log.info("flash", "detected bootloader");

  Log.info("flash", "flashing", firmware.byteLength, "bytes");
  await XModem.send(serial, firmware, progressCallback);

  Log.info("flash", "success");
}

export default defineComponent({
  data() {
    return {
      mode: "Local",
      modeOptions: ["Release", "Local"],
      firmwareFile: undefined as File | undefined,
      flashInProgress: false,
      progress: undefined as number | undefined,
    };
  },
  computed: {
    ...mapState(useLogStore, ["logLines"]),
    canFlash() {
      if (this.flashInProgress) {
        return false;
      }
      if (this.mode == "Local" && this.firmwareFile) {
        return true;
      }
      return false;
    },
  },
  watch: {
    logLines(prev, next) {
      if (prev.length != next.length) {
        const el = this.$refs.log as HTMLPreElement;
        el.scrollTop = el.scrollHeight;
      }
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

      this.progress = 0;
      this.flashInProgress = true;
      try {
        const file = await readFile(this.firmwareFile);

        await flashFile(
          serial,
          new Uint8Array(file),
          (i: number) => (this.progress = i * 100)
        );

        this.progress = 100;
      } finally {
        serial.close();
        this.flashInProgress = false;
      }
    },
  },
});
</script>
