import type { LogLevel } from './types';
import * as colors from './colors';

/**
 * Color configuration for each log level
 */
export const LEVEL_COLORS: Record<LogLevel, string[]> = {
    debug: [colors.FG_BRIGHT_BLACK],
    info: [colors.FG_CYAN],
    success: [colors.FG_GREEN, colors.BOLD],
    warn: [colors.FG_YELLOW, colors.BOLD],
    error: [colors.FG_RED, colors.BOLD],
};

/**
 * Priority order for log levels (lower = less priority)
 * Used for filtering logs
 */
export const LEVEL_PRIORITY: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    success: 2,
    warn: 3,
    error: 4,
};

/**
 * Check if a log level should be displayed based on minimum level
 * 
 * @param level - The log level to check
 * @param minLevel - The minimum level to display
 * @returns true if the level should be displayed
 */
export function shouldLog(level: LogLevel, minLevel: LogLevel): boolean {
    return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[minLevel];
}
