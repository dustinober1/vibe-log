import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { colorize, supportsColor, FG_RED, FG_GREEN, BOLD, RESET } from '../src/colors';

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

        it('should use auto-detection when forceColors is undefined', () => {
            const result = colorize('test', [FG_RED]);
            // Result will depend on environment, but should not throw
            expect(result).toBeDefined();
        });
    });

    describe('supportsColor', () => {
        let originalEnv: NodeJS.ProcessEnv;
        let originalIsTTY: boolean;

        beforeEach(() => {
            originalEnv = { ...process.env };
            originalIsTTY = process.stdout.isTTY;
        });

        afterEach(() => {
            process.env = originalEnv;
            Object.defineProperty(process.stdout, 'isTTY', {
                value: originalIsTTY,
                writable: true,
            });
        });

        it('should return false when NO_COLOR is set', () => {
            process.env.NO_COLOR = '1';
            delete process.env.FORCE_COLOR;
            Object.defineProperty(process.stdout, 'isTTY', { value: true, writable: true });

            expect(supportsColor()).toBe(false);
        });

        it('should return false when FORCE_COLOR is 0', () => {
            delete process.env.NO_COLOR;
            process.env.FORCE_COLOR = '0';

            expect(supportsColor()).toBe(false);
        });

        it('should return true when FORCE_COLOR is set to non-zero', () => {
            delete process.env.NO_COLOR;
            process.env.FORCE_COLOR = '1';

            expect(supportsColor()).toBe(true);
        });

        it('should return false when stdout is not a TTY', () => {
            delete process.env.NO_COLOR;
            delete process.env.FORCE_COLOR;
            Object.defineProperty(process.stdout, 'isTTY', { value: false, writable: true });

            expect(supportsColor()).toBe(false);
        });

        it('should return false when TERM is dumb', () => {
            delete process.env.NO_COLOR;
            delete process.env.FORCE_COLOR;
            process.env.TERM = 'dumb';
            Object.defineProperty(process.stdout, 'isTTY', { value: true, writable: true });

            expect(supportsColor()).toBe(false);
        });

        it('should return false in CI environment without FORCE_COLOR', () => {
            delete process.env.NO_COLOR;
            delete process.env.FORCE_COLOR;
            process.env.CI = 'true';
            process.env.TERM = 'xterm-256color';
            Object.defineProperty(process.stdout, 'isTTY', { value: true, writable: true });

            expect(supportsColor()).toBe(false);
        });

        it('should return true in CI environment with FORCE_COLOR', () => {
            delete process.env.NO_COLOR;
            process.env.FORCE_COLOR = '1';
            process.env.CI = 'true';

            expect(supportsColor()).toBe(true);
        });

        it('should return true when all conditions are favorable', () => {
            delete process.env.NO_COLOR;
            delete process.env.FORCE_COLOR;
            delete process.env.CI;
            process.env.TERM = 'xterm-256color';
            Object.defineProperty(process.stdout, 'isTTY', { value: true, writable: true });

            expect(supportsColor()).toBe(true);
        });

        it('should handle undefined TERM environment variable', () => {
            delete process.env.NO_COLOR;
            delete process.env.FORCE_COLOR;
            delete process.env.CI;
            delete process.env.TERM;
            Object.defineProperty(process.stdout, 'isTTY', { value: true, writable: true });

            expect(supportsColor()).toBe(true);
        });
    });
});
