import fs from 'fs';
import path from 'path';
import type { Transport } from './transport';
import type { LogEntry, LoggerConfig } from '../types';
import { getMsUntilNextMidnightUTC, generateRotatedName } from '../utils/rotation';
import { compressRotatedFile } from '../utils/compression';
import { cleanupOldLogs } from '../utils/retention';

// Constants for file stream configuration
const DEFAULT_FILE_MODE = 0o666; // read/write for all (modified by umask)
const STREAM_ENCODING = 'utf8';

/**
 * Parse human-readable file size to bytes
 *
 * @param size - Size as number (bytes) or string (e.g., '100MB', '1.5GB', '500KB')
 * @returns Size in bytes
 * @throws {Error} If size string is invalid
 *
 * @example
 * ```typescript
 * parseSize('100MB');    // 104857600
 * parseSize('1.5GB');    // 1610612736
 * parseSize('500KB');    // 512000
 * parseSize(104857600);  // 104857600
 * ```
 */
function parseSize(size: string | number): number {
    // If already a number, return as-is
    if (typeof size === 'number') {
        if (size <= 0) {
            throw new Error(`Size must be positive, got ${size}`);
        }
        return size;
    }

    // Parse string format: "100MB", "1.5GB", etc.
    const units: Record<string, number> = {
        'B': 1,
        'KB': 1024,
        'MB': 1024 ** 2,
        'GB': 1024 ** 3,
        'TB': 1024 ** 4,
        'PB': 1024 ** 5,
    };

    const trimmed = size.trim();
    const match = trimmed.match(/^([\d.]+)\s*([A-Z]+)$/i);

    if (!match) {
        throw new Error(`Invalid size format: "${size}". Expected format: "100MB", "1.5GB", etc.`);
    }

    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();

    if (!(unit in units)) {
        throw new Error(`Unknown size unit: "${unit}". Supported: B, KB, MB, GB, TB, PB`);
    }

    const bytes = Math.round(value * units[unit]);

    if (bytes <= 0) {
        throw new Error(`Size must be positive, got "${size}" (${bytes} bytes)`);
    }

    return bytes;
}

/**
 * File transport for writing logs to a file
 *
 * Uses Node.js streams for efficient async file writing.
 * Creates parent directories automatically if they don't exist.
 */

/**
 * Options for FileTransport
 */
interface FileTransportOptions {
    /** Maximum file size before rotation (e.g., '100MB', 104857600) */
    maxSize?: string | number;
    /** Time-based rotation pattern (e.g., 'daily' for midnight UTC rotation) */
    pattern?: 'daily';
    /** Gzip compression level for rotated log files (1-9, default 6) */
    compressionLevel?: number;
    /** Maximum number of log files to keep (default: 20) */
    maxFiles?: number;
    /** Maximum age of log files in days (default: 30) */
    maxAge?: number;
}

export class FileTransport implements Transport {
    private stream: fs.WriteStream;
    private readonly filePath: string;
    private closed = false;
    private readonly maxSize?: number;
    private readonly rotationEnabled: boolean;
    private readonly timeBasedRotationEnabled: boolean;
    private rotating = false;              // Write gate flag
    private rotationInProgress?: Promise<void>;  // Track rotation promise
    private currentFileSize = 0;           // Track current file size
    private rotationTimer?: NodeJS.Timeout;
    // Field reserved for future use in tracking rotation date
    private lastRotationDate?: Date;
    private readonly compressionLevel?: number;  // Gzip compression level (1-9)
    private readonly maxFiles?: number;  // Maximum number of log files to keep
    private readonly maxAge?: number;  // Maximum age of log files in days

