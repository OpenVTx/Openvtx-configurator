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
            <div class="file is-boxed is-medium">
              <label class="file-label">
                <input class="file-input" type="file" name="resume" />
                <span class="file-cta">
                  <span class="file-icon">
                    <i class="fas fa-upload"></i>
                  </span>
                  <span class="file-label"> Choose a file… </span>
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
        <button class="button is-medium is-primary" v-on:click="flash()">
          Flash
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { useFlashStore } from "@/stores/flash";
import { useLogStore } from "@/stores/log";
import { mapActions, mapState } from "pinia";
import { defineComponent } from "vue";

export default defineComponent({
  data() {
    return {
      mode: "Local",
      modeOptions: ["Release", "Local"],
    };
  },
  computed: {
    ...mapState(useLogStore, ["logLines"]),
  },
  methods: {
    ...mapActions(useFlashStore, ["connect"]),
    async flash() {
      await this.connect();
    },
  },
});
</script>
