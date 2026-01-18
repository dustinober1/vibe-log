import fs from 'fs';
import path from 'path';
import type { Transport } from './transport';
import type { LogEntry, LoggerConfig } from '../types';

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
}

export class FileTransport implements Transport {
    private stream: fs.WriteStream;
    private readonly filePath: string;
    private closed = false;
    private readonly maxSize?: number;
    private readonly rotationEnabled: boolean;
    private rotating = false;              // Write gate flag
    private rotationInProgress?: Promise<void>;  // Track rotation promise

    /**
     * Create a new file transport
     *
     * @param filePath - Path to the log file (relative or absolute)
     * @param options - Rotation options (optional, for future use)
     *
     * @throws {Error} If filePath is empty or only whitespace
     * @throws {Error} If rotation config has invalid size format
     *
     * @example
     * ```typescript
     * // Basic file logging (no rotation)
     * const transport = new FileTransport('./logs/app.log');
     *
     * // With rotation (future implementation)
     * const transport = new FileTransport('./logs/app.log', { maxSize: '100MB' });
     * ```
     */
    constructor(filePath: string, options?: FileTransportOptions) {
        if (!filePath || !filePath.trim()) {
            throw new Error('File path cannot be empty or whitespace');
        }

        this.filePath = filePath;

        // Parse rotation config if provided (stored for Phase 2 implementation)
        this.rotationEnabled = false;
        if (options?.maxSize) {
            this.maxSize = parseSize(options.maxSize);
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

        // Create append stream with UTF-8 encoding
        this.stream = fs.createWriteStream(filePath, {
            flags: 'a',      // append mode
            encoding: 'utf8',
            mode: 0o666,     // read/write for all (modified by umask)
        });

        // Prevent crashes on stream errors (Critical: unhandled error events crash Node.js)
        this.stream.on('error', (err) => {
            // Fallback to console.error - don't throw, don't crash
            console.error(`[FileTransport] Write error for ${this.filePath}: ${err.message}`);
        });
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
     * Size checking: Before writing, check if file size + this write will
     * exceed maxSize. If so, trigger rotation (fire-and-forget async).
     *
     * This method remains synchronous. Rotation happens asynchronously.
     */
    log(formatted: string, _entry: LogEntry, _config: LoggerConfig): void {
        // Write gating: skip writes during rotation
        if (this.rotating) {
            return;
        }

        const bytesAboutToWrite = formatted.length + 1; // +1 for newline

        try {
            this.stream.write(formatted + '\n');
        } catch (error) {
            // Swallow errors - stream error handler will log to console
            // This prevents logging failures from crashing the application
        }

        // Check size and potentially trigger rotation (fire-and-forget)
        if (this.rotationEnabled) {
            // Async call without await — don't block log() method
            this.checkSizeAndRotate(bytesAboutToWrite).catch((err) => {
                console.error(`[FileTransport] Rotation error: ${err instanceof Error ? err.message : String(err)}`);
            });
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
     * Perform atomic rotation: close stream → rename file → create new stream
     *
     * @returns Promise that resolves when rotation completes
     *
     * @remarks
     * Atomic rotation sequence:
     * 1. Close current stream (stream.end() flushes all buffered data)
     * 2. Rename file to date-stamped name (fs.rename is atomic on most filesystems)
     * 3. Create new stream for continued logging
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
                        this.stream = fs.createWriteStream(this.filePath, {
                            flags: 'a',
                            encoding: 'utf8',
                            mode: 0o666,
                        });

                        // Re-attach error handler
                        this.stream.on('error', (err) => {
                            console.error(`[FileTransport] Write error for ${this.filePath}: ${err.message}`);
                        });

                        reject(renameErr);
                        return;
                    }

                    // Step 3: Create new stream for continued logging
                    this.stream = fs.createWriteStream(this.filePath, {
                        flags: 'a',
                        encoding: 'utf8',
                        mode: 0o666,
                    });

                    // Re-attach error handler to new stream
                    this.stream.on('error', (err) => {
                        console.error(`[FileTransport] Write error for ${this.filePath}: ${err.message}`);
                    });

                    resolve();
                });
            });
        });
    }

    /**
     * Check file size and trigger rotation if threshold exceeded
     *
     * @param bytesAboutToWrite - Number of bytes that will be written
     *
     * @remarks
     * Uses fs.stat() to get current file size. If size + bytesAboutToWrite
     * exceeds maxSize, triggers rotation. Deduplicates concurrent rotation
     * checks by tracking rotationInProgress promise.
     *
     * This method is async but called fire-and-forget from log() to avoid
     * blocking writes. The rotating flag ensures no writes during rotation.
     */
    private async checkSizeAndRotate(bytesAboutToWrite: number): Promise<void> {
        // Skip if rotation not enabled or already rotating
        if (!this.rotationEnabled || this.rotating || this.rotationInProgress) {
            return;
        }

        try {
            // Get current file size
            const stats = await fs.promises.stat(this.filePath);
            const currentSize = stats.size;

            // Check if rotation needed
            if (currentSize + bytesAboutToWrite >= this.maxSize!) {
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
        } catch (error) {
            // File doesn't exist or stat failed — log error but don't crash
            const err = error as NodeJS.ErrnoException;
            console.error(`[FileTransport] Size check failed: ${err.message}`);
        }
    }
}
