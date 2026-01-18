import type { LoggerConfig } from './types';

/**
 * Internal configuration type with required core fields
 * Transport-related fields remain optional for backward compatibility
 */
type InternalConfig = Required<Omit<LoggerConfig, 'file' | 'transports' | 'console'>> &
    Pick<LoggerConfig, 'file' | 'transports' | 'console'>;

/**
 * Default configuration for the logger
 */
const defaultConfig: InternalConfig = {
    level: 'debug',
    showTimestamp: true,
    showIcons: true,
    useColors: true,
    maxDepth: 10,
    timestampFormat: 'time', // 'time' or 'iso'
    file: undefined,
    transports: undefined,
    console: true,
};

/**
 * Current global configuration
 */
let currentConfig: InternalConfig = { ...defaultConfig };

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
export function configure(config: Partial<LoggerConfig>): LoggerConfig {
    currentConfig = { ...currentConfig, ...config };
    return { ...currentConfig };
}

/**
 * Get the current global configuration
 *
 * @returns A copy of the current configuration
 */
export function getConfig(): LoggerConfig {
    return { ...currentConfig };
}

/**
 * Reset configuration to defaults
 */
export function resetConfig(): void {
    currentConfig = { ...defaultConfig };
}
