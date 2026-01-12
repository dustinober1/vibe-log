/**
 * log-vibe
 * Beautiful, simple, contextual logging for the modern developer
 * 
 * @packageDocumentation
 */

// Export types
export type {
    LogLevel,
    LogEntry,
    LoggerConfig,
    Logger,
    ScopedLogger,
} from './types';

// Export main logger
export { log, createScope } from './logger';

// Export configuration
export { configure, getConfig } from './config';

// Default export for convenience
import { log } from './logger';
export default log;

// Version constant from package.json
import packageJson from '../package.json';

/**
 * Current version of log-vibe
 * @constant
 */
export const VERSION = packageJson.version;
