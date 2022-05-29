import { LogLevel } from "./../log";
import { defineStore } from "pinia";

export interface LogEntry {
  level: LogLevel;
  prefix?: string;
  line: string;
}

export const useLogStore = defineStore({
  id: "log",
  state: () => ({
    logEntries: new Array<LogEntry>(),
    logLevel: LogLevel.Debug,
  }),
  getters: {
    logLines(): string[] {
      return this.logEntries
        .filter((e) => e.level >= this.logLevel)
        .map((e) => e.line);
    },
  },
  actions: {
    append(entry: LogEntry) {
      this.logEntries = [...this.logEntries, entry];
    },
    clearLog() {
      this.logEntries = [];
    },
  },
});
