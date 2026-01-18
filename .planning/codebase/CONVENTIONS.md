# Coding Conventions

**Analysis Date:** 2025-01-18

## Naming Patterns

**Files:**
- Use `camelCase.ts` for all TypeScript files
- Test files use `.test.ts` suffix (co-located with source in separate `/test` directory)
- Examples: `logger.ts`, `config.ts`, `formatter.test.ts`

**Functions:**
- Use `camelCase` for all function names
- Exported functions use descriptive verbs: `configure()`, `getConfig()`, `createScope()`, `formatLogEntry()`, `shouldLog()`
- Internal helpers use descriptive names: `formatError()`, `formatArray()`, `formatObject()`

**Variables:**
- Use `camelCase` for all variables
- Constants use `UPPER_SNAKE_CASE` for exported constants: `RESET`, `BOLD`, `FG_RED`, `LEVEL_COLORS`, `LEVEL_PRIORITY`, `ICONS`, `ASCII_ICONS`
- Internal module constants use `UPPER_SNAKE_CASE`: `defaultConfig` (lowercase for mutable module state)

**Types:**
- Use `PascalCase` for all type names
- Interfaces use `PascalCase` without `I` prefix: `Logger`, `ScopedLogger`, `LogEntry`, `LoggerConfig`
- Type aliases use `PascalCase`: `LogLevel`
- Prefer `type` for simple unions and aliases, `interface` for object shapes

## Code Style

**Formatting:**
- No dedicated formatter configured (no `.prettierrc` or ESLint rules)
- Use 4-space indentation (inferred from codebase)
- Consistent spacing around operators and after keywords

**Linting:**
- No ESLint configuration present
- TypeScript strict mode enabled with additional strict checks:
  - `noImplicitAny: true`
  - `strictNullChecks: true`
  - `noUnusedLocals: true`
  - `noUnusedParameters: true`
  - `noImplicitReturns: true`
  - `forceConsistentCasingInFileNames: true`

**Line Length:**
- No explicit limit, but code generally stays under 100 characters
- Longer lines acceptable for clear readability

## Import Organization

**Order:**
1. Type imports (`import type { ... }`)
2. Value imports from local modules (`import { ... } from './...'`)
3. Default imports last

**Patterns:**
```typescript
// Type imports first
import type { Logger, ScopedLogger, LogLevel, LogEntry } from './types';

// Value imports from local modules
import { formatLogEntry } from './formatter';
import { getConfig } from './config';
import { shouldLog } from './levels';

// Default imports
import { log } from './logger';
```

**Path Aliases:**
- No path aliases configured
- Use relative imports with `./` for same directory, `../` for parent directory

**Module Structure:**
- Each file exports related functionality
- Barrel file at `src/index.ts` re-exports public API
- Types centralized in `src/types.ts`

## Error Handling

**Validation:**
- Input validation at function entry points
- Throw `Error` with descriptive messages for invalid inputs
- Check for empty/whitespace strings using `!value || !value.trim()`

**Patterns:**
```typescript
// Input validation
if (!context || !context.trim()) {
    throw new Error('Context cannot be empty or whitespace');
}

// Type guards
if (value instanceof Error) {
    return formatError(value, useColors);
}

// Try-catch for risky operations
try {
    const keys = Object.keys(obj);
    // ... process keys
} catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return colorize(`[Error: ${errorMsg}]`, [FG_RED], useColors);
}
```

**Error Messages:**
- Use clear, descriptive error messages
- Format: `'What cannot be empty or invalid'`
- Include context about what went wrong

**No Silent Failures:**
- Functions that can fail should throw, not return null/undefined
- Use try-catch blocks around operations that may throw (e.g., `Object.keys()`, property access)

## Logging

**Framework:** Console methods (direct usage)

**Patterns:**
- Use appropriate console method for log level:
  - `debug` → `console.debug()`
  - `info` → `console.log()`
  - `success` → `console.log()`
  - `warn` → `console.warn()`
  - `error` → `console.error()`
- No logging library (zero-dependency philosophy)

## Comments

**When to Comment:**
- JSDoc/TSDoc on all exported functions and types
- Inline comments for non-obvious logic
- Section headers for related constant groups

**JSDoc/TSDoc:**
```typescript
/**
 * Configure the global logger settings
 *
 * @param config - Partial configuration to merge with current settings
 * @returns The updated configuration
 *
 * @example
 * ```typescript
 * import { configure } from 'log-vibe';
 * configure({ useColors: false });
 * ```
 */
export function configure(config: Partial<LoggerConfig>): Required<LoggerConfig>
```

