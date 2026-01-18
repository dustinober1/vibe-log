import type { LoggerConfig } from './types';
import { FileTransport } from './transports/file-transport';
import { ConsoleTransport } from './transports/console-transport';

/**
 * Internal configuration type with required core fields
 * Transport-related fields remain optional for backward compatibility
 */
type InternalConfig = Required<Omit<LoggerConfig, 'file' | 'transports' | 'console' | 'rotation'>> &
    Pick<LoggerConfig, 'file' | 'transports' | 'console' | 'rotation'>;

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
    console: true,
    file: undefined,
    transports: undefined,
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
 *
 * // Use file shorthand
 * configure({ file: './app.log' });
 *
 * // Use file shorthand with rotation
 * configure({ file: './app.log', rotation: { maxSize: '100MB' } });
 *
 * // Configure explicit transports
 * configure({ transports: [new FileTransport('./app.log')] });
 * ```
 */
export function configure(config: Partial<LoggerConfig>): LoggerConfig {
    // File shorthand: convert file string to FileTransport
    // Note: Rotation config only applies to file shorthand (config.file).
    // For custom FileTransport instances, pass options directly to constructor:
    // new FileTransport('./app.log', { maxSize: '100MB' })
    if (config.file && !config.transports) {
        const { file, rotation } = config;

        // Build FileTransport options if rotation config provided
        const fileTransportOptions: { maxSize?: string | number } = {};

        if (rotation?.maxSize) {
            fileTransportOptions.maxSize = rotation.maxSize;
        }

        // Only pass options if rotation config was provided
        const fileTransport = new FileTransport(
            file,
            Object.keys(fileTransportOptions).length > 0 ? fileTransportOptions : undefined
        );
        config.transports = [fileTransport];
    }

    // Handle transports configuration
    if (config.transports !== undefined) {
        // User provided explicit transports array
        currentConfig.transports = config.transports;
    }

    // Handle console flag
    if (config.console !== undefined) {
        currentConfig.console = config.console;
        // Rebuild default transports if no explicit transports were set
        // This ensures console: false clears the default ConsoleTransport
        if (!config.transports && !config.file) {
            buildDefaultTransports();
        }
    }

    // Merge all other config fields (including file)
    const { transports, console: _console, ...otherConfig } = config;
    currentConfig = { ...currentConfig, ...otherConfig };

    // Build default transports if none set
    if (!currentConfig.transports) {
        buildDefaultTransports();
    }

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
    buildDefaultTransports();
}

/**
 * Build default transports array based on console setting
 */
function buildDefaultTransports(): void {
    if (currentConfig.console) {
        currentConfig.transports = [new ConsoleTransport()];
    } else {
        currentConfig.transports = [];
    }
}

// Initialize default transports on module load
buildDefaultTransports();