    /**
     * Create a new file transport
     *
     * @param filePath - Path to the log file (relative or absolute)
     * @param options - Rotation options (optional)
     *
     * @throws {Error} If filePath is empty or only whitespace
     * @throws {Error} If rotation config has invalid size format
     *
     * @example
     * ```typescript
     * // Basic file logging (no rotation)
     * const transport = new FileTransport('./logs/app.log');
     *
     * // With rotation enabled
     * const transport = new FileTransport('./logs/app.log', { maxSize: '100MB' });
     * ```
     */
    constructor(filePath: string, options?: FileTransportOptions) {
        if (!filePath || !filePath.trim()) {
            throw new Error('File path cannot be empty or whitespace');
        }

        this.filePath = filePath;

        // Parse rotation config if provided
        this.rotationEnabled = false;
        this.timeBasedRotationEnabled = false;
        this.compressionLevel = undefined;

        if (options !== undefined && options.maxSize !== undefined) {
            this.maxSize = parseSize(options.maxSize);
            this.rotationEnabled = true;
        }
        if (options !== undefined && options.pattern === 'daily') {
            this.timeBasedRotationEnabled = true;
            // Enable rotation for time-based pattern
            this.rotationEnabled = true;
        }

        // Parse compression level if provided
        if (options !== undefined && options.compressionLevel !== undefined) {
            const level = options.compressionLevel;
            if (level < 1 || level > 9) {
                throw new Error(`Compression level must be between 1 and 9, got ${level}`);
            }
            this.compressionLevel = level;
        }

        // Parse retention config if provided
        if (options !== undefined && options.maxFiles !== undefined) {
            const maxFiles = options.maxFiles;
            if (maxFiles < 1) {
                throw new Error(`maxFiles must be at least 1, got ${maxFiles}`);
            }
            this.maxFiles = maxFiles;
        }

        if (options !== undefined && options.maxAge !== undefined) {
            const maxAge = options.maxAge;
            if (maxAge < 1) {
                throw new Error(`maxAge must be at least 1 day, got ${maxAge}`);
            }
            this.maxAge = maxAge;
        }

        // Retention config requires both maxFiles AND maxAge
        const hasMaxFiles = this.maxFiles !== undefined;
        const hasMaxAge = this.maxAge !== undefined;
        if (hasMaxFiles !== hasMaxAge) {
            throw new Error('Retention config requires both maxFiles AND maxAge to be specified');
        }

        // Ensure directory exists (Node.js >= 10.12.0)
        const dir = path.dirname(filePath);
        try {
            fs.mkdirSync(dir, { recursive: true });
        } catch (error) {
            const err = error as NodeJS.ErrnoException;
            throw new Error(`Failed to create directory for log file: ${err.message}`);
        }

        // Initialize current file size (0 if file doesn't exist)
        try {
            const stats = fs.statSync(filePath);
            this.currentFileSize = stats.size;
        } catch {
            // File doesn't exist yet, size is 0
            this.currentFileSize = 0;
        }

        // Create append stream
        this.stream = this.createWriteStream(filePath);

        // Schedule midnight rotation if time-based rotation is enabled
        if (this.timeBasedRotationEnabled) {
            this.scheduleMidnightRotation();
        }
    }

    /**
     * Write a log entry to the file
     *
     * @param formatted - Formatted log string
     * @param entry - Raw log entry (not used in file transport)
     * @param config - Logger config (not used in file transport)
     *
     * @remarks
     * Write gating: If rotation is in progress, skip this write to prevent
     * data loss during rotation. The rotation is atomic and will complete
     * before new writes are accepted.
     *
     * Size checking: Track file size internally and trigger rotation when
     * size threshold is exceeded.
     *
     * Time checking: Initialize lastRotationDate on first write for time-based
     * rotation. Check if midnight has passed on each write.
     *
     * This method remains synchronous. Rotation happens asynchronously.
     */
    log(formatted: string, _entry: LogEntry, _config: LoggerConfig): void {
        // Write gating: skip writes during rotation
        if (this.rotating) {
            return;
        }

        // Initialize lastRotationDate on first write for time-based rotation
        if (this.timeBasedRotationEnabled && !this.lastRotationDate) {
            this.lastRotationDate = new Date();
        }

        const bytesAboutToWrite = formatted.length + 1; // +1 for newline

        // Check if rotation needed BEFORE writing (size-based check)
        const needSizeRotation = this.maxSize !== undefined && this.currentFileSize + bytesAboutToWrite >= this.maxSize;

        // Check if time-based rotation needed
        const needTimeRotation = this.timeBasedRotationEnabled && this.isMidnightPassed();

        // Update file size immediately (before write completes)
        // This allows rotation to trigger before the next write
        this.currentFileSize += bytesAboutToWrite;

        try {
            this.stream.write(formatted + '\n', 'utf8', () => {
                // Trigger rotation after this write is flushed to stream
                if (needSizeRotation || needTimeRotation) {
                    this.checkSizeAndRotate().catch((err) => {
                        console.error(`[FileTransport] Rotation error: ${err instanceof Error ? err.message : String(err)}`);
                    });
                }
            });
        } catch (error) {
            // Swallow errors - stream error handler will log to console
            // This prevents logging failures from crashing the application
        }
    }

