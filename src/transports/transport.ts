import type { LogEntry, LoggerConfig } from '../types';

/**
 * Transport interface for log output destinations
 *
 * Transports receive formatted log strings and raw log entries,
 * enabling both simple output (write formatted string) and
 * advanced processing (analyze raw entry for custom formatting).
 */
export interface Transport {
    /**
     * Write a log entry to this transport
     *
     * @param formatted - Formatted log string (with colors, icons, etc.)
     * @param entry - Raw log entry for custom formatting if needed
     * @param config - Current logger configuration (colors, icons, etc.)
     *
     * @remarks
     * This method MUST be synchronous. If a transport needs async
     * operations (e.g., network requests), it should handle them
     * internally without blocking the log call.
     *
     * This method MUST NOT throw. Errors should be caught and
     * handled gracefully. For production error handling, transports
     * should:
     * - Emit 'error' events for monitoring
     * - Log to console.error as fallback
     * - Never crash the application
     */
    log(formatted: string, entry: LogEntry, config: LoggerConfig): void;

    /**
     * Optional cleanup method for releasing resources
     *
     * Called when logger is destroyed or transport is removed.
     * Implement for transports that allocate resources (file handles,
     * network connections, etc.).
     *
     * @returns Promise that resolves when cleanup is complete
     *
     * @remarks
     * This method is optional. Transports that don't allocate resources
     * (e.g., console transport) can omit it.
     *
     * Users should call this during application shutdown to ensure
     * all logs are flushed and resources are released.
     */
    close?(): Promise<void> | void;
}
