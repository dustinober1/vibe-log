import { describe, it, expect } from 'vitest';
import { VERSION } from '../src/index';

describe('log-vibe', () => {
    it('should have a version number', () => {
        expect(VERSION).toBe('1.0.0');
    });
});
