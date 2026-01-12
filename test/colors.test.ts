import { describe, it, expect } from 'vitest';
import { colorize, FG_RED, FG_GREEN, BOLD, RESET } from '../src/colors';

describe('colors', () => {
    describe('colorize', () => {
        it('should wrap text with color codes and reset', () => {
            const result = colorize('hello', [FG_RED], true);
            expect(result).toBe('\x1b[31mhello\x1b[0m');
        });

        it('should support multiple style codes', () => {
            const result = colorize('bold green', [BOLD, FG_GREEN], true);
            expect(result).toBe('\x1b[1m\x1b[32mbold green\x1b[0m');
        });

        it('should handle empty text', () => {
            const result = colorize('', [FG_RED], true);
            expect(result).toBe('\x1b[31m\x1b[0m');
        });

        it('should not colorize when forceColors is false', () => {
            const result = colorize('hello', [FG_RED], false);
            expect(result).toBe('hello');
        });
    });
});
