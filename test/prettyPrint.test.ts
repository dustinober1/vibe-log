import { describe, it, expect } from 'vitest';
import { prettyPrint } from '../src/prettyPrint';

describe('prettyPrint', () => {
    it('should format null', () => {
        expect(prettyPrint(null)).toContain('null');
    });

    it('should format undefined', () => {
        expect(prettyPrint(undefined)).toContain('undefined');
    });

    it('should format strings with quotes', () => {
        expect(prettyPrint('hello')).toContain('"hello"');
    });

    it('should format numbers', () => {
        expect(prettyPrint(42)).toContain('42');
    });

    it('should format booleans', () => {
        expect(prettyPrint(true)).toContain('true');
        expect(prettyPrint(false)).toContain('false');
    });

    it('should format empty arrays', () => {
        expect(prettyPrint([])).toBe('[]');
    });

    it('should format empty objects', () => {
        expect(prettyPrint({})).toBe('{}');
    });

    it('should format errors with name and message', () => {
        const error = new Error('test error');
        const result = prettyPrint(error);
        expect(result).toContain('Error');
        expect(result).toContain('test error');
    });
});
