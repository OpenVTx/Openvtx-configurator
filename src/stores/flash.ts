import { defineStore } from "pinia";
import { Github, type ReleaseMap } from "./api/github";

export enum FlashModes {
  Release = "Release",
  Local = "Local",
}

export const useFlashStore = defineStore({
  id: "flash",
  state: () => ({
    mode: FlashModes.Release,
    modeOptions: [FlashModes.Release, FlashModes.Local],

    version: "",
    target: "",

    releases: {} as ReleaseMap,
    versions: new Array<string>(),
  }),
  getters: {
    assets(state) {
      return state.releases[state.version];
    },
  },
  actions: {
    fetchReleases() {
      return Github.fetchReleases().then((releases) => {
        this.releases = releases;
        this.versions = Object.keys(releases);

        this.version = this.versions[0];
      });
    },
  },
});
