# Technology Stack

**Project:** log-vibe (v1.1 - Log Rotation)
**Researched:** 2025-01-18
**Milestone:** Add log rotation with daily/size-based triggers, compression, and retention

## Recommended Stack

### Core Dependencies
**Zero runtime dependencies** - This is the core value proposition of log-vibe.

All log rotation functionality will be built using Node.js built-in modules only.

### Node.js Built-in Modules

| Module | Version | Purpose | Why |
|--------|---------|---------|-----|
| `node:fs` | Built-in | File operations (stat, rename, unlink, readdir) | **HIGH confidence** - Official Node.js docs confirm all needed operations are available for rotation logic |
| `node:zlib` | Built-in | Gzip compression of rotated files | **HIGH confidence** - Official Node.js docs provide `createGzip()` and `pipeline()` for streaming compression |
| `node:path` | Built-in | Path manipulation for rotated filenames | **HIGH confidence** - Needed for constructing rotation paths like `app.log-2025-01-18.gz` |
| `node:stream` | Built-in | Pipeline for compression streams | **HIGH confidence** - Official docs show `pipeline()` for safe stream handling |

### Implementation Approach

**Rotation Triggers:**
- **Size-based**: Use `fs.stat()` to check file size before each write
- **Daily**: Store creation date, compare with current date on each write
- **Both**: Check both conditions, rotate if either is met

**File Rotation Process:**
1. Close current write stream
2. Rename current file with timestamp suffix (e.g., `app.log` → `app.log-2025-01-18`)
3. Create new write stream for original filename
4. Compress rotated file asynchronously (non-blocking)
5. Delete old files beyond retention period

**Compression:**
```typescript
import { createReadStream, createWriteStream } from 'node:fs';
import { createGzip } from 'node:zlib';
import { pipeline } from 'node:stream';

// Compress rotated file
pipeline(
  createReadStream('app.log-2025-01-18'),
  createGzip(),
  createWriteStream('app.log-2025-01-18.gz'),
  (err) => {
    if (err) console.error('Compression failed:', err);
    else fs.unlinkSync('app.log-2025-01-18'); // Delete uncompressed
  }
);
```

**Retention Cleanup:**
```typescript
import { readdir } from 'node:fs/promises';

// Delete files older than retention period
const files = await readdir('./logs');
const now = Date.now();
for (const file of files) {
  const stats = await stat(`./logs/${file}`);
  const ageDays = (now - stats.mtimeMs) / (1000 * 60 * 60 * 24);
  if (ageDays > retentionDays) {
    await unlink(`./logs/${file}`);
  }
}
```

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| **Log Rotation** | Built-in `fs` module | `rotating-file-stream` | External dependency violates core value proposition |
| **Compression** | Built-in `zlib` | External compression libs | Adds dependency, built-in gzip is sufficient |
| **File watching** | Manual size/date checks | `fs.watch()` | Unreliable for rotation detection, direct checks are more predictable |

## What NOT to Use (Anti-Patterns)

| Library/Pattern | Reason to Avoid |
|-----------------|-----------------|
| **`winston-daily-rotate-file`** | External dependency with 20+ transitive dependencies |
| **`file-stream-rotator`** | External dependency, not maintained since 2023 |
| **`fs.watch()` for rotation** | Platform inconsistencies, doesn't work well for detecting size changes |
| **Synchronous compression** | Blocks event loop, must use async `pipeline()` |
| **`rotating-file-stream`** | External dependency that could be implemented with built-ins |

## Configuration Interface

**Extend existing `FileTransport` with rotation options:**

```typescript
interface RotationConfig {
  // Rotation triggers (one or both)
  maxSize?: string;        // e.g., '10m', '100k', '1g'
  pattern?: 'daily';       // Daily rotation at midnight

  // Compression
  compress?: boolean;       // Enable gzip compression (default: true)

  // Retention
  retention?: number;       // Days to keep rotated files (default: 7)
  retentionDays?: number;   // Alias for retention

  // Filename pattern
  datePattern?: string;     // Date format for rotated files (default: 'YYYY-MM-DD')
}

// Usage
new FileTransport('./app.log', {
  maxSize: '10m',
  pattern: 'daily',
  compress: true,
  retention: 14
});
```

## Installation

```bash
# No new dependencies required
npm install  # Just ensures existing dev dependencies

# For TypeScript (already installed)
npm install -D @types/node
```

## Implementation Strategy

### Phase 1: Core Rotation
- Add `RotationConfig` interface
- Implement size-based rotation check
- Implement daily rotation check
- Add file renaming logic
- Update `FileTransport` to support rotation config

### Phase 2: Compression
- Implement async gzip compression
- Add compression completion callback
- Handle compression errors gracefully
- Add tests for compression

### Phase 3: Retention
- Implement retention cleanup on rotation
- Add configurable retention period
- Support for both compressed and uncompressed files
- Add tests for retention

### Phase 4: Backward Compatibility
- Ensure existing `FileTransport` usage continues to work
- Add migration guide if needed
- Maintain zero-runtime-dependency guarantee

## Performance Considerations

| Operation | Performance Impact | Mitigation |
|-----------|-------------------|------------|
| **Size check** | Minimal (`fs.stat` is fast) | Cache stats, check only on writes |
| **Compression** | Heavy (CPU intensive) | Async pipeline, don't block writes |
| **Retention cleanup** | Moderate (I/O intensive) | Run after rotation, not on every write |
| **File rename** | Fast atomic operation | Use `fs.rename()` which is atomic |

## Compatibility

- **Node.js version**: >=14.0.0 (existing constraint)
- **Operating systems**: All platforms supported by Node.js
- **File systems**: Works with any file system supporting standard POSIX operations

## Sources

- **Node.js v25.2.0 Documentation - Zlib** (HIGH confidence) - https://nodejs.org/api/zlib.html
- **Node.js v25.2.1 Documentation - File System** (HIGH confidence) - https://nodejs.org/api/fs.html
- **Log rotation libraries survey** (MEDIUM confidence) - Various npm packages and blog posts
- **Production-grade logging patterns** (LOW confidence) - WebSearch results only

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Built-in modules capability | HIGH | Official Node.js docs verify all needed features |
| Rotation implementation approach | HIGH | Standard patterns verified through multiple sources |
| Compression implementation | HIGH | Official zlib documentation provides clear examples |
| Retention cleanup strategy | MEDIUM | Standard pattern but needs testing for edge cases |
| Performance characteristics | MEDIUM | Theoretical analysis, needs benchmark validation |

## Gaps and Unknowns

- **Compression overhead**: Exact performance impact needs benchmarking
- **Large file handling**: Behavior with multi-gigabyte log files needs testing
- **Concurrent writes**: Multiple processes writing to same log file during rotation
- **Error recovery**: What happens if compression fails mid-process
- **Retention precision**: Whether to use mtime or creation time for age calculation

These gaps should be addressed during implementation with proper testing and may need phase-specific research.
