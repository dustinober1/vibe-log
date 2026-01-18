import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { log, createScope } from '../src/logger';
import { configure, resetConfig } from '../src/config';
import type { Transport } from '../src/transports/transport';

describe('log', () => {
    beforeEach(() => {
        resetConfig();
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

    describe('validation', () => {
        it('should throw error for empty context', () => {
            expect(() => log.info('', 'Message')).toThrow('Context cannot be empty or whitespace');
        });

        it('should throw error for whitespace-only context', () => {
            expect(() => log.info('   ', 'Message')).toThrow('Context cannot be empty or whitespace');
        });

        it('should throw error for empty message', () => {
            expect(() => log.info('Context', '')).toThrow('Message cannot be empty or whitespace');
        });

        it('should throw error for whitespace-only message', () => {
            expect(() => log.info('Context', '   ')).toThrow('Message cannot be empty or whitespace');
        });
    });

    describe('log level filtering', () => {
        it('should filter logs below configured level (warn)', () => {
            configure({ level: 'warn' });

            log.debug('Test', 'Debug');
            log.info('Test', 'Info');
            log.success('Test', 'Success');
            log.warn('Test', 'Warning');
            log.error('Test', 'Error');

            expect(console.debug).toHaveBeenCalledTimes(0);
            expect(console.log).toHaveBeenCalledTimes(0);
            expect(console.warn).toHaveBeenCalledTimes(1);
            expect(console.error).toHaveBeenCalledTimes(1);
        });

        it('should filter logs below configured level (error)', () => {
            configure({ level: 'error' });

            log.debug('Test', 'Debug');
            log.info('Test', 'Info');
            log.success('Test', 'Success');
            log.warn('Test', 'Warning');
            log.error('Test', 'Error');

            expect(console.debug).toHaveBeenCalledTimes(0);
            expect(console.log).toHaveBeenCalledTimes(0);
            expect(console.warn).toHaveBeenCalledTimes(0);
            expect(console.error).toHaveBeenCalledTimes(1);
        });

        it('should allow all logs when level is debug', () => {
            configure({ level: 'debug' });

            log.debug('Test', 'Debug');
            log.info('Test', 'Info');
            log.success('Test', 'Success');
            log.warn('Test', 'Warning');
            log.error('Test', 'Error');

            expect(console.debug).toHaveBeenCalledTimes(1);
            expect(console.log).toHaveBeenCalledTimes(2); // info + success
            expect(console.warn).toHaveBeenCalledTimes(1);
            expect(console.error).toHaveBeenCalledTimes(1);
        });
    });

    describe('transport error handling', () => {
        it('should handle transport errors gracefully', () => {
            // Create a transport that throws
            const throwingTransport: Transport = {
                log: () => {
                    throw new Error('Transport failed');
                },
            };

            configure({ transports: [throwingTransport] });

            // Should not throw despite transport error
            expect(() => log.info('Test', 'Message')).not.toThrow();

            // Error should be logged to stderr
            expect(console.error).toHaveBeenCalledWith(
                expect.stringContaining('[log-vibe] Transport error:')
            );
        });
    });
});

describe('createScope', () => {
    beforeEach(() => {
        resetConfig();
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

