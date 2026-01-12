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
