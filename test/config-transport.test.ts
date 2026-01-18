import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { configure, resetConfig, getConfig } from '../src/config';
import { FileTransport, ConsoleTransport } from '../src/transports';
import fs from 'fs';
import path from 'path';

describe('configure - transport integration', () => {
    const testFile = path.join(process.cwd(), 'test-config.log');

    beforeEach(() => {
        resetConfig();
        // Clean up test file
        if (fs.existsSync(testFile)) {
            fs.rmSync(testFile, { force: true });
        }
    });

    afterEach(() => {
        resetConfig();
        // Clean up test file
        if (fs.existsSync(testFile)) {
            fs.rmSync(testFile, { force: true });
        }
    });

    describe('file shorthand', () => {
        it('should convert file string to FileTransport', () => {
            const config = configure({ file: testFile });

            expect(config.transports).toHaveLength(1);
            expect(config.transports![0]).toBeInstanceOf(FileTransport);
        });

        it('should create file transport with specified path', async () => {
            configure({ file: testFile });

            const config = getConfig();
            expect(config.file).toBe(testFile);

            // Verify file was created by transport
            const transport = config.transports![0] as FileTransport;
            const entry = {
                level: 'info' as const,
                context: 'Test',
                message: 'Test message',
                timestamp: new Date(),
            };
            transport.log('Test', entry, config);
            await transport.close();

            expect(fs.existsSync(testFile)).toBe(true);
        });
    });

    describe('transports array', () => {
        it('should accept explicit transports array', () => {
            const transports = [
                new FileTransport(testFile),
                new ConsoleTransport(),
            ];

            const config = configure({ transports });

            expect(config.transports).toHaveLength(2);
            expect(config.transports![0]).toBeInstanceOf(FileTransport);
            expect(config.transports![1]).toBeInstanceOf(ConsoleTransport);
        });

        it('should allow empty transports array', () => {
            const config = configure({ transports: [] });

            expect(config.transports).toEqual([]);
        });

        it('should allow multiple file transports', async () => {
            const testFile2 = path.join(process.cwd(), 'test-config-2.log');

            const transports = [
                new FileTransport(testFile),
                new FileTransport(testFile2),
            ];

            configure({ transports });

            const config = getConfig();
            expect(config.transports).toHaveLength(2);
            expect(config.transports![0]).toBeInstanceOf(FileTransport);
            expect(config.transports![1]).toBeInstanceOf(FileTransport);

            // Clean up
            await (config.transports![0] as FileTransport).close();
            await (config.transports![1] as FileTransport).close();
            if (fs.existsSync(testFile2)) {
                fs.rmSync(testFile2, { force: true });
            }
        });
    });

    describe('console flag', () => {
        it('should include console transport by default', () => {
            const config = getConfig();

            expect(config.console).toBe(true);
            expect(config.transports).toHaveLength(1);
            expect(config.transports![0]).toBeInstanceOf(ConsoleTransport);
        });

        it('should allow disabling console transport', () => {
            const config = configure({ console: false });

            expect(config.console).toBe(false);
            expect(config.transports).toEqual([]);
        });

        it('should allow enabling console transport explicitly', () => {
            configure({ console: false });
            configure({ console: true });

            const config = getConfig();
            expect(config.console).toBe(true);
            expect(config.transports).toHaveLength(1);
            expect(config.transports![0]).toBeInstanceOf(ConsoleTransport);
        });

        it('should not add console when transports explicitly set', () => {
            const transports = [new FileTransport(testFile)];
            configure({ transports, console: false });

            const config = getConfig();
            expect(config.transports).toHaveLength(1);
            expect(config.transports![0]).toBeInstanceOf(FileTransport);
        });
    });

    describe('configuration merging', () => {
        it('should merge transports with other config', async () => {
            const config = configure({
                level: 'warn',
                file: testFile,
                showTimestamp: false,
            });

            expect(config.level).toBe('warn');
            expect(config.showTimestamp).toBe(false);
            expect(config.transports).toHaveLength(1);
            expect(config.transports![0]).toBeInstanceOf(FileTransport);

            // Clean up
            await (config.transports![0] as FileTransport).close();
        });

        it('should persist transports across configure calls', async () => {
            configure({ file: testFile });
            configure({ level: 'error' });

            const config = getConfig();
            expect(config.level).toBe('error');
            expect(config.transports).toHaveLength(1);
            expect(config.transports![0]).toBeInstanceOf(FileTransport);

            // Clean up
            await (config.transports![0] as FileTransport).close();
        });
    });
});
