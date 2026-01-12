import type { LoggerConfig } from './types';

/**
 * Default configuration for the logger
 */
const defaultConfig: Required<LoggerConfig> = {
    level: 'debug',
    showTimestamp: true,
    showIcons: true,
    useColors: true,
    maxDepth: 10,
    timestampFormat: 'time', // 'time' or 'iso'
};

/**
 * Current global configuration
 */
let currentConfig: Required<LoggerConfig> = { ...defaultConfig };

/**
 * Configure the global logger settings
 * 
 * @param config - Partial configuration to merge with current settings
 * @returns The updated configuration
 * 
 * @example
 * ```typescript
 * import { configure } from 'log-vibe';
 * 
 * // Disable colors in CI environments
 * configure({ useColors: false });
 * 
 * // Hide timestamps
 * configure({ showTimestamp: false });
 * 
 * // Set minimum log level
 * configure({ level: 'warn' });
 * ```
 */
export function configure(config: Partial<LoggerConfig>): Required<LoggerConfig> {
    currentConfig = { ...currentConfig, ...config };
    return { ...currentConfig };
}

/**
 * Get the current global configuration
 * 
 * @returns A copy of the current configuration
 */
export function getConfig(): Required<LoggerConfig> {
    return { ...currentConfig };
}

/**
 * Reset configuration to defaults
 */
export function resetConfig(): void {
    currentConfig = { ...defaultConfig };
}
