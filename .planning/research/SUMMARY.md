# Project Research Summary

**Project:** log-vibe (v1.1 - Log Rotation)
**Domain:** Node.js logging library with zero-dependency log rotation
**Researched:** 2025-01-18
**Confidence:** HIGH

## Executive Summary

Log-vibe is a Node.js logging library implementing log rotation as an internal concern of the FileTransport class. Research confirms that production logging libraries require daily time-based rotation, size-based rotation, gzip compression, and retention policies as table stakes features. The recommended approach maintains zero runtime dependencies by leveraging Node.js built-in modules (`node:fs`, `node:zlib`, `node:stream`, `node:path`) exclusively, avoiding external packages like `winston-daily-rotate-file` or `rotating-file-stream` that introduce heavy dependency trees.

The architecture integrates rotation seamlessly into the existing Transport interface through internal components (RotationManager, StreamManager, RotationExecutor) that operate transparently to users. Critical risks identified include stream data loss during rotation (must use `stream.end()` not `stream.destroy()`), file handle leaks from improper cleanup (requires try-finally blocks), and multi-process race conditions (document as unsupported for v1.1). Mitigation strategies emphasize graceful stream handoff, async fire-and-forget compression, and comprehensive error handling with try-finally blocks to ensure cleanup even when rotation fails.

## Key Findings

### Recommended Stack

**Zero runtime dependencies** - core value proposition validated by research. All rotation functionality built using Node.js built-in modules only.

**Core technologies:**
- `node:fs` - File operations (stat, rename, unlink, readdir) - HIGH confidence, official docs confirm all needed operations
- `node:zlib` - Gzip compression via `createGzip()` and `pipeline()` - HIGH confidence, streaming compression prevents event loop blocking
- `node:stream` - Safe stream handling with `pipeline()` - HIGH confidence, prevents data loss during rotation
- `node:path` - Cross-platform path manipulation - HIGH confidence, critical for Windows compatibility

No external dependencies required. Implementation avoids anti-patterns like `winston-daily-rotate-file` (20+ transitive dependencies), `file-stream-rotator` (unmaintained since 2023), and `fs.watch()` (unreliable for rotation detection).

### Expected Features

**Must have (table stakes):**
- **Daily time-based rotation** - Standard practice across Log4j, Winston, Python logging; users expect midnight rotation with date-stamped filenames
- **Size-based rotation** - Prevents disk space exhaustion; industry standard 10-100MB thresholds
- **Gzip compression** - 80-90% storage reduction; de facto standard across all production loggers
- **Retention policies** - Prevents disk exhaustion; compliance requirements; 7-30 day defaults common
- **Atomic rotation** - Prevents log loss; avoids "copytruncate" race conditions
- **Graceful shutdown** - Flush buffers before closing; prevents data loss on exit

**Should have (competitive):**
- **Zero-dependency rotation** - Most Node.js libs rely on external logrotate; cross-platform out-of-box
- **Hybrid rotation strategy** - Combines daily + size-based; rare in Node.js but standard in Log4j 2
- **Beautiful filename patterns** - Developer-friendly `app.2025-01-18.log.gz` vs cryptic naming
- **No data loss architecture** - Atomic operations; explicit close() contract

**Defer (v2+):**
- Multiple rotation strategies (keep simple hybrid approach)
- Custom compression algorithms (gzip sufficient)
- Advanced retention rules (age-based sufficient for MVP)
- Log rotation monitoring (nice-to-have for operations)

### Architecture Approach

Log rotation implemented as internal concern of FileTransport, maintaining existing Transport interface while adding rotation capabilities transparently. Four internal components coordinate: RotationManager (monitors file size/creation date, triggers rotation), StreamManager (manages fs.WriteStream lifecycle, handles graceful rotation), RotationExecutor (performs rotation sequence: close → rename → create new stream → trigger async workers), and async workers (Compressor and Cleanup run non-blocking via setImmediate).

**Major components:**
1. **FileTransport** - Public API, implements Transport interface, remains unchanged from user perspective
2. **RotationManager** - Monitors file state, decides when to rotate (size or time-based)
3. **StreamManager** - Manages fs.WriteStream lifecycle, ensures graceful handoff during rotation
4. **RotationExecutor** - Performs atomic rotation sequence, triggers async compression/cleanup
5. **Compressor** - Async gzip compression using zlib streams, fire-and-forget to avoid blocking
6. **Cleanup** - Async retention enforcement, removes files exceeding retention period

Key pattern: **Internal concern, external simplicity** - users configure rotation via FileTransport constructor options, rotation happens transparently without breaking existing code.

### Critical Pitfalls

