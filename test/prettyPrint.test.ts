import { describe, it, expect, beforeEach } from 'vitest';
import { prettyPrint } from '../src/prettyPrint';
import { configure, resetConfig } from '../src/config';

describe('prettyPrint', () => {
    beforeEach(() => {
        resetConfig();
    });

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

    it('should format errors without stack trace', () => {
        const error = new Error('test error');
        error.stack = undefined;
        const result = prettyPrint(error);
        expect(result).toContain('Error');
        expect(result).toContain('test error');
    });

    it('should format named functions', () => {
        function namedFunc() { return 42; }
        const result = prettyPrint(namedFunc);
        expect(result).toContain('[Function: namedFunc]');
    });

    it('should format anonymous functions', () => {
        const result = prettyPrint(() => { });
        expect(result).toContain('[Function: anonymous]');
    });

    it('should format symbols', () => {
        const sym = Symbol('test');
        const result = prettyPrint(sym);
        expect(result).toContain('Symbol(test)');
    });

    it('should format bigints', () => {
        const big = BigInt(9007199254740991);
        const result = prettyPrint(big);
        expect(result).toContain('9007199254740991n');
    });

    it('should format dates', () => {
        const date = new Date('2024-01-15T10:00:00.000Z');
        const result = prettyPrint(date);
        expect(result).toContain('2024-01-15T10:00:00.000Z');
    });

    it('should format regular expressions', () => {
        const regex = /test\d+/gi;
        const result = prettyPrint(regex);
        expect(result).toContain('/test\\d+/gi');
    });

    it('should format non-empty arrays with nested values', () => {
        const arr = [1, 'test', true];
        const result = prettyPrint(arr);
        expect(result).toContain('1');
        expect(result).toContain('"test"');
        expect(result).toContain('true');
    });

    it('should detect circular references in arrays', () => {
        const arr: any[] = [1, 2];
        arr.push(arr);
        const result = prettyPrint(arr);
        expect(result).toContain('[Circular]');
    });

    it('should format non-empty objects with nested values', () => {
        const obj = { name: 'John', age: 30, active: true };
        const result = prettyPrint(obj);
        expect(result).toContain('name');
        expect(result).toContain('"John"');
        expect(result).toContain('age');
        expect(result).toContain('30');
        expect(result).toContain('active');
        expect(result).toContain('true');
    });

    it('should detect circular references in objects', () => {
        const obj: any = { name: 'test' };
        obj.self = obj;
        const result = prettyPrint(obj);
        expect(result).toContain('[Circular]');
    });

    it('should respect max depth limit', () => {
        configure({ maxDepth: 2 });
        const deep = { a: { b: { c: { d: 'too deep' } } } };
        const result = prettyPrint(deep);
        expect(result).toContain('[Max Depth Reached]');
    });

    it('should handle object property getters that throw', () => {
        const obj = {
            get throwingProp() {
                throw new Error('Getter error');
            }
        };
        const result = prettyPrint(obj);
        expect(result).toContain('throwingProp');
        expect(result).toContain('[Error: Getter error]');
    });

    it('should handle objects that cannot be enumerated', () => {
        const proxy = new Proxy({}, {
            ownKeys() {
                throw new Error('Cannot enumerate');
            }
        });
        const result = prettyPrint(proxy);
        expect(result).toContain('[Error: Cannot enumerate]');
    });

    it('should format nested arrays and objects', () => {
        const complex = {
            users: [
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' }
            ],
            count: 2
        };
        const result = prettyPrint(complex);
        expect(result).toContain('users');
        expect(result).toContain('Alice');
        expect(result).toContain('Bob');
        expect(result).toContain('count');
    });
});

