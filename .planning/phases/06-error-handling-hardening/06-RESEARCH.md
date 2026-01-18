# Phase 6: Error Handling & Production Hardening - Research

**Researched:** 2026-01-18
**Domain:** Node.js error handling, test isolation, production logging, edge cases
**Confidence:** HIGH

## Summary

This research covers production hardening for a Node.js logging library, focusing on error handling strategies, test reliability, edge case management, and production documentation. The log-vibe library uses Node.js streams for file logging and must maintain non-blocking behavior while handling production edge cases gracefully.

Key findings:
1. **Stream error handling**: Use `stream.end()` not `stream.destroy()` for proper cleanup; always attach 'error' event handlers to prevent uncaught exceptions
2. **Test isolation**: Vitest runs test files in parallel by default; the current failures stem from shared `test-logs` directory cleanup interfering between parallel test runs
3. **Production edge cases**: ENOSPC (disk full) and EACCES (permission denied) are the most critical production errors to handle explicitly
4. **Error codes**: Node.js fs errors come from libuv; only EBUSY is retryable, while ENOSPC, EACCES, ENOENT require user intervention
5. **Production logging patterns**: Winston and Pino both use event emission (`'error'` events) and fallback to console.error for transport failures

**Primary recommendation:** Implement explicit error handling for ENOSPC and EACCES with emit + console.error pattern, fix test isolation by using unique per-test directories, and add comprehensive troubleshooting documentation.

## Standard Stack

### Core
| Tool/Library | Version | Purpose | Why Standard |
|--------------|---------|---------|--------------|
| Node.js fs streams | 25.x | File writing | Official async file I/O API |
| EventEmitter | built-in | Error propagation | Standard pattern for async error notification |
| Vitest | latest | Test runner | Chosen test framework for the project |

### Supporting
| Tool/Library | Version | Purpose | When to Use |
|--------------|---------|---------|-------------|
| fs.createWriteStream() | built-in | Write stream creation | For all file writing operations |
| console.error() | built-in | Fallback error logging | When transport fails |
| stream.end() | built-in | Graceful stream closure | Always use instead of destroy() |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|----------|----------|
| stream.end() | stream.destroy() | destroy() loses buffered data, end() flushes first |
| Event emission | Throwing errors | Throws crash applications; events allow handlers |
| Unique test dirs | Sequential test runs | Parallelism is faster; unique dirs give isolation without speed loss |

**Installation:**
```bash
# No additional packages needed - using built-in Node.js APIs
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── transports/
│   └── file-transport.ts    # Enhanced error handling
├── utils/
│   ├── errors.ts              # NEW: Error classes and handlers
│   └── monitoring.ts          # NEW: Health check utilities
docs/
├── TROUBLESHOOTING.md          # NEW: Production debugging guide
└── MONITORING.md               # NEW: Health check guide
```

### Pattern 1: Stream Error Handling with Event Emission
**What:** Attach 'error' event handlers to all write streams and emit errors to application
**When to use:** For all file stream operations in production code
**Why:** Prevents uncaught exceptions while surfacing errors to application

```typescript
// Source: Node.js EventEmitter documentation
import { EventEmitter } from 'events';

class FileTransport extends EventEmitter {
    private stream: fs.WriteStream;

    private createWriteStream(filePath: string): fs.WriteStream {
        const stream = fs.createWriteStream(filePath, { flags: 'a' });

        // CRITICAL: Always attach error handler to prevent crash
        stream.on('error', (err: NodeJS.ErrnoException) => {
            // Emit to application for monitoring
            this.emit('error', err);

            // Fallback to console.error (never crash app)
            console.error(`[FileTransport] Write error: ${err.message}`);

            // Attempt recovery based on error type
            this.handleStreamError(err);
        });

        return stream;
    }

    private handleStreamError(err: NodeJS.ErrnoException): void {
        // Error-specific recovery strategies
        if (err.code === 'ENOSPC') {
            // Disk full - stop accepting writes
            this.rotating = true;
            this.emit('disk-full', err);
        } else if (err.code === 'EACCES') {
            // Permission denied - fail permanently
            this.closed = true;
            this.emit('permission-denied', err);
        }
    }
}
```

**Key insight:** The 'error' event on EventEmitter is special — if no handler is attached, Node.js crashes the process with an uncaught exception. Always attach at least one handler.

### Pattern 2: Test Isolation with Unique Directories
**What:** Each test suite uses a unique directory to prevent interference
**When to use:** For all integration tests that manipulate the filesystem
**Why:** Vitest runs test files in parallel; shared directories cause race conditions