    /**
     * Close the file stream and release the file handle
     *
     * @returns Promise that resolves when stream is closed
     *
     * @remarks
     * Call this during application shutdown to ensure all logs are flushed.
     * Not calling this may result in file handle leaks.
     */
    close(): Promise<void> {
        return new Promise((resolve, reject) => {
            // Already closed - resolve immediately
            if (this.closed) {
                resolve();
                return;
            }

            this.closed = true;

            // Clear rotation timer to prevent memory leaks
            this.clearRotationTimer();

            // Remove error handler to avoid "Possible EventEmitter memory leak" warning
            this.stream.removeAllListeners('error');

            this.stream.end((err: Error | null | undefined) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * Create a new write stream for the log file
     *
     * @param filePath - Path to the log file
     * @returns Write stream with error handler attached
     *
     * @remarks
     * This helper method encapsulates stream creation logic to avoid duplication.
     * Used during initialization and rotation.
     */
    private createWriteStream(filePath: string): fs.WriteStream {
        const stream = fs.createWriteStream(filePath, {
            flags: 'a',           // append mode
            encoding: STREAM_ENCODING,
            mode: DEFAULT_FILE_MODE,
        });

        // Prevent crashes on stream errors (Critical: unhandled error events crash Node.js)
        this.attachErrorHandler(stream);
        return stream;
    }

    /**
     * Attach error handler to a write stream
     *
     * @param stream - Write stream to attach handler to
     *
     * @remarks
     * Error handler falls back to console.error to prevent logging failures
     * from crashing the application.
     */
    private attachErrorHandler(stream: fs.WriteStream): void {
        stream.on('error', (err) => {
            // Fallback to console.error - don't throw, don't crash
            console.error(`[FileTransport] Write error for ${this.filePath}: ${err.message}`);
        });
    }

    /**
     * Perform atomic rotation: close stream → rename file → create new stream
     *
     * @returns Promise that resolves when rotation completes
     *
     * @remarks
     * Atomic rotation sequence:
     * 1. Close current stream (stream.end() flushes all buffered data)
     * 2. Rename file to date-stamped name (fs.rename is atomic on most filesystems)
     * 3. Create new stream for continued logging
     * 4. Reset file size counter to 0
     *
     * This method MUST be called with rotating flag set to prevent concurrent writes.
     *
     * @throws {Error} If stream close fails
     * @throws {Error} If file rename fails
     */
    private async performRotation(): Promise<void> {
        return new Promise((resolve, reject) => {
            // Step 1: Close current stream (flushes all buffered data)
            this.stream.end((closeErr: Error | null | undefined) => {
                if (closeErr) {
                    reject(closeErr);
                    return;
                }

                // Step 2: Rename file to date-stamped name
                const rotatedPath = generateRotatedName(this.filePath);

                fs.rename(this.filePath, rotatedPath, (renameErr: NodeJS.ErrnoException | null) => {
                    if (renameErr) {
                        // Rename failed — try to recover by reopening original file
                        this.stream = this.createWriteStream(this.filePath);
                        reject(renameErr);
                        return;
                    }

                    // Step 3: Create new stream for continued logging
                    this.stream = this.createWriteStream(this.filePath);

                    // Step 4: Reset file size counter to 0 for new file
                    this.currentFileSize = 0;

                    // Step 5: Schedule compression with 10ms delay (fire-and-forget)
                    if (this.compressionLevel !== undefined) {
                        setTimeout(() => {
                            compressRotatedFile(rotatedPath, this.compressionLevel!)
                                .catch(() => {
                                    // Errors already logged in compressRotatedFile
                                    // This catch is just to prevent unhandled promise rejection
                                });
                        }, 10);  // 10ms delay to avoid CPU spike during active logging
                    }

                    // Step 6: Trigger retention cleanup if configured
                    if (this.maxFiles !== undefined && this.maxAge !== undefined) {
                        setTimeout(() => {
                            this.performRetentionCleanup().catch((err) => {
                                console.error(`[FileTransport] Retention cleanup error: ${err instanceof Error ? err.message : String(err)}`);
                            });
                        }, 20);  // 20ms delay: 10ms for compression + 10ms buffer
                    }

                    resolve();
                });
            });
        });
    }

    /**
     * Check if midnight UTC has passed since last rotation
     *
     * @returns true if midnight has passed (should rotate), false otherwise
     *
     * @remarks
     * This method implements date-based rotation detection using UTC dates.
     * Compares current UTC date with last rotation UTC date to detect day change.
     *
     * Integration: Called from checkSizeAndRotate() as part of hybrid rotation trigger.
     */
    private isMidnightPassed(): boolean {
        // Initialize lastRotationDate on first call
        if (!this.lastRotationDate) {
            this.lastRotationDate = new Date();
            return false;
        }

        const now = new Date();

        // Compare UTC dates (not timestamps) to detect day change
        const nowUTC = Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate()
        );

        const lastUTC = Date.UTC(
            this.lastRotationDate.getUTCFullYear(),
            this.lastRotationDate.getUTCMonth(),
            this.lastRotationDate.getUTCDate()
        );

        // If current UTC day > last rotation UTC day, rotate
        if (nowUTC > lastUTC) {
            this.lastRotationDate = now;
            return true;
        }

        return false;
    }

    /**
     * Check file size and trigger rotation if threshold exceeded
     *
     * @param forceRotation - Force rotation regardless of size (for time-based rotation)
     *
     * @remarks
     * Uses tracked file size to determine if rotation is needed.
     * Deduplicates concurrent rotation checks by tracking rotationInProgress promise.
     *
     * This method is async but called fire-and-forget from log() to avoid
     * blocking writes. The rotating flag ensures no writes during rotation.
     *
     * Time-based rotation: When called with forceRotation=true from
     * scheduleMidnightRotation callback, this performs rotation regardless of file size.
     *
     * Hybrid rotation: Supports both size-based and time-based triggers.
     * Size trigger: currentFileSize >= maxSize
     * Time trigger: isMidnightPassed() returns true
     * Rotation occurs when EITHER condition is met.
     */
    private async checkSizeAndRotate(forceRotation = false): Promise<void> {
        // Skip if rotation not enabled or already rotating
        if (!this.rotationEnabled || this.rotating || this.rotationInProgress) {
            return;
        }

        // Check if rotation needed (size OR time triggers)
        const sizeTriggered = this.maxSize !== undefined && this.currentFileSize >= this.maxSize;
        const timeTriggered = this.timeBasedRotationEnabled && this.isMidnightPassed();

        if (forceRotation || sizeTriggered || timeTriggered) {
            // Set write gate BEFORE rotation starts
            this.rotating = true;

            // Perform rotation and track promise
            this.rotationInProgress = this.performRotation();

            try {
                await this.rotationInProgress;
            } finally {
                // Clear write gate AFTER rotation completes
                this.rotating = false;
                this.rotationInProgress = undefined;
            }
        }
    }

    /**
     * Schedule midnight rotation using recursive setTimeout
     *
     * @remarks
     * This method implements recursive timer scheduling for daily rotation at midnight UTC.
     * Using setTimeout instead of setInterval prevents timing drift because each timeout
     * is calculated fresh based on current time.
     *
     * Integration with existing rotation:
     * - Calls checkSizeAndRotate(true) to force rotation at midnight
     * - This allows hybrid rotation (size + time) to work seamlessly
     *
     * Error handling prevents midnight rotation failures from crashing the application.
     * Errors are logged to console as a fallback.
     */
    private scheduleMidnightRotation(): void {
        // Calculate milliseconds until next midnight UTC
        const msUntilMidnight = getMsUntilNextMidnightUTC();

        // Schedule rotation callback
        this.rotationTimer = setTimeout(() => {
            // Trigger rotation via existing checkSizeAndRotate
            // Force rotation for time-based trigger
            this.checkSizeAndRotate(true).catch((err) => {
                console.error(`[FileTransport] Midnight rotation error: ${err instanceof Error ? err.message : String(err)}`);
            });

            // Reschedule for next day (recursive setTimeout prevents drift)
            this.scheduleMidnightRotation();
        }, msUntilMidnight);
    }

    /**
     * Clear rotation timer to prevent memory leaks
     *
     * @remarks
     * This method clears the rotation timer if it exists.
     * Uncleared timers prevent garbage collection and cause memory leaks.
     * Called during close() to ensure proper cleanup.
     */
    private clearRotationTimer(): void {
        if (this.rotationTimer) {
            clearTimeout(this.rotationTimer);
            this.rotationTimer = undefined;
        }
    }

    /**
     * Perform retention cleanup of old log files
     *
     * @returns Promise that resolves when cleanup completes
     *
     * @remarks
     * This method implements retention cleanup using the cleanupOldLogs utility.
     * - Returns early if retention config not set (both maxFiles and maxAge required)
     * - Extracts file path components (directory, base name, extension)
     * - Calls cleanupOldLogs with retention configuration
     * - Emits 'error' event if any cleanup failures occurred (non-fatal)
     *
     * Error handling: Cleanup errors are non-fatal and emitted as 'error' events
     * to allow logging to continue while alerting the application.
     */
    private async performRetentionCleanup(): Promise<void> {
        // Skip if retention config not set
        if (this.maxFiles === undefined || this.maxAge === undefined) {
            return;
        }

        // Extract directory, base filename, and extension
        const dir = path.dirname(this.filePath);
        const base = path.basename(this.filePath, path.extname(this.filePath));
        const ext = path.extname(this.filePath);

        // Perform cleanup
        const result = await cleanupOldLogs(dir, base, ext, this.maxFiles, this.maxAge);

        // Emit error event if any cleanup failures occurred
        if (result.errors.length > 0) {
            this.stream.emit('error', new Error(
                `Retention cleanup completed with ${result.errors.length} error(s): ${result.errors.join(', ')}`
            ));
        }
    }
}
