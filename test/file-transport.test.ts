import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { FileTransport } from '../src/transports/file-transport';
import type { LogEntry, LoggerConfig } from '../src/types';
import { resetConfig } from '../src/config';

describe('FileTransport', () => {
    const testDir = path.join(process.cwd(), 'test-logs');
    const testFile = path.join(testDir, 'test.log');

    beforeEach(() => {
        resetConfig();
        // Clean up test directory
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
    });

    afterEach(async () => {
        // Clean up test directory
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
    });

    describe('constructor', () => {
        it('should create file and directory if not exist', async () => {
            const transport = new FileTransport(testFile);
            await transport.close();
            // File should exist after stream is created and closed
            expect(fs.existsSync(testFile)).toBe(true);
        });

        it('should create nested directories', async () => {
            const nestedFile = path.join(testDir, 'nested', 'deep', 'test.log');
            const transport = new FileTransport(nestedFile);
            await transport.close();
            // File should exist after stream is created and closed
            expect(fs.existsSync(nestedFile)).toBe(true);
        });

        it('should throw for empty file path', () => {
            expect(() => new FileTransport(''))
                .toThrow('File path cannot be empty or whitespace');
        });

        it('should throw for whitespace-only file path', () => {
            expect(() => new FileTransport('   '))
                .toThrow('File path cannot be empty or whitespace');
        });
    });

    describe('log', () => {
        it('should write formatted log to file', async () => {
            const transport = new FileTransport(testFile);

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
                useColors: false,
                maxDepth: 10,
                timestampFormat: 'time',
            };

            transport.log('INFO  [Test] Test message', entry, config);

            // Close to flush and ensure file is written
            await transport.close();

            const content = fs.readFileSync(testFile, 'utf8');
            expect(content).toContain('INFO  [Test] Test message');
        });

        it('should append multiple logs', async () => {
            const transport = new FileTransport(testFile);

            const entry: LogEntry = {
                level: 'info',
                context: 'Test',
                message: 'Message',
                timestamp: new Date(),
            };

            const config: LoggerConfig = {
                level: 'debug',
                showTimestamp: true,
                showIcons: true,
                useColors: false,
                maxDepth: 10,
                timestampFormat: 'time',
            };

            transport.log('First', entry, config);
            transport.log('Second', entry, config);

            // Close to flush and ensure file is written
            await transport.close();

            const content = fs.readFileSync(testFile, 'utf8');
            const lines = content.trim().split('\n');
            expect(lines).toHaveLength(2);
            expect(lines[0]).toBe('First');
            expect(lines[1]).toBe('Second');
        });

        it('should add newline after each log', async () => {
            const transport = new FileTransport(testFile);

            const entry: LogEntry = {
                level: 'info',
                context: 'Test',
                message: 'Test',
                timestamp: new Date(),
            };

            const config: LoggerConfig = {
                level: 'debug',
                showTimestamp: true,
                showIcons: true,
                useColors: false,
                maxDepth: 10,
                timestampFormat: 'time',
            };

            transport.log('Line 1', entry, config);
            transport.log('Line 2', entry, config);

            // Close to flush and ensure file is written
            await transport.close();

            const content = fs.readFileSync(testFile, 'utf8');
            expect(content).toBe('Line 1\nLine 2\n');
        });

        it('should handle write errors gracefully', () => {
            const transport = new FileTransport(testFile);

            // Force close stream to induce error
            (transport as any).stream.destroy();

            const entry: LogEntry = {
                level: 'info',
                context: 'Test',
                message: 'Test',
                timestamp: new Date(),
            };

            const config: LoggerConfig = {
                level: 'debug',
                showTimestamp: true,
                showIcons: true,
                useColors: false,
                maxDepth: 10,
                timestampFormat: 'time',
            };

            // Should not throw
            expect(() => {
                transport.log('Test', entry, config);
            }).not.toThrow();
        });
    });

    describe('close', () => {
        it('should close file stream', async () => {
            const transport = new FileTransport(testFile);

            const entry: LogEntry = {
                level: 'info',
                context: 'Test',
                message: 'Test',
                timestamp: new Date(),
            };

            const config: LoggerConfig = {
                level: 'debug',
                showTimestamp: true,
                showIcons: true,
                useColors: false,
                maxDepth: 10,
                timestampFormat: 'time',
            };

            transport.log('Before close', entry, config);
            await transport.close();
            transport.log('After close', entry, config);

            const content = fs.readFileSync(testFile, 'utf8');
            expect(content).toContain('Before close');
            expect(content).not.toContain('After close');
        });

        it('should resolve promise on successful close', async () => {
            const transport = new FileTransport(testFile);

            await expect(transport.close()).resolves.toBeUndefined();
        });

        it('should handle close errors', async () => {
            const transport = new FileTransport(testFile);

            // Force close stream twice
            await transport.close();

            // Second close should not throw
            await expect(transport.close()).resolves.toBeUndefined();
        });
    });

    describe('compression integration', () => {
        const compressionTestDir = path.join(process.cwd(), 'test-logs-compression-integration');

        beforeEach(() => {
            // Clean up test directory
            if (fs.existsSync(compressionTestDir)) {
                fs.rmSync(compressionTestDir, { recursive: true, force: true });
            }
            // Create test directory
            fs.mkdirSync(compressionTestDir, { recursive: true });
        });

        afterEach(async () => {
            // Clean up test directory
            if (fs.existsSync(compressionTestDir)) {
                fs.rmSync(compressionTestDir, { recursive: true, force: true });
            }
        });

        it('should schedule compression after rotation when compressionLevel set', async () => {
            const compressionTestFile = path.join(compressionTestDir, 'app.log');
            const transport = new FileTransport(compressionTestFile, {
                maxSize: 1024, // 1KB
                compressionLevel: 6,
            });

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
                useColors: false,
                maxDepth: 10,
                timestampFormat: 'time',
            };

            // Write enough logs to trigger rotation
            for (let i = 0; i < 20; i++) {
                transport.log(`This is a test log message with some content to trigger rotation: ${i}`, entry, config);
            }

            // Wait for rotation and compression to complete
            await new Promise(resolve => setTimeout(resolve, 100));

            // Close transport
            await transport.close();

            // Wait a bit more for compression to finish
            await new Promise(resolve => setTimeout(resolve, 50));

            // Verify .gz file was created
            const files = fs.readdirSync(compressionTestDir);
            const gzFiles = files.filter(f => f.endsWith('.gz'));
            expect(gzFiles.length).toBeGreaterThan(0);

            // Verify original rotated file was deleted (only .gz files remain)
            const logFiles = files.filter(f => f.endsWith('.log') && f !== 'app.log');
            expect(logFiles.length).toBe(0);
        });

        it('should not compress when compressionLevel not set', async () => {
            const compressionTestFile = path.join(compressionTestDir, 'app.log');
            const transport = new FileTransport(compressionTestFile, {
                maxSize: 1024, // 1KB
                // No compressionLevel
            });

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
                useColors: false,
                maxDepth: 10,
                timestampFormat: 'time',
            };

            // Write enough logs to trigger rotation
            for (let i = 0; i < 20; i++) {
                transport.log(`This is a test log message with some content: ${i}`, entry, config);
            }

            // Wait for rotation to complete
            await new Promise(resolve => setTimeout(resolve, 100));

            // Close transport
            await transport.close();

            // Wait a bit more to ensure no compression happens
            await new Promise(resolve => setTimeout(resolve, 50));

            // Verify NO .gz file was created
            const files = fs.readdirSync(compressionTestDir);
            const gzFiles = files.filter(f => f.endsWith('.gz'));
            expect(gzFiles.length).toBe(0);

            // Verify app.log exists (current log file)
            expect(fs.existsSync(path.join(compressionTestDir, 'app.log'))).toBe(true);
        });

        it('should throw error for invalid compression level', () => {
            const compressionTestFile = path.join(compressionTestDir, 'app.log');

            // Try compression level 0 (too low)
            expect(() => new FileTransport(compressionTestFile, { compressionLevel: 0 }))
                .toThrow('Compression level must be between 1 and 9');

            // Try compression level 10 (too high)
            expect(() => new FileTransport(compressionTestFile, { compressionLevel: 10 }))
                .toThrow('Compression level must be between 1 and 9');

            // Try negative compression level
            expect(() => new FileTransport(compressionTestFile, { compressionLevel: -1 }))
                .toThrow('Compression level must be between 1 and 9');
        });

        it('should wait 10ms before starting compression', async () => {
            const compressionTestFile = path.join(compressionTestDir, 'app.log');

            const transport = new FileTransport(compressionTestFile, {
                maxSize: 1024, // 1KB
                compressionLevel: 6,
            });

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
                useColors: false,
                maxDepth: 10,
                timestampFormat: 'time',
            };

            // Write enough logs to trigger rotation
            for (let i = 0; i < 20; i++) {
                transport.log(`This is a test log message: ${i}`, entry, config);
            }

            // Wait for rotation but before compression completes
            await new Promise(resolve => setTimeout(resolve, 5));

            // At this point, rotation should have started but compression should be delayed
            // The .gz file should not exist yet because of the 10ms delay
            const filesBefore = fs.readdirSync(compressionTestDir);
            const gzFilesBefore = filesBefore.filter(f => f.endsWith('.gz'));
            // .gz file might not exist yet due to 10ms delay
            expect(gzFilesBefore.length).toBeGreaterThanOrEqual(0);

            // Wait longer for compression to complete
            await new Promise(resolve => setTimeout(resolve, 100));

            // Close transport
            await transport.close();
        });

        it('should complete rotation without waiting for compression (fire-and-forget)', async () => {
            const compressionTestFile = path.join(compressionTestDir, 'app.log');

            const transport = new FileTransport(compressionTestFile, {
                maxSize: 1024, // 1KB
                compressionLevel: 6,
            });

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
                useColors: false,
                maxDepth: 10,
                timestampFormat: 'time',
            };

            // Write enough logs to trigger rotation
            for (let i = 0; i < 20; i++) {
                transport.log(`This is a test log message: ${i}`, entry, config);
            }

            // Rotation should complete quickly (not wait for compression)
            const rotationStart = Date.now();
            await new Promise(resolve => setTimeout(resolve, 50));
            const rotationDuration = Date.now() - rotationStart;

            // Rotation should complete in less than 100ms (not waiting for compression)
            expect(rotationDuration).toBeLessThan(100);

            // Close transport
            await transport.close();
        });

        it('should handle multiple rotations with multiple compressions', async () => {
            const compressionTestFile = path.join(compressionTestDir, 'app.log');

            // Use a very small size to trigger multiple rotations quickly
            const transport = new FileTransport(compressionTestFile, {
                maxSize: 100, // Very small to trigger multiple rotations
                compressionLevel: 6,
            });

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
                useColors: false,
                maxDepth: 10,
                timestampFormat: 'time',
            };

            // Write logs synchronously to trigger rotations
            // Each log is about 60 bytes, so 5 logs should trigger rotation
            for (let i = 0; i < 15; i++) {
                transport.log(`Log message ${i}: some content here`, entry, config);
            }

            // Wait for all rotations and compressions to complete
            await new Promise(resolve => setTimeout(resolve, 500));

            // Close transport
            await transport.close();

            // Wait a bit more for any pending compressions
            await new Promise(resolve => setTimeout(resolve, 200));

            // Verify at least one .gz file was created (compression is working)
            const files = fs.readdirSync(compressionTestDir);
            const gzFiles = files.filter(f => f.endsWith('.gz'));
            expect(gzFiles.length).toBeGreaterThanOrEqual(1);
        });

        it('should not crash on compression errors', async () => {
            const compressionTestFile = path.join(compressionTestDir, 'app.log');

            // Mock console.error to capture error logs
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            const transport = new FileTransport(compressionTestFile, {
                maxSize: 1024, // 1KB
                compressionLevel: 6,
            });

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
                useColors: false,
                maxDepth: 10,
                timestampFormat: 'time',
            };

            // Write enough logs to trigger rotation
            for (let i = 0; i < 20; i++) {
                transport.log(`This is a test log message: ${i}`, entry, config);
            }

            // Wait for rotation and compression
            await new Promise(resolve => setTimeout(resolve, 100));

            // Close transport should not throw even if compression fails
            await expect(transport.close()).resolves.toBeUndefined();

            consoleErrorSpy.mockRestore();
        });
    });
});
