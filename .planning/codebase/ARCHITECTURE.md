# Architecture

**Analysis Date:** 2025-01-18

## Pattern Overview

**Overall:** Module-based utility library with layered dependencies

**Key Characteristics:**
- Pure functions with no side effects (except console output)
- Single responsibility principle - each module handles one concern
- Type-first design with TypeScript interfaces defining contracts
- Zero external runtime dependencies
- Global configuration shared via singleton pattern

## Layers

**Presentation Layer (Logger API):**
- Purpose: Public API for logging operations
- Location: `src/logger.ts`, `src/index.ts`
- Contains: Main `log` object and `createScope` function
- Depends on: Types, Formatter, Config, Levels
- Used by: External applications

**Business Logic Layer:**
- Purpose: Core logging operations and validation
- Location: `src/formatter.ts`, `src/prettyPrint.ts`
- Contains: Log formatting, object pretty-printing, data serialization
- Depends on: Types, Colors, Icons, Timestamp, Config
- Used by: Logger layer

**Configuration Layer:**
- Purpose: Global state management for logger settings
- Location: `src/config.ts`
- Contains: Default config, current config state, configure/getConfig/resetConfig
- Depends on: Types
- Used by: All layers that need settings

**Utility Layer:**
- Purpose: Low-level formatting and detection utilities
- Location: `src/colors.ts`, `src/icons.ts`, `src/timestamp.ts`, `src/levels.ts`
- Contains: ANSI color codes, icon mappings, timestamp formatting, log level filtering
- Depends on: Types, Colors (for icons/levels)
- Used by: Business logic and presentation layers

**Type Definition Layer:**
- Purpose: TypeScript interfaces and type definitions
- Location: `src/types.ts`
- Contains: LogLevel, LogEntry, LoggerConfig, Logger, ScopedLogger interfaces
- Depends on: None (foundation layer)
- Used by: All other modules

## Data Flow

**Log Entry Flow:**

1. User calls `log.info('Context', 'Message', data)` or scoped equivalent
2. `writeLog()` in `logger.ts` validates context and message (throws if empty)
3. `shouldLog()` checks if level meets minimum threshold from config
4. `LogEntry` object created with timestamp
5. `formatLogEntry()` in `formatter.ts` composes output:
   - Gets formatted timestamp from `formatTimestamp()`
   - Gets icon from `getIcon()` (Unicode or ASCII based on color support)
   - Applies level-specific colors from `LEVEL_COLORS`
   - Pretty-prints additional data via `prettyPrint()`
6. Formatted string output to appropriate console method (log, warn, error, debug)

**Configuration Flow:**

1. `configure()` merges partial config with current config
2. Returns copy of updated config
3. `getConfig()` returns copy of current config to any module
4. All modules read config on each operation (dynamic configuration)

**Scoped Logger Flow:**

1. `createScope('Context')` returns `ScopedLogger` object
2. Each method pre-binds context to base `log` methods
3. Subsequent calls omit context parameter: `scopedLog.info('Message')`

## Key Abstractions

**LogEntry:**
- Purpose: Immutable representation of a single log event
- Examples: `src/types.ts` (interface), `src/logger.ts` (construction)
- Pattern: Data transfer object with level, context, message, optional data array, timestamp

**Logger vs ScopedLogger:**
- Purpose: Two interfaces for different usage patterns
- Examples: `src/types.ts` (interfaces), `src/logger.ts` (implementations)
- Pattern: Interface segregation - `Logger` requires context parameter, `ScopedLogger` pre-binds it

**Color Support Detection:**
- Purpose: Environment-aware color/Unicode detection
- Examples: `src/colors.ts` (supportsColor), `src/icons.ts` (getIcon)
- Pattern: Feature detection based on environment variables (NO_COLOR, FORCE_COLOR, CI, TTY)

## Entry Points

**Main Export (`src/index.ts`):**
- Location: `/Users/dustinober/Projects/log-vibe/src/index.ts`
- Triggers: `import log from 'log-vibe'` or named imports
- Responsibilities: Re-exports all public APIs, sets up default export

**Build Entry (`tsup.config.ts`):**
- Location: `/Users/dustinober/Projects/log-vibe/tsup.config.ts`
- Triggers: `npm run build`
- Responsibilities: Bundles `src/index.ts` into CJS and ESM formats with TypeScript declarations

**Test Entry (`vitest.config.ts`):**
- Location: `/Users/dustinober/Projects/log-vibe/vitest.config.ts`
- Triggers: `npm test`
- Responsibilities: Configures test runner, coverage, and glob patterns for `test/**/*.test.ts`

## Error Handling

**Strategy:** Fail fast with descriptive errors

**Patterns:**
- Input validation throws `Error` objects immediately on empty context/message
- `prettyPrint()` wraps object enumeration in try-catch for getter properties
- Circular reference detection using `WeakSet` to prevent infinite recursion
- Max depth limiting to prevent stack overflow on deeply nested objects

## Cross-Cutting Concerns

**Logging:** Not applicable (this is a logging library - no internal logging)

**Validation:** Context and message validation in `writeLog()`, prevents empty strings

**Authentication:** Not applicable (client-side library)

**Color Detection:** Centralized in `colors.ts`, respected by all formatters

**Configuration:** Global singleton pattern in `config.ts`, all modules read via `getConfig()`

---

*Architecture analysis: 2025-01-18*
