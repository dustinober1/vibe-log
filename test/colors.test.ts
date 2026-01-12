import { describe, it, expect } from 'vitest';
import { colorize, RESET, FG_RED, BOLD } from '../src/colors';

describe('colors', () => {
    describe('colorize', () => {
        it('should wrap text with color codes and reset', () => {
            const result = colorize('hello', FG_RED);
            expect(result).toBe('\x1b[31mhello\x1b[0m');
        });

        it('should support multiple style codes', () => {
            const result = colorize('hello', BOLD, FG_RED);
            expect(result).toBe('\x1b[1m\x1b[31mhello\x1b[0m');
        });

        it('should handle empty text', () => {
            const result = colorize('', FG_RED);
            expect(result).toBe('\x1b[31m\x1b[0m');
        });
    });
});
