import type { LogEntry } from './types';
import { ICONS } from './icons';
import { LEVEL_COLORS } from './levels';
import { formatTimestamp } from './timestamp';
import { prettyPrint } from './prettyPrint';
import { colorize, BOLD, DIM } from './colors';

/**
 * Format a log entry for console output
 */
export function formatLogEntry(entry: LogEntry): string {
    const parts: string[] = [];

    // Timestamp
    parts.push(formatTimestamp(entry.timestamp));

    // Icon
    parts.push(ICONS[entry.level]);

    // Level badge
    const levelText = entry.level.toUpperCase().padEnd(7);
    parts.push(colorize(levelText, ...LEVEL_COLORS[entry.level]));

    // Context (in brackets)
    const contextText = `[${entry.context}]`;
    parts.push(colorize(contextText, BOLD, DIM));

    // Message
    parts.push(entry.message);

    // Join main line
    let output = parts.join(' ');

    // Additional data
    if (entry.data && entry.data.length > 0) {
        for (const item of entry.data) {
            output += '\n' + prettyPrint(item);
        }
    }

    return output;
}
