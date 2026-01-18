import { describe, it, expect } from 'vitest';
import type { Transport } from '../src/transports/transport';
import type { LogEntry, LoggerConfig } from '../src/types';

describe('Transport interface', () => {
    it('should define log method signature', () => {
        // This test validates the interface exists and has correct signature
        const entry: LogEntry = {
            level: 'info',
            context: 'Test',
            message: 'Test message',
            timestamp: new Date(),
        };

        const config: LoggerConfig = {
            level: 'debug',
            showTimestamp: true,
            showIcons: true,
            useColors: true,
            maxDepth: 10,
            timestampFormat: 'time',
        };

        // Create a mock transport to verify interface
        const mockTransport: Transport = {
            log: (formatted: string, entry: LogEntry, config: LoggerConfig) => {
                expect(typeof formatted).toBe('string');
                expect(entry).toBeDefined();
                expect(config).toBeDefined();
            },
        };

        // Should not throw
        expect(() => {
            mockTransport.log('test', entry, config);
        }).not.toThrow();
    });

    it('should allow optional close method', () => {
        // Transport without close() method
        const transportNoClose: Transport = {
            log: () => {},
        };
        expect(transportNoClose.close).toBeUndefined();

        // Transport with close() method
        const transportWithClose: Transport = {
            log: () => {},
            close: () => Promise.resolve(),
        };
        expect(transportWithClose.close).toBeDefined();
    });

    it('should support synchronous close method', () => {
        const transport: Transport = {
            log: () => {},
            close: () => {
                // Synchronous cleanup
            },
        };

        expect(transport.close).toBeDefined();
        expect(() => transport.close?.()).not.toThrow();
    });

    it('should support asynchronous close method', async () => {
        const transport: Transport = {
            log: () => {},
            close: async () => {
                // Async cleanup
                await new Promise(resolve => setTimeout(resolve, 1));
            },
        };

        expect(transport.close).toBeDefined();
        await expect(transport.close?.()).resolves.toBeUndefined();
    });
});
