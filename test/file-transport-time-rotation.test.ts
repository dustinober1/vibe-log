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
        const transport = new FileTransport(testFile, { pattern: 'daily' });
        transport.log('first message', { level: 'info', context: 'test', message: 'test', timestamp: new Date() }, {});

        // Get initial date
        const initialDate = transport['lastRotationDate'];

        // Advance time past midnight (25 hours)
        vi.advanceTimersByTime(25 * 60 * 60 * 1000);
        await vi.runAllTimersAsync();

        transport.log('second message', { level: 'info', context: 'test', message: 'test', timestamp: new Date() }, {});

        // Verify rotation occurred (lastRotationDate updated)
        expect(transport['lastRotationDate'].getTime()).toBeGreaterThan(initialDate.getTime());

        await transport.close();
    });

    it('should not rotate when midnight has not passed', () => {
        const transport = new FileTransport(testFile, { pattern: 'daily' });
        transport.log('test message', { level: 'info', context: 'test', message: 'test', timestamp: new Date() }, {});

        const initialDate = transport['lastRotationDate'];

        // Advance time by 1 hour (not past midnight)
        vi.advanceTimersByTime(60 * 60 * 1000);

        transport.log('another message', { level: 'info', context: 'test', message: 'test', timestamp: new Date() }, {});

        // Verify rotation did not occur
        expect(transport['lastRotationDate'].getTime()).toBe(initialDate.getTime());
    });
});