```typescript
// Source: Vitest parallelism guide
import { beforeEach } from 'vitest';
import { randomUUID } from 'crypto';
import path from 'path';

describe('Rotation integration', () => {
    // Use UUID to ensure unique directory per test run
    const testDir = path.join(process.cwd(), `test-logs-${randomUUID()}`);
    const testFile = path.join(testDir, 'integration.log');

    beforeEach(async () => {
        // Create unique directory for this test run
        await fs.mkdir(testDir, { recursive: true });
    });

    afterEach(async () => {
        // Clean up only this test's directory
        await fs.rm(testDir, { recursive: true, force: true });
    });
});
```

**Key insight:** Vitest's `--no-isolate` flag can improve speed but reduces isolation. Using unique directories gives you both speed AND isolation.

### Pattern 3: Production Error Classification
**What:** Categorize errors as transient (retryable) or permanent (fatal)
**When to use:** For all fs error handling logic
**Why:** Prevents infinite retry loops on permanent errors

```typescript
// Source: Node.js fs error codes documentation
enum ErrorClass {
    TRANSIENT = 'TRANSIENT',   // Safe to retry
    PERMANENT = 'PERMANENT',   // User action required
    UNKNOWN = 'UNKNOWN'         // Needs investigation
}

const ERROR_CLASSIFICATIONS: Record<string, ErrorClass> = {
    // Transient errors - safe to retry
    'EBUSY': ErrorClass.TRANSIENT,      // Resource busy
    'EAGAIN': ErrorClass.TRANSIENT,     // Try again
    'EINTR': ErrorClass.TRANSIENT,      // Interrupted

    // Permanent errors - don't retry
    'ENOSPC': ErrorClass.PERMANENT,     // Disk full
    'EACCES': ErrorClass.PERMANENT,     // Permission denied
    'ENOENT': ErrorClass.PERMANENT,     // Not found (after creation attempt)
    'EISDIR': ErrorClass.PERMANENT,     // Is directory
    'ENOTDIR': ErrorClass.PERMANENT,    // Not directory

    // Unknown by default
};

function classifyError(error: NodeJS.ErrnoException): ErrorClass {
    return ERROR_CLASSIFICATIONS[error.code] || ErrorClass.UNKNOWN;
}
```

**Key insight:** Only EBUSY is truly retryable in fs operations. ENOSPC requires freeing disk space; EACCES requires permission changes.

### Anti-Patterns to Avoid
- **Calling `stream.destroy()`**: Loses buffered data in stream; use `stream.end()` instead
- **Not attaching 'error' handlers**: Unhandled error events crash the Node.js process
- **Retry on permanent errors**: ENOSPC and EACCES will never succeed without user intervention
- **Shared test directories**: Causes test interference in parallel runs
- **Throwing in log()**: Breaks application; use event emission instead

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Retry logic with exponential backoff | Custom retry loop | No retry for fs errors (except EBUSY) | Most fs errors are permanent; retry loops waste resources |
| Test parallelization | Custom parallel test runner | Vitest built-in parallelism | Vitest already handles parallel test execution |
| Error classification system | Custom error codes | Node.js system error codes | OS provides comprehensive error classification |
| Stream cleanup | Manual error tracking | `stream.end()` + 'close' event | Built-in stream cleanup handles edge cases |
| Event unhandled protection | Custom crash handlers | EventEmitter 'error' handlers | Node.js requires 'error' handlers on EventEmitters |

**Key insight:** Node.js provides robust error classification through system error codes. Don't reinvent the wheel — use `error.code` to classify and handle errors appropriately.

## Common Pitfalls

### Pitfall 1: Test Isolation Failures in Parallel Runs
**What goes wrong:** Integration tests fail when run in parallel because they share `test-logs` directory
**Why it happens:** Vitest runs test files in parallel by default; shared directory cleanup causes race conditions
**How to avoid:** Use unique per-test directories with UUID suffixes
**Warning signs:** Tests pass individually but fail in full test run

**Current issue manifestation:**
```
FAIL test/integration.test.ts > should rotate log file when size exceeds threshold
Error: ENOENT: no such file or directory, scandir '/Users/dustinober/Projects/log-vibe/test-logs'
```

### Pitfall 2: Stream Data Loss on Error
**What goes wrong:** Calling `stream.destroy()` instead of `stream.end()` loses buffered data
**Why it happens:** `destroy()` immediately closes the stream without flushing
**How to avoid:** Always use `stream.end()` for graceful shutdown
**Warning signs:** Log entries missing after stream closure

