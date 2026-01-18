import fs from 'fs';
import path from 'path';
import type { Transport } from './transport';
import type { LogEntry, LoggerConfig } from '../types';

/**
 * File transport for writing logs to a file
 *
 * Uses Node.js streams for efficient async file writing.
 * Creates parent directories automatically if they don't exist.
 */
export class FileTransport implements Transport {
    private stream: fs.WriteStream;
    private readonly filePath: string;

    /**
     * Create a new file transport
     *
     * @param filePath - Path to the log file (relative or absolute)
     *
     * @throws {Error} If filePath is empty or only whitespace
     *
     * @example
     * ```typescript
     * const transport = new FileTransport('./logs/app.log');
     * ```
     */
    constructor(filePath: string) {
        if (!filePath || !filePath.trim()) {
            throw new Error('File path cannot be empty or whitespace');
        }

        this.filePath = filePath;

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
     * This method is synchronous. The stream handles backpressure internally.
     * For high-volume logging, consider backpressure handling in Phase 2.
     */
    log(formatted: string, _entry: LogEntry, _config: LoggerConfig): void {
        try {
            this.stream.write(formatted + '\n');
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
}
