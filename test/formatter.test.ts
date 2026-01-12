import { describe, it, expect } from 'vitest';
import { formatLogEntry } from '../src/formatter';
import type { LogEntry } from '../src/types';

describe('formatLogEntry', () => {
    it('should format a basic info log', () => {
        const date = new Date('2024-01-15T10:00:00.000Z');
        const entry: LogEntry = {
            level: 'info',
            context: 'App',
            message: 'Hello world',
            timestamp: date,
        };

        const result = formatLogEntry(entry);

        // Construct expected time string based on local timezone
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const seconds = date.getSeconds().toString().padStart(2, '0');
        const ms = date.getMilliseconds().toString().padStart(3, '0');
        const timeStr = `${hours}:${minutes}:${seconds}.${ms}`;

        expect(result).toContain(timeStr);
        expect(result).toContain('INFO');
        expect(result).toContain('[App]');
        expect(result).toContain('Hello world');
    });

    it('should include additional data', () => {
        const entry: LogEntry = {
            level: 'debug',
            context: 'DB',
            message: 'Query result',
            data: [{ id: 1, name: 'test' }],
            timestamp: new Date(),
        };

        const result = formatLogEntry(entry);

        expect(result).toContain('id');
        expect(result).toContain('1');
        expect(result).toContain('name');
        expect(result).toContain('test');
    });

    it('should handle all log levels', () => {
        const levels: Array<'debug' | 'info' | 'success' | 'warn' | 'error'> =
            ['debug', 'info', 'success', 'warn', 'error'];

        for (const level of levels) {
            const entry: LogEntry = {
                level,
                context: 'Test',
                message: 'Test message',
                timestamp: new Date(),
            };

            const result = formatLogEntry(entry);
            expect(result).toContain(level.toUpperCase());
        }
    });
});
