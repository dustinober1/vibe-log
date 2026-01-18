# Phase 1: Transport System - Research

**Researched:** 2026-01-18
**Domain:** Node.js logging with transport abstraction layer
**Confidence:** HIGH

## Summary

The transport system requires adding a flexible abstraction layer to log-vibe while maintaining its core design principles: zero runtime dependencies, beautiful aesthetics, and simplicity. Research indicates that modern logging libraries (Winston, Pino, tslog) use transport interfaces that receive either formatted strings or raw log objects, with Winston being the most established pattern.

**Primary recommendation:** Implement a Transport interface with a `log()` method that receives both formatted output and raw LogEntry, following Winston's established pattern while keeping the API simple and backward compatible.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js fs | Built-in (>=14.0.0) | File system operations | Zero dependency, streams API |
| Node.js stream | Built-in (>=14.0.0) | Writable streams for file output | Efficient async file writing |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | ^4.0.16 | Testing framework | Already in project, vi.mock for streams |
| TypeScript | ^5.9.3 | Type safety | Already in project |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Built-in fs streams | fs-extra | Adds dependency, not needed for basic writes |
| Built-in fs.mkdir | fs-extra.ensureDir | Adds 20KB+ dependency for one-line operation |

**Installation:**
```bash
# No additional packages needed - use Node.js built-ins only
npm install --save-dev @types/node  # Already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── transports/
│   ├── transport.ts        # Transport interface definition
│   ├── file-transport.ts   # File transport implementation
│   ├── console-transport.ts # Console transport (internal)
│   └── index.ts            # Export transports
├── types.ts                # Extended with TransportConfig
├── config.ts               # Extended with transports array
├── logger.ts               # Modified to use transports
└── formatter.ts            # Unchanged - already separates concerns
```

### Pattern 1: Transport Interface
**What:** Abstract interface defining log() and optional close() methods
**When to use:** All transports must implement this interface
**Example:**
```typescript
// Source: Research from Winston/Pino/tslog patterns
interface Transport {
  /**
   * Write a log entry
   * @param formatted - Formatted log string ready for output
   * @param entry - Raw log entry object for advanced use cases
   * @param config - Current logger configuration (colors, icons, etc.)
   */
  log(formatted: string, entry: LogEntry, config: LoggerConfig): void;

  /**
   * Optional cleanup method for releasing resources
   * Called when logger is destroyed or transport is removed
   */
  close?(): Promise<void> | void;
}
```

### Pattern 2: Configuration Extension (Backward Compatible)
**What:** Extend existing LoggerConfig to support transports while keeping defaults
**When to use:** Adding features without breaking existing code
**Example:**
```typescript
// Extend existing interface - additive changes only
interface LoggerConfig {
  // ... existing fields remain unchanged

  /** New: File path shorthand for single file logging */
  file?: string;

  /** New: Array of transports (empty = no output) */
  transports?: Transport[];
}
```

### Pattern 3: File Transport with Streams
**What:** Use fs.createWriteStream() for efficient async file writing
**When to use:** Writing logs to files
**Example:**
```typescript
// Source: Node.js streams best practices 2025
class FileTransport implements Transport {
  private stream: fs.WriteStream;

  constructor(filePath: string) {
    // Create directory if not exists
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });

    // Create write stream with UTF-8 encoding
    this.stream = fs.createWriteStream(filePath, {
      flags: 'a',  // append mode
      encoding: 'utf8',
    });

    // Handle stream errors gracefully
    this.stream.on('error', (err) => {
      // Log to console as fallback, don't throw
      console.error('Transport error:', err);
    });
  }

  log(formatted: string): void {
    // Write with newline
    this.stream.write(formatted + '\n');
  }

  close(): Promise<void> {
    return new Promise((resolve) => {
      this.stream.end(() => resolve());
    });
  }
}
```

### Pattern 4: Console Always-On Default
**What:** Console transport added automatically unless explicitly disabled
**When to use:** Maintaining backward compatibility
**Example:**
```typescript
// Default behavior: console always on
const defaultTransports = [new ConsoleTransport()];

// Allow file-only logging
configure({ transports: [new FileTransport('./app.log')] });

// Allow silencing all output
configure({ transports: [] });
```

