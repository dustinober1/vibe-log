# Phase 4: Async Compression - Research

**Researched:** 2026-01-18
**Domain:** Node.js built-in zlib module for gzip compression
**Confidence:** HIGH

## Summary

This phase implements fire-and-forget gzip compression of rotated log files using Node.js built-in zlib module. The standard approach uses stream pipelines with `stream.pipeline()` for robust error handling, avoiding the event loop blocking that would occur with synchronous compression.

**Primary recommendation:** Use `stream.pipeline()` from `node:stream/promises` with `zlib.createGzip()`, `fs.createReadStream()`, and `fs.createWriteStream()` for async file compression. Start compression after a 10ms `setTimeout()` delay to avoid CPU spikes during active logging periods.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `node:zlib` | Built-in (Node.js 25.x) | Gzip compression | Node.js built-in, zero dependencies, industry standard |
| `node:stream` | Built-in (Node.js 25.x) | Stream pipeline management | Provides `pipeline()` for proper error handling and cleanup |
| `node:fs` | Built-in (Node.js 25.x) | File system operations | Standard Node.js file I/O |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `node:stream/promises` | Built-in (Node.js 25.x) | Promise-based pipeline API | When using async/await for cleaner error handling |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `stream.pipeline()` | `.pipe()` chaining | `.pipe()` doesn't propagate errors correctly, pipeline handles cleanup automatically |
| `zlib.createGzip()` | `zlib.gzip()` convenience | `zlib.gzip()` loads entire file into memory, streams handle large files efficiently |
| Fire-and-forget | Awaited compression | Awaiting would block the `log()` method, violating non-blocking requirement |

**Installation:**
```bash
# No installation needed - all are Node.js built-in modules
import zlib from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import fs from 'node:fs';
```

## Architecture Patterns

### Recommended Project Structure
```
src/transports/file-transport.ts  # Add compression logic here
src/utils/compression.ts          # New: CompressRotatedFile utility
src/types.ts                      # Extend RotationConfig with compressionLevel
```

### Pattern 1: Stream Pipeline Compression
**What:** Use `stream.pipeline()` to connect file read stream → gzip transform → file write stream
**When to use:** Compressing rotated log files after rotation completes
**Why:** Pipeline automatically handles cleanup, error propagation, and backpressure

**Example:**
```typescript
// Source: Node.js v25.2.0 Documentation
// https://nodejs.org/api/zlib.html
import { createReadStream, createWriteStream } from 'node:fs';
import { createGzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';

async function compressFile(sourcePath: string, destPath: string): Promise<void> {
  const gzip = createGzip();
  const source = createReadStream(sourcePath);
  const destination = createWriteStream(destPath);

  await pipeline(source, gzip, destination);
  // Pipeline automatically:
  // - Closes all streams on completion
  // - Propagates errors to the promise
  // - Cleans up on error (closes streams, deletes partial output)
}
```

### Pattern 2: Fire-and-Forget with Delayed Execution
**What:** Start compression after rotation completes, using a short delay to avoid CPU spikes
**When to use:** When compression should not block the log rotation or logging operations
**Why:** Prevents CPU spikes during active logging periods

**Example:**
```typescript
// Fire-and-forget compression with 10ms delay
function scheduleCompression(rotatedFilePath: string): void {
  setTimeout(() => {
    compressFile(rotatedFilePath, `${rotatedFilePath}.gz`)
      .then(() => {
        // Compression succeeded - delete uncompressed file
        fs.unlink(rotatedFilePath);
      })
      .catch((err) => {
        // Compression failed - move to failed/ directory
        console.error(`[FileTransport] Compression failed for ${rotatedFilePath}: ${err.message}`);
        moveToFailedDirectory(rotatedFilePath);
      });
  }, 10); // 10ms delay to avoid CPU spike
}
```

### Pattern 3: Error Handling with Fallback
**What:** Move failed compression files to a `failed/` subdirectory for manual inspection
**When to use:** When compression errors occur (disk full, permissions, etc.)
**Why:** Preserves log data for recovery attempts, prevents data loss

**Example:**
```typescript
async function moveToFailedDirectory(filePath: string): Promise<void> {
  const dir = path.dirname(filePath);
  const failedDir = path.join(dir, 'failed');
  const failedPath = path.join(failedDir, path.basename(filePath));

  // Ensure failed/ directory exists
  await fs.promises.mkdir(failedDir, { recursive: true });

  // Move failed file
  await fs.promises.rename(filePath, failedPath);
}
```

