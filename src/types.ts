/**
 * Available log levels
 */
export type LogLevel = 'debug' | 'info' | 'success' | 'warn' | 'error';

/**
 * A single log entry
 */
export interface LogEntry {
    level: LogLevel;
    context: string;
    message: string;
    data?: unknown[];
    timestamp: Date;
}

/**
 * Logger configuration options (for future use)
 */
export interface LoggerConfig {
    level?: LogLevel;
    showTimestamp?: boolean;
    showIcons?: boolean;
}

/**
 * Core logger interface
 */
export interface Logger {
    debug(context: string, message: string, ...data: unknown[]): void;
    info(context: string, message: string, ...data: unknown[]): void;
    success(context: string, message: string, ...data: unknown[]): void;
    warn(context: string, message: string, ...data: unknown[]): void;
    error(context: string, message: string, ...data: unknown[]): void;
}

/**
 * Scoped logger interface (context is pre-bound)
 */
export interface ScopedLogger {
    debug(message: string, ...data: unknown[]): void;
    info(message: string, ...data: unknown[]): void;
    success(message: string, ...data: unknown[]): void;
    warn(message: string, ...data: unknown[]): void;
    error(message: string, ...data: unknown[]): void;
}
