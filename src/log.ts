import { useLogStore } from "./stores/log";

export enum LogLevel {
  Trace,
  Debug,
  Info,
  Warning,
  Error,
}

export const LevelNames = {
  [LogLevel.Trace]: "trace",
  [LogLevel.Debug]: "debug",
  [LogLevel.Info]: "info",
  [LogLevel.Warning]: "warning",
  [LogLevel.Error]: "error",
};

export class Log {
  public static trace(prefix: string, ...data: unknown[]) {
    Log.log(LogLevel.Trace, prefix, ...data);
  }

  public static debug(prefix: string, ...data: unknown[]) {
    Log.log(LogLevel.Debug, prefix, ...data);
  }

  public static info(prefix: string, ...data: unknown[]) {
    Log.log(LogLevel.Info, prefix, ...data);
  }

  public static warn(prefix: string, ...data: unknown[]) {
    Log.log(LogLevel.Warning, prefix, ...data);
  }

  public static warning(prefix: string, ...data: unknown[]) {
    Log.log(LogLevel.Warning, prefix, ...data);
  }

  public static error(prefix: string, ...data: unknown[]) {
    Log.log(LogLevel.Error, prefix, ...data);
  }

  public static log(level: LogLevel, prefix?: string, ...data: unknown[]) {
    let str = "[" + LevelNames[level] + "]";
    if (prefix && prefix.length) {
      str += "[" + prefix + "]";
    }
    if (typeof data[0] == "string") {
      str += " " + data.shift();
    }

    const store = useLogStore();
    if (store) {
      const line = this.format(str, data);
      store.append({
        level,
        prefix,
        line,
      });
    }

    switch (level) {
      case LogLevel.Trace:
      case LogLevel.Debug:
      case LogLevel.Info:
        console.log(str, ...data);
        break;
      case LogLevel.Warning:
        console.warn(str, ...data);
        break;
      case LogLevel.Error:
        console.error(str, ...data);
        break;
      default:
        break;
    }
  }

  private static format(str: string, args: unknown[]): string {
    for (const a of args) {
      if (typeof a == "object") {
        if (a instanceof Error) {
          str += " Error: " + a.message;
        } else {
          str += " " + JSON.stringify(a);
        }
      } else {
        str += " " + a;
      }
    }
    return str;
  }
}