1. **Stream Data Loss on Rotation** - ALWAYS use `stream.end()` instead of `stream.destroy()`, wait for 'finish' event before considering stream closed, track pending writes during rotation. Consequence: silent log loss during every rotation event.

2. **File Handle Leaks During Frequent Rotation** - Wrap rotation in try-finally to ensure cleanup always runs, track open file handles, rate limit rotation to prevent rapid successive cycles. Consequence: application crashes with "EMFILE: too many open files."

3. **Race Conditions in Multi-Process Environments** - Document limitation (multi-process unsupported for v1.1), recommend external logrotate for production clusters, consider PID-based file naming. Consequence: corrupted logs, EBADF errors after rotation.

4. **Compression Blocking the Event Loop** - Defer compression with setImmediate, use stream-based zlib.createGzip(), add size threshold (only compress <50MB files). Consequence: application freeze during compression of large files.

5. **Breaking Backward Compatibility** - Rotation config must be optional parameter, default to no rotation, test with existing API `new FileTransport('./app.log')`. Consequence: breaking change forces semver major bump.

## Implications for Roadmap

Based on combined research (feature dependencies, architecture patterns, pitfall prevention), suggested phase structure:

### Phase 1: Core Rotation Infrastructure
**Rationale:** Foundation for all rotation features; must be implemented first to avoid data loss pitfall. Size-based rotation simpler to test than time-based, provides immediate value.
**Delivers:** Size-based rotation with atomic file switching, RotationConfig interface, rotating flag with write-gating, stream close/rename/create sequence
**Addresses:** Size-based rotation (table stakes), atomic rotation (table stakes)
**Avoids:** Stream data loss (Pitfall 1) - proper stream.end() usage; file handle leaks (Pitfall 2) - try-finally cleanup

**Implementation:**
- RotationConfig interface with defaults (maxSize, pattern, compress, retention)
- `rotating` flag to skip writes during rotation
- `rotate()` skeleton: close stream → rename file → create new stream
- Size checking via `fs.stat()` after each write
- Tests: verify no data loss during rotation, verify size limit trigger

### Phase 2: Time-based Rotation
**Rationale:** Daily rotation is table stakes; depends on Phase 1 infrastructure. Simpler than compression (no async workers), complements size-based rotation.
**Delivers:** Midnight scheduling, date-based filename generation, timer cleanup on close()
**Addresses:** Daily time-based rotation (table stakes), date-stamped filenames (table stakes)
**Implements:** Midnight scheduling pattern from ARCHITECTURE.md

**Implementation:**
- Calculate milliseconds until next midnight
- setTimeout with automatic rescheduling after rotation
- Call timer.unref() to prevent keeping process alive
- Date-based filename: `app-2025-01-18.log`
- Tests: verify rotation at midnight, verify rescheduling, verify timer cleanup

### Phase 3: Async Compression
**Rationale:** Compression is table stakes but depends on having rotated files to compress. Non-blocking implementation critical to avoid event loop blocking pitfall.
**Delivers:** Gzip compression of rotated files, non-blocking async execution, error handling
**Addresses:** Gzip compression (table stakes)
**Avoids:** Event loop blocking (Pitfall 4) - defer compression with setImmediate
**Uses:** `node:zlib` createGzip() and `node:stream` pipeline()

**Implementation:**
- Fire-and-forget compression via setImmediate
- Stream pipeline: read stream → gzip → write stream
- Delete original after successful compression
- Log errors but don't crash
- Tests: verify .gz file creation, verify original deletion, verify non-blocking writes

### Phase 4: Retention Cleanup
**Rationale:** Retention policies are table stakes; depends on compression (cleanup .gz files). Simpler than other phases, straightforward file age checking.
**Delivers:** Retention policy enforcement, async cleanup worker, configurable retention period
**Addresses:** Retention policies (table stakes)
**Implements:** Cleanup flow from ARCHITECTURE.md

**Implementation:**
- Track rotated file count in memory
- Trigger cleanup when count exceeds retention
- Async file scanning via fs.readdir()
- Delete files older than retention period
- Tests: verify old files deleted, verify newest kept

### Phase 5: Edge Cases & Error Handling
**Rationale:** Must address remaining pitfalls after core features work. Multi-process limitation documented, cross-platform support validated.
**Delivers:** Comprehensive error handling, Windows compatibility testing, multi-process documentation
**Addresses:** Graceful shutdown (table stakes), cross-platform support
**Avoids:** Incomplete cleanup (Pitfall 8) - try-finally blocks; Windows breakage (Pitfall 6) - path.join() usage

