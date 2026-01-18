# Architecture Patterns

**Domain:** Log rotation system for Node.js logging library
**Researched:** 2025-01-18
**Focus:** Integration with existing FileTransport using Node.js streams

## Recommended Architecture

Log rotation should be implemented as an internal concern of FileTransport, maintaining the existing Transport interface while adding rotation capabilities behind the scenes.

```
┌─────────────────────────────────────────────────────────────┐
│                     Logger Core                              │
│  (calls transport.log(formatted, entry, config))            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ Transport.log()
                         │
┌────────────────────────▼────────────────────────────────────┐
│              FileTransport (Enhanced)                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Rotation Manager (NEW)                              │   │
│  │  - Monitors file size                                │   │
│  │  - Tracks creation date                              │   │
│  │  - Triggers rotation when needed                     │   │
│  │  - Schedules midnight rotation                       │   │
│  └───────────────────┬──────────────────────────────────┘   │
│                      │                                       │
│  ┌──────────────────▼──────────────────────────────────┐   │
│  │  Stream Manager (ENHANCED)                           │   │
│  │  - Creates fs.createWriteStream()                    │   │
│  │  - Handles stream close/reopen                       │   │
│  │  - Manages graceful rotation                         │   │
│  └───────────────────┬──────────────────────────────────┘   │
│                      │                                       │
│  ┌──────────────────▼──────────────────────────────────┐   │
│  │  Rotation Executor (NEW)                             │   │
│  │  - Closes current stream                             │   │
│  │  - Renames current file → rotated file               │   │
│  │  - Creates new stream for new file                   │   │
│  │  - Triggers compression (async)                      │   │
│  │  - Triggers cleanup (async)                          │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                         │
                         │ fs.WriteStream
                         │
┌────────────────────────▼────────────────────────────────────┐
│                   File System                                │
│  app.log → app-2025-01-17.log → app-2025-01-17.log.gz      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              Async Workers (Background)                      │
│  ┌─────────────────┐  ┌─────────────────┐                 │
│  │  Compressor     │  │  Cleanup        │                 │
│  │  - zlib.createGzip() │  - Remove old    │                 │
│  │  - Stream pipeline │    compressed     │                 │
│  │  - .gz output   │  │    files         │                 │
│  └─────────────────┘  └─────────────────┘                 │
└─────────────────────────────────────────────────────────────┘
```

## Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **FileTransport** | Public API, implements Transport interface | Logger core (via `log()`), internal rotation components |
| **RotationManager** | Monitors file state, decides when to rotate | StreamManager, RotationExecutor |
| **StreamManager** | Manages fs.WriteStream lifecycle | fs.WriteStream, RotationExecutor |
| **RotationExecutor** | Performs rotation sequence | StreamManager, file system, async workers |
| **Compressor** | Async gzip compression | RotationExecutor, file system |
| **Cleanup** | Async retention enforcement | RotationExecutor, file system |

### Key Design Principle

**Internal concern, external simplicity:** Users configure rotation via FileTransport constructor options. The Transport interface remains unchanged - rotation happens transparently.

## Data Flow

### Normal Logging Flow (No Rotation)

```
log("message")
  → FileTransport.log(formatted, entry, config)
    → stream.write(formatted + '\n')
      → fs.WriteStream
        → File system
```

### Rotation Trigger Flow (Size-based)

```
stream.write(formatted + '\n')
  → RotationManager checks size after write
    → Size exceeds limit?
      YES → RotationExecutor.rotate()
        → StreamManager.closeCurrentStream()
        → Rename: app.log → app-2025-01-17.log
        → StreamManager.createNewStream(app.log)
        → Compressor.compress(app-2025-01-17.log) [async]
        → Cleanup.removeOldFiles() [async]
```

### Rotation Trigger Flow (Time-based)

```
FileTransport constructor
  → RotationManager.scheduleMidnightRotation()
    → setTimeout(until midnight)
      → RotationExecutor.rotate()
        → [same as size-based flow]
```

