import fs from 'fs';
import path from 'path';
import type { Transport } from './transport';
import type { LogEntry, LoggerConfig } from '../types';
import { getMsUntilNextMidnightUTC } from '../utils/rotation';

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
 * Generate a rotated filename with date stamp and sequence number
 *
 * @param filePath - Original log file path
 * @returns Rotated filename path (e.g., "app-2026-01-18.log.1")
 *
 * @remarks
 * Filename format: `{basename}-{YYYY-MM-DD}.{ext}.{sequence}`
 * - Uses UTC date to avoid timezone issues across servers
 * - Sequence increments for multiple rotations per day
 * - Extension preserved before sequence number
 *
 * @example
 * ```typescript
 * generateRotatedName('./logs/app.log');      // './logs/app-2026-01-18.log.1'
 * generateRotatedName('./logs/app.log');      // './logs/app-2026-01-18.log.2' (if .1 exists)
 * generateRotatedName('./logs/error.txt');    // './logs/error-2026-01-18.txt.1'
 * ```
 */
function generateRotatedName(filePath: string): string {
    const ext = path.extname(filePath);           // '.log'
    const base = path.basename(filePath, ext);    // 'app'
    const dir = path.dirname(filePath);           // './logs'

    // UTC date format: YYYY-MM-DD
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0];  // '2026-01-18'

    // Find existing rotated files to determine next sequence number
    let sequence = 1;

    try {
        const existingFiles = fs.readdirSync(dir)
            .filter(f => f.startsWith(`${base}-${dateStr}`) && f.endsWith(ext));

        // Extract highest sequence number from existing files
        const maxSequence = existingFiles.reduce((max, file) => {
            // Extract sequence number from filename (format: base-date.ext.N)
            const match = file.match(new RegExp(`^${escapeRegExp(base)}-${escapeRegExp(dateStr)}${escapeRegExp(ext)}\\.(\\d+)$`));
            return match ? Math.max(max, parseInt(match[1], 10)) : max;
        }, 0);

        sequence = maxSequence + 1;
    } catch (error) {
        // Directory doesn't exist or can't be read — use sequence 1
        // This is fine, rotation will create directory if needed
    }

    // Format: app-2026-01-18.log.1
    const rotatedName = `${base}-${dateStr}${ext}.${sequence}`;
    return path.join(dir, rotatedName);
}

/**
 * Escape special regex characters in a string
 */
function escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
    private lastRotationDate?: Date;

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
        if (options !== undefined && options.maxSize !== undefined) {
            this.maxSize = parseSize(options.maxSize);
            this.rotationEnabled = true;
        }
        if (options !== undefined && options.pattern === 'daily') {
            this.timeBasedRotationEnabled = true;
            // Enable rotation for time-based pattern
            this.rotationEnabled = true;
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
     * This method remains synchronous. Rotation happens asynchronously.
     */
    log(formatted: string, _entry: LogEntry, _config: LoggerConfig): void {
        // Write gating: skip writes during rotation
        if (this.rotating) {
            return;
        }

        const bytesAboutToWrite = formatted.length + 1; // +1 for newline

        // Check if rotation needed BEFORE writing
        const needRotation = this.rotationEnabled && this.currentFileSize + bytesAboutToWrite >= this.maxSize!;

        // Update file size immediately (before write completes)
        // This allows rotation to trigger before the next write
        this.currentFileSize += bytesAboutToWrite;

        try {
            this.stream.write(formatted + '\n', 'utf8', () => {
                // Trigger rotation after this write is flushed to stream
                if (needRotation) {
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

                    resolve();
                });
            });
        });
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
     */
    private async checkSizeAndRotate(forceRotation = false): Promise<void> {
        // Skip if rotation not enabled or already rotating
        if (!this.rotationEnabled || this.rotating || this.rotationInProgress) {
            return;
        }

        // Check if rotation needed (using tracked size for size-based)
        const needSizeRotation = this.maxSize !== undefined && this.currentFileSize >= this.maxSize;

        if (forceRotation || needSizeRotation) {
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
}
