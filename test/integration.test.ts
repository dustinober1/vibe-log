import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { configure, resetConfig } from '../src/config';
import { log } from '../src/logger';
import { FileTransport } from '../src/transports/file-transport';

describe('Rotation integration', () => {
    const testDir = path.join(process.cwd(), 'test-logs');
    const testFile = path.join(testDir, 'integration.log');

    beforeEach(async () => {
        // Clean up test directory
        try {
            await fs.rm(testDir, { recursive: true, force: true });
        } catch {
            // Directory doesn't exist
        }
        await fs.mkdir(testDir, { recursive: true });

        // Reset config
        resetConfig();
    });

    afterEach(async () => {
        // Clean up test directory
        try {
            await fs.rm(testDir, { recursive: true, force: true });
        } catch {
            // Directory doesn't exist
        }

        // Reset config
        resetConfig();
    });

    it('should rotate log file when size exceeds threshold', async () => {
        // Configure with small rotation threshold
        configure({
            file: testFile,
            rotation: { maxSize: '1KB' },
            console: false, // Disable console output
        });

        // Write enough logs to trigger rotation (each log is ~80 bytes, so 20 should exceed 1KB)
        // Add small delays to allow stream callbacks to fire
        for (let i = 0; i < 20; i++) {
            log.info('test', `Log entry ${i} with some padding text to make it longer`);
            // Small delay to allow stream callback to update file size
            await new Promise(resolve => setTimeout(resolve, 10));
        }

        // Wait for async rotation to complete
        await new Promise(resolve => setTimeout(resolve, 500));

        // Verify rotated file exists
        const files = await fs.readdir(testDir);
        const rotatedFiles = files.filter(f => f.includes('integration-') && f.endsWith('.log.1'));

        expect(rotatedFiles.length).toBeGreaterThan(0);
    });

    it('should not rotate when rotation config not provided', async () => {
        // Configure without rotation
        configure({
            file: testFile,
            console: false,
        });

        // Write logs
        for (let i = 0; i < 10; i++) {
            log.info('test', `Log entry ${i}`);
        }

        // Wait for any async operations
        await new Promise(resolve => setTimeout(resolve, 100));

        // Verify no rotated files
        const files = await fs.readdir(testDir);
        const rotatedFiles = files.filter(f => f.includes('.log.'));

        expect(rotatedFiles.length).toBe(0);
    });

    it('should support custom FileTransport with rotation', async () => {
        // Configure with custom FileTransport
        const customTransport = new FileTransport(testFile, { maxSize: '1KB' });

        configure({
            transports: [customTransport],
            console: false,
        });

        // Write enough logs to trigger rotation
        // Add small delays to allow stream callbacks to fire
        for (let i = 0; i < 20; i++) {
            log.info('test', `Log entry ${i} with padding to make it longer`);
            // Small delay to allow stream callback to update file size
            await new Promise(resolve => setTimeout(resolve, 10));
        }

        // Wait for rotation
        await new Promise(resolve => setTimeout(resolve, 500));

        // Verify rotation occurred
        const files = await fs.readdir(testDir);
        const rotatedFiles = files.filter(f => f.includes('.log.'));

        expect(rotatedFiles.length).toBeGreaterThan(0);
    });
});
