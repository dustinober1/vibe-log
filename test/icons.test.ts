import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getIcon, ICONS, ASCII_ICONS } from '../src/icons';

describe('icons', () => {
    describe('getIcon', () => {
        it('should return Unicode icons when forceColors is true', () => {
            expect(getIcon('debug', true)).toBe(ICONS.debug);
            expect(getIcon('info', true)).toBe(ICONS.info);
            expect(getIcon('success', true)).toBe(ICONS.success);
            expect(getIcon('warn', true)).toBe(ICONS.warn);
            expect(getIcon('error', true)).toBe(ICONS.error);
        });

        it('should return ASCII icons when forceColors is false', () => {
            expect(getIcon('debug', false)).toBe(ASCII_ICONS.debug);
            expect(getIcon('info', false)).toBe(ASCII_ICONS.info);
            expect(getIcon('success', false)).toBe(ASCII_ICONS.success);
            expect(getIcon('warn', false)).toBe(ASCII_ICONS.warn);
            expect(getIcon('error', false)).toBe(ASCII_ICONS.error);
        });

        it('should use auto-detection when useColors is undefined', () => {
            const result = getIcon('info');
            // Result will depend on environment, but should be one of the two
            expect([ICONS.info, ASCII_ICONS.info]).toContain(result);
        });
    });

    describe('ICONS', () => {
        it('should have icons for all log levels', () => {
            expect(ICONS.debug).toBe('🔍');
            expect(ICONS.info).toBe('ℹ️');
            expect(ICONS.success).toBe('✅');
            expect(ICONS.warn).toBe('⚠️');
            expect(ICONS.error).toBe('❌');
        });
    });

    describe('ASCII_ICONS', () => {
        it('should have ASCII fallback icons for all log levels', () => {
            expect(ASCII_ICONS.debug).toBe('[DBG]');
            expect(ASCII_ICONS.info).toBe('[INF]');
            expect(ASCII_ICONS.success).toBe('[OK!]');
            expect(ASCII_ICONS.warn).toBe('[WRN]');
            expect(ASCII_ICONS.error).toBe('[ERR]');
        });
    });
});