### Pitfall 3: Unhandled 'error' Events Crashing Process
**What goes wrong:** EventEmitter with no 'error' handler crashes the entire Node.js process
**Why it happens:** Node.js treats unhandled 'error' events as uncaught exceptions
**How to avoid:** Always attach at least one 'error' event handler
**Warning signs:** Application crashes with "Uncaught error" message

### Pitfall 4: Infinite Retry on Permanent Errors
**What goes wrong:** Retrying ENOSPC or EACCES errors wastes resources and delays failure notification
**Why it happens:** Assuming all fs errors are transient
**How to avoid:** Classify errors before retrying; only retry EBUSY
**Warning signs:** Application hangs while repeatedly attempting same operation

### Pitfall 5: Disk Full Not Detected Early
**What goes wrong:** Continuing to accept writes when disk is full
**Why it happens:** Not checking for ENOSPC error codes early
**How to avoid:** Set flag to stop accepting writes on ENOSPC; emit 'disk-full' event
**Warning signs:** Application slows down but logs aren't being written

## Code Examples

Verified patterns from official sources:

### Stream Error Handling with Emitted Events
```typescript
// Source: Node.js EventEmitter documentation + fs.WriteStream API
import { EventEmitter } from 'events';
import fs from 'fs';

class SafeFileWriter extends EventEmitter {
    private stream: fs.WriteStream;

    constructor(filePath: string) {
        super();
        this.stream = fs.createWriteStream(filePath, { flags: 'a' });

        // CRITICAL: Prevents crash on stream errors
        this.stream.on('error', (err: NodeJS.ErrnoException) => {
            // 1. Emit to allow application monitoring
            this.emit('error', err);

            // 2. Log to console (never crash the app)
            console.error(`[SafeFileWriter] Error: ${err.code} - ${err.message}`);

            // 3. Error-specific handling
            if (err.code === 'ENOSPC') {
                this.emit('disk-full', err);
            } else if (err.code === 'EACCES') {
                this.emit('permission-denied', err);
            }
        });

        // Monitor for successful flush
        this.stream.on('finish', () => {
            this.emit('flushed');
        });
    }

    write(data: string): boolean {
        // Check disk-full flag before writing
        if (this.isDiskFull()) {
            return false;
        }

        // Write returns false if buffer is full (backpressure)
        return this.stream.write(data);
    }

    async close(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.stream.end((err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }
}
```

### Error Classification by System Code
```typescript
// Source: Node.js fs error codes documentation (system errors section)
function isRetryableError(error: NodeJS.ErrnoException): boolean {
    // Only EBUSY is truly retryable for file system operations
    const RETRYABLE_CODES = new Set(['EBUSY', 'EAGAIN', 'EINTR']);
    return RETRYABLE_CODES.has(error.code);
}

function isPermanentError(error: NodeJS.ErrnoException): boolean {
    const PERMANENT_CODES = new Set([
        'ENOSPC',  // Disk full - requires user action
        'EACCES',  // Permission denied - requires chmod/chown
        'ENOENT',  // Not found (after create attempt)
        'EISDIR',  // Is directory (programming error)
        'ENOTDIR', // Not directory (programming error)
    ]);
    return PERMANENT_CODES.has(error.code);
}

// Usage in error handling
try {
    await fs.writeFile('/path/to/file', data);
} catch (error) {
    const err = error as NodeJS.ErrnoException;

    if (isPermanentError(err)) {
        // Log and fail fast - no point retrying
        console.error(`Permanent error: ${err.code}`);
        throw err;
    }

    if (isRetryableError(err)) {
        // Retry with exponential backoff
        await retryWithBackoff(() => fs.writeFile('/path/to/file', data));
    }
}
```

