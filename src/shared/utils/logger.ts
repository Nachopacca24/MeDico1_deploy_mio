/**
 * Sistema de logging centralizado para la aplicación
 */

enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

class Logger {
  private static instance: Logger;
  private level: LogLevel = LogLevel.DEBUG;
  private enabled: boolean = true;

  private constructor() {
    // Deshabilitar en producción
    if (import.meta.env.PROD) {
      this.enabled = false;
    }
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private log(level: LogLevel, module: string, message: string, ...args: any[]) {
    if (!this.enabled || level < this.level) return;

    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
    const prefix = `[${timestamp}] [${module}]`;

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(`${prefix} 🔍`, message, ...args);
        break;
      case LogLevel.INFO:
        console.info(`${prefix} ℹ️`, message, ...args);
        break;
      case LogLevel.WARN:
        console.warn(`${prefix} ⚠️`, message, ...args);
        break;
      case LogLevel.ERROR:
        console.error(`${prefix} ❌`, message, ...args);
        break;
    }
  }

  debug(module: string, message: string, ...args: any[]) {
    this.log(LogLevel.DEBUG, module, message, ...args);
  }

  info(module: string, message: string, ...args: any[]) {
    this.log(LogLevel.INFO, module, message, ...args);
  }

  warn(module: string, message: string, ...args: any[]) {
    this.log(LogLevel.WARN, module, message, ...args);
  }

  error(module: string, message: string, ...args: any[]) {
    this.log(LogLevel.ERROR, module, message, ...args);
  }

  setLevel(level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR') {
    this.level = LogLevel[level];
  }

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
  }
}

export const logger = Logger.getInstance();