### Anti-Patterns to Avoid
- **Creating async log() method:** Breaks sync API, adds complexity. Keep log() synchronous, handle async internally.
- **Throwing from transport.log():** Crashes application. Catch errors, log to stderr, continue.
- **Requiring transport.close() calls:** Easy to forget. Make optional, handle gracefully if not called.
- **Hand-rolling directory creation:** Use fs.mkdir({ recursive: true }) instead of custom logic.
- **Mixing formatting in transports:** Keep formatting in formatter.ts, transports only write.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Directory creation | Custom recursive mkdir logic | `fs.mkdir(dir, { recursive: true })` | Handles edge cases, race conditions, permissions |
| Async stream draining | Manual backpressure handling | `stream.write()` + check return value | Built-in backpressure management |
| UTF-8 encoding | Manual encoding | `fs.createWriteStream(path, { encoding: 'utf8' })` | Handles BOM, invalid sequences |
| File appending | Custom seek/write logic | `fs.createWriteStream(path, { flags: 'a' })` | Atomic appends on most systems |
| Stream error handling | Uncaught error handlers | `stream.on('error', handler)` | Prevents unhandled rejection crashes |

**Key insight:** Node.js streams have 10+ years of battle-tested edge case handling. Custom solutions will miss subtle bugs around concurrent writes, partial writes, system limits, and error recovery.

## Common Pitfalls

### Pitfall 1: Stream Backpressure Ignored
**What goes wrong:** Writing faster than disk can handle causes memory bloat and crashes
**Why it happens:** Not checking `stream.write()` return value or not handling 'drain' event
**How to avoid:**
- For logging (low volume), `write()` usually succeeds. Monitor memory in testing.
- If high volume needed, implement backpressure with 'drain' event.
- For Phase 1, document limitation: "High-volume logging may buffer in memory"
**Warning signs:** Process memory grows steadily during heavy logging

### Pitfall 2: Unhandled Stream Errors
**What goes wrong:** 'error' event on unhandled stream crashes Node.js process
**Why it happens:** Streams emit 'error' event when no listener attached
**How to avoid:** Always attach error handler in transport constructor
```typescript
this.stream.on('error', (err) => {
  // Fallback to console, don't throw
  console.error(`[${this.constructor.name}] error:`, err);
});
```
**Warning signs:** Process crashes during file system issues (disk full, permissions)

### Pitfall 3: Breaking Backward Compatibility
**What goes wrong:** Existing code stops working after adding transports
**Why it happens:** Changing default behavior or making existing fields required
**How to avoid:**
- Make all new fields optional (file, transports)
- Default transports to [ConsoleTransport] if not specified
- Never remove existing fields from LoggerConfig
- Test upgrade path: old code should work identically
**Warning signs:** Existing tests fail after changes

### Pitfall 4: Mutable LogEntry
**What goes wrong:** Transport modifies LogEntry, affects other transports
**Why it happens:** Passing same object reference to multiple transports
**How to avoid:**
- Document that LogEntry should be treated as read-only
- Use TypeScript `readonly` modifier on interface fields
- In transport, create defensive copy if mutation needed: `{ ...entry }`
**Warning signs:** One transport's behavior affects another unexpectedly

### Pitfall 5: File Handle Leaks
**What goes wrong:** File handles never closed, eventually hit system limit
**Why it happens:** Forgetting to call stream.end() or close() method
**How to avoid:**
- Implement optional close() method on Transport interface
- Document that users should call cleanup on shutdown
- Consider process.exit handlers for production apps
**Warning signs:** "EMFILE: too many open files" error

## Code Examples

Verified patterns from official sources:

### Transport Interface Definition
```typescript
// Source: Research from Winston/tslog/Pino patterns
// File: src/transports/transport.ts
export interface Transport {
  /**
   * Write a log entry to this transport
   * @param formatted - Formatted log string (with colors, icons, etc.)
   * @param entry - Raw log entry for custom formatting if needed
   * @param config - Current logger configuration
   */
  log(formatted: string, entry: LogEntry, config: LoggerConfig): void;

  /**
   * Optional cleanup for releasing resources (file handles, connections)
   * Called when logger is destroyed or transport removed
   */
  close?(): Promise<void> | void;
}
```

