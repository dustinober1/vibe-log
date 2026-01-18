/**
 * Available log levels
 */
export type LogLevel = 'debug' | 'info' | 'success' | 'warn' | 'error';

/**
 * Forward declaration for Transport interface
 * (defined in transports/transport.ts to avoid circular dependency)
 */
export interface Transport {
    log(formatted: string, entry: LogEntry, config: LoggerConfig): void;
    close?(): Promise<void> | void;
}

/**
 * Rotation configuration options
 *
 * @remarks
 * Rotation is an internal concern of FileTransport.
 * When rotation config is provided, FileTransport automatically
 * rotates log files based on the configured strategy.
 *
 * Rotation strategies:
 * - Size-based: Rotates when file exceeds maxSize threshold
 * - Time-based: Rotates daily at midnight UTC when pattern is set
 * - Hybrid: Combines both strategies (rotates on whichever triggers first)
 *
 * Compression runs asynchronously after rotation completes using fire-and-forget
 * pattern to avoid blocking the log() method or event loop.
 *
 * Size can be specified as:
 * - Number: Bytes (e.g., 104857600 for 100MB)
 * - String: Human-readable format (e.g., '100MB', '1.5GB', '500KB')
 *
 * Default maxSize: 100MB (104857600 bytes)
 * Default compressionLevel: 6 (balanced speed/size)
 *
 * Time-based rotation uses UTC midnight to avoid timezone issues
 * and Daylight Saving Time problems.
 */
export interface RotationConfig {
    /** Maximum file size before rotation (default: '100MB') */
    maxSize?: string | number;
    /**
     * Time-based rotation pattern
     *
     * @remarks
     * When set to 'daily', rotates log files at midnight UTC.
     * This ensures consistent rotation regardless of server timezone.
     *
     * Can be combined with maxSize for hybrid rotation:
     * rotates at midnight OR when size threshold is exceeded.
     *
     * Example:
     * ```typescript
     * { pattern: 'daily' }                    // Daily rotation at midnight UTC
     * { pattern: 'daily', maxSize: '100MB' }  // Daily OR at 100MB, whichever first
     * ```
     */
    pattern?: 'daily';
    /**
     * Gzip compression level for rotated log files
     *
     * @remarks
     * When set, rotated log files are compressed asynchronously using gzip.
     * Compression runs fire-and-forget after rotation completes without blocking logging.
     *
     * Compression levels (zlib standard):
     * - 1: Fastest compression (larger files)
     * - 6: Balanced speed/size (default)
     * - 9: Best compression (slowest)
     *
     * Default: 6 (balanced compression)
     *
     * Example:
     * ```typescript
     * { maxSize: '100MB', compressionLevel: 1 }     // Fast compression
     * { maxSize: '100MB', compressionLevel: 9 }     // Best compression
     * { maxSize: '100MB', compressionLevel: 6 }     // Balanced (default)
     * ```
     */
    compressionLevel?: number;
    /**
     * Maximum number of log files to retain
     *
     * @remarks
     * When BOTH maxFiles AND maxAge are specified, automatic cleanup of old
     * log files is enabled. Files are deleted only when BOTH conditions are met
     * (conservative retention policy).
     *
     * This field counts ALL files in the log directory, including the current
     * active log file and all rotated files (both .gz and uncompressed).
     *
     * Default: 20 files
     *
     * Must be specified together with maxAge. Rotation works without retention
     * if neither field is specified.
     *
     * Retention policy: File deleted only if BOTH maxFiles AND maxAge exceeded
     *
     * Example:
     * ```typescript
     * { maxSize: '100MB', maxFiles: 20, maxAge: 30 }  // Keep 20 files, 30 days
     * { maxSize: '100MB', maxFiles: 50, maxAge: 7 }   // Keep 50 files, 7 days
     * ```
     */
    maxFiles?: number;
    /**
     * Maximum age of log files to retain (in days)
     *
     * @remarks
     * When BOTH maxFiles AND maxAge are specified, automatic cleanup of old
     * log files is enabled. Files are deleted only when BOTH conditions are met
     * (conservative retention policy).
     *
     * Age is calculated from the date embedded in rotated filenames (YYYY-MM-DD format).
     * Uses UTC to avoid timezone issues.
     *
     * Default: 30 days
     *
     * Must be specified together with maxFiles. Rotation works without retention
     * if neither field is specified.
     *
     * Retention policy: File deleted only if BOTH maxFiles AND maxAge exceeded
     *
     * Example:
     * ```typescript
     * { maxSize: '100MB', maxFiles: 20, maxAge: 30 }  // Keep 20 files, 30 days
     * { maxSize: '100MB', maxFiles: 50, maxAge: 7 }   // Keep 50 files, 7 days
     * ```
     */
    maxAge?: number;
}

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
    /** File path shorthand for single file logging */
    file?: string;
    /** Rotation configuration for file transport */
    rotation?: RotationConfig;
    /** Array of transports (empty = no output, undefined = default console) */
    transports?: Transport[];
    /** Whether to include console transport in default transports */
    console?: boolean;
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
