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

// Export transport types and classes
export type { Transport } from './transports/transport';
export { FileTransport, ConsoleTransport } from './transports';

// Export error handling utilities
export type { FileTransportOptions } from './transports/file-transport';
export { ErrorClass, classifyError } from './transports/file-transport';

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
