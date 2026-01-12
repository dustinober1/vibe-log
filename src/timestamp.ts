import { colorize, FG_BRIGHT_BLACK } from './colors';
import { getConfig } from './config';

/**
 * Format a timestamp for display
 * Supports both time format (HH:MM:SS.mmm) and ISO 8601
 * 
 * @param date - The date to format
 * @returns Formatted and colorized timestamp
 */
export function formatTimestamp(date: Date): string {
    const config = getConfig();

    let timestamp: string;

    if (config.timestampFormat === 'iso') {
        // ISO 8601 format with timezone
        timestamp = date.toISOString();
    } else {
        // Time format: HH:MM:SS.mmm
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const seconds = date.getSeconds().toString().padStart(2, '0');
        const ms = date.getMilliseconds().toString().padStart(3, '0');
        timestamp = `${hours}:${minutes}:${seconds}.${ms}`;
    }

    return colorize(timestamp, [FG_BRIGHT_BLACK], config.useColors);
}
