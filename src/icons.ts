import type { LogLevel } from './types';
import { supportsColor } from './colors';

/**
 * Icons for each log level
 * Using Unicode symbols for broad terminal support
 */
export const ICONS: Record<LogLevel, string> = {
    debug: '🔍',
    info: 'ℹ️',
    success: '✅',
    warn: '⚠️',
    error: '❌',
};

/**
 * Fallback ASCII icons for terminals without Unicode support
 */
export const ASCII_ICONS: Record<LogLevel, string> = {
    debug: '[DBG]',
    info: '[INF]',
    success: '[OK!]',
    warn: '[WRN]',
    error: '[ERR]',
};

/**
 * Get the appropriate icon for a log level
 * Uses Unicode icons if colors are supported, ASCII otherwise
 * 
 * @param level - The log level
 * @param useColors - Override color detection
 * @returns The icon string
 */
export function getIcon(level: LogLevel, useColors?: boolean): string {
    const shouldUseUnicode = useColors ?? supportsColor();
    return shouldUseUnicode ? ICONS[level] : ASCII_ICONS[level];
}