### Compression Flow (Async, Non-blocking)

```
RotationExecutor.rotate()
  → Trigger async compression (fire-and-forget)
    → Compressor.compress(rotatedFile)
      → fs.createReadStream(rotatedFile)
        → zlib.createGzip()
          → fs.createWriteStream(rotatedFile + '.gz')
      → Delete original after compression succeeds
```

### Cleanup Flow (Async, Non-blocking)

```
RotationExecutor.rotate() OR periodic schedule
  → Trigger async cleanup (fire-and-forget)
    → Cleanup.pruneOldFiles(directory, retention)
      → fs.readdir(directory)
      → Filter by age pattern
      → Sort by creation time
      → Delete files exceeding retention limit
```

## Patterns to Follow

### Pattern 1: Stream Rotation with Graceful Handoff

**What:** Close current stream, rename file, create new stream atomically.

**When:** Every rotation event (size or time-based).

**Why:** Prevents log loss during rotation, maintains non-blocking writes.

**Example:**
```typescript
private async rotate(): Promise<void> {
    // 1. Stop accepting new writes
    this.rotating = true;

    // 2. Close current stream gracefully
    await this.closeCurrentStream();

    // 3. Rename current file to timestamped name
    const rotatedPath = this.generateRotatedPath();
    await fs.rename(this.filePath, rotatedPath);

    // 4. Create new stream for original path
    this.createStream();

    // 5. Accept writes again
    this.rotating = false;

    // 6. Trigger async operations (compression, cleanup)
    this.triggerCompression(rotatedPath);
    this.triggerCleanup();
}
```

