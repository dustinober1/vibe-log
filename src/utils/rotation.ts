/**
 * Rotation utility functions for time-based log rotation
 *
 * @remarks
 * This module provides utilities for calculating time-based rotation schedules,
 * specifically for daily rotation at midnight UTC.
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
