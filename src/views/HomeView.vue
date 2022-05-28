<template>
  <div class="field is-horizontal">
    <div class="field-label is-medium">
      <label class="label">Source</label>
    </div>
    <div class="field-body">
      <div class="field">
        <div class="control">
          <div class="select is-medium">
            <select>
              <option>Select dropdown</option>
              <option>With options</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="field is-horizontal">
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

  <div class="field is-horizontal">
    <div class="field-label">
      <!-- Left empty for spacing -->
    </div>
    <div class="field-body">
      <div class="field">
        <div class="control">
          <button class="button is-medium is-primary" v-on:click="flash()">
            Flash
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Serial } from "@/serial/serial";
import { useFlashStore } from "@/stores/flash";
import { mapActions } from "pinia";
import { defineComponent } from "vue";

export default defineComponent({
  data() {
    return {
      serial: new Serial(),
    };
  },

  methods: {
    ...mapActions(useFlashStore, ["connect"]),
    async flash() {
      await this.connect();
    },
  },
});
</script>