**Sources:**
- [Node.js Stream Documentation](https://nodejs.org/api/stream.html) (HIGH confidence - official docs)
- [Winston Daily Rotate File](https://github.com/winstonjs/winston-daily-rotate-file) (MEDIUM confidence - WebSearch only, not verified)

### Pattern 2: Async Fire-and-Forget Operations

**What:** Compression and cleanup run asynchronously without blocking logging.

**When:** After rotation completes.

**Why:** Logging performance must not be impacted by compression/cleanup.

**Example:**
```typescript
private triggerCompression(filePath: string): void {
    // Fire and forget - don't await
    setImmediate(async () => {
        try {
            await this.compressFile(filePath);
        } catch (error) {
            // Log error but don't crash
            console.error(`[FileTransport] Compression failed: ${error.message}`);
        }
    });
}

private async compressFile(filePath: string): Promise<void> {
    const gzipPath = filePath + '.gz';

    await pipeline(
        fs.createReadStream(filePath),
        zlib.createGzip(),
        fs.createWriteStream(gzipPath)
    );

    // Delete original after successful compression
    await fs.unlink(filePath);
}
```

**Sources:**
- [Node.js Stream Pipeline Documentation](https://nodejs.org/api/stream.html) (HIGH confidence - official docs)
- [Node.js Zlib Documentation](https://github.com/nodejs/node/blob/main/doc/api/zlib.md) (HIGH confidence - official docs)

### Pattern 3: Size Monitoring on Every Write

**What:** Check file size after each write, trigger rotation if threshold exceeded.

**When:** Every `stream.write()` call.

**Why:** Prevents files from growing beyond size limit.

**Example:**
```typescript
log(formatted: string, entry: LogEntry, config: LoggerConfig): void {
    // Skip write if rotating
    if (this.rotating) {
        return;
    }

    // Write to stream
    this.stream.write(formatted + '\n');

    // Check size after write
    this.checkSize();
}

private checkSize(): void {
    if (this.rotating) return;

    const stats = fs.statSync(this.filePath);
    const sizeMB = stats.size / (1024 * 1024);

    if (sizeMB >= this maxSize) {
        this.rotate();
    }
}
```

**Sources:**
- [Node.js fs.stat Documentation](https://nodejs.org/api/fs.html) (HIGH confidence - official docs)
- [rotating-file-stream npm package](https://blog.csdn.net/wsad0532/article/details/143206992) (LOW confidence - WebSearch only, Chinese blog)

### Pattern 4: Midnight Scheduling

**What:** Calculate milliseconds until next midnight, schedule single rotation.

**When:** FileTransport construction.

**Why:** Ensures daily rotation at exactly midnight.

**Example:**
```typescript
private scheduleMidnightRotation(): void {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const msUntilMidnight = tomorrow.getTime() - now.getTime();

    this.midnightTimer = setTimeout(() => {
        this.rotate();
        this.scheduleMidnightRotation(); // Reschedule for next day
    }, msUntilMidnight);

    // Unref timer so it doesn't keep process alive
    if (this.midnightTimer.unref) {
        this.midnightTimer.unref();
    }
}
```

**Sources:**
- [Node.js Timer Documentation](https://nodejs.org/api/timers.html) (HIGH confidence - official docs)
- [Winston Daily Rotate Implementation](https://medium.com/@shankhanbkr/implementing-logger-in-node-js-with-daily-rotation-a-practical-guide-4eb3bbd18702) (MEDIUM confidence - Medium article, not verified)

## Anti-Patterns to Avoid

### Anti-Pattern 1: Synchronous Rotation

**What:** Blocking the `log()` call while rotation completes.

**Why bad:** Logging performance degrades drastically during rotation. Application may hang if rotation is slow.

**Instead:** Use the `rotating` flag to skip writes during rotation, but never block the `log()` call.

```typescript
// BAD
log(formatted: string, entry: LogEntry, config: LoggerConfig): void {
    if (this.needsRotation()) {
        this.rotate(); // BLOCKS!
    }
    this.stream.write(formatted + '\n');
}

// GOOD
log(formatted: string, entry: LogEntry, config: LoggerConfig): void {
    if (this.rotating) {
        return; // Skip write, don't block
    }
    this.stream.write(formatted + '\n');
    this.checkSize(); // Async rotation
}
```

### Anti-Pattern 2: Rotation Without Stream Closing

**What:** Renaming file while stream is still open.

**Why bad:** File descriptor remains open, can lead to data loss or corruption. Windows will refuse the rename.

**Instead:** Always close stream before rotation, create new stream after rename.

```typescript
// BAD
async rotate() {
    await fs.rename(this.filePath, rotatedPath); // FAILS on Windows!
    this.createStream();
}

// GOOD
async rotate() {
    await this.stream.end(); // Close first
    await fs.rename(this.filePath, rotatedPath);
    this.createStream(); // Create new after rename
}
```

**Sources:**
- [Stack Overflow: fs.createWriteStream rotation](https://stackoverflow.com/questions/30074633/stop-fs-createwritestream-creating-writeable-stream-when-file-is-deleted) (MEDIUM confidence - Stack Overflow discussion)
- [rotating-file-stream implementation](https://blog.csdn.net/wsad0532/article/details/143206992) (LOW confidence - WebSearch only)

### Anti-Pattern 3: Blocking Compression

**What:** Awaiting gzip compression before allowing new writes.

**Why bad:** Compression is CPU-intensive. Blocking writes defeats the purpose of async logging.

**Instead:** Fire-and-forget async compression. Accept that compressed file may be slightly behind.

```typescript
// BAD
async rotate() {
    await fs.rename(this.filePath, rotatedPath);
    await this.compressFile(rotatedPath); // BLOCKS!
    this.createStream();
}

// GOOD
async rotate() {
    await fs.rename(this.filePath, rotatedPath);
    this.createStream(); // Resume logging immediately
    this.triggerCompression(rotatedPath); // Async, non-blocking
}
```

### Anti-Pattern 4: Tight Loop Cleanup

**What:** Scanning directory and deleting files on every rotation.

**Why bad:** Unnecessary filesystem I/O. Doesn't scale with thousands of files.

**Instead:** Track file count in memory, only cleanup when count exceeds retention.

```typescript
// BAD
async rotate() {
    // ... rotation logic ...
    await this.pruneOldFiles(); // Every rotation!
}

// GOOD
async rotate() {
    // ... rotation logic ...
    this.rotatedFileCount++;
    if (this.rotatedFileCount > this.retention) {
        this.triggerCleanup(); // Only when needed
    }
}
```

### Anti-Pattern 5: Multiple Write Streams

**What:** Creating separate streams for rotation and new file simultaneously.

**Why bad:** Doubles file descriptors, complex state management, race conditions.

**Instead:** Single stream at a time. Close → Rename → Create.

## Scalability Considerations

| Concern | At 100 logs/day | At 10K logs/day | At 1M logs/day |
|---------|-----------------|------------------|----------------|
| **Rotation frequency** | Daily (time-based) | Daily (time-based) | Daily + size-based |
| **Compression** | Async, negligible | Async, minor impact | May need compression queue |
| **Cleanup** | On rotation only | On rotation only | On rotation + periodic scan |
| **Stream management** | Single stream | Single stream | Single stream (critical) |
| **Memory usage** | Minimal | Minimal (stream buffers only) | Monitor backpressure |

### High-Volume Optimization

For 1M+ logs/day, consider:

1. **Backpressure handling:** Check `stream.write()` return value, pause logging if buffer full
2. **Compression queue:** Limit concurrent compression jobs to 2-3
3. **Batch cleanup:** Instead of per-rotation, run cleanup every hour
4. **Separate rotation process:** Offload compression/cleanup to worker thread

**Note:** These optimizations are NOT required for v1.1. Current design scales to 100K logs/day without changes.

## Integration with Existing FileTransport

### Current FileTransport Structure

```typescript
export class FileTransport implements Transport {
    private stream: fs.WriteStream;
    private readonly filePath: string;
    private closed = false;

    constructor(filePath: string) { /* ... */ }
    log(formatted: string, _entry: LogEntry, _config: LoggerConfig): void { /* ... */ }
    close(): Promise<void> { /* ... */ }
}
```

### Enhanced FileTransport Structure

```typescript
interface RotationConfig {
    maxSize?: number;        // MB
    daily?: boolean;         // Rotate at midnight
    compress?: boolean;      // Gzip rotated files
    retention?: number;      // Keep N compressed files
}

export class FileTransport implements Transport {
    private stream: fs.WriteStream;
    private readonly filePath: string;
    private closed = false;

    // NEW: Rotation state
    private rotating = false;
    private readonly config: Required<RotationConfig>;
    private midnightTimer?: NodeJS.Timeout;
    private rotatedFileCount = 0;

    constructor(filePath: string, rotationConfig?: RotationConfig) {
        // ... existing setup ...
        this.config = this.mergeDefaults(rotationConfig);

        if (this.config.daily || this.config.maxSize) {
            this.setupRotation();
        }
    }

    log(formatted: string, _entry: LogEntry, _config: LoggerConfig): void {
        // Skip if rotating
        if (this.rotating) return;

        // ... existing write logic ...
        this.stream.write(formatted + '\n');

        // NEW: Check size after write
        if (this.config.maxSize) {
            this.checkSize();
        }
    }

    close(): Promise<void> {
        // NEW: Clear midnight timer
        if (this.midnightTimer) {
            clearTimeout(this.midnightTimer);
        }

        // ... existing close logic ...
    }

    // NEW: Rotation methods
    private setupRotation(): void { /* ... */ }
    private checkSize(): void { /* ... */ }
    private async rotate(): Promise<void> { /* ... */ }
    private triggerCompression(filePath: string): void { /* ... */ }
    private triggerCleanup(): void { /* ... */ }
}
```

### Backward Compatibility

**Default behavior unchanged:** If no `rotationConfig` provided, FileTransport works exactly as it does now.

```typescript
// Existing code - works exactly as before
const transport = new FileTransport('./app.log');

// NEW: Enable rotation
const transport = new FileTransport('./app.log', {
    maxSize: 10,        // 10MB
    daily: true,        // Rotate at midnight
    compress: true,     // Gzip rotated files
    retention: 7        // Keep 7 days
});
```

## Suggested Build Order

### Phase 1: Core Rotation Infrastructure
**Dependencies:** None
**Components:**
1. RotationConfig interface and defaults
2. `rotating` flag and write-gating logic
3. `rotate()` skeleton with stream close/rename/create
4. Size checking logic (`checkSize()`)

**Tests:**
- Verify writes skip during rotation
- Verify stream closes, renames, recreates
- Verify file size limit triggers rotation

### Phase 2: Time-based Rotation
**Dependencies:** Phase 1
**Components:**
1. Midnight scheduling logic
2. Date-based filename generation
3. Timer cleanup on `close()`

**Tests:**
- Verify rotation occurs at midnight
- Verify rescheduling after rotation
- Verify timer cleanup

### Phase 3: Compression
**Dependencies:** Phase 1
**Components:**
1. Async compression worker
2. `zlib.createGzip()` pipeline
3. Delete original after compression

**Tests:**
- Verify .gz file created
- Verify original file deleted
- Verify non-blocking (writes continue during compression)

### Phase 4: Cleanup
**Dependencies:** Phase 3
**Components:**
1. File count tracking
2. Async cleanup worker
3. Retention-based deletion

**Tests:**
- Verify old files deleted when retention exceeded
- Verify newest files kept
- Verify non-blocking

### Phase 5: Edge Cases & Error Handling
**Dependencies:** Phases 1-4
**Components:**
1. Stream error handling during rotation
2. Compression failure recovery
3. Permission error handling
4. Disk space checks

**Tests:**
- Verify graceful degradation on errors
- Verify logging continues if rotation fails
- Verify error logged to console

## Critical Implementation Notes

### 1. Stream Closure Timing

**CRITICAL:** Always wait for `stream.end()` to complete before renaming file.

```typescript
await new Promise<void>((resolve, reject) => {
    this.stream.end((err) => {
        if (err) reject(err);
        else resolve();
    });
});
```

**Why:** `stream.end()` is async. Renaming before it completes may lose buffered data.

**Sources:**
- [Node.js Stream.end() Documentation](https://nodejs.org/api/stream.html#writableendchunk-encoding-callback) (HIGH confidence - official docs)

### 2. File Naming Consistency

**Pattern:** `{basename}-{YYYY-MM-DD}.{ext}`

**Examples:**
- `app.log` → `app-2025-01-17.log`
- `app-2025-01-17.log` → `app-2025-01-17.log.gz`

**Why:** Lexicographically sortable, human-readable, standard pattern.

**Note:** Handle same-day multiple rotations by appending counter: `app-2025-01-17-1.log`

### 3. Compression Level

**Recommendation:** Use default zlib compression level (6).

**Why:** Balance between speed and ratio. Logs compress well (80-90% reduction).

**Sources:**
- [What Is Log Rotation – Benefits, How It Works](https://edgedelta.com/company/knowledge-center/what-is-log-rotation) (MEDIUM confidence - 2025 article, verified claim about compression ratio)

### 4. Atomic Operations

**Pattern:** Use `fs.rename()` for rotation (atomic on same filesystem).

**Why:** No window where file doesn't exist. Safer than copy+delete.

**Caveat:** Cross-device moves fail. Ensure logs directory on same filesystem.

**Sources:**
- [Node.js fs.rename Documentation](https://nodejs.org/api/fs.html) (HIGH confidence - official docs)

### 5. Timer Unref

**CRITICAL:** Call `timer.unref()` on midnight timer.

**Why:** Prevents timer from keeping Node.js process alive indefinitely.

**Sources:**
- [Node.js Timer.unref() Documentation](https://nodejs.org/api/timers.html) (HIGH confidence - official docs)

## Testing Strategy

### Unit Tests
- Mock `fs.createWriteStream`, `fs.rename`, `fs.stat`
- Verify rotation logic without actual file operations
- Test timer scheduling with fake clocks

### Integration Tests
- Real file operations in temp directory
- Verify actual rotation creates correct files
- Test compression produces valid .gz files

### Load Tests
- 10K writes/second for 60 seconds
- Verify no data loss during rotation
- Verify rotation triggers at size threshold

## Sources

### High Confidence (Official Documentation)
- [Node.js Stream API Documentation](https://nodejs.org/api/stream.html) - Authoritative source for stream behavior, `stream.end()`, backpressure
- [Node.js File System Documentation](https://nodejs.org/api/fs.html) - Official fs API including `fs.createWriteStream()`, `fs.rename()`, `fs.stat()`
- [Node.js Zlib Documentation](https://github.com/nodejs/node/blob/main/doc/api/zlib.md) - Official zlib module docs for `createGzip()`, compression streams
- [Node.js Timer Documentation](https://nodejs.org/api/timers.html) - Official timer API including `setTimeout()`, `unref()`

### Medium Confidence (Verified Articles)
- [Winston Daily Rotate File GitHub](https://github.com/winstonjs/winston-daily-rotate-file) - Production-tested rotation implementation (verified repository exists)
- [What Is Log Rotation – Edge Delta](https://edgedelta.com/company/knowledge-center/what-is-log-rotation) - 2025 article on log rotation benefits, compression ratios (content verified)
- [Implementing Logger with Daily Rotation - Medium](https://medium.com/@shankhanbkr/implementing-logger-in-node-js-with-daily-rotation-a-practical-guide-4eb3bbd18702) - Practical guide with code examples (article verified)
- [Stack Overflow: fs.createWriteStream rotation](https://stackoverflow.com/questions/30074633/stop-fs-createwritestream-creating-writeable-stream-when-file-is-deleted) - Discussion on stream rotation issues (discussion verified)

### Low Confidence (Unverified Sources)
- [rotating-file-stream npm package](https://blog.csdn.net/wsad0532/article/details/143206992) - Chinese blog post about rotation package (not verified)
- [Node.js Zlib模块详解 (Chinese)](https://blog.csdn.net/gusushantang/article/details/141157998) - Chinese tutorial on zlib (not verified)
- [告别繁琐压缩：Node.js Zlib与Archiver](https://blog.csdn.net/gitblog_00368/article/details/151810218) - Chinese article on compression (not verified)

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| **Stream rotation pattern** | HIGH | Based on official Node.js stream documentation |
| **Compression strategy** | HIGH | Based on official Node.js zlib documentation |
| **Async fire-and-forget** | MEDIUM | Standard pattern, verified by community practice |
| **Midnight scheduling** | MEDIUM | Standard timer usage, verified by examples |
| **File naming patterns** | MEDIUM | Industry standard, verified by Winston implementation |
| **Cleanup strategy** | LOW | No authoritative source found, best-effort recommendation |
| **Performance at scale** | LOW | No production data available, theoretical analysis only |

## Open Questions

1. **Compression queue limits:** Should we limit concurrent compression jobs? (Recommended: YES, max 2-3)
2. **Cleanup frequency:** Is per-rotation cleanup sufficient, or need periodic scans? (Recommended: Start with per-rotation, add periodic if needed)
3. **Same-day multiple rotations:** How to name files when size limit triggers multiple rotations in one day? (Recommended: Append counter: `-1`, `-2`)
4. **Disk space monitoring:** Should we check available disk space before rotation? (Recommended: NO, out of scope for v1.1)
