import type { LogEntry } from './types';
import { getIcon } from './icons';
import { LEVEL_COLORS } from './levels';
import { formatTimestamp } from './timestamp';
import { prettyPrint } from './prettyPrint';
import { colorize, BOLD, DIM } from './colors';
import { getConfig } from './config';

/**
 * Format a log entry for console output
 * 
 * @param entry - The log entry to format
 * @returns Formatted string ready for console output
 */
export function formatLogEntry(entry: LogEntry): string {
    const config = getConfig();
    const parts: string[] = [];

    // Timestamp (if enabled)
    if (config.showTimestamp) {
        parts.push(formatTimestamp(entry.timestamp));
    }

    // Icon (if enabled)
    if (config.showIcons) {
        parts.push(getIcon(entry.level, config.useColors));
    }

    // Level badge
    const levelText = entry.level.toUpperCase().padEnd(7);
    parts.push(colorize(levelText, LEVEL_COLORS[entry.level], config.useColors));

    // Context (in brackets)
    const contextText = `[${entry.context}]`;
    parts.push(colorize(contextText, [BOLD, DIM], config.useColors));

    // Message
    parts.push(entry.message);

    // Join main line
    let output = parts.join(' ');

    // Additional data (optimized string concatenation)
    if (entry.data && entry.data.length > 0) {
        const dataParts = entry.data.map(item => prettyPrint(item));
        output += '\n' + dataParts.join('\n');
    }

    return output;
}
