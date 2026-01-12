import type { Logger, ScopedLogger, LogLevel, LogEntry } from './types';
import { formatLogEntry } from './formatter';

/**
 * Create a log entry and output it to console
 */
function writeLog(
    level: LogLevel,
    context: string,
    message: string,
    data?: unknown[]
): void {
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
 */
export const log: Logger = {
    debug(context: string, message: string, ...data: unknown[]): void {
        writeLog('debug', context, message, data.length > 0 ? data : undefined);
    },

    info(context: string, message: string, ...data: unknown[]): void {
        writeLog('info', context, message, data.length > 0 ? data : undefined);
    },

    success(context: string, message: string, ...data: unknown[]): void {
        writeLog('success', context, message, data.length > 0 ? data : undefined);
    },

    warn(context: string, message: string, ...data: unknown[]): void {
        writeLog('warn', context, message, data.length > 0 ? data : undefined);
    },

    error(context: string, message: string, ...data: unknown[]): void {
        writeLog('error', context, message, data.length > 0 ? data : undefined);
    },
};

/**
 * Create a scoped logger with pre-bound context
 */
export function createScope(context: string): ScopedLogger {
    return {
        debug(message: string, ...data: unknown[]): void {
            log.debug(context, message, ...data);
        },

        info(message: string, ...data: unknown[]): void {
            log.info(context, message, ...data);
        },

        success(message: string, ...data: unknown[]): void {
            log.success(context, message, ...data);
        },

        warn(message: string, ...data: unknown[]): void {
            log.warn(context, message, ...data);
        },

        error(message: string, ...data: unknown[]): void {
            log.error(context, message, ...data);
        },
    };
}