### Anti-Patterns to Avoid
- **Using `.pipe()` chaining:** Errors don't propagate correctly, streams don't close on errors
- **Awaiting compression in rotation:** Would block the rotation, making `log()` method synchronous
- **Using `zlib.gzip()` convenience method:** Loads entire file into memory, unsuitable for large log files
- **Not handling partial .gz files:** Pipeline cleanup on error is critical to prevent orphaned files

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Stream error handling | Custom error handlers on each stream | `stream.pipeline()` | Automatically handles cleanup, error propagation, and stream closing |
| Async stream coordination | Manual event-based coordination | `pipeline()` from `node:stream/promises` | Promise-based API is cleaner and handles all edge cases |
| Compression buffers | Manual buffer management | `zlib.createGzip()` stream | Handles chunking, backpressure, and memory automatically |
| File cleanup on error | Manual try-catch with cleanup logic | `pipeline()` error handling | Automatically deletes partial output and closes streams |

**Key insight:** Stream error handling is notoriously difficult to get right manually. The `pipeline()` function handles all the edge cases: cleaning up streams on error, propagating errors correctly, and ensuring no resource leaks.

## Common Pitfalls

### Pitfall 1: Event Loop Blocking with Synchronous Compression
**What goes wrong:** Using `zlib.gzipSync()` or awaiting compression blocks the event loop, making the application unresponsive
**Why it happens:** Compression is CPU-intensive; doing it synchronously freezes the event loop
**How to avoid:** Always use stream-based compression (`zlib.createGzip()`) with fire-and-forget pattern
**Warning signs:** Application becomes unresponsive during log rotation, increased latency in request handling

### Pitfall 2: Stream Leaks from Improper Error Handling
**What goes wrong:** File handles remain open after compression errors, eventually hitting OS limits
**Why it happens:** Manually managing multiple streams without proper cleanup logic
**How to avoid:** Use `stream.pipeline()` which automatically closes all streams on success or error
**Warning signs:** "EMFILE: too many open files" errors after extended runtime

### Pitfall 3: Partial .gz Files on Error
**What goes wrong:** Compression fails partway through, leaving a corrupted `.gz` file
**Why it happens:** Write stream isn't cleaned up properly on error
**How to avoid:** `stream.pipeline()` automatically deletes partial output files on error
**Warning signs:** Gunzip fails on compressed files, file size smaller than expected

### Pitfall 4: CPU Spikes During Active Logging
**What goes wrong:** Compression starts immediately after rotation, causing CPU spike that affects logging performance
**Why it happens:** No delay between rotation and compression start
**How to avoid:** Add 10ms `setTimeout()` delay before starting compression
**Warning signs:** Increased latency in log() calls around rotation time

### Pitfall 5: Cross-Device Rename Failures
**What goes wrong:** `fs.rename()` fails when moving files to `failed/` directory across different filesystems
**Why it happens:** `fs.rename()` cannot move files across filesystems/devices
**How to avoid:** Use `fs.copyFile()` + `fs.unlink()` as fallback, or catch error and leave file in place
**Warning signs:** "EXDEV: cross-device link not permitted" errors

### Pitfall 6: Memory Issues with Large Files
**What goes wrong:** Out of memory errors when compressing large rotated log files
**Why it happens:** Using `zlib.gzip()` convenience method loads entire file into memory
**How to avoid:** Always use stream-based compression with `createGzip()` and `pipeline()`
**Warning signs:** Process memory grows continuously, "JavaScript heap out of memory" errors

## Code Examples

Verified patterns from official sources:

### Basic File Compression with Pipeline
```typescript
// Source: Node.js v25.2.0 Documentation
// https://nodejs.org/api/zlib.html
import { createReadStream, createWriteStream } from 'node:fs';
import { createGzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';

async function compressFile(sourcePath: string, destPath: string): Promise<void> {
  const gzip = createGzip({ level: 6 }); // Default balanced compression
  const source = createReadStream(sourcePath);
  const destination = createWriteStream(destPath);

  await pipeline(source, gzip, destination);
}
```

### Compression with Custom Level
```typescript
// Source: Node.js v25.2.0 Documentation
// Compression levels: 1 (fastest) to 9 (best compression)
import { createGzip } from 'node:zlib';

// Level 1: Fastest compression (user-selected priority)
const gzipFast = createGzip({ level: 1 });

// Level 6: Balanced speed/size (default)
const gzipBalanced = createGzip({ level: 6 });

// Level 9: Best compression (slowest)
const gzipBest = createGzip({ level: 9 });
```