**Implementation:**
- Try-finally blocks around all rotation logic
- Stream error handling during rotation
- Compression failure recovery
- Permission error handling (EACCES, ENOSPC, EROFS)
- Cross-platform path handling with path.join()
- Document multi-process limitation
- Tests: error path simulation, Windows path handling, rapid rotation stress test

### Phase Ordering Rationale

- **Dependency-driven:** Phase 2 (time-based) requires Phase 1 infrastructure; Phase 3 (compression) requires Phase 1 to produce rotated files; Phase 4 (retention) requires Phase 3 to have compressed files
- **Complexity gradient:** Start with size-based (simpler, deterministic), add time-based (timer logic), then async operations (compression), then cleanup (straightforward file deletion)
- **Pitfall avoidance:** Early phases focus on critical data loss prevention (stream lifecycle), later phases handle performance and compatibility
- **Value delivery:** Each phase delivers complete, testable functionality; size-based rotation provides immediate value before daily rotation added

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 3 (Compression):** Performance characteristics at scale need benchmarking; compression overhead with multi-gigabyte files untested
- **Phase 5 (Error Handling):** Edge cases around disk full (ENOSPC) and read-only filesystems (EROFS) may need platform-specific handling

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Core Rotation):** Stream rotation pattern well-documented in Node.js official docs; HIGH confidence sources
- **Phase 2 (Time-based Rotation):** Midnight scheduling standard pattern; verified by Winston implementation
- **Phase 4 (Retention):** File age checking and deletion straightforward; no complex integration

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All built-in modules verified via official Node.js documentation |
| Features | HIGH | Table stakes features confirmed across Log4j, Winston, Python logging sources |
| Architecture | HIGH | Stream rotation patterns backed by official Node.js docs; verified by Winston implementation |
| Pitfalls | HIGH | Critical pitfalls validated by real-world GitHub issues and official documentation |

**Overall confidence:** HIGH

All research areas grounded in official documentation (Node.js APIs) or verified real-world implementations (Winston, Log4j 2, Python logging). Critical pitfalls confirmed by actual GitHub issues from production libraries. No speculative features or unproven patterns recommended.

### Gaps to Address

- **Compression overhead:** Exact performance impact needs benchmarking during Phase 3 implementation; add performance tests for large files (100MB+)
- **Large file handling:** Behavior with multi-gigabyte log files needs testing; may need chunking or streaming optimization
- **Concurrent writes:** Multi-process race conditions documented as unsupported; future consideration for IPC coordination
- **Retention precision:** Whether to use mtime or creation time for age calculation; decision needed during Phase 4

All gaps are implementation details, not architectural decisions. Can be addressed during phase execution without requiring upfront research.

## Sources

### Primary (HIGH confidence)
- **Node.js Stream API Documentation** - Authoritative source for stream behavior, stream.end(), backpressure, stream lifecycle
- **Node.js File System Documentation** - Official fs API including fs.createWriteStream(), fs.rename(), fs.stat()
- **Node.js Zlib Documentation** - Official zlib module docs for createGzip(), compression streams, pipeline()
- **Node.js Timer Documentation** - Official timer API including setTimeout(), unref()
- **Apache Log4j 2 - Rolling File Appenders** - Comprehensive guide on triggering policies, rollover strategies, compression patterns

### Secondary (MEDIUM confidence)
- **Winston Daily Rotate File GitHub** - Production-tested rotation implementation; verified repository exists, active maintenance
- **cluster + rotating file + large log file = crash (GitHub Issue)** - Real-world multi-process race condition issue
- **winston daily rotate does not respect file size limit #360** - Actual production issue confirming size-based rotation challenges
- **winston-daily-rotate-file issues** - Collection of real-world pitfalls from production usage
- **Understanding Node.js file locking (LogRocket)** - Verified article on file locking challenges in Node.js
- **11 Best Practices for Logging in Node.js (BetterStack)** - Community consensus on logging library expectations
- **What Is Log Rotation – Edge Delta** - 2025 article on log rotation benefits and compression ratios (80-90% reduction verified)
- **Mastering Log Rotation in Linux with Logrotate** - Standard rotation patterns and naming conventions
- **A Complete Guide to Managing Log Files with Logrotate (BetterStack)** - File management best practices

### Tertiary (LOW confidence)
- **A Comparison of Winston, Bunyan, Pino, and Log4js (Medium)** - Library feature comparison (needs official docs verification)
- **Log Rotation on Production (Blog)** - Production patterns (needs source verification)
- **rotating-file-stream npm package (Chinese blog)** - Rotation package discussion (not verified)

---
*Research completed: 2025-01-18*
*Ready for roadmap: yes*
