import { describe, it, expect, beforeEach } from 'vitest';
import { configure, getConfig, resetConfig } from '../src/config';

describe('config', () => {
    beforeEach(() => {
        // Reset to defaults before each test
        resetConfig();
    });

    describe('configure', () => {
        it('should merge partial configuration with defaults', () => {
            const result = configure({ level: 'warn' });

            expect(result.level).toBe('warn');
            expect(result.showTimestamp).toBe(true); // default
            expect(result.useColors).toBe(true); // default
        });

        it('should update multiple settings at once', () => {
            const result = configure({
                level: 'error',
                showTimestamp: false,
                useColors: false,
            });

            expect(result.level).toBe('error');
            expect(result.showTimestamp).toBe(false);
            expect(result.useColors).toBe(false);
        });

        it('should return a copy of the configuration', () => {
            const result = configure({ level: 'info' });
            result.level = 'debug';

            const current = getConfig();
            expect(current.level).toBe('info'); // should not be affected
        });

        it('should persist configuration across calls', () => {
            configure({ level: 'warn' });
            configure({ showTimestamp: false });

            const result = getConfig();
            expect(result.level).toBe('warn');
            expect(result.showTimestamp).toBe(false);
        });
    });

    describe('getConfig', () => {
        it('should return current configuration', () => {
            configure({ level: 'error', maxDepth: 5 });

            const result = getConfig();
            expect(result.level).toBe('error');
            expect(result.maxDepth).toBe(5);
        });

        it('should return a copy to prevent external mutation', () => {
            const config1 = getConfig();
            config1.level = 'error';

            const config2 = getConfig();
            expect(config2.level).toBe('debug'); // should still be default
        });
    });

    describe('resetConfig', () => {
        it('should reset configuration to defaults', () => {
            configure({
                level: 'error',
                showTimestamp: false,
                useColors: false,
                maxDepth: 3,
            });

            resetConfig();

            const result = getConfig();
            expect(result.level).toBe('debug');
            expect(result.showTimestamp).toBe(true);
            expect(result.useColors).toBe(true);
            expect(result.maxDepth).toBe(10);
        });
    });

    describe('configuration options', () => {
        it('should support all log levels', () => {
            const levels: Array<'debug' | 'info' | 'success' | 'warn' | 'error'> = [
                'debug', 'info', 'success', 'warn', 'error'
            ];

            levels.forEach(level => {
                configure({ level });
                expect(getConfig().level).toBe(level);
            });
        });

        it('should support timestamp format options', () => {
            configure({ timestampFormat: 'iso' });
            expect(getConfig().timestampFormat).toBe('iso');

            configure({ timestampFormat: 'time' });
            expect(getConfig().timestampFormat).toBe('time');
        });

        it('should support boolean flags', () => {
            configure({
                showTimestamp: false,
                showIcons: false,
                useColors: false,
            });

            const result = getConfig();
            expect(result.showTimestamp).toBe(false);
            expect(result.showIcons).toBe(false);
            expect(result.useColors).toBe(false);
        });

        it('should support maxDepth configuration', () => {
            configure({ maxDepth: 15 });
            expect(getConfig().maxDepth).toBe(15);
        });
    });
});
