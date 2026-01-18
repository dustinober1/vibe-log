import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConsoleTransport } from '../src/transports/console-transport';
import type { LogEntry, LoggerConfig } from '../src/types';

describe('ConsoleTransport', () => {
    beforeEach(() => {
        // Mock console methods
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'debug').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('log', () => {
        it('should use console.log for info level', () => {
            const transport = new ConsoleTransport();

            const entry: LogEntry = {
                level: 'info',
                context: 'Test',
                message: 'Test message',
                timestamp: new Date(),
            };

            const config: LoggerConfig = {
                level: 'debug',
                showTimestamp: true,
                showIcons: true,
                useColors: true,
                maxDepth: 10,
                timestampFormat: 'time',
            };

            transport.log('INFO  [Test] Test message', entry, config);

            expect(console.log).toHaveBeenCalledTimes(1);
            expect(console.log).toHaveBeenCalledWith('INFO  [Test] Test message');
        });

        it('should use console.log for success level', () => {
            const transport = new ConsoleTransport();

            const entry: LogEntry = {
                level: 'success',
                context: 'Test',
                message: 'Success message',
                timestamp: new Date(),
            };

            const config: LoggerConfig = {
                level: 'debug',
                showTimestamp: true,
                showIcons: true,
                useColors: true,
                maxDepth: 10,
                timestampFormat: 'time',
            };

            transport.log('SUCCESS [Test] Success message', entry, config);

            expect(console.log).toHaveBeenCalledTimes(1);
            expect(console.log).toHaveBeenCalledWith('SUCCESS [Test] Success message');
        });

        it('should use console.warn for warn level', () => {
            const transport = new ConsoleTransport();

            const entry: LogEntry = {
                level: 'warn',
                context: 'Test',
                message: 'Warning message',
                timestamp: new Date(),
            };

            const config: LoggerConfig = {
                level: 'debug',
                showTimestamp: true,
                showIcons: true,
                useColors: true,
                maxDepth: 10,
                timestampFormat: 'time',
            };

            transport.log('WARN   [Test] Warning message', entry, config);

            expect(console.warn).toHaveBeenCalledTimes(1);
            expect(console.warn).toHaveBeenCalledWith('WARN   [Test] Warning message');
        });

        it('should use console.error for error level', () => {
            const transport = new ConsoleTransport();

            const entry: LogEntry = {
                level: 'error',
                context: 'Test',
                message: 'Error message',
                timestamp: new Date(),
            };

            const config: LoggerConfig = {
                level: 'debug',
                showTimestamp: true,
                showIcons: true,
                useColors: true,
                maxDepth: 10,
                timestampFormat: 'time',
            };

            transport.log('ERROR [Test] Error message', entry, config);

            expect(console.error).toHaveBeenCalledTimes(1);
            expect(console.error).toHaveBeenCalledWith('ERROR [Test] Error message');
        });

        it('should use console.debug for debug level', () => {
            const transport = new ConsoleTransport();

            const entry: LogEntry = {
                level: 'debug',
                context: 'Test',
                message: 'Debug message',
                timestamp: new Date(),
            };

            const config: LoggerConfig = {
                level: 'debug',
                showTimestamp: true,
                showIcons: true,
                useColors: true,
                maxDepth: 10,
                timestampFormat: 'time',
            };

            transport.log('DEBUG  [Test] Debug message', entry, config);

            expect(console.debug).toHaveBeenCalledTimes(1);
            expect(console.debug).toHaveBeenCalledWith('DEBUG  [Test] Debug message');
        });
    });

    describe('close', () => {
        it('should be a no-op', () => {
            const transport = new ConsoleTransport();

            expect(() => transport.close()).not.toThrow();
            expect(transport.close()).toBeUndefined();
        });
    });
});
