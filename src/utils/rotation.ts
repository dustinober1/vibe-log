import fs from 'fs';
import path from 'path';

/**
 * Rotation utility functions for time-based log rotation
 *
 * @remarks
 * This module provides utilities for calculating time-based rotation schedules,
 * specifically for daily rotation at midnight UTC, and generating rotated filenames.
 *
 * Using UTC ensures consistent rotation timing regardless of server timezone
 * and avoids Daylight Saving Time complications.
 */

/**
 * Calculate milliseconds until next midnight UTC
 *
 * @returns Milliseconds until next midnight UTC (0-86400000 range)
 *
 * @remarks
 * This function calculates the time difference between the current UTC time
 * and the next midnight UTC. It's used to schedule daily log rotation.
 *
 * UTC is used instead of local time to avoid:
 * - Daylight Saving Time (DST) complications
 * - Timezone inconsistencies across servers
 * - Rotation timing changes when clocks change
 *
 * The calculation handles edge cases automatically:
 * - End of month: getUTCDate() + 1 rolls over to next month
 * - End of year: getUTCMonth() + 1 rolls over, year increments
 * - Year transitions: Date.UTC() handles all date boundaries correctly
 *
 * @example
 * ```typescript
 * // Schedule rotation at midnight UTC
 * const msUntilMidnight = getMsUntilNextMidnightUTC();
 * setTimeout(() => rotateLogFile(), msUntilMidnight);
 * ```
 */
export function getMsUntilNextMidnightUTC(): number {
    const now = new Date();

    // Get current UTC time components
    const currentYear = now.getUTCFullYear();
    const currentMonth = now.getUTCMonth();
    const currentDay = now.getUTCDate();

    // Calculate tomorrow midnight UTC
    // Date.UTC returns milliseconds since epoch for the given UTC date/time
    const tomorrowMidnight = Date.UTC(currentYear, currentMonth, currentDay + 1, 0, 0, 0, 0);

    // Get current time in UTC milliseconds
    const currentTime = Date.UTC(
        currentYear,
        currentMonth,
        currentDay,
        now.getUTCHours(),
        now.getUTCMinutes(),
        now.getUTCSeconds(),
        now.getUTCMilliseconds()
    );

    // Return difference in milliseconds
    return tomorrowMidnight - currentTime;
}

/**
 * Escape special regex characters in a string
 *
 * @param str - String to escape
 * @returns Escaped string safe for use in regex
 *
 * @remarks
 * This function escapes special regex metacharacters to prevent unintended
 * regex behavior when dynamically building patterns.
 *
 * @example
 * ```typescript
 * escapeRegExp('file.txt'); // 'file\\.txt'
 * escapeRegExp('app.log');  // 'app\\.log'
 * ```
 */
function escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
 * This function scans the directory for existing rotated files with the same
 * base name and date, then increments the sequence number accordingly.
 *
 * @example
 * ```typescript
 * generateRotatedName('./logs/app.log');      // './logs/app-2026-01-18.log.1'
 * generateRotatedName('./logs/app.log');      // './logs/app-2026-01-18.log.2' (if .1 exists)
 * generateRotatedName('./logs/error.txt');    // './logs/error-2026-01-18.txt.1'
 * ```
 */
export function generateRotatedName(filePath: string): string {
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
