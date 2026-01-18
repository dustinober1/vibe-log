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
});
