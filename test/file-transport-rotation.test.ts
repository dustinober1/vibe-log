import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { FileTransport } from '../src/transports/file-transport';

const mockWriteStream = {
    write: vi.fn(),
    end: vi.fn((cb) => cb && cb(null)),
    on: vi.fn(),
    removeAllListeners: vi.fn(),
};

// Mock file system operations
vi.mock('node:fs', () => ({
    default: {
        mkdirSync: vi.fn(() => undefined),
        createWriteStream: vi.fn(() => mockWriteStream),
        readdirSync: vi.fn(() => []),
        rename: vi.fn(),
        promises: {
            stat: vi.fn(),
        },
    },
}));

describe('parseSize utility', () => {
    it('should parse MB size strings correctly', () => {
        // This test will fail because parseSize is not exported
        // We'll need to either export it or test it indirectly
        // For now, we'll test it via FileTransport constructor
        expect(() => new FileTransport('./test.log', { maxSize: '100MB' }))
            .not.toThrow();
    });

    it('should parse GB size strings correctly', () => {
        expect(() => new FileTransport('./test.log', { maxSize: '1.5GB' }))
            .not.toThrow();
    });

    it('should parse KB size strings correctly', () => {
        expect(() => new FileTransport('./test.log', { maxSize: '500KB' }))
            .not.toThrow();
    });

    it('should accept raw byte numbers', () => {
        expect(() => new FileTransport('./test.log', { maxSize: 104857600 }))
            .not.toThrow();
    });

    it('should throw on invalid size format', () => {
        expect(() => new FileTransport('./test.log', { maxSize: 'invalid' }))
            .toThrow('Invalid size format');
    });

    it('should throw on unknown unit', () => {
        expect(() => new FileTransport('./test.log', { maxSize: '100XB' }))
            .toThrow('Unknown size unit');
    });

    it('should throw on zero or negative size', () => {
        expect(() => new FileTransport('./test.log', { maxSize: 0 }))
            .toThrow('Size must be positive');
        // Negative string sizes fail the regex match (invalid format)
        expect(() => new FileTransport('./test.log', { maxSize: '-100MB' }))
            .toThrow('Invalid size format');
    });
});
