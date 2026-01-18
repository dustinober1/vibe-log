# Testing Patterns

**Analysis Date:** 2025-01-18

## Test Framework

**Runner:**
- Vitest 4.0.16
- Config: `vitest.config.ts`

**Assertion Library:**
- Built-in Vitest assertions (`expect`)

**Run Commands:**
```bash
npm test              # Run all tests once
npm run test:watch    # Watch mode (interactive)
npm run test:coverage # Run with coverage report
```

**Test Configuration:**
- `globals: true` - Global test functions available without import
- `environment: 'node'` - Node.js environment
- `include: ['test/**/*.test.ts']` - Test file pattern
- Coverage provider: v8
- Coverage reporters: text, json, html

## Test File Organization

**Location:**
- Separate `/test` directory at project root
- Tests not co-located with source code
- Mirror source structure: `test/logger.test.ts` tests `src/logger.ts`

**Naming:**
- Test files match source files with `.test.ts` suffix
- Pattern: `<moduleName>.test.ts`
- Examples: `logger.test.ts`, `config.test.ts`, `formatter.test.ts`

**Structure:**
```
test/
├── index.test.ts       # Tests for barrel exports
├── logger.test.ts      # Tests for main logger
├── config.test.ts      # Tests for configuration
├── formatter.test.ts   # Tests for log formatting
├── prettyPrint.test.ts # Tests for object printing
├── colors.test.ts      # Tests for color utilities
├── icons.test.ts       # Tests for icon selection
├── timestamp.test.ts   # Tests for timestamp formatting
├── types.test.ts       # Tests for type definitions
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { configure, resetConfig } from '../src/config';

describe('config', () => {
    beforeEach(() => {
        resetConfig();
    });

    describe('configure', () => {
        it('should merge partial configuration with defaults', () => {
            const result = configure({ level: 'warn' });
            expect(result.level).toBe('warn');
            expect(result.showTimestamp).toBe(true);
        });
    });
});
```

**Patterns:**
- Use `describe()` to group related tests
- Nested `describe()` for sub-functionality
- Use `beforeEach()` to reset state before each test
- Use `afterEach()` to restore mocks after each test
- Test names follow `should <expected behavior>` pattern

**Test Naming:**
- Use `it('should <do something>')` for positive tests
- Use `it('should <do something> when <condition>')` for conditional tests
- Be descriptive and specific

**Setup Pattern:**
```typescript
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

    // Tests...
});
```

## Mocking

**Framework:** Vitest built-in mocking (`vi`)

**Patterns:**

**Console Mocking:**
```typescript
beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => { });
    vi.spyOn(console, 'debug').mockImplementation(() => { });
    vi.spyOn(console, 'warn').mockImplementation(() => { });
    vi.spyOn(console, 'error').mockImplementation(() => { });
});

afterEach(() => {
    vi.restoreAllMocks();
});

// Verify calls
expect(console.log).toHaveBeenCalledTimes(1);
const call = vi.mocked(console.log).mock.calls[0][0];
expect(call).toContain('[MyContext]');
```

**Environment Mocking:**
```typescript
describe('supportsColor', () => {
    let originalEnv: NodeJS.ProcessEnv;
    let originalIsTTY: boolean;

    beforeEach(() => {
        originalEnv = { ...process.env };
        originalIsTTY = process.stdout.isTTY;
    });

    afterEach(() => {
        process.env = originalEnv;
        Object.defineProperty(process.stdout, 'isTTY', {
            value: originalIsTTY,
            writable: true,
        });
    });

    it('should return false when NO_COLOR is set', () => {
        process.env.NO_COLOR = '1';
        delete process.env.FORCE_COLOR;
        Object.defineProperty(process.stdout, 'isTTY', { value: true, writable: true });
        expect(supportsColor()).toBe(false);
    });
});
```

**What to Mock:**
- External dependencies (console, process.env, process.stdout)
- I/O operations
- Side effects
- Environment-specific behavior

**What NOT to Mock:**
- Pure functions
- Simple utilities (test them directly)
- Data transformations

## Fixtures and Factories

**Test Data:**
```typescript
// Inline test data
it('should format non-empty objects with nested values', () => {
    const obj = { name: 'John', age: 30, active: true };
    const result = prettyPrint(obj);
    expect(result).toContain('name');
});

// Type-asserted test data
const levels: Array<'debug' | 'info' | 'success' | 'warn' | 'error'> =
    ['debug', 'info', 'success', 'warn', 'error'];

for (const level of levels) {
    const entry: LogEntry = {
        level,
        context: 'Test',
        message: 'Test message',
        timestamp: new Date(),
    };
    expect(result).toContain(level.toUpperCase());
}
```

**Location:**
- Test data defined inline within tests
- No dedicated fixtures directory
- Complex objects constructed directly in tests

**Setup Functions:**
- Use `beforeEach()` for common setup
- Reset global state with `resetConfig()`
- Create fresh mocks for each test

## Coverage

**Requirements:** None explicitly enforced, but codebase has 99.41% coverage (91 passing tests)

**View Coverage:**
```bash
npm run test:coverage
```

**Coverage Configuration:**
```typescript
coverage: {
    provider: 'v8',
    reporter: ['text', 'json', 'html'],
    include: ['src/**/*.ts'],
    exclude: ['src/**/*.d.ts'],
}
```

**Coverage Reports:**
- Text output to terminal
- JSON for tooling
- HTML report in `coverage/` directory

**Coverage Goals:**
- Aim for 99%+ coverage (current: 99.41%)
- Test all branches and edge cases
- Include error paths and validation