### File Transport Implementation
```typescript
// Source: Node.js fs.createWriteStream documentation
// File: src/transports/file-transport.ts
import fs from 'fs';
import path from 'path';

export class FileTransport implements Transport {
  private stream: fs.WriteStream;

  constructor(filePath: string) {
    // Ensure directory exists (Node.js >= 10.12.0)
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });

    // Create append stream with UTF-8 encoding
    this.stream = fs.createWriteStream(filePath, {
      flags: 'a',      // append mode
      encoding: 'utf8',
      mode: 0o666,     // read/write for all
    });

    // Prevent crashes on stream errors
    this.stream.on('error', (err) => {
      console.error(`[FileTransport] Write error: ${err.message}`);
    });
  }

  log(formatted: string): void {
    // Write with newline
    this.stream.write(formatted + '\n');
  }

  close(): Promise<void> {
    return new Promise((resolve) => {
      this.stream.end(() => resolve());
    });
  }
}
```

### Console Transport (Internal)
```typescript
// Source: Existing log-vibe logger.ts pattern
// File: src/transports/console-transport.ts
export class ConsoleTransport implements Transport {
  log(formatted: string, entry: LogEntry): void {
    // Map levels to console methods (existing pattern)
    const method = entry.level === 'error' ? 'error' :
                   entry.level === 'warn' ? 'warn' :
                   entry.level === 'debug' ? 'debug' : 'log';

    console[method](formatted);
  }
}
```

### Configuration with Backward Compatibility
```typescript
// Source: TypeScript additive pattern for API evolution
// File: src/config.ts (extended)
import { Transport } from './transports';

// Extend existing interface - BREAKS NOTHING
interface LoggerConfig {
  // ... existing fields (level, showTimestamp, etc.)

  // New optional fields
  file?: string;
  transports?: Transport[];
  console?: boolean;
}

// Add convenience: file shorthand creates FileTransport
export function configure(config: Partial<LoggerConfig>) {
  // ... existing merge logic

  // Convert file shorthand to transport
  if (config.file && !config.transports) {
    const fileTransport = new FileTransport(config.file);
    config.transports = [fileTransport];
  }

  // Default console if not specified
  if (!config.transports) {
    config.transports = defaultTransports;
  }
}
```