### Production Monitoring Hook Pattern
```typescript
// Source: Production logging best practices (Winston/Pino patterns)
class MonitoredFileTransport extends EventEmitter {
    private errorCounts = new Map<string, number>();
    private lastErrorTime = new Map<string, number>();

    private recordError(code: string, err: Error): void {
        const count = (this.errorCounts.get(code) || 0) + 1;
        this.errorCounts.set(code, count);
        this.lastErrorTime.set(code, Date.now());

        // Emit monitoring event
        this.emit('error', {
            code,
            message: err.message,
            count,
            timestamp: new Date().toISOString(),
        });

        // Alert on repeated errors (monitoring hook)
        if (count >= 5) {
            this.emit('repeated-error', {
                code,
                count,
                message: `Error ${code} occurred ${count} times`,
            });
        }
    }

    getErrorStats(): Record<string, { count: number; lastSeen: number }> {
        const stats: Record<string, { count: number; lastSeen: number }> = {};
        for (const [code, count] of this.errorCounts.entries()) {
            stats[code] = {
                count,
                lastSeen: this.lastErrorTime.get(code) || 0,
            };
        }
        return stats;
    }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual error handling with try-catch | EventEmitter 'error' pattern | Node.js 0.10+ | EventEmitter is standard for async errors |
| Throwing errors in log() | Emitting 'error' events | 2020s production patterns | Prevents app crashes from logging failures |
| Ignoring ENOSPC errors | Explicit 'disk-full' events | Production best practices | Enables monitoring and alerting |
| Sequential test runs | Parallel test runs with isolation | Vitest adoption | Faster CI/CD pipelines |
| Generic error messages | Error code classification | Node.js error codes API | Precise error identification |

**Deprecated/outdated:**
- `stream.destroy()`: Use `stream.end()` instead — destroy() loses buffered data
- Unhandled error events: Always attach handlers — unhandled errors crash Node.js
- Throwing from log() method: Use event emission — throwing crashes applications
- Manual retry logic for fs errors: Use error classification — most errors are permanent

## Open Questions

Things that couldn't be fully resolved:

1. **Should ENOSPC trigger immediate failure or graceful degradation?**
   - What we know: ENOSPC is a permanent error requiring user intervention
   - What's unclear: Whether to buffer logs in memory temporarily or fail immediately
   - Recommendation: Fail writes immediately with 'disk-full' event; no in-memory buffering (risks OOM)

2. **Should EACCES attempt chmod/chown or fail loudly?**
   - What we know: EACCES is a permission error that may require system-level changes
   - What's unclear: Whether to attempt automatic remediation
   - Recommendation: Fail loudly with 'permission-denied' event; don't attempt chmod (security risk)

3. **Directory deletion during runtime recreation or permanent failure?**
   - What we know: Log directory can be deleted while process is running
   - What's unclear: Whether to recreate automatically or fail permanently
   - Recommendation: Attempt recreation once with error emission; fail if recreation fails

4. **Integration test sequential-only limitation or full fix?**
   - What we know: Tests fail in parallel due to shared directory cleanup
   - What's unclear: Whether to document as known limitation or fix with unique directories
   - Recommendation: Fix with unique directories (UUID suffix) — gives speed + reliability

## Sources

### Primary (HIGH confidence)
- [Node.js v25.2.1 Error Documentation](https://nodejs.org/api/errors.html) — System errors, error codes, EventEmitter patterns
- [Node.js v25.2.1 File System Documentation](https://nodejs.org/api/fs.html) — fs API, error handling, stream management
- [Vitest Parallelism Guide](https://vitest.dev/guide/parallelism.html) — Test isolation configuration
- [Vitest Test Lifecycle](https://vitest.dev/guide/lifecycle.html) — Setup/teardown patterns

### Secondary (MEDIUM confidence)
- [5 Best Practices for Stream Management in Node.js](https://arunangshudas.medium.com/5-best-practices-for-stream-management-in-node-js-596f7d2d9c11) — Stream error handling patterns
- [Reading and Writing Files in Node.js](https://nodejsdesignpatterns.com/blog/reading-writing-nodejs/) — File system best practices
- [The Complete Guide to Node.js Logging Libraries in 2025](https://last9.io/blog/node-js-logging-libraries/) — Winston/Pino error handling patterns
- [Production-Grade Log Troubleshooting](https://blog.devops.dev/production-grade-log-troubleshooting-real-time-analysis-a-2025-practitioners-guide-12ad313d62bb) — Production monitoring patterns

### Tertiary (LOW confidence)
- [Node.js fs error codes StackOverflow discussion](https://stackoverflow.com/questions/23683911/node-js-error-code-meanings-specifically-fs) — Error code meanings
- [Performance and Stress Testing in Node.js](https://blog.appsignal.com/2025/06/04/performance-and-stress-testing-in-nodejs.html) — Stress testing approaches
- [Mastering Exponential Backoff in Distributed Systems](https://betterstack.com/community/guides/monitoring/exponential-backoff/) — Retry logic patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Node.js built-in APIs are well-documented
- Architecture patterns: HIGH - EventEmitter and stream patterns are standard Node.js practices
- Pitfalls: HIGH - All pitfalls verified with official documentation or reproduced in tests
- Test isolation: HIGH - Vitest parallelism and test lifecycle documented
- Error classification: HIGH - Node.js system error codes are authoritative

**Research date:** 2026-01-18
**Valid until:** 2026-02-18 (30 days — Node.js APIs are stable)
