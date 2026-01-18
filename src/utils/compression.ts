import { createReadStream, createWriteStream } from 'node:fs';
import { createGzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import fs from 'node:fs';
import path from 'path';

/**
 * Compression utility functions for async gzip compression
 *
 * @remarks
 * This module provides utilities for compressing rotated log files using gzip.
 * Compression uses stream.pipeline() for robust error handling and automatic cleanup.
 *
 * The fire-and-forget pattern ensures compression doesn't block the log() method
 * or event loop. All errors are logged and failed files are moved to a failed/
 * subdirectory for manual inspection.
 */

/**
 * Compress a rotated log file using gzip
 *
 * @param filePath - Path to the rotated log file to compress
 * @param compressionLevel - Gzip compression level (1-9, default 6)
 * @returns Promise that resolves when compression completes or fails
 *
 * @remarks
 * This function implements fire-and-forget compression using stream.pipeline():
 * - Reads the rotated file via createReadStream
 * - Compresses using createGzip with specified level
 * - Writes to .gz file via createWriteStream
 * - Deletes original file after successful compression
 * - Moves failed files to failed/ subdirectory on error
 *
 * The pipeline() function automatically:
 * - Closes all streams on completion
 * - Propagates errors to the promise
 * - Cleans up partial output on error (deletes incomplete .gz files)
 *
 * Compression levels:
 * - 1: Fastest compression (largest files)
 * - 6: Balanced speed/size (default recommended)
 * - 9: Best compression (slowest)
 *
 * @example
 * ```typescript
 * // Compress rotated file with level 6 (balanced)
 * await compressRotatedFile('./logs/app-2026-01-18.log.1', 6);
 * // Result: ./logs/app-2026-01-18.log.1.gz created, original deleted
 *
 * // Compress with level 1 (fastest)
 * await compressRotatedFile('./logs/app-2026-01-18.log.2', 1);
 * // Result: Faster compression, larger file size
 * ```
 */
export async function compressRotatedFile(filePath: string, compressionLevel: number): Promise<void> {
    const destPath = `${filePath}.gz`;

    try {
        // Create streams
        const source = createReadStream(filePath);
        const gzip = createGzip({ level: compressionLevel });
        const destination = createWriteStream(destPath);

        // Use pipeline for proper error handling and cleanup
        await pipeline(source, gzip, destination);

        // Success: delete uncompressed file
        await fs.promises.unlink(filePath);

        // Log success to console for visibility
        console.log(`[FileTransport] Compressed: ${filePath} -> ${destPath}`);
    } catch (error) {
        const err = error as NodeJS.ErrnoException;
        console.error(`[FileTransport] Compression failed for ${filePath}: ${err.message}`);

        // Move failed file to failed/ subdirectory for manual inspection
        const failedDir = path.join(path.dirname(filePath), 'failed');
        await fs.promises.mkdir(failedDir, { recursive: true });
        const failedPath = path.join(failedDir, path.basename(filePath));

        try {
            await fs.promises.rename(filePath, failedPath);
            console.log(`[FileTransport] Moved failed file to: ${failedPath}`);
        } catch (renameError) {
            // If rename fails (e.g., cross-device link), leave file in place
            const renameErr = renameError as NodeJS.ErrnoException;
            if (renameErr.code === 'EXDEV') {
                console.error(`[FileTransport] Could not move failed file (cross-device link): ${filePath}`);
            } else {
                console.error(`[FileTransport] Could not move failed file: ${renameErr.message}`);
            }
        }
    }
}
