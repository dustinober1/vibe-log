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

// Default export for convenience
import { log } from './logger';
export default log;

// Version constant
export const VERSION = '1.0.0';
