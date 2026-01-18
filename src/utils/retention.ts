import fs from 'fs';
import path from 'path';

/**
 * Retention cleanup utility functions for log file management
 *
 * @remarks
 * This module provides utilities for parsing rotated log filenames,
 * sorting files by age, and deleting old logs based on retention policy.
 *
 * Retention policy: BOTH maxFiles AND maxAge must be satisfied
 * before a file is deleted (conservative AND logic).
 */

/**
 * Escape special regex characters in a string
 *
 * @param str - String to escape
 * @returns Escaped string safe for use in regex
 *
 * @remarks
 * Copied from rotation.ts to avoid cross-module dependencies.
 * Handles special regex metacharacters: . * + ? ^ $ { } ( ) | [ ] \
 */
function escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Parse date from rotated filename (format: base-YYYY-MM-DD.ext.sequence)
 *
 * @param filename - Rotated filename to parse
 * @param base - Base filename without extension
 * @param ext - File extension (e.g., '.log')
 * @returns Date parsed from filename or undefined if not a rotated file
 *
 * @remarks
 * Rotated filename format: {base}-{YYYY-MM-DD}.{ext}.{sequence}
 * Example: app-2026-01-18.log.1 → Date(2026-01-18)
 *
 * Strips .gz suffix before parsing if present (for compressed files).
 * Uses UTC date to avoid timezone issues.
 *
 * @example
 * ```typescript
 * parseRotatedDate('app-2026-01-18.log.1', 'app', '.log')
 * // Returns: Date('2026-01-18T00:00:00.000Z')
 *
 * parseRotatedDate('app-2026-01-18.log.1.gz', 'app', '.log')
 * // Returns: Date('2026-01-18T00:00:00.000Z')
 *
 * parseRotatedDate('app.log', 'app', '.log')
 * // Returns: undefined
 * ```
 */
export function parseRotatedDate(filename: string, base: string, ext: string): Date | undefined {
    // Strip .gz suffix if present (for compressed files)
    const filenameWithoutGz = filename.replace(/\.gz$/, '');

    // Match pattern: base-YYYY-MM-DD.ext.sequence
    const match = filenameWithoutGz.match(new RegExp(
        `^${escapeRegExp(base)}-(\\d{4}-\\d{2}-\\d{2})${escapeRegExp(ext)}\\.\\d+$`
    ));

    if (!match) {
        return undefined;
    }

    // Parse YYYY-MM-DD format (creates date at midnight UTC)
    const dateStr = match[1];
    return new Date(dateStr + 'T00:00:00.000Z');
}

/**
 * Get sorted list of rotated log files, oldest first
 *
 * @param dir - Directory containing log files
 * @param base - Base filename without extension
 * @param ext - File extension (e.g., '.log')
 * @returns Array of filenames sorted by date (oldest first)
 *
 * @remarks
 * Scans directory for rotated files matching the pattern:
 * {base}-{YYYY-MM-DD}.{ext}.{sequence}
 *
 * Files are sorted by the date parsed from the filename.
 * YYYY-MM-DD format is naturally sortable as strings, but we parse
 * to Date objects for age calculation against maxAge.
 *
 * Includes both .gz and uncompressed rotated files.
 *
 * Returns empty array if directory doesn't exist or can't be read.
 *
 * @example
 * ```typescript
 * const files = getSortedRotatedFiles('./logs', 'app', '.log');
 * // Returns: ['app-2026-01-15.log.1.gz', 'app-2026-01-16.log.1', ...]
 * ```
 */
export function getSortedRotatedFiles(dir: string, base: string, ext: string): string[] {
    try {
        const allFiles = fs.readdirSync(dir);

        // Filter rotated files (both .gz and uncompressed)
        const rotatedFiles = allFiles.filter(f => {
            const hasDatePattern = f.match(new RegExp(
                `^${escapeRegExp(base)}-\\d{4}-\\d{2}-\\d{2}${escapeRegExp(ext)}\\.\\d+(\\.gz)?$`
            ));
            return hasDatePattern !== null;
        });

        // Sort by date parsed from filename (oldest first)
        const sorted = rotatedFiles.sort((a, b) => {
            const dateA = parseRotatedDate(a, base, ext);
            const dateB = parseRotatedDate(b, base, ext);

            if (!dateA || !dateB) {
                return 0;
            }

            return dateA.getTime() - dateB.getTime();
        });

        return sorted;
    } catch (error) {
        // Directory doesn't exist or can't be read
        return [];
    }
}

