import { colorize, FG_BRIGHT_BLACK } from './colors';

/**
 * Format a timestamp for display
 * Format: HH:MM:SS.mmm
 */
export function formatTimestamp(date: Date): string {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const ms = date.getMilliseconds().toString().padStart(3, '0');

    const timestamp = `${hours}:${minutes}:${seconds}.${ms}`;
    return colorize(timestamp, FG_BRIGHT_BLACK);
}