## Test Types

**Unit Tests:**
- Primary test type
- Test individual functions and modules
- Mock external dependencies
- Fast and isolated
- Examples: All tests in `/test` directory

**Integration Tests:**
- Not used (library code with clear boundaries)
- Configuration changes tested as part of unit tests

**E2E Tests:**
- Not used (CLI/library, not application)

## Common Patterns

**Async Testing:**
```typescript
// Not applicable - codebase is synchronous
// For async code, use:
it('should handle async operations', async () => {
    const result = await asyncFunction();
    expect(result).toBe('expected');
});
```

**Error Testing:**
```typescript
describe('validation', () => {
    it('should throw error for empty context', () => {
        expect(() => log.info('', 'Message'))
            .toThrow('Context cannot be empty or whitespace');
    });

    it('should throw error for whitespace-only message', () => {
        expect(() => log.info('Context', '   '))
            .toThrow('Message cannot be empty or whitespace');
    });
});
```

**Configuration Testing:**
```typescript
describe('configure', () => {
    beforeEach(() => {
        resetConfig(); // Always reset before config tests
    });

    it('should merge partial configuration with defaults', () => {
        const result = configure({ level: 'warn' });
        expect(result.level).toBe('warn');
        expect(result.showTimestamp).toBe(true); // default preserved
    });

    it('should return a copy of the configuration', () => {
        const result = configure({ level: 'info' });
        result.level = 'debug'; // Mutating returned copy
        const current = getConfig();
        expect(current.level).toBe('info'); // Original unchanged
    });
});
```

**State Testing:**
```typescript
it('should persist configuration across calls', () => {
    configure({ level: 'warn' });
    configure({ showTimestamp: false });
    const result = getConfig();
    expect(result.level).toBe('warn');
    expect(result.showTimestamp).toBe(false);
});
```

**Multiple Conditions:**
```typescript
it('should handle all log levels', () => {
    const levels: Array<'debug' | 'info' | 'success' | 'warn' | 'error'> =
        ['debug', 'info', 'success', 'warn', 'error'];

    for (const level of levels) {
        const entry: LogEntry = {
            level,
            context: 'Test',
            message: 'Test message',
            timestamp: new Date(),
        };
        const result = formatLogEntry(entry);
        expect(result).toContain(level.toUpperCase());
    }
});
```

**Output Verification:**
```typescript
it('should include context in output', () => {
    log.info('MyContext', 'Test message');
    const call = vi.mocked(console.log).mock.calls[0][0];
    expect(call).toContain('[MyContext]');
});

it('should format a basic info log', () => {
    const entry: LogEntry = {
        level: 'info',
        context: 'App',
        message: 'Hello world',
        timestamp: date,
    };
    const result = formatLogEntry(entry);
    expect(result).toContain(timeStr);
    expect(result).toContain('INFO');
    expect(result).toContain('[App]');
    expect(result).toContain('Hello world');
});
```

**Negative Testing:**
```typescript
it('should hide timestamp when showTimestamp is false', () => {
    configure({ showTimestamp: false });
    const result = formatLogEntry(entry);
    expect(result).not.toContain(timeStr);
    expect(result).toContain('[App]');
});

it('should detect circular references in arrays', () => {
    const arr: any[] = [1, 2];
    arr.push(arr); // Circular reference
    const result = prettyPrint(arr);
    expect(result).toContain('[Circular]');
});
```

**Edge Cases:**
```typescript
it('should format empty arrays', () => {
    expect(prettyPrint([])).toBe('[]');
});

it('should format empty objects', () => {
    expect(prettyPrint({})).toBe('{}');
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
```

## Type Testing

**Type Imports:**
```typescript
import type { LogLevel, LogEntry, LoggerConfig, Logger, ScopedLogger } from '../src/types';
```

**Type Validation Tests:**
```typescript
describe('LogLevel', () => {
    it('should accept all valid log levels', () => {
        const levels: LogLevel[] = ['debug', 'info', 'success', 'warn', 'error'];
        expect(levels).toHaveLength(5);
    });
});

describe('Logger interface', () => {
    it('should define all required methods', () => {
        const mockLogger: Logger = {
            debug: () => { },
            info: () => { },
            success: () => { },
            warn: () => { },
            error: () => { },
        };
        expect(mockLogger.debug).toBeDefined();
        // ... verify all methods
    });
});
```

**Type Compatibility:**
```typescript
it('type exports compile correctly', () => {
    // These just need to compile - type checking
    const level: LogLevel = 'info';
    expect(level).toBe('info');
});
```

## Test Organization Best Practices

**Grouping:**
- Top-level `describe()` matches module name
- Nested `describe()` for function groups
- One `it()` per specific behavior

**Example Structure:**
```typescript
describe('module-name', () => {
    beforeEach(() => {
        // Setup
    });

    afterEach(() => {
        // Teardown
    });

    describe('function-name', () => {
        it('should do basic operation', () => {
            // Test
        });

        it('should handle edge case', () => {
            // Test
        });

        describe('error handling', () => {
            it('should throw when invalid', () => {
                // Test
            });
        });
    });
});
```

## Testing Anti-Patterns to Avoid

**Don't:**
- Test implementation details (test behavior, not internals)
- Mock the function you're testing
- Use `any` in tests (use proper types)
- Skip `afterEach` cleanup
- Forget to reset global state
- Test multiple behaviors in one `it()`

**Do:**
- Test observable behavior
- Use descriptive test names
- Clean up mocks and state
- Test edge cases and errors
- Keep tests focused and independent

---

*Testing analysis: 2025-01-18*
