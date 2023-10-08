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
                <select v-model="store.mode" :disabled="flashInProgress">
                  <option v-for="o in modeOptions" :key="o">{{ o }}</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="field is-horizontal" v-if="store.mode == 'Local'">
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

      <template v-if="store.mode == 'Release'">
        <div class="field is-horizontal">
          <div class="field-label is-medium">
            <label class="label">Version</label>
          </div>
          <div class="field-body">
            <div class="field">
              <div class="control">
                <div class="select is-medium">
                  <select v-model="store.version" :disabled="flashInProgress">
                    <option v-for="o in versions" :key="o">{{ o }}</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="field is-horizontal">
          <div class="field-label is-medium">
            <label class="label">Target</label>
          </div>
          <div class="field-body">
            <div class="field">
              <div class="control">
                <div class="select is-medium">
                  <select v-model="store.target" :disabled="flashInProgress">
                    <option v-for="a in assets" :key="a.Target">
                      {{ a.Target }}
                    </option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

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
import { mapActions, mapState } from "pinia";
import { defineComponent } from "vue";
import { VTXType } from "./../serial/openvtx";
import { MSPPassthrough } from "./../serial/msp";
import { Serial } from "@/serial/serial";
import { OpenVTX } from "@/serial/openvtx";
import { XModem } from "@/serial/xmodem";
import { Log } from "@/log";
import { FlashModes, useFlashStore } from "@/stores/flash";
import { Github } from "@/stores/api/github";

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
  let bootloaderActive = false;
  let vtxType = VTXType.Unknown;

  try{
    Log.info("listening", "Is the VTx already in bootloader mode? Checking with SmartAudio settings.");
    await OpenVTX.listenForBootloader(serial, true);
    bootloaderActive = true;
    Log.info("listening", "Bootloader found.");
    } catch (err) {
    Log.debug("listening", "Bootloader not found.");
  }
  
  if (!bootloaderActive){
    try {
      Log.info("flash", "attempting msp passthrough");
      vtxType = await MSPPassthrough.enable(serial);
      Log.info("flash", "detected vtx type", vtxType);
    } catch (err) {
      Log.warn("flash", "passthrough failed");
      Log.debug("flash", err);
    }
  }

  if (!bootloaderActive){
    try{
      Log.info("listening", "Is the VTx already in bootloader mode? Checking with SmartAudio settings.");
      await OpenVTX.listenForBootloader(serial, false);
      bootloaderActive = true;
      Log.info("listening", "Bootloader found.");
    } catch (err) {
      Log.debug("listening", "Bootloader not found.");
    }
  }

  if (!bootloaderActive){
    try {
      Log.info("flash", "attempting to reboot into bootloader");
      await OpenVTX.resetToBootloader(serial, vtxType);
      Log.info("flash", "detected bootloader");
    } catch (err) {
      Log.warn("flash", err);
      return;
    }
  }

  Log.info("flash", "flashing", firmware.byteLength, "bytes");
  await XModem.send(serial, firmware, progressCallback);

  Log.info("flash", "success");
}

export default defineComponent({
  setup() {
    const store = useFlashStore();
    return {
      store,
    };
  },
  data() {
    return {
      firmwareFile: undefined as File | undefined,
      flashInProgress: false,
      progress: undefined as number | undefined,
      scrollTimeout: undefined as number | undefined,
    };
  },
  computed: {
    ...mapState(useLogStore, ["logLines"]),
    ...mapState(useFlashStore, ["modeOptions", "versions", "assets"]),
    canFlash() {
      if (this.flashInProgress) {
        return false;
      }
      if (this.store.mode == FlashModes.Local && this.firmwareFile) {
        return true;
      }
      if (
        this.store.mode == FlashModes.Release &&
        this.store.version.length &&
        this.store.target.length
      ) {
        return true;
      }
      return false;
    },
  },
  watch: {
    logLines(prev, next) {
      if (prev.length != next.length) {
        const el = this.$refs.log as HTMLPreElement;

        window.clearTimeout(this.scrollTimeout);
        this.scrollTimeout = window.setTimeout(
          () => (el.scrollTop = el.scrollHeight),
          1
        );
      }
    },
  },
  methods: {
    ...mapActions(useLogStore, ["clearLog"]),
    ...mapActions(useFlashStore, ["fetchReleases"]),
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

    async getFile() {
      if (this.store.mode == FlashModes.Local && this.firmwareFile) {
        return await readFile(this.firmwareFile);
      }

      const asset = this.assets.find((a) => a.Target == this.store.target);
      if (!asset) {
        return undefined;
      }

      return await Github.fetchAsset(asset).then((res) => res.arrayBuffer());
    },

    async flash() {
      const file = await this.getFile();
      if (!file) {
        return;
      }

      const serial = await Serial.request(this.onSerialError.bind(this));
      if (!serial) {
        return;
      }

      this.clearLog();
      this.progress = 0;
      this.flashInProgress = true;
      try {
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
  created() {
    this.fetchReleases();
  },
});
</script>
