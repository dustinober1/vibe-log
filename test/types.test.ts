import { describe, it, expect } from 'vitest';
import type { LogLevel, LogEntry, LoggerConfig, Logger, ScopedLogger } from '../src/types';

describe('types', () => {
    describe('LogLevel', () => {
        it('should accept all valid log levels', () => {
            const levels: LogLevel[] = ['debug', 'info', 'success', 'warn', 'error'];
            expect(levels).toHaveLength(5);
        });
    });

    describe('LogEntry', () => {
        it('should create a valid log entry', () => {
            const entry: LogEntry = {
                level: 'info',
                context: 'Test',
                message: 'Test message',
                timestamp: new Date(),
            };

            expect(entry.level).toBe('info');
            expect(entry.context).toBe('Test');
            expect(entry.message).toBe('Test message');
            expect(entry.timestamp).toBeInstanceOf(Date);
        });

        it('should support optional data field', () => {
            const entry: LogEntry = {
                level: 'debug',
                context: 'Test',
                message: 'Test message',
                data: [{ foo: 'bar' }],
                timestamp: new Date(),
            };

            expect(entry.data).toBeDefined();
            expect(entry.data).toHaveLength(1);
        });
    });

    describe('LoggerConfig', () => {
        it('should create a valid config with all fields', () => {
            const config: LoggerConfig = {
                level: 'warn',
                showTimestamp: false,
                showIcons: true,
                useColors: false,
                maxDepth: 5,
                timestampFormat: 'iso',
            };

            expect(config.level).toBe('warn');
            expect(config.showTimestamp).toBe(false);
            expect(config.showIcons).toBe(true);
            expect(config.useColors).toBe(false);
            expect(config.maxDepth).toBe(5);
            expect(config.timestampFormat).toBe('iso');
        });

        it('should support partial config', () => {
            const config: LoggerConfig = {
                level: 'error',
            };

            expect(config.level).toBe('error');
        });

        it('should support empty config', () => {
            const config: LoggerConfig = {};
            expect(config).toBeDefined();
        });
    });

    describe('Logger interface', () => {
        it('should define all required methods', () => {
            const mockLogger: Logger = {
                debug: () => { },
                info: () => { },
                success: () => { },
                warn: () => { },
                error: () => { },
            };

            expect(mockLogger.debug).toBeDefined();
            expect(mockLogger.info).toBeDefined();
            expect(mockLogger.success).toBeDefined();
            expect(mockLogger.warn).toBeDefined();
            expect(mockLogger.error).toBeDefined();
        });
    });

    describe('ScopedLogger interface', () => {
        it('should define all required methods', () => {
            const mockScopedLogger: ScopedLogger = {
                debug: () => { },
                info: () => { },
                success: () => { },
                warn: () => { },
                error: () => { },
            };

            expect(mockScopedLogger.debug).toBeDefined();
            expect(mockScopedLogger.info).toBeDefined();
            expect(mockScopedLogger.success).toBeDefined();
            expect(mockScopedLogger.warn).toBeDefined();
            expect(mockScopedLogger.error).toBeDefined();
        });
    });
});
