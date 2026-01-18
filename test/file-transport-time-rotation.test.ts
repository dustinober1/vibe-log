import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FileTransport } from '../src/transports/file-transport';
import fs from 'fs';
import path from 'path';

describe('FileTransport - Time-based Rotation', () => {
    const testDir = './test-logs-time';
    const testFile = path.join(testDir, 'app.log');

    beforeEach(() => {
        vi.useFakeTimers();
        // Clean up test directory
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
    });

    afterEach(() => {
        vi.restoreAllMocks();
        // Clean up test directory
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
    });

    it('should initialize lastRotationDate on first write', () => {
        const transport = new FileTransport(testFile, { pattern: 'daily' });
        transport.log('test message', { level: 'info', context: 'test', message: 'test', timestamp: new Date() }, {});

        // Verify lastRotationDate is set
        expect(transport['lastRotationDate']).toBeDefined();
    });

    it('should rotate when midnight UTC is passed', async () => {
        // Set initial time to Jan 1, 2026 10:00 UTC
        vi.setSystemTime(new Date('2026-01-01T10:00:00Z'));

        const transport = new FileTransport(testFile, { pattern: 'daily' });
        transport.log('first message', { level: 'info', context: 'test', message: 'test', timestamp: new Date() }, {});

        // Get initial date
        const initialDate = transport['lastRotationDate'];

        // Advance time past midnight to Jan 2, 2026 01:00 UTC
        vi.setSystemTime(new Date('2026-01-02T01:00:00Z'));

        transport.log('second message', { level: 'info', context: 'test', message: 'test', timestamp: new Date() }, {});

        // Verify rotation occurred (lastRotationDate updated)
        expect(transport['lastRotationDate'].getTime()).toBeGreaterThan(initialDate.getTime());
        expect(transport['lastRotationDate'].getUTCDate()).toBe(2); // Jan 2

        await transport.close();
    });

    it('should not rotate when midnight has not passed', () => {
        // Set initial time to Jan 1, 2026 10:00 UTC
        vi.setSystemTime(new Date('2026-01-01T10:00:00Z'));

        const transport = new FileTransport(testFile, { pattern: 'daily' });
        transport.log('test message', { level: 'info', context: 'test', message: 'test', timestamp: new Date() }, {});

        const initialDate = transport['lastRotationDate'];

        // Advance time by 1 hour (not past midnight)
        vi.setSystemTime(new Date('2026-01-01T11:00:00Z'));

        transport.log('another message', { level: 'info', context: 'test', message: 'test', timestamp: new Date() }, {});

        // Verify rotation did not occur
        expect(transport['lastRotationDate'].getTime()).toBe(initialDate.getTime());
    });

    it('should clear rotation timer on close', () => {
        const transport = new FileTransport(testFile, { pattern: 'daily' });

        // Verify timer is scheduled
        expect(transport['rotationTimer']).toBeDefined();

        // Close transport
        transport.close();

        // Verify timer is cleared
        expect(transport['rotationTimer']).toBeUndefined();
    });

    it('should trigger rotation on either size or time condition', async () => {
        // Use real timers for this test since it involves real file I/O
        vi.useRealTimers();

        // Clean up test directory
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }

        const transport = new FileTransport(testFile, {
            maxSize: '1KB',
            pattern: 'daily'
        });

        // Write enough to trigger size rotation (100 messages * 100 bytes = 10KB)
        for (let i = 0; i < 100; i++) {
            transport.log('x'.repeat(100), { level: 'info', context: 'test', message: 'test', timestamp: new Date() }, {});
        }

        // Wait for async rotation to complete
        await new Promise(resolve => setTimeout(resolve, 500));

        // Verify rotation was triggered (size-based)
        expect(transport['currentFileSize']).toBeLessThan(1000);

        await transport.close();

        // Clean up
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }

        // Restore fake timers for other tests
        vi.useFakeTimers();
    });

    it('should not schedule timer when pattern is not configured', () => {
        const transport = new FileTransport(testFile, { maxSize: '100MB' });

        // Verify timer is not scheduled
        expect(transport['rotationTimer']).toBeUndefined();
    });

    it('should handle month boundaries correctly', () => {
        // Set date to Jan 31, 2026 23:00 UTC
        vi.setSystemTime(new Date('2026-01-31T23:00:00Z'));

        const transport = new FileTransport(testFile, { pattern: 'daily' });
        transport.log('test', { level: 'info', context: 'test', message: 'test', timestamp: new Date() }, {});

        const initialDate = transport['lastRotationDate'];

        // Advance to Feb 1, 2026 01:00 UTC
        vi.setSystemTime(new Date('2026-02-01T01:00:00Z'));

        transport.log('test', { level: 'info', context: 'test', message: 'test', timestamp: new Date() }, {});

        // Verify rotation occurred (date changed)
        expect(transport['lastRotationDate'].getUTCMonth()).toBe(1); // February (0-indexed)
        expect(transport['lastRotationDate'].getTime()).toBeGreaterThan(initialDate.getTime());
    });
});