/**
 * Calculate file age in days
 *
 * @param date - File date
 * @returns Age in days (rounded down)
 *
 * @remarks
 * Calculates the difference between current UTC date and file date.
 * Used to determine if a file exceeds maxAge threshold.
 *
 * Rounds down using Math.floor - a file that is 1.9 days old
 * is considered 1 day old, not 2 days old.
 *
 * @example
 * ```typescript
 * const fileDate = new Date('2026-01-15T00:00:00.000Z');
 * const age = calculateAgeInDays(fileDate);
 * // Returns: 3 (if current date is 2026-01-18)
 * ```
 */
export function calculateAgeInDays(date: Date): number {
    const now = new Date();
    const msPerDay = 24 * 60 * 60 * 1000;
    const ageMs = now.getTime() - date.getTime();
    return Math.floor(ageMs / msPerDay);
}

/**
 * Delete old log files based on retention policy
 *
 * @param dir - Directory containing log files
 * @param base - Base filename without extension
 * @param ext - File extension (e.g., '.log')
 * @param maxFiles - Maximum number of files to keep
 * @param maxAge - Maximum age of files in days
 * @returns Object with deleted count and any errors encountered
 *
 * @remarks
 * Retention policy: BOTH maxFiles AND maxAge must be satisfied
 * before a file is deleted. This is a conservative approach.
 *
 * Cleanup strategy:
 * 1. Get sorted list of rotated files (oldest first)
 * 2. For each file, check if it exceeds BOTH thresholds
 * 3. Delete file if both conditions met
 * 4. Skip locked files (EBUSY, EPERM) and continue
 * 5. Never delete all files - protect current active file
 *
 * AND logic explanation:
 * - maxFiles = 20 means keep 20 files total
 * - maxAge = 30 means keep files newer than 30 days
 * - File deleted ONLY IF: (index >= maxFiles - 1) AND (age > maxAge)
 * - If file is old but within maxFiles limit: kept
 * - If file exceeds maxFiles but is recent: kept
 * - Both conditions must be true for deletion
 *
 * Best-effort deletion: If a file is locked or can't be deleted,
 * log the error and continue with remaining files.
 *
 * Safety check: Returns immediately if total files <= 1 (only active file exists).
 *
 * @example
 * ```typescript
 * const result = await cleanupOldLogs('./logs', 'app', '.log', 20, 30);
 * // Deletes files that are > 20 in count AND > 30 days old
 * // Returns: { deleted: 5, errors: [] }
 * ```
 */
export async function cleanupOldLogs(
    dir: string,
    base: string,
    ext: string,
    maxFiles: number,
    maxAge: number
): Promise<{ deleted: number; errors: string[] }> {
    const sortedFiles = getSortedRotatedFiles(dir, base, ext);
    const errors: string[] = [];
    let deleted = 0;

    // Add current active file to count (it's not in sortedFiles)
    const totalFiles = sortedFiles.length + 1;

    // Safety check: never delete all files
    if (totalFiles <= 1) {
        return { deleted: 0, errors: [] };
    }

    // Check each file against retention policy
    for (let i = 0; i < sortedFiles.length; i++) {
        const filename = sortedFiles[i];
        const filePath = path.join(dir, filename);

        // Parse date from filename
        const fileDate = parseRotatedDate(filename, base, ext);
        if (!fileDate) {
            continue;
        }

        // Calculate file age
        const ageInDays = calculateAgeInDays(fileDate);

        // Check if file exceeds BOTH thresholds (AND logic)
        const exceedsMaxFiles = i >= (maxFiles - 1);
        const exceedsMaxAge = ageInDays > maxAge;

        if (exceedsMaxFiles && exceedsMaxAge) {
            try {
                await fs.promises.unlink(filePath);
                deleted++;
                console.log(`[FileTransport] Deleted old log: ${filePath}`);
            } catch (error) {
                const err = error as NodeJS.ErrnoException;
                const errorMsg = `Failed to delete ${filePath}: ${err.message}`;
                errors.push(errorMsg);
                console.error(`[FileTransport] ${errorMsg}`);

                // Continue with remaining files (best-effort)
            }
        }
    }

    return { deleted, errors };
}
