# Domain Pitfalls

**Domain:** Node.js Log Rotation Implementation
**Project:** log-vibe
**Researched:** 2026-01-18
**Focus:** Zero-dependency log rotation for FileTransport

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

### Pitfall 1: Stream Data Loss on Rotation

**What goes wrong:** Closing a write stream prematurely during rotation causes log entries to be lost. When `stream.destroy()` is called instead of `stream.end()`, or when the stream is closed before pending writes are flushed, in-flight log entries disappear.

**Why it happens:**
- Node.js write streams are asynchronous; `write()` returns before data is actually flushed
- The stream has an internal buffer that must be drained before closing
- During rotation, there's a race condition between closing the old stream and creating the new one
- Multiple concurrent log calls may be in-flight during rotation

**Consequences:**
- Log entries lost during every rotation event
- Silent data loss (no error thrown)
- Critical error logs may be missing when debugging issues
- Violates the core promise of a logging library

**Prevention:**
- **ALWAYS use `stream.end()` instead of `stream.destroy()`** - This ensures data is flushed before closing
- **Wait for the 'finish' event** before considering the stream closed
- **Track pending writes** during rotation - don't close until all writes are acknowledged
- **Use a write queue** to serialize operations during rotation transitions
- **Add tests** that verify log count before and after rotation

**Detection:**
- Monitor log file size drops during rotation (should never decrease)
- Add instrumentation to count written vs. rotated entries
- Integration test with high-volume logging during rotation

