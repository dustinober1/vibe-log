import { describe, it, expect } from 'vitest';
import { formatTimestamp } from '../src/timestamp';

describe('formatTimestamp', () => {
    it('should format timestamp correctly', () => {
        const date = new Date('2024-01-15T10:05:03.042Z');
        const result = formatTimestamp(date);

        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const seconds = date.getSeconds().toString().padStart(2, '0');
        const ms = date.getMilliseconds().toString().padStart(3, '0');
        const expected = `${hours}:${minutes}:${seconds}.${ms}`;

        expect(result).toContain(expected);
    });

    it('should pad single digits', () => {
        // Create a date that will definitley have single digits in UTC, 
        // but we need to match local time behavior.
        // Easiest way is to manually construct a date or use setHours
        const date = new Date();
        date.setHours(1, 2, 3, 4);

        const result = formatTimestamp(date);
        expect(result).toContain('01:02:03.004');
    });
});
