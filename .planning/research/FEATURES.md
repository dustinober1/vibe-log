# Feature Landscape

**Domain:** Logging library with log rotation
**Researched:** 2025-01-18
**Focus:** Log rotation features for production logging libraries

## Table Stakes

Features users expect in a production logging library. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Daily time-based rotation** | Standard practice for log organization; aligns with operational workflows (daily backups, analysis) | Medium | Rotate at midnight with date-stamped filenames |
| **Size-based rotation** | Prevents single log file from consuming all disk space; critical for high-volume applications | Medium | Typical threshold: 10-100MB per file |
| **Gzip compression** | Reduces storage costs by 80-90%; standard industry practice | Low | Gzip is universally available; 10-20% of original size |
| **Retention policies** | Prevents disk exhaustion; compliance requirements (data retention) | Low | Delete files older than X days |
| **Date-stamped filenames** | Essential for log navigation and manual inspection | Low | Format: `app.YYYY-MM-DD.log.gz` |
| **Atomic rotation** | Prevents log loss during rotation; no "copytruncate" data loss | Medium | Avoid race conditions during rotation |
| **Graceful shutdown** | Prevents data loss on application exit | Medium | Flush buffers before closing |

### Industry Standards (HIGH Confidence)

**Daily Rotation:**
- Log4j 2: `TimeBasedTriggeringPolicy` with `filePattern="%d{yyyy-MM-dd}"`
- Winston: `DailyRotateFile` transport
- Python: `logging.handlers.TimedRotatingFileHandler` with `when='midnight'`
- Pino: Uses `pino-rotating-file` or external logrotate

**Size-Based Rotation:**
- Log4j 2: `SizeBasedTriggeringPolicy` (default 10MB)
- Winston: `maxsize` option in transports
- Python: `RotatingFileHandler` with `maxBytes`
- Industry standard: 10-100MB thresholds

**Compression:**
- Log4j 2: Automatic based on file extension (`.gz`, `.zip`)
- Python: Custom rotator functions for gzip
- Winston: `zippedArchive: true`
- Industry: Gzip is the de facto standard (80-90% reduction)

**Retention:**
- Log4j 2: `DefaultRolloverStrategy` with `max` attribute
- Python: `backupCount` parameter
- Winston: `maxFiles` option
- Common defaults: 7-30 days

## Differentiators

Features that set log-vibe apart from competitors.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Zero-dependency rotation** | No external tools (logrotate) required; works out-of-box on all platforms | High | Most Node.js libs rely on external logrotate |
| **Hybrid rotation strategy** | Combines daily + size-based; prevents daily files from growing too large | Medium | Log4j 2 supports this; rare in Node.js |
| **Synchronous rotation** | Predictable performance; no background job surprises | Medium | Async rotation can cause issues on shutdown |
| **Beautiful filename patterns** | Developer-friendly defaults; sensible naming conventions | Low | `app.2025-01-18.log.gz` vs `app.log.1.gz` |
| **No data loss architecture** | Atomic file operations; explicit close() contract | High | Avoids "copytruncate" race conditions |

### Competitive Analysis

**Winston:**
- ✅ Multiple transports (file, console, etc.)
- ❌ Requires external packages for rotation (`winston-daily-rotate-file`)
- ❌ Defaults are poor (no timestamp by default)
- ❌ Heavy dependencies

**Pino:**
- ✅ Extremely fast (3-5x faster than Winston)
- ❌ No built-in file rotation (requires `pino-rotating-file` or external logrotate)
- ❌ Requires external log shippers for rotation

**Log4js-node:**
- ❌ No built-in rotation (relies on logrotate)
- ❌ Doesn't support JSON logging by default

**log-vibe (our project):**
- ✅ Zero dependencies (beautiful, flexible logging without dependencies)
- ✅ Built-in rotation (daily + size-based)
- ✅ Sensible defaults (date-stamped filenames, gzip compression)
- ✅ Transport abstraction (extensible architecture)

## Anti-Features

Features to explicitly NOT build. Common mistakes in this domain.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Async log rotation** | Unpredictable performance; data loss on abrupt shutdown; race conditions | Synchronous rotation with explicit close() |
| **Copytruncate approach** | Small time slice between copy and truncate = data loss | Atomic file rename operations |
| **Background rotation jobs** | Surprises users; conflicts with explicit lifecycle management | Explicit rotation at log time |
| **Multiple rotation schemes** | Configuration complexity; user confusion | One sensible hybrid approach (daily + size) |
| **Compression during rotation** | Blocks application during compression (expensive) | Compress after rotation completes (non-blocking) |
| **Complex filename patterns** | Users can't find their logs; tool incompatibility | Simple, standard date-stamped filenames |

