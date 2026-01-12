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
 * Logger configuration options
 */
export interface LoggerConfig {
    /** Minimum log level to display */
    level?: LogLevel;
    /** Whether to show timestamps in log output */
    showTimestamp?: boolean;
    /** Whether to show icons in log output */
    showIcons?: boolean;
    /** Whether to use ANSI colors (auto-detected if not specified) */
    useColors?: boolean;
    /** Maximum depth for object pretty-printing (prevents stack overflow) */
    maxDepth?: number;
    /** Timestamp format: 'time' for HH:MM:SS.mmm or 'iso' for ISO 8601 */
    timestampFormat?: 'time' | 'iso';
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
