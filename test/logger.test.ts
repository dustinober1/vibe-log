import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { log, createScope } from '../src/logger';

describe('log', () => {
    beforeEach(() => {
        // Mock console methods
        vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.spyOn(console, 'debug').mockImplementation(() => { });
        vi.spyOn(console, 'warn').mockImplementation(() => { });
        vi.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should call console.log for info', () => {
        log.info('Test', 'Hello');
        expect(console.log).toHaveBeenCalledTimes(1);
    });

    it('should call console.log for success', () => {
        log.success('Test', 'Done');
        expect(console.log).toHaveBeenCalledTimes(1);
    });

    it('should call console.warn for warn', () => {
        log.warn('Test', 'Warning');
        expect(console.warn).toHaveBeenCalledTimes(1);
    });

    it('should call console.error for error', () => {
        log.error('Test', 'Error');
        expect(console.error).toHaveBeenCalledTimes(1);
    });

    it('should call console.debug for debug', () => {
        log.debug('Test', 'Debug');
        expect(console.debug).toHaveBeenCalledTimes(1);
    });

    it('should include context in output', () => {
        log.info('MyContext', 'Test message');

        const call = vi.mocked(console.log).mock.calls[0][0];
        expect(call).toContain('[MyContext]');
    });

    it('should include message in output', () => {
        log.info('Test', 'My test message');

        const call = vi.mocked(console.log).mock.calls[0][0];
        expect(call).toContain('My test message');
    });
});

describe('createScope', () => {
    beforeEach(() => {
        vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.spyOn(console, 'debug').mockImplementation(() => { });
        vi.spyOn(console, 'warn').mockImplementation(() => { });
        vi.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should create a scoped logger', () => {
        const scopedLog = createScope('Database');

        scopedLog.info('Connected');

        const call = vi.mocked(console.log).mock.calls[0][0];
        expect(call).toContain('[Database]');
        expect(call).toContain('Connected');
    });

    it('should support all log levels', () => {
        const scopedLog = createScope('API');

        scopedLog.debug('Debug msg');
        scopedLog.info('Info msg');
        scopedLog.success('Success msg');
        scopedLog.warn('Warn msg');
        scopedLog.error('Error msg');

        expect(console.debug).toHaveBeenCalledTimes(1);
        expect(console.log).toHaveBeenCalledTimes(2); // info + success
        expect(console.warn).toHaveBeenCalledTimes(1);
        expect(console.error).toHaveBeenCalledTimes(1);
    });

    it('should pass additional data', () => {
        const scopedLog = createScope('Test');

        scopedLog.info('User data', { id: 1, name: 'John' });

        const call = vi.mocked(console.log).mock.calls[0][0];
        expect(call).toContain('id');
        expect(call).toContain('John');
    });
});