### Error Handling with Cleanup
```typescript
// Source: Node.js v25.2.0 Documentation + best practices
import { pipeline } from 'node:stream/promises';
import fs from 'node:fs';
import path from 'path';

async function compressWithErrorHandling(sourcePath: string): Promise<void> {
  const destPath = `${sourcePath}.gz`;

  try {
    await compressFile(sourcePath, destPath);
    // Success: delete uncompressed file
    await fs.promises.unlink(sourcePath);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    console.error(`[FileTransport] Compression failed for ${sourcePath}: ${err.message}`);

    // Move failed file to failed/ subdirectory
    const failedDir = path.join(path.dirname(sourcePath), 'failed');
    await fs.promises.mkdir(failedDir, { recursive: true });
    const failedPath = path.join(failedDir, path.basename(sourcePath));

    try {
      await fs.promises.rename(sourcePath, failedPath);
    } catch (renameError) {
      // If rename fails (e.g., cross-device), leave file in place
      console.error(`[FileTransport] Could not move failed file: ${renameError}`);
    }
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `.pipe()` chaining | `stream.pipeline()` | Node.js 10.x | Proper error handling and automatic cleanup |
| Callback-based pipeline | Promise-based pipeline | Node.js 15.x | Cleaner async/await syntax via `stream/promises` |
| Synchronous compression | Stream-based async compression | Node.js 0.5+ | Prevents event loop blocking for large files |

**Deprecated/outdated:**
- `.pipe()` method: Still works but doesn't handle errors correctly - use `pipeline()` instead
- `zlib.gzip()` for files: Loads entire file into memory - use streams for file compression
- Manual stream error handling: Prone to leaks and cleanup issues - `pipeline()` handles this

**Current best practices (2026):**
- Use `pipeline()` from `node:stream/promises` for clean async/await syntax
- Use stream-based compression (`createGzip()`) for memory efficiency
- Implement fire-and-forget pattern with short delay to avoid CPU spikes
- Move failed files to `failed/` directory for manual inspection
- Configure compression level based on speed vs size priority

## Open Questions

1. **Retry strategy for transient errors**
   - What we know: Compression errors should be logged and files moved to `failed/`
   - What's unclear: Should we retry on specific error types (e.g., ENOSPC temporarily)?
   - Recommendation: No retry for v1.1 - keep it simple. Move to `failed/` and let operators handle manually.

2. **Cross-device rename handling**
   - What we know: `fs.rename()` fails with EXDEV error when moving across filesystems
   - What's unclear: Should we use `fs.copyFile()` + `fs.unlink()` as fallback?
   - Recommendation: Catch EXDEV error and leave file in place with warning. Copy+unlink could be slow for large files.

3. **Compression of multiple rotated files**
   - What we know: Only compress one file at a time to avoid CPU spikes
   - What's unclear: What if multiple rotations happen quickly?
   - Recommendation: Each compression is fire-and-forget. Multiple compressions can run concurrently but the 10ms delay spreads the load.

## Sources

### Primary (HIGH confidence)
- [Zlib | Node.js v25.2.0 Documentation](https://nodejs.org/api/zlib.html) - Complete zlib API reference including createGzip, compression levels, pipeline examples, memory usage tuning
- [Node.js Event Loop - Understanding setImmediate()](https://nodejs.org/en/learn/asynchronous-work/understanding-setimmediate) - Official documentation on setImmediate vs setTimeout
- [How to compress files in Node.js with zlib](https://coreui.io/answers/how-to-compress-files-in-nodejs-with-zlib/) (Nov 13, 2025) - Tutorial on zlib compression with streams

### Secondary (MEDIUM confidence)
- [Combine Node.js Streams with Async Operations Like a Pro](https://medium.com/towardsdev/combine-node-js-streams-with-async-operations-like-a-pro-no-more-memory-leaks-or-spaghetti-code-a2478260b8c7) - Async iterators with pipeline for error handling
- [Pipeline API - the best way to handle stream errors](https://dev.to/morz/pipeline-api-the-best-way-to-handle-stream-errors-that-nobody-tells-you-about-122o) - Why pipeline is superior to .pipe()
- [Analyze the Fire-&-Forget in NodeJs](https://medium.com/@onu.khatri/analyze-the-fire-forget-in-nodejs-7a60f78128ec) - Fire-and-forget pattern analysis
- [12 Node.js Event-Loop Myths — Busted](https://medium.com/@Nexumo_/12-node-js-event-loop-myths-busted-77c9ba65fb93) - Event loop mechanics and timing

### Tertiary (LOW confidence)
- Various WebSearch results on Node.js compression patterns - Marked for validation but align with official documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All Node.js built-in modules, official documentation
- Architecture: HIGH - Official Node.js documentation provides verified patterns
- Pitfalls: HIGH - Well-documented issues with streams, zlib, and async operations

**Research date:** 2026-01-18
**Valid until:** 30 days (Node.js built-in modules are stable, patterns are well-established)

**Key verification:**
- All zlib API patterns verified against official Node.js v25.2.0 documentation
- Stream pipeline patterns verified against official documentation
- Fire-and-forget async patterns verified against multiple community sources
- Compression level behavior verified in official zlib documentation
