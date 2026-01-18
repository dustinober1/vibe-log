import type { Transport } from './transport';
import type { LogEntry, LoggerConfig } from '../types';

/**
 * Console transport for writing logs to standard output
 *
 * Maps log levels to appropriate console methods (log, warn, error, debug).
 * This is the default transport for backward compatibility.
 */
export class ConsoleTransport implements Transport {
    /**
     * Write a log entry to the console
     *
     * @param formatted - Formatted log string (with colors, icons, etc.)
     * @param entry - Raw log entry (used to determine console method)
     * @param config - Logger config (not used, formatter already applied)
     *
     * @remarks
     * This method maps log levels to console methods:
     * - error -> console.error
     * - warn -> console.warn
     * - debug -> console.debug
     * - info/success -> console.log
     *
     * The formatted string already contains colors, icons, and formatting
     * from the formatter, so this transport only needs to route to the
     * appropriate console method.
     */
    log(formatted: string, entry: LogEntry, config: LoggerConfig): void {
        // Map levels to console methods (same pattern as existing logger.ts)
        switch (entry.level) {
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
                // info and success both use console.log
                console.log(formatted);
        }
    }

    /**
     * No-op cleanup method (console has no resources to release)
     *
     * @remarks
     * Console transport doesn't allocate resources, so this is a no-op.
     * Included for interface compatibility.
     */
    close(): void {
        // No resources to release
    }
}