### Why These Are Anti-Features

**Async Rotation:**
- **Problem:** If app crashes during async rotation, logs are lost
- **Example:** Logrotate's `copytruncate` loses data during the gap between copy and truncate
- **Source:** [Log4j 2 documentation](https://logging.apache.org/log4j/2.x/manual/appenders/rolling-file.html) explicitly warns about this
- **Better:** Synchronous rotation at log write time

**Copytruncate:**
- **Problem:** "Very small time slice between copying and truncating, so some logging data might be lost"
- **Source:** [Logrotate documentation](https://linux.die.net/man/8/logrotate)
- **Better:** Atomic rename (create new file, then rename)

**Background Jobs:**
- **Problem:** Users don't expect background activity from a logging library
- **Example:** Rotation happening at midnight surprises users debugging production issues
- **Better:** Explicit rotation triggered by log writes

## Feature Dependencies

```
Transport Abstraction (v1.0) →
    ├─ File Rotation (v1.1) ← Stream Management
    │   ├─ Daily Rotation
    │   ├─ Size-Based Rotation
    │   └─ Retention Policies
    └─ Compression (v1.1) ← File System Operations
        └─ Gzip Compression
```

**Dependencies:**
- File Rotation depends on Transport Abstraction (v1.0 validated)
- Compression depends on File Rotation (need files to compress)
- Retention depends on both rotation and compression

**No circular dependencies** - clean, linear progression

## MVP Recommendation

For v1.1 MVP, prioritize:

1. **Daily rotation at midnight** (table stakes)
   - Date-stamped filenames: `app.2025-01-18.log`
   - Atomic file switching

2. **Size-based rotation for single-day files** (table stakes)
   - 100MB threshold (configurable)
   - Prevents individual daily files from becoming unwieldy

3. **Gzip compression of rotated files** (table stakes)
   - `.gz` extension added automatically
   - Non-blocking (compress after rotation)

4. **14-day retention period** (table stakes)
   - Delete files older than 14 days
   - Configurable

5. **Zero-dependency implementation** (differentiator)
   - No external logrotate required
   - Cross-platform compatibility

### Defer to Post-MVP:

- **Multiple rotation strategies** - Keep it simple for now
- **Custom compression algorithms** - Gzip is sufficient
- **Advanced retention rules** - Age-based is sufficient for MVP
- **Log rotation monitoring** - Nice-to-have for operations

## Sources

### HIGH Confidence (Official Documentation)

- [Apache Log4j 2 - Rolling File Appenders](https://logging.apache.org/log4j/2.x/manual/appenders/rolling-file.html) - Comprehensive guide on triggering policies, rollover strategies, and compression
- [Python Logging Cookbook](https://docs.python.org/3/howto/logging-cookbook.html) - Official Python documentation on file rotation with `RotatingFileHandler`

### MEDIUM Confidence (WebSearch + Official Verification)

- [Logging in Node.js: Comparison of Top 8 Libraries](https://betterstack.com/community/guides/logging/best-nodejs-logging-libraries/) - Winston, Pino, Log4js-node feature comparison
- [What Is Log Rotation – Benefits, How It Works](https://edgedelta.com/company/knowledge-center/what-is-log-rotation) - General log rotation concepts and benefits
- [Mastering Log Rotation: Keeping Your System Running Smoothly](https://dev.to/dhaval512/mastering-log-rotation-keeping-your-system-running-smoothly-3c09) - Size-based and time-based rotation overview
- [Understanding Logrotate Directives](https://dohost.us/index.php/2025/11/06/understanding-logrotate-directives-daily-weekly-rotate-compress-delaycompress-create-postrotate/) - Logrotate configuration patterns

### LOW Confidence (WebSearch Only - Needs Verification)

- [A Comparison of Winston, Bunyan, Pino, and Log4js](https://medium.com/@khanshahid9283/choosing-the-right-logging-package-for-your-node-js-6a3043a66164) - Library feature comparison (needs official docs verification)
- [Log Rotation on Production](https://daksh.be/blog/2025/01/15/log-rotation-on-production/) - Production patterns (needs source verification)