**Required Documentation:**
- `@param` for all parameters
- `@returns` for return values
- `@example` for complex functions
- Description of purpose and behavior
- `@throws` for functions that throw errors

**Inline Comments:**
- Use `//` for single-line comments
- Place comments above the code they describe
- Use blank lines to separate comment groups

## Function Design

**Size:**
- Keep functions focused and small
- Large functions split into helpers (e.g., `formatError()`, `formatArray()`, `formatObject()`)
- Maximum recommended length: ~50 lines

**Parameters:**
- Use required parameters for essential data
- Use optional parameters (`param?: type`) for configuration
- Use rest parameters (`...data: unknown[]`) for variadic arguments
- Default values where appropriate (`indent: number = 2`)

**Return Values:**
- Always return typed values
- Use `void` for side-effect functions
- Return copies of mutable data to prevent external mutation: `return { ...currentConfig }`
- Use `Required<T>` utility type to remove optional modifiers

**Parameter Patterns:**
```typescript
// Required parameters
function formatLogEntry(entry: LogEntry): string

// Optional parameters with defaults
export function prettyPrint(
    value: unknown,
    indent: number = 2,
    seen: WeakSet<object> = new WeakSet(),
    depth: number = 0
): string

// Rest parameters
debug(context: string, message: string, ...data: unknown[]): void
```

## Module Design

**Exports:**
- Export types separately from values
- Use named exports for most functions
- Default export for main convenience object (`export default log`)
- Re-export public API through barrel file

**Barrel Files:**
- `src/index.ts` serves as main barrel
- Organize exports by category:
  - Types first
  - Core functionality
  - Configuration
  - Default export last

**Pattern:**
```typescript
// Export types
export type { LogLevel, LogEntry, LoggerConfig, Logger, ScopedLogger };

// Export main logger
export { log, createScope } from './logger';

// Export configuration
export { configure, getConfig } from './config';

// Default export for convenience
import { log } from './logger';
export default log;
```

**Internal State:**
- Use module-level constants for immutable config
- Use module-level `let` variables for mutable state (e.g., `currentConfig`)
- Export functions to access/modify state, never export state directly
- Always return copies of state to prevent mutation

## Configuration

**Global Config Pattern:**
- Default config as constant: `defaultConfig`
- Current state as module variable: `currentConfig`
- `configure()` merges partial config with current
- `getConfig()` returns a copy of current config
- `resetConfig()` resets to defaults

**Pattern:**
```typescript
const defaultConfig: Required<LoggerConfig> = { ... };
let currentConfig: Required<LoggerConfig> = { ...defaultConfig };

export function configure(config: Partial<LoggerConfig>): Required<LoggerConfig> {
    currentConfig = { ...currentConfig, ...config };
    return { ...currentConfig };
}

export function getConfig(): Required<LoggerConfig> {
    return { ...currentConfig };
}

export function resetConfig(): void {
    currentConfig = { ...defaultConfig };
}
```

## TypeScript Usage

**Type Safety:**
- Strict mode enabled
- Explicit return types on exported functions
- Use `unknown` instead of `any` for untyped data
- Type assertions used sparingly and safely
- Discriminated unions for related types

**Utility Types:**
- `Required<T>` - Remove optional modifiers
- `Partial<T>` - Make all properties optional
- `Record<K, V>` - Dictionary/map types

**Type Guards:**
- Use `instanceof` for type narrowing
- Use `typeof` for primitive types
- Custom type guards for complex validation

**Pattern:**
```typescript
// Type narrowing with instanceof
if (value instanceof Error) {
    return formatError(value, useColors);
}

// Type narrowing with typeof
if (typeof value === 'string') {
    return colorize(`"${value}"`, [FG_GREEN], useColors);
}

// Safe property access with try-catch
try {
    const value = prettyPrint(obj[key], indent + 2, seen, depth + 1);
    return `${spaces}${coloredKey}: ${value}`;
} catch (error) {
    // Handle getters that throw
}
```

## Constants

**Exported Constants:**
- Use `UPPER_SNAKE_CASE` naming
- Group related constants
- Export from modules that define them

**Pattern:**
```typescript
// Exported constants
export const RESET = '\x1b[0m';
export const BOLD = '\x1b[1m';
export const FG_RED = '\x1b[31m';

// Related constants grouped
export const LEVEL_COLORS: Record<LogLevel, string[]> = { ... };
export const LEVEL_PRIORITY: Record<LogLevel, number> = { ... };
```

---

*Convention analysis: 2025-01-18*