**Sources:**
- [Node.js Stream API Documentation](https://nodejs.org/api/stream.html) - HIGH confidence (official docs)
- [GitHub Issue #341: Synchronous flush + close](https://github.com/nodejs/readable-stream/issues/341) - HIGH confidence
- [Understanding Node.js Streams](https://blog.dennisokeeffe.com/blog/2024-07-05-understanding-node-js-streams) - MEDIUM confidence

---

### Pitfall 2: File Handle Leaks During Frequent Rotation

**What goes wrong:** When rotation happens frequently (e.g., size-based rotation on high-volume logs), file handles accumulate without being properly released. This eventually hits the OS limit (ulimit) and the application crashes with "EMFILE: too many open files."

**Why it happens:**
- Old streams aren't properly closed before creating new ones
- Error during rotation prevents cleanup code from running
- Multiple rotation triggers happen in quick succession
- No proper error handling in the rotation code path

**Consequences:**
- Application crashes after hitting file descriptor limit
- Requires manual intervention to close file handles or restart
- Production outage with logs unavailable for debugging
- Particularly bad in long-running server processes

**Prevention:**
- **Wrap rotation in try-finally** - Ensure cleanup code always runs
- **Track open file handles** - Add monitoring/logging for active streams
- **Rate limit rotation** - Prevent multiple rotations within time window
- **Use 'close' event confirmation** - Only consider rotation complete after stream emits 'close'
- **Add file handle monitoring** - Log warning if handle count grows unexpectedly
- **Test rapid rotation** - Integration test with 100+ rotations in quick succession

**Detection:**
- Monitor `process.cwd()` for open file descriptors
- Add tests that rapidly rotate and check handle count
- Log stream lifecycle events (create, rotate, close)

**Sources:**
- [Node.js File System Best Practices](https://nodejs.org/en/learn/modules/backpressuring-in-streams) - HIGH confidence
- [10 Common Mistakes in Node.js Backpressure Handling](https://medium.com/@arunangshudas/10-common-mistakes-in-node-js-backpressure-handling-df304f4a71e2) - MEDIUM confidence
- [Understanding Node.js file locking](https://blog.logrocket.com/understanding-node-js-file-locking/) - MEDIUM confidence

---

### Pitfall 3: Race Conditions in Multi-Process Environments

**What goes wrong:** When multiple Node.js processes (e.g., PM2 cluster, worker_threads) write to the same log file, rotation creates race conditions. One process rotates the file while another is still writing, causing corrupted logs or failed writes.

**Why it happens:**
- No coordination between processes for rotation timing
- File rename operation breaks other processes' file handles
- Multiple processes simultaneously trigger rotation
- OS file locking is insufficient for cross-process coordination

**Consequences:**
- Corrupted log files with interleaved or truncated entries
- Write errors after rotation (EBADF, ENOENT)
- Lost log entries during rotation
- Particularly problematic in production with clustered Node.js apps

**Prevention:**
- **Document limitation** - Clearly state that rotation doesn't support multi-process
- **Add process detection** - Warn if running in cluster mode
- **Recommend external rotation** - Suggest logrotate/linux utilities for production
- **Add file-based locking** - Use advisory locks (though still imperfect)
- **Unique file names per process** - Append PID to log file name
- **Future phase consideration** - Add proper IPC coordination for rotation

**Detection:**
- Test with `worker_threads` or `child_process`
- Integration test with PM2 cluster mode
- Check for corrupted log files after simulated rotation

**Sources:**
- [cluster + rotating file + large log file = crash](https://github.com/trentm/node-bunyan/issues/117) - HIGH confidence (real-world issue)
- [winston daily rotate does not respect file size limit #360](https://github.com/winstonjs/winston-daily-rotate-file/issues/360) - HIGH confidence
- [How to handle concurrent file write requests](https://stackoverflow.com/questions/36010450/how-to-handle-concurrent-file-write-requests-on-a-node-server-with-socket-io) - MEDIUM confidence
- [A deep dive into file locking with NodeJS](https://dev.to/sebastianrath/today-i-released-a-version-control-software-for-2d-3d-artists-and-graphic-designers-made-in-angular-electron-nck) - MEDIUM confidence

---

## Moderate Pitfalls

Mistakes that cause delays or technical debt.

### Pitfall 4: Compression Blocking the Event Loop

**What goes wrong:** Synchronous compression of rotated log files blocks the Node.js event loop, causing application freezes. For large log files (100MB+), compression can take seconds, during which the application is unresponsive.

**Why it happens:**
- Using synchronous compression (zlib.gzipSync) in the main rotation flow
- No awareness of zero-dependency constraint (can't spawn worker threads easily)
- Compressing inline during rotation instead of deferring
- Not accounting for file size before attempting compression

**Consequences:**
- Application freeze during compression (bad for user experience)
- Increased latency for all requests during rotation
- Memory spike during compression (file loaded into memory)
- Particularly bad for high-traffic services

**Prevention:**
- **Defer compression** - Use `setImmediate` or `process.nextTick` to avoid blocking
- **Stream-based compression** - Use `zlib.createGzip()` with pipes (if staying zero-dep)
- **Size threshold** - Only compress files below certain size (e.g., 50MB)
- **Async compression** - Use `zlib.gzip()` with promise wrapper
- **Background compression** - Flag file for compression, handle in next tick
- **Consider external tools** - Recommend logrotate with compression for production

**Detection:**
- Measure event loop delay during rotation
- Add performance tests with large log files
- Monitor memory during compression

**Sources:**
- [HTTP Compression in Node.js](https://www.ayrshare.com/http-compression-in-node-js-a-dive-into-gzip-deflate-and-brotli/) - MEDIUM confidence
- [Managing PM2 Logs: Preventing Performance Issues](https://dev.to/manojspace/managing-pm2-logs-preventing-performance-issues-in-nodejs-applications-c6) - MEDIUM confidence
- [Too much logging is killing your app](https://medium.com/@bbangjoa/too-much-logging-is-killing-your-app-practical-logging-optimization-for-node-js-c1b7cf7ba7b5) - MEDIUM confidence

---

### Pitfall 5: Breaking Backward Compatibility

**What goes wrong:** Adding rotation configuration to FileTransport constructor changes the API in a breaking way. Existing code that does `new FileTransport('./app.log')` breaks if rotation config becomes required or changes the constructor signature.

**Why it happens:**
- Adding required rotation parameters to constructor
- Not providing default values for new parameters
- Changing the second parameter from `options` to `rotationConfig`
- Not testing with existing usage patterns

**Consequences:**
- Breaking change forces semver major bump (v2.0.0)
- Existing users' code breaks on upgrade
- Migration pain and negative community reaction
- Violates project's backward compatibility principle

**Prevention:**
- **Rotation is optional** - Default to no rotation (backward compatible)
- **Options object pattern** - Add rotation as optional property to options
- **Separate class** - Consider `RotatingFileTransport` extends `FileTransport`
- **Test with existing API** - Ensure `new FileTransport('./app.log')` still works
- **Document migration path** - If breaking, provide clear upgrade guide
- **Feature detection** - Use TypeScript optional properties to maintain compatibility

**Detection:**
- Run existing test suite after changes
- Test with code using old API
- Add backward compatibility tests

**Sources:**
- [Node.js Logging Best Practices](https://www.hyperdx.io/blog/node-js-logging-best-practices) - MEDIUM confidence
- [11 Best Practices for Logging in Node.js](https://betterstack.com/community/guides/logging/nodejs-logging-best-practices/) - MEDIUM confidence
- Project constraint: "Must maintain backward compatibility" - HIGH confidence

---

### Pitfall 6: Cross-Platform Path Handling

**What goes wrong:** Log file rotation logic assumes Unix-style paths and file operations, which breaks on Windows. Issues include backslash handling, drive letters, and different file locking behavior.

**Why it happens:**
- Using string concatenation for paths instead of `path.join()`
- Assuming `/` separator works on Windows
- Not testing on Windows during development
- Different file permissions semantics (chmod doesn't work on Windows)

**Consequences:**
- Library doesn't work on Windows
- Negative reviews from Windows users
- Support burden for Windows-specific issues
- Reduced adoption (many developers use Windows)

**Prevention:**
- **ALWAYS use `path.join()`** - Never use string concatenation for paths
- **Use `path.parse()`** - Parse file paths correctly for rotation naming
- **Test on Windows** - Add Windows to CI (GitHub Actions supports it)
- **Avoid Unix-specific APIs** - Don't use `fs.chmod()`, `fs.symlink()`
- **Handle drive letters** - Be aware of `C:\` prefix in Windows paths
- **Use `path.sep`** - Reference platform-specific separator if needed

**Detection:**
- Add Windows to CI pipeline
- Manual testing on Windows machines
- Path handling tests with Windows-style paths

**Sources:**
- [Windows logs vs Linux logs comparison](https://blog.imkhoi.com/posts/2023/10/windows-logs-vs-linux-logs-and-how-they-help-with-vulnerability-scanning/) - LOW confidence
- [Equivalent of LogRotate for Windows](https://serverfault.com/questions/358172/equivalent-of-logrotate-for-windows) - MEDIUM confidence
- [Demystifying Log Rotation: A Comprehensive Guide](https://www.wallarm.com/what/log-rotation) - LOW confidence

---

## Minor Pitfalls

Mistakes that cause annoyance but are fixable.

### Pitfall 7: Rotation Check Performance Degradation

**What goes wrong:** Checking file size on every log write (to trigger rotation) causes performance degradation. As logging volume increases, the overhead of `fs.stat()` calls accumulates.

**Why it happens:**
- Calling `fs.stat()` before every write to check size
- Not caching the file size between writes
- No debouncing or sampling of rotation checks
- Checking rotation on every log entry instead of periodically

**Consequences:**
- Logging performance degrades as files grow
- Increased I/O pressure from stat calls
- Unnecessary system calls in hot path
- Particularly bad for high-volume logging (1000+ logs/second)

**Prevention:**
- **Sample-based checks** - Only check size every N writes (e.g., 100)
- **Time-based checks** - Check for rotation every N seconds
- **Track bytes written** - Maintain counter instead of stat calls
- **Background checks** - Use setInterval for periodic rotation checks
- **Lazy checks** - Only check when writing, but cache the result
- **Make it configurable** - Let users tune check frequency

**Detection:**
- Benchmark logging performance with large files
- Profile I/O operations during high-volume logging
- Test with 10,000+ log writes

**Sources:**
- [Too much logging is killing your app](https://medium.com/@bbangjoa/too-much-logging-is-killing-your-app-practical-logging-optimization-for-node-js-c1b7cf7ba7b5) - MEDIUM confidence
- [Express.js Performance Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html) - HIGH confidence
- [Node.js Console Log Performance Impact](https://www.linkedin.com/posts/prajjwal-soni-5b0741291_why-a-simple-consolelog-can-hurt-a-production-activity-7408088643657146368-o8oH) - LOW confidence

---

### Pitfall 8: Incomplete Cleanup on Errors

**What goes wrong:** When an error occurs during rotation (e.g., permission denied, disk full), cleanup is incomplete. Old streams aren't closed, temporary files aren't deleted, and the system is left in an inconsistent state.

**Why it happens:**
- Error thrown mid-rotation before cleanup code
- No try-finally block around rotation logic
- Assuming disk operations never fail
- Not handling edge cases (disk full, read-only filesystem)

**Consequences:**
- File handle leaks after failed rotation
- Temporary files accumulate
- Logs continue writing to wrong file
- Difficult to debug (no error message)

**Prevention:**
- **Try-finally blocks** - Ensure cleanup runs even if errors occur
- **Comprehensive error handling** - Catch all possible error types
- **Cleanup temp files** - Delete partial rotation artifacts on error
- **Log errors clearly** - Provide actionable error messages
- **State recovery** - Ability to detect and recover from failed rotation
- **Test error paths** - Simulate ENOSPC, EACCES, EROFS

**Detection:**
- Integration tests with simulated disk errors
- Test with read-only filesystem
- Monitor file handle count after failed rotation

**Sources:**
- [winston-daily-rotate-file issues](https://github.com/winstonjs/winston-daily-rotate-file/issues) - HIGH confidence (real issues)
- [ENOENT Exception from Daily Rotate File #36](https://github.com/winstonjs/winston-daily-rotate-file/issues/36) - HIGH confidence
- [On rotation the new file's owner is not always the same #374](https://github.com/winstonjs/winston-daily-rotate-file/issues/374) - MEDIUM confidence

---

### Pitfall 9: Confusing Rotation Naming Schemes

**What goes wrong:** Rotated files have unclear or inconsistent naming patterns, making it difficult for users to find and manage log files. Examples include unclear timestamps, non-chronological ordering, or non-standard extensions.

**Why it happens:**
- No standard naming convention for rotated files
- Using timestamps that don't sort chronologically
- Not including enough information in filename
- Not considering how users will find and grep logs

**Consequences:**
- Users can't find the log file they need
- Difficult to automate log management
- Poor user experience
- Support burden (explaining naming scheme)

**Prevention:**
- **ISO 8601 timestamps** - Use `YYYY-MM-DD` format for chronological sorting
- **Clear naming pattern** - `app.log.2025-01-18` or `app-2025-01-18.log`
- **Compression extension** - `.gz` suffix for compressed files
- **Document naming** - Clear documentation of file naming pattern
- **Configurable naming** - Allow users to customize naming pattern
- **Avoid ambiguous formats** - Don't use `MM-DD-YY` (which century?)

**Detection:**
- User testing with log file navigation
- Documentation review for clarity
- Test sorting of rotated files

**Sources:**
- [Mastering Log Rotation in Linux with Logrotate](https://www.dash0.com/guides/log-rotation-linux-logrotate) - MEDIUM confidence
- [A Complete Guide to Managing Log Files with Logrotate](https://betterstack.com/community/guides/logging/how-to-manage-log-files-with-logrotate-on-ubuntu-20-04/) - MEDIUM confidence
- [What Is Log Rotation – Benefits, How It Works, Limitations](https://edgedelta.com/company/knowledge-center/what-is-log-rotation) - MEDIUM confidence

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| **Stream Lifecycle Management** | Data loss on rotation (Pitfall 1) | Use `stream.end()`, wait for 'finish' event, track pending writes |
| **File Handle Management** | Handle leaks (Pitfall 2) | Try-finally cleanup, rate limit rotation, monitor handle count |
| **Multi-Process Considerations** | Race conditions (Pitfall 3) | Document limitation, recommend external rotation, add process detection |
| **Compression Implementation** | Event loop blocking (Pitfall 4) | Defer compression, use streams, add size threshold |
| **API Design** | Breaking compatibility (Pitfall 5) | Optional rotation, options pattern, test existing API |
| **Cross-Platform Support** | Windows compatibility (Pitfall 6) | Use `path.join()`, test on Windows, avoid Unix APIs |
| **Performance Optimization** | Check overhead (Pitfall 7) | Sample-based checks, track bytes written, make configurable |
| **Error Handling** | Incomplete cleanup (Pitfall 8) | Try-finally blocks, comprehensive error handling, test error paths |
| **User Experience** | Confusing file names (Pitfall 9) | ISO 8601 timestamps, clear patterns, configurable naming |

---

## Zero-Dependency Constraints

Specific challenges due to zero-dependency philosophy:

### No `chokidar` for File Watching

**Challenge:** Can't use file watching libraries for external rotation detection.

**Solution:**
- Manual `fs.watch()` with proper error handling
- Or don't support external rotation (document limitation)
- Or poll file size periodically

### No `zlib` Stream Wrappers

**Challenge:** Can't use convenience libraries for compression streams.

**Solution:**
- Use Node.js built-in `zlib.createGzip()` (still zero-dep)
- Pipe read stream to gzip stream to write stream
- Handle stream errors manually

### No `lockfile` or `proper-lockfile`

**Challenge:** Can't use file locking libraries for multi-process coordination.

**Solution:**
- Use `fs.open()` with `wx` flag (exclusive create)
- Or document that multi-process isn't supported
- Or use PID-based file naming

### No `dayjs` or `date-fns`

**Challenge:** Can't use date libraries for timestamp formatting.

**Solution:**
- Use `Date` object with manual formatting
- Or `Intl.DateTimeFormat` (built-in)
- ISO 8601 format is simplest

---

## Testing Strategy

To avoid these pitfalls, include tests for:

### Stream Lifecycle Tests
- Log count before and after rotation (no data loss)
- Rotation with in-flight writes
- Rapid successive rotations
- Stream close confirmation

### File Handle Tests
- File handle count before/after rotation
- Rotation with 100+ cycles
- Error during rotation (handle still released?)

### Error Path Tests
- Disk full simulation (ENOSPC)
- Permission denied (EACCES)
- Read-only filesystem (EROFS)
- Invalid path (ENOENT)

### Performance Tests
- Logging performance with large files
- Event loop delay during compression
- Rotation check overhead
- High-volume logging during rotation

### Cross-Platform Tests
- Windows path handling
- Mixed slash styles
- Drive letter handling
- File permissions on Windows

### Integration Tests
- PM2 cluster mode (multi-process)
- High-volume logging (10,000+ entries)
- Long-running process (24+ hours)
- Rotation at midnight (time-based)

---

## Sources

### HIGH Confidence (Official Documentation)
- [Node.js Stream API Documentation](https://nodejs.org/api/stream.html)
- [Node.js File System Documentation](https://nodejs.org/api/fs.html)
- [Express.js Performance Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)

### HIGH Confidence (Real-World Issues)
- [cluster + rotating file + large log file = crash](https://github.com/trentm/node-bunyan/issues/117)
- [winston daily rotate does not respect file size limit #360](https://github.com/winstonjs/winston-daily-rotate-file/issues/360)
- [winston-daily-rotate-file issues](https://github.com/winstonjs/winston-daily-rotate-file/issues)
- [GitHub Issue #341: Synchronous flush + close](https://github.com/nodejs/readable-stream/issues/341)

### MEDIUM Confidence (Verified Sources)
- [Understanding Node.js file locking](https://blog.logrocket.com/understanding-node-js-file-locking/)
- [10 Common Mistakes in Node.js Backpressure Handling](https://medium.com/@arunangshudas/10-common-mistakes-in-node-js-backpressure-handling-df304f4a71e2)
- [Node.js Logging Best Practices](https://www.hyperdx.io/blog/node-js-logging-best-practices)
- [11 Best Practices for Logging in Node.js](https://betterstack.com/community/guides/logging/nodejs-logging-best-practices/)
- [Too much logging is killing your app](https://medium.com/@bbangjoa/too-much-logging-is-killing-your-app-practical-logging-optimization-for-node-js-c1b7cf7ba7b5)
- [Managing PM2 Logs: Preventing Performance Issues](https://dev.to/manojspace/managing-pm2-logs-preventing-performance-issues-in-nodejs-applications-c6)
- [HTTP Compression in Node.js](https://www.ayrshare.com/http-compression-in-node-js-a-dive-into-gzip-deflate-and-brotli/)
- [Understanding Node.js Streams](https://blog.dennisokeeffe.com/blog/2024-07-05-understanding-node-js-streams)
- [Mastering Log Rotation in Linux with Logrotate](https://www.dash0.com/guides/log-rotation-linux-logrotate)
- [A Complete Guide to Managing Log Files with Logrotate](https://betterstack.com/community/guides/logging/how-to-manage-log-files-with-logrotate-on-ubuntu-20-04/)
- [How to handle concurrent file write requests](https://stackoverflow.com/questions/36010450/how-to-handle-concurrent-file-write-requests-on-a-node-server-with-socket-io)

### LOW Confidence (Unverified - Needs Validation)
- [Windows logs vs Linux logs comparison](https://blog.imkhoi.com/posts/2023/10/windows-logs-vs-linux-logs-and-how-they-help-with-vulnerability-scanning/)
- [Demystifying Log Rotation: A Comprehensive Guide](https://www.wallarm.com/what/log-rotation)
- [Node.js Console Log Performance Impact](https://www.linkedin.com/posts/prajjwal-soni-5b0741291_why-a-simple-consolelog-can-hurt-a-production-activity-7408088643657146368-o8oH)
