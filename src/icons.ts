import type { LogLevel } from './types';

/**
 * Icons for each log level
 * Using Unicode symbols for broad terminal support
 */
export const ICONS: Record<LogLevel, string> = {
    debug: '🔍',
    info: 'ℹ️ ',
    success: '✅',
    warn: '⚠️ ',
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
