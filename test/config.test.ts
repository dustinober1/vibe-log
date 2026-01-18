import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { configure, getConfig, resetConfig } from '../src/config';
import { log } from '../src/logger';
import fs from 'fs';
import path from 'path';

describe('config', () => {
    beforeEach(() => {
        // Reset to defaults before each test
        resetConfig();
    });

    describe('configure', () => {
        it('should merge partial configuration with defaults', () => {
            const result = configure({ level: 'warn' });

            expect(result.level).toBe('warn');
            expect(result.showTimestamp).toBe(true); // default
            expect(result.useColors).toBe(true); // default
        });

        it('should update multiple settings at once', () => {
            const result = configure({
                level: 'error',
                showTimestamp: false,
                useColors: false,
            });

            expect(result.level).toBe('error');
            expect(result.showTimestamp).toBe(false);
            expect(result.useColors).toBe(false);
        });

        it('should return a copy of the configuration', () => {
            const result = configure({ level: 'info' });
            result.level = 'debug';

            const current = getConfig();
            expect(current.level).toBe('info'); // should not be affected
        });

        it('should persist configuration across calls', () => {
            configure({ level: 'warn' });
            configure({ showTimestamp: false });

            const result = getConfig();
            expect(result.level).toBe('warn');
            expect(result.showTimestamp).toBe(false);
        });
    });

    describe('getConfig', () => {
        it('should return current configuration', () => {
            configure({ level: 'error', maxDepth: 5 });

            const result = getConfig();
            expect(result.level).toBe('error');
            expect(result.maxDepth).toBe(5);
        });

        it('should return a copy to prevent external mutation', () => {
            const config1 = getConfig();
            config1.level = 'error';

            const config2 = getConfig();
            expect(config2.level).toBe('debug'); // should still be default
        });
    });

    describe('resetConfig', () => {
        it('should reset configuration to defaults', () => {
            configure({
                level: 'error',
                showTimestamp: false,
                useColors: false,
                maxDepth: 3,
            });

            resetConfig();

            const result = getConfig();
            expect(result.level).toBe('debug');
            expect(result.showTimestamp).toBe(true);
            expect(result.useColors).toBe(true);
            expect(result.maxDepth).toBe(10);
        });
    });

    describe('configuration options', () => {
        it('should support all log levels', () => {
            const levels: Array<'debug' | 'info' | 'success' | 'warn' | 'error'> = [
                'debug', 'info', 'success', 'warn', 'error'
            ];

            levels.forEach(level => {
                configure({ level });
                expect(getConfig().level).toBe(level);
            });
        });

        it('should support timestamp format options', () => {
            configure({ timestampFormat: 'iso' });
            expect(getConfig().timestampFormat).toBe('iso');

            configure({ timestampFormat: 'time' });
            expect(getConfig().timestampFormat).toBe('time');
        });

        it('should support boolean flags', () => {
            configure({
                showTimestamp: false,
                showIcons: false,
                useColors: false,
            });

            const result = getConfig();
            expect(result.showTimestamp).toBe(false);
            expect(result.showIcons).toBe(false);
            expect(result.useColors).toBe(false);
        });

        it('should support maxDepth configuration', () => {
            configure({ maxDepth: 15 });
            expect(getConfig().maxDepth).toBe(15);
        });
    });

    describe('rotation configuration', () => {
        const testLogsDir = './test-logs-config-rotation';

        afterEach(() => {
            // Clean up test log directory
            try {
                if (fs.existsSync(testLogsDir)) {
                    fs.rmSync(testLogsDir, { recursive: true, force: true });
                }
            } catch (error) {
                // Ignore cleanup errors
            }
            // Reset config after each test
            resetConfig();
        });

        it('should configure daily rotation pattern', () => {
            configure({
                file: path.join(testLogsDir, 'config-daily.log'),
                rotation: { pattern: 'daily' }
            });

            const config = getConfig();
            expect(config.file).toBe(path.join(testLogsDir, 'config-daily.log'));
            expect(config.rotation?.pattern).toBe('daily');
        });

        it('should configure hybrid rotation with pattern and maxSize', () => {
            configure({
                file: path.join(testLogsDir, 'config-hybrid.log'),
                rotation: {
                    pattern: 'daily',
                    maxSize: '50MB'
                }
            });

            const config = getConfig();
            expect(config.rotation?.pattern).toBe('daily');
            expect(config.rotation?.maxSize).toBe('50MB');
        });

        it('should continue to support maxSize-only rotation config', () => {
            configure({
                file: path.join(testLogsDir, 'config-size.log'),
                rotation: { maxSize: '100MB' }
            });

            const config = getConfig();
            expect(config.rotation?.maxSize).toBe('100MB');
            expect(config.rotation?.pattern).toBeUndefined();
        });

        it('should create file transport without rotation when not configured', () => {
            configure({
                file: path.join(testLogsDir, 'config-no-rotation.log')
            });

            const config = getConfig();
            expect(config.file).toBe(path.join(testLogsDir, 'config-no-rotation.log'));
            expect(config.rotation).toBeUndefined();
        });

        it('should create FileTransport with daily pattern and log successfully', () => {
            configure({
                file: path.join(testLogsDir, 'daily-pattern.log'),
                rotation: { pattern: 'daily' }
            });

            expect(() => log.info('test', 'Test message with daily pattern')).not.toThrow();
        });

        it('should create FileTransport with hybrid rotation and log successfully', () => {
            configure({
                file: path.join(testLogsDir, 'hybrid-rotation.log'),
                rotation: {
                    pattern: 'daily',
                    maxSize: '10KB'
                }
            });

            expect(() => log.info('test', 'Test message with hybrid rotation')).not.toThrow();
        });

        it('should maintain backward compatibility with maxSize-only rotation', () => {
            configure({
                file: path.join(testLogsDir, 'size-only.log'),
                rotation: { maxSize: '10KB' }
            });

            expect(() => log.info('test', 'Test message with size-only rotation')).not.toThrow();
        });

        it('should work without any rotation config', () => {
            configure({
                file: path.join(testLogsDir, 'no-rotation.log')
            });

            expect(() => log.info('test', 'Test message without rotation')).not.toThrow();
        });
    });
});