### Usage Examples
```typescript
// Existing code continues to work
import log from 'log-vibe';
log.info('App', 'Started');  // Works as before (console output)

// Simple file logging
import { configure } from 'log-vibe';
configure({ file: './app.log' });
log.info('App', 'Now writing to file too');

// Multiple transports
import { FileTransport } from 'log-vibe';
configure({
  transports: [
    new FileTransport('./app.log'),
    new FileTransport('./errors.log'),  // Could filter by level in future
  ]
});

// File-only logging (disable console)
configure({
  file: './app.log',
  console: false
});

// Custom transport
import type { Transport } from 'log-vibe';

class SlackTransport implements Transport {
  log(formatted: string, entry: LogEntry): void {
    if (entry.level === 'error') {
      // Send to Slack webhook (no library dependency!)
      fetch('https://hooks.slack.com/...', {
        method: 'POST',
        body: JSON.stringify({ text: formatted }),
      }).catch(() => {});  // Don't throw
    }
  }
}

configure({
  transports: [
    new FileTransport('./app.log'),
    new SlackTransport(),
  ]
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `fs.appendFile()` | `fs.createWriteStream()` | Node.js 0.10 (2013) | Streams handle backpressure automatically |
| `new Transport()` class | Interface + composition | ~2015 (Winston 2.x) | Flexibility for custom implementations |
| Callback error handling | Promise + async/await | Node.js 8 (2017) | Cleaner async code in close() methods |
| Console only | Multi-transport architecture | ~2018 (Pino, Winston 3.x) | Logs can go to multiple destinations |
| Sync file writing | Async streams by default | Node.js 10+ (2018) | Non-blocking I/O for better performance |

**Deprecated/outdated:**
- `fs.appendFile()` for each log: Too slow for high volume, creates new handle each time
- Throwing from transports: Crashes app, modern libraries catch and report errors
- Requiring external dependencies: Modern trend is zero-dependency (see Pino, log-vibe)

## Open Questions

1. **Transport log() method signature: sync vs async**
   - What we know: Winston uses sync, Pino supports both, tslog uses sync
   - What's unclear: Whether returning Promise from log() is worth complexity
   - Recommendation: Keep log() synchronous for Phase 1. Can add async variant in Phase 2 if needed for remote transports.

2. **LogEntry mutability**
   - What we know: TypeScript's `readonly` modifier provides compile-time safety only
   - What's unclear: Whether to use `Readonly<LogEntry>` or trust users not to mutate
   - Recommendation: Mark LogEntry fields as `readonly` in types, document immutability contract. No runtime enforcement (too expensive).

3. **Transport error reporting mechanism**
   - What we know: Errors shouldn't crash logging, but users need visibility
   - What's unclear: Whether to add error callback/hook or just console.error fallback
   - Recommendation: For Phase 1, log transport errors to console.error. Can add configurable error handler in Phase 2 based on user feedback.

4. **Transport filtering at transport level**
   - What we know: Winston supports per-transport level filtering, Pino doesn't
   - What's unclear: Whether FileTransport should accept level filter in constructor
   - Recommendation: Skip for Phase 1. Logger already filters by level before calling transports. Keep it simple.

## Sources

### Primary (HIGH confidence)
- **Node.js Stream Documentation (v25.3.0)** - Stream API, error events, backpressure: https://nodejs.org/api/stream.html
- **Node.js File System Documentation** - fs.createWriteStream, fs.mkdir recursive: https://nodejs.org/en/learn/manipulating-files/working-with-folders-in-nodejs
- **Node.js Backpressure Guide (Official)** - drain event, write() return value: https://nodejs.org/en/learn/modules/backpressuring-in-streams
- **Vitest Documentation** - Mocking, spies for testing: https://vitest.dev/guide/mocking
- **Existing log-vibe codebase** - src/logger.ts, src/config.ts, src/formatter.ts, src/types.ts

### Secondary (MEDIUM confidence)
- **Winston Transport Documentation** - Established transport interface pattern: https://github.com/winstonjs/winston/blob/master/docs/transports.md
- **5 Best Practices for Stream Management (Medium, 2025)** - Stream error handling, drain events: https://arunangshudas.medium.com/5-best-practices-for-stream-management-in-node-js-596f7d2d9c11
- **Understanding Node.js Streams (BetterStack, 2025)** - Modern stream usage patterns: https://betterstack.com/community/guides/scaling-nodejs/nodejs-streams/
- **Backward Compatibility in TypeScript (CodeSignal)** - API evolution patterns: https://codesignal.com/learn/courses/backward-compatibility-in-software-development-with-typescript/lessons/backward-compatibility-in-typescript
- **TypeScript Logging from Scratch (LevelUp, 2025)** - Transport interface design considerations: https://levelup.gitconnected.com/typescript-logging-from-scratch-isomorphic-performant-and-extensible-51d4e859a745
- **tslog README (GitHub)** - Transport attachment patterns: https://github.com/fullstack-build/tslog/blob/master/README.md
- **Working with folders in Node.js (Official)** - fs.mkdir recursive usage: https://nodejs.org/en/learn/manipulating-files/working-with-folders-in-nodejs

### Tertiary (LOW confidence)
- **Multiple transport issues in Pino (GitHub issues)** - Known problems with multi-transport: https://github.com/pinojs/pino/issues/2333
- **Winston custom transport TypeScript (StackOverflow)** - Community implementation examples: https://stackoverflow.com/questions/56591967/winston-custom-transport-with-typescript
- **Common mistakes in backpressure handling (Medium, 2025)** - Pitfalls to avoid: https://medium.com/@arunangshudas/10-common-mistakes-in-node-js-backpressure-handling-df304f4a71e2
- **Mastering TypeScript readonly (Medium, 2025)** - Readonly modifier limitations: https://medium.com/@skull-sage/immutability-usefulness-of-readonly-in-typescript-ed2a122d7fd4
- **LogLayer Architecture** - Modern TypeScript logging approach: https://loglayer.dev/

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Node.js built-in modules are well-documented and stable
- Architecture: HIGH - Based on established patterns from Winston/Pino/tslog
- Pitfalls: HIGH - Stream errors and backward compatibility issues well-documented
- Implementation details: MEDIUM - Some judgment calls on error handling, mutability

**Research date:** 2026-01-18
**Valid until:** 30 days (stable domain - Node.js streams API changes slowly)

**Key assumptions verified:**
- Node.js >=14.0.0 supports all required features (streams, recursive mkdir) ✓
- fs.createWriteStream is appropriate for logging (not too high-volume) ✓
- Existing log-vibe patterns can be extended without breaking changes ✓
- TypeScript interface design supports transport abstraction ✓
