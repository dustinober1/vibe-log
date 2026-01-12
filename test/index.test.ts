import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import log, { createScope, VERSION } from '../src/index';
import type { LogLevel, Logger, ScopedLogger } from '../src/index';

describe('log-vibe exports', () => {
    it('exports VERSION', () => {
        expect(VERSION).toBe('0.1.0');
    });

    it('exports log as default', () => {
        expect(log).toBeDefined();
        expect(typeof log.info).toBe('function');
        expect(typeof log.debug).toBe('function');
        expect(typeof log.success).toBe('function');
        expect(typeof log.warn).toBe('function');
        expect(typeof log.error).toBe('function');
    });

    it('exports createScope function', () => {
        expect(typeof createScope).toBe('function');
    });

    it('type exports compile correctly', () => {
        // These just need to compile - type checking
        const level: LogLevel = 'info';
        expect(level).toBe('info');
    });
});
