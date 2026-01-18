import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { configure, getConfig, resetConfig } from '../src/config';
import { log } from '../src/logger';
import { generateRotatedName } from '../src/utils/rotation';
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

        it('should pass compressionLevel to FileTransport', () => {
            configure({
                file: path.join(testLogsDir, 'compression.log'),
                rotation: { compressionLevel: 9 }
            });

            const config = getConfig();
            expect(config.rotation?.compressionLevel).toBe(9);

            // Verify the transport was created and can log
            expect(() => log.info('test', 'Test message with compression')).not.toThrow();
        });

        it('should pass maxFiles and maxAge to FileTransport', () => {
            configure({
                file: path.join(testLogsDir, 'retention.log'),
                rotation: { maxFiles: 10, maxAge: 7 }
            });

            const config = getConfig();
            expect(config.rotation?.maxFiles).toBe(10);
            expect(config.rotation?.maxAge).toBe(7);

            // Verify the transport was created and can log
            expect(() => log.info('test', 'Test message with retention')).not.toThrow();
        });
    });

    describe('generateRotatedName verification (FILE-01 and FILE-02)', () => {
        const testDir = './test-logs-generateRotatedName';

        afterEach(() => {
            // Clean up test directory
            try {
                if (fs.existsSync(testDir)) {
                    fs.rmSync(testDir, { recursive: true, force: true });
                }
            } catch (error) {
                // Ignore cleanup errors
            }
        });

        it('should generate date-stamped filenames for rotated files (FILE-01)', () => {
            const baseName = path.join(testDir, 'app.log');

            const rotatedName = generateRotatedName(baseName);

            // Verify format: app-YYYY-MM-DD.log.1 (or .2, .3, etc.)
            expect(rotatedName).toMatch(/app-\d{4}-\d{2}-\d{2}\.log\.\d+$/);
            expect(rotatedName).not.toBe(baseName); // Rotated name is different from active
            expect(rotatedName).toContain(path.join(testDir, 'app-')); // Contains path and date-stamped format
        });

        it('should generate different names for different sequence numbers', () => {
            const baseName = path.join(testDir, 'app.log');

            // Create test directory
            fs.mkdirSync(testDir, { recursive: true });

            // Get current date string for consistent testing
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0];

            // Create an existing rotated file
            fs.writeFileSync(path.join(testDir, `app-${dateStr}.log.1`), '');

            // Now generate a new name - should get sequence 2
            const rotatedName = generateRotatedName(baseName);

            // Should have sequence 2 since .1 already exists
            expect(rotatedName).toMatch(/app-\d{4}-\d{2}-\d{2}\.log\.2$/);
        });

        it('should handle different file extensions correctly', () => {
            const logFile = path.join(testDir, 'app.log');
            const txtFile = path.join(testDir, 'error.txt');
            const jsonFile = path.join(testDir, 'output.json');

            const rotatedLog = generateRotatedName(logFile);
            const rotatedTxt = generateRotatedName(txtFile);
            const rotatedJson = generateRotatedName(jsonFile);

            expect(rotatedLog).toMatch(/app-\d{4}-\d{2}-\d{2}\.log\.\d+$/);
            expect(rotatedTxt).toMatch(/error-\d{4}-\d{2}-\d{2}\.txt\.\d+$/);
            expect(rotatedJson).toMatch(/output-\d{4}-\d{2}-\d{2}\.json\.\d+$/);
        });

        it('should increment sequence number for same-day rotations', () => {
            const baseName = path.join(testDir, 'app.log');

            // Create test directory and simulate existing rotated files
            fs.mkdirSync(testDir, { recursive: true });

            // Get current date string for consistent testing
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0];

            // Create existing rotated files
            fs.writeFileSync(path.join(testDir, `app-${dateStr}.log.1`), '');
            fs.writeFileSync(path.join(testDir, `app-${dateStr}.log.2`), '');

            const rotatedName = generateRotatedName(baseName);

            // Should be .3 since .1 and .2 already exist
            expect(rotatedName).toMatch(/app-\d{4}-\d{2}-\d{2}\.log\.3$/);
        });

        it('should use sequence 1 when no existing rotated files', () => {
            const baseName = path.join(testDir, 'app.log');

            // Create test directory (but no existing rotated files)
            fs.mkdirSync(testDir, { recursive: true });

            const rotatedName = generateRotatedName(baseName);

            // Should be .1 since no existing files
            expect(rotatedName).toMatch(/app-\d{4}-\d{2}-\d{2}\.log\.1$/);
        });

        it('should handle paths with multiple directories', () => {
            const baseName = path.join(testDir, 'nested/deep/app.log');

            const rotatedName = generateRotatedName(baseName);

            // Should preserve the directory structure
            expect(rotatedName).toContain(path.join(testDir, 'nested/deep'));
            expect(rotatedName).toMatch(/app-\d{4}-\d{2}-\d{2}\.log\.\d+$/);
        });

        it('should handle files with no extension', () => {
            const baseName = path.join(testDir, 'server');

            const rotatedName = generateRotatedName(baseName);

            // Should handle missing extension
            expect(rotatedName).toMatch(/server-\d{4}-\d{2}-\d{2}\.\d+$/);
        });

        it('should handle files with multiple extensions', () => {
            const baseName = path.join(testDir, 'app.tar.gz');

            const rotatedName = generateRotatedName(baseName);

            // Should use the last extension
            expect(rotatedName).toMatch(/app\.tar-\d{4}-\d{2}-\d{2}\.gz\.\d+$/);
        });
    });
});
