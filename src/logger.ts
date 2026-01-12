import type { Logger, ScopedLogger, LogLevel, LogEntry } from './types';
import { formatLogEntry } from './formatter';
import { getConfig } from './config';
import { shouldLog } from './levels';

/**
 * Create a log entry and output it to console
 * 
 * @param level - The log level
 * @param context - The context/module name
 * @param message - The log message
 * @param data - Additional data to log
 * @throws Error if context or message is empty
 */
function writeLog(
    level: LogLevel,
    context: string,
    message: string,
    data?: unknown[]
): void {
    // Input validation
    if (!context || !context.trim()) {
        throw new Error('Context cannot be empty or whitespace');
    }

    if (!message || !message.trim()) {
        throw new Error('Message cannot be empty or whitespace');
    }

    // Check if this level should be logged
    const config = getConfig();
    if (!shouldLog(level, config.level)) {
        return;
    }

    const entry: LogEntry = {
        level,
        context,
        message,
        data,
        timestamp: new Date(),
    };

    const formatted = formatLogEntry(entry);

    // Use appropriate console method for each level
    switch (level) {
        case 'error':
            console.error(formatted);
            break;
        case 'warn':
            console.warn(formatted);
            break;
        case 'debug':
            console.debug(formatted);
            break;
        default:
            console.log(formatted);
    }
}

/**
 * The main logger object
 * 
 * @example
 * ```typescript
 * import log from 'log-vibe';
 * 
 * log.info('App', 'Application started');
 * log.success('Database', 'Connected successfully');
 * log.warn('Cache', 'Cache miss for user_123');
 * log.error('API', 'Request failed', { status: 500 });
 * ```
 */
export const log: Logger = {
    /**
     * Log debug information
     * @param context - The context/module name
     * @param message - The log message
     * @param data - Additional data to log
     */
    debug(context: string, message: string, ...data: unknown[]): void {
        writeLog('debug', context, message, data.length > 0 ? data : undefined);
    },

    /**
     * Log general information
     * @param context - The context/module name
     * @param message - The log message
     * @param data - Additional data to log
     */
    info(context: string, message: string, ...data: unknown[]): void {
        writeLog('info', context, message, data.length > 0 ? data : undefined);
    },

    /**
     * Log success messages
     * @param context - The context/module name
     * @param message - The log message
     * @param data - Additional data to log
     */
    success(context: string, message: string, ...data: unknown[]): void {
        writeLog('success', context, message, data.length > 0 ? data : undefined);
    },

    /**
     * Log warnings
     * @param context - The context/module name
     * @param message - The log message
     * @param data - Additional data to log
     */
    warn(context: string, message: string, ...data: unknown[]): void {
        writeLog('warn', context, message, data.length > 0 ? data : undefined);
    },

    /**
     * Log errors
     * @param context - The context/module name
     * @param message - The log message
     * @param data - Additional data to log
     */
    error(context: string, message: string, ...data: unknown[]): void {
        writeLog('error', context, message, data.length > 0 ? data : undefined);
    },
};

/**
 * Create a scoped logger with pre-bound context
 * 
 * @param context - The context to bind to all log calls
 * @returns A scoped logger instance
 * 
 * @example
 * ```typescript
 * import { createScope } from 'log-vibe';
 * 
 * const dbLog = createScope('Database');
 * dbLog.info('Connection established');
 * dbLog.success('Migration complete');
 * dbLog.error('Query failed', { table: 'users' });
 * ```
 */
export function createScope(context: string): ScopedLogger {
    return {
        /**
         * Log debug information
         * @param message - The log message
         * @param data - Additional data to log
         */
        debug(message: string, ...data: unknown[]): void {
            log.debug(context, message, ...data);
        },

        /**
         * Log general information
         * @param message - The log message
         * @param data - Additional data to log
         */
        info(message: string, ...data: unknown[]): void {
            log.info(context, message, ...data);
        },

        /**
         * Log success messages
         * @param message - The log message
         * @param data - Additional data to log
         */
        success(message: string, ...data: unknown[]): void {
            log.success(context, message, ...data);
        },

        /**
         * Log warnings
         * @param message - The log message
         * @param data - Additional data to log
         */
        warn(message: string, ...data: unknown[]): void {
            log.warn(context, message, ...data);
        },

        /**
         * Log errors
         * @param message - The log message
         * @param data - Additional data to log
         */
        error(message: string, ...data: unknown[]): void {
            log.error(context, message, ...data);
        },
    };
}
