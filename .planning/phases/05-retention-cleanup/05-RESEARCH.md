# Phase 5: Retention Cleanup - Research

**Researched:** 2026-01-18
**Domain:** Log file retention and cleanup implementation
**Confidence:** HIGH

## Summary

This phase implements automatic cleanup of old log files based on retention policy to prevent disk exhaustion. The research investigated log retention best practices, file deletion patterns, error handling strategies, and timing approaches for cleanup operations.

**Key findings:**
- **Standard approach**: Combine maxFiles (count) and maxAge (time) constraints with AND logic
- **Cleanup timing**: After rotation is simpler and more reliable than scheduled cleanup
- **Error handling**: Best-effort deletion with graceful handling of locked files
- **File selection**: Sort by filename date parsing (YYYY-MM-DD format is naturally sortable)
- **Safety mechanism**: Never delete all files - protect current active file when other files exist

**Primary recommendation:** Implement fire-and-forget cleanup triggered after rotation with best-effort deletion, sorting files by parsing YYYY-MM-DD dates from rotated filenames, and using both maxFiles AND maxAge constraints.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js fs | v25.2.1 | File system operations (readdir, unlink, stat) | Built-in, async APIs, battle-tested |
| Node.js path | Built-in | Path manipulation (dirname, basename, extname) | Cross-platform path handling |
| Node.js stream/promises | Built-in | Stream pipeline for compression (already used) | Proper error handling and cleanup |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None required | - | - | Zero-dependency philosophy maintained |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Built-in fs module | fs-extra | Adds dependency, fs.promises is sufficient |
| After-rotation cleanup | Scheduled cron/cleanup | After-rotation is simpler, no external scheduling needed |
| Filename date parsing | fs.stat mtime | Filename parsing is faster, no stat calls needed |

**Installation:**
```bash
# No additional dependencies needed
# Uses built-in Node.js modules only
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── utils/
│   ├── rotation.ts         # Existing rotation utilities
│   ├── compression.ts      # Existing compression utilities
│   └── retention.ts        # NEW: Retention cleanup utilities
├── transports/
│   └── file-transport.ts   # Extend with retention cleanup
└── types.ts                # Extend RotationConfig with retention fields
```

### Pattern 1: Retention Utility Functions
**What:** Separate utility module for retention cleanup logic
**When to use:** Keeping FileTransport focused on core transport responsibilities
**Example:**
```typescript
// Source: Research-based pattern from compression.ts and rotation.ts
// File: src/utils/retention.ts

/**
 * Parse date from rotated filename (format: base-YYYY-MM-DD.ext.N)
 *
 * @param filename - Rotated filename to parse
 * @param base - Base filename without extension
 * @param ext - File extension (e.g., '.log')
 * @returns Date parsed from filename or undefined if not a rotated file
 *
 * @remarks
 * Rotated filename format: {base}-{YYYY-MM-DD}.{ext}.{sequence}
 * Example: app-2026-01-18.log.1 → Date(2026-01-18)
 *
 * Uses UTC date to avoid timezone issues.
 */
export function parseRotatedDate(filename: string, base: string, ext: string): Date | undefined {
    // Match pattern: base-YYYY-MM-DD.ext.sequence
    const match = filename.match(new RegExp(
        `^${escapeRegExp(base)}-(\\d{4}-\\d{2}-\\d{2})${escapeRegExp(ext)}\\.\\d+$`
    ));

    if (!match) {
        return undefined;
    }

    // Parse YYYY-MM-DD format (creates date at midnight UTC)
    const dateStr = match[1];
    return new Date(dateStr + 'T00:00:00.000Z');
}

/**
 * Get sorted list of rotated log files, oldest first
 *
 * @param dir - Directory containing log files
 * @param base - Base filename without extension
 * @param ext - File extension (e.g., '.log')
 * @returns Array of filenames sorted by date (oldest first)
 *
 * @remarks
 * Scans directory for rotated files matching the pattern:
 * {base}-{YYYY-MM-DD}.{ext}.{sequence}
 *
 * Files are sorted by the date parsed from the filename.
 * YYYY-MM-DD format is naturally sortable as strings, but we parse
 * to Date objects for age calculation against maxAge.
 *
 * Includes both .gz and uncompressed rotated files.
 *
 * @example
 * ```typescript
 * const files = getSortedRotatedFiles('./logs', 'app', '.log');
 * // Returns: ['app-2026-01-15.log.1.gz', 'app-2026-01-16.log.1', ...]
 * ```
 */
export function getSortedRotatedFiles(dir: string, base: string, ext: string): string[] {
    try {
        const allFiles = fs.readdirSync(dir);

        // Filter rotated files (both .gz and uncompressed)
        const rotatedFiles = allFiles.filter(f => {
            const hasDatePattern = f.match(new RegExp(
                `^${escapeRegExp(base)}-\\d{4}-\\d{2}-\\d{2}${escapeRegExp(ext)}\\.\\d+(\\.gz)?$`
            ));
            return hasDatePattern !== null;
        });

        // Sort by date parsed from filename (oldest first)
        const sorted = rotatedFiles.sort((a, b) => {
            const dateA = parseRotatedDate(a.replace(/\.gz$/, ''), base, ext);
            const dateB = parseRotatedDate(b.replace(/\.gz$/, ''), base, ext);

            if (!dateA || !dateB) {
                return 0;
            }

            return dateA.getTime() - dateB.getTime();
        });

        return sorted;
    } catch (error) {
        // Directory doesn't exist or can't be read
        return [];
    }
}

/**
 * Calculate file age in days
 *
 * @param date - File date
 * @returns Age in days (rounded down)
 *
 * @remarks
 * Calculates the difference between current UTC date and file date.
 * Used to determine if a file exceeds maxAge threshold.
 */
export function calculateAgeInDays(date: Date): number {
    const now = new Date();
    const msPerDay = 24 * 60 * 60 * 1000;
    const ageMs = now.getTime() - date.getTime();
    return Math.floor(ageMs / msPerDay);
}

/**
 * Delete old log files based on retention policy
 *
 * @param dir - Directory containing log files
 * @param base - Base filename without extension
 * @param ext - File extension (e.g., '.log')
 * @param maxFiles - Maximum number of files to keep
 * @param maxAge - Maximum age of files in days
 * @returns Object with deleted count and any errors encountered
 *
 * @remarks
 * Retention policy: BOTH maxFiles AND maxAge must be satisfied
 * before a file is deleted. This is a conservative approach.
 *
 * Cleanup strategy:
 * 1. Get sorted list of rotated files (oldest first)
 * 2. For each file, check if it exceeds BOTH thresholds
 * 3. Delete file if both conditions met
 * 4. Skip locked files (EBUSY, EPERM) and continue
 * 5. Never delete all files - protect current active file
 *
 * Best-effort deletion: If a file is locked or can't be deleted,
 * log the error and continue with remaining files.
 *
 * @example
 * ```typescript
 * const result = cleanupOldLogs('./logs', 'app', '.log', 20, 30);
 * // Deletes files that are > 20 in count AND > 30 days old
 * ```
 */
export async function cleanupOldLogs(
    dir: string,
    base: string,
    ext: string,
    maxFiles: number,
    maxAge: number
): Promise<{ deleted: number; errors: string[] }> {
    const sortedFiles = getSortedRotatedFiles(dir, base, ext);
    const errors: string[] = [];
    let deleted = 0;

    // Add current active file to count (it's not in sortedFiles)
    const totalFiles = sortedFiles.length + 1;

    // Safety check: never delete all files
    if (totalFiles <= 1) {
        return { deleted: 0, errors: [] };
    }

    // Check each file against retention policy
    for (const filename of sortedFiles) {
        const filePath = path.join(dir, filename);

        // Parse date from filename
        const fileDate = parseRotatedDate(filename.replace(/\.gz$/, ''), base, ext);
        if (!fileDate) {
            continue;
        }

        // Calculate file age
        const ageInDays = calculateAgeInDays(fileDate);

        // Check if file exceeds BOTH thresholds
        const exceedsMaxFiles = sortedFiles.indexOf(filename) >= (maxFiles - 1);
        const exceedsMaxAge = ageInDays > maxAge;

        if (exceedsMaxFiles && exceedsMaxAge) {
            try {
                await fs.promises.unlink(filePath);
                deleted++;
                console.log(`[FileTransport] Deleted old log: ${filePath}`);
            } catch (error) {
                const err = error as NodeJS.ErrnoException;
                const errorMsg = `Failed to delete ${filePath}: ${err.message}`;
                errors.push(errorMsg);
                console.error(`[FileTransport] ${errorMsg}`);

                // Continue with remaining files (best-effort)
            }
        }
    }

    return { deleted, errors };
}
```

### Pattern 2: Integration with FileTransport
**What:** Add retention cleanup to FileTransport class
**When to use:** Triggering cleanup after rotation completes
**Example:**
```typescript
// Source: Extension of existing file-transport.ts pattern
// In FileTransport constructor:
private readonly maxFiles?: number;
private readonly maxAge?: number;

// Parse retention config if provided
if (options !== undefined && options.maxFiles !== undefined) {
    this.maxFiles = options.maxFiles;
}
if (options !== undefined && options.maxAge !== undefined) {
    this.maxAge = options.maxAge;
}

// In performRotation(), after compression scheduling:
// Step 6: Trigger retention cleanup if configured
if (this.maxFiles !== undefined && this.maxAge !== undefined) {
    setTimeout(() => {
        this.performRetentionCleanup().catch((err) => {
            console.error(`[FileTransport] Retention cleanup error: ${err instanceof Error ? err.message : String(err)}`);
        });
    }, 20);  // 20ms delay after compression (10ms + 10ms buffer)
}

// New private method:
private async performRetentionCleanup(): Promise<void> {
    if (this.maxFiles === undefined || this.maxAge === undefined) {
        return;
    }

    const dir = path.dirname(this.filePath);
    const base = path.basename(this.filePath, path.extname(this.filePath));
    const ext = path.extname(this.filePath);

    const result = await cleanupOldLogs(dir, base, ext, this.maxFiles, this.maxAge);

    if (result.errors.length > 0) {
        // Emit error event for cleanup failures
        this.stream.emit('error', new Error(
            `Retention cleanup completed with ${result.errors.length} error(s): ${result.errors.join(', ')}`
        ));
    }
}
```

### Anti-Patterns to Avoid
- **Synchronous cleanup**: Don't use fs.unlinkSync in rotation flow - blocks writes
- **Aggressive deletion**: Don't delete files based on maxFiles OR maxAge - use AND logic
- **Zero file protection**: Don't delete all files - always leave at least current active file
- **Complex scheduling**: Don't implement cron-style timers - after-rotation is simpler
- **Filename stat reliance**: Don't use fs.stat for sorting - parse dates from filenames (faster, no race conditions)
- **Stop-on-error**: Don't abort cleanup on first failure - use best-effort approach

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Filename date parsing | Custom regex with escaping | escapeRegExp utility from rotation.ts | Handles special characters in filenames (dots, brackets, etc.) |
| File sorting | Array sort with fs.stat mtime | Parse YYYY-MM-DD from filename | Faster (no stat calls), avoids race conditions, uses existing format |
| Cleanup timing | Cron jobs, node-cron, setInterval | Fire-and-forget after rotation | Simpler, no external dependencies, integrates with existing rotation flow |
| Error handling | Custom retry logic | Best-effort with try-catch | Multi-process scenarios make retries unreliable, just log and continue |
| File deletion | Manual fs.unlink with checks | fs.promises.unlink with try-catch | Handles EBUSY/EPERM gracefully, async doesn't block |

**Key insight:** Retention cleanup is deceptively simple. The complexity comes from edge cases: locked files, multi-process scenarios, permission errors, and ensuring we never delete all files. The best approach is conservative (AND logic) with best-effort deletion.

## Common Pitfalls

### Pitfall 1: Race Conditions with File Deletion
**What goes wrong:** Between checking if a file should be deleted and actually deleting it, another process might lock or delete the file, causing EBUSY or ENOENT errors.

**Why it happens:** Node.js fs operations are async by default. Time gap between directory scan and deletion allows state changes.

**How to avoid:**
- Use best-effort deletion: catch errors and continue with remaining files
- Don't assume file still exists when unlink is called
- Log partial results so users know what was deleted

**Warning signs:** Intermittent ENOENT or EBUSY errors during cleanup, inconsistent cleanup results between runs.

### Pitfall 2: Deleting All Log Files
**What goes wrong:** Cleanup deletes all rotated files AND the current active file, leaving the application with no log file.

**Why it happens:** maxFiles = 1, or cleanup logic doesn't account for current active file being in the directory.

**How to avoid:**
- Always add 1 to file count for current active file
- Never delete if total files <= 1
- Implement explicit safety check: if (totalFiles <= 1) return;

**Warning signs:** Application logs missing after cleanup, "file not found" errors on next write.

### Pitfall 3: Windows File Locking Behavior
**What goes wrong:** On Windows, fs.unlink on a locked file marks it for deletion but doesn't delete immediately, causing confusing behavior.

**Why it happens:** Windows file locking semantics differ from Unix. Locked files are deleted when all handles close.

**How to avoid:**
- Handle EBUSY and EPERM errors gracefully
- Don't retry immediately - file might stay locked for a while
- Accept that some files might not be deleted in multi-process scenarios

**Warning signs:** Files disappear later after cleanup runs, inconsistent behavior between Windows and Unix.

### Pitfall 4: Timezone Issues with Age Calculation
**What goes wrong:** Files older than expected are deleted, or files younger than expected are kept, due to timezone confusion.

**Why it happens:** Mixing local time and UTC when parsing dates from filenames or calculating age.

**How to avoid:**
- Use UTC consistently (already done in rotation.ts)
- Parse YYYY-MM-DD as UTC: new Date(dateStr + 'T00:00:00.000Z')
- Calculate age using UTC timestamps

**Warning signs:** Inconsistent cleanup behavior across servers in different timezones, DST-related issues.

### Pitfall 5: Blocking Log Writes During Cleanup
**What goes wrong:** Log writes block while cleanup is running, causing application slowdown.

**Why it happens:** Running cleanup synchronously in the rotation flow.

**How to avoid:**
- Use fire-and-forget pattern with setTimeout
- Never await cleanup in performRotation
- Use fs.promises.unlink (async) not fs.unlinkSync

**Warning signs:** Increased log() latency after rotation, application pauses during cleanup.

### Pitfall 6: Incorrect File Sorting
**What goes wrong:** Wrong files deleted because sorting doesn't correctly identify oldest files.

**Why it happens:** Using fs.stat mtime which can change, or incorrectly parsing dates from filenames.

**How to avoid:**
- Parse dates from YYYY-MM-DD in filename (immutable)
- Sort by parsed Date objects, not filename strings
- Handle .gz files by removing .gz suffix before parsing

**Warning signs:** Recently rotated files deleted, very old files not deleted.

## Code Examples

Verified patterns from official sources:

### File Deletion with Error Handling
```typescript
// Source: Node.js fs.promises.unlink documentation
// https://nodejs.org/api/fs.html#fspromisesunlinkpath

import fs from 'fs/promises';
import path from 'path';

async function deleteFile(filePath: string): Promise<boolean> {
    try {
        await fs.unlink(filePath);
        console.log(`Deleted: ${filePath}`);
        return true;
    } catch (error) {
        const err = error as NodeJS.ErrnoException;

        // Handle common errors gracefully
        if (err.code === 'ENOENT') {
            // File already deleted - not an error
            console.warn(`File not found (already deleted): ${filePath}`);
            return true;
        } else if (err.code === 'EBUSY' || err.code === 'EPERM') {
            // File locked or permission denied - log and continue
            console.error(`File locked or no permission: ${filePath}`);
            return false;
        } else {
            // Unexpected error
            console.error(`Failed to delete ${filePath}: ${err.message}`);
            throw err;
        }
    }
}
```

### Directory Scanning and Filtering
```typescript
// Source: Node.js fs.readdirSync documentation
// https://nodejs.org/api/fs.html#fsreaddirsyncpath-options

import fs from 'fs';
import path from 'path';

function findRotatedFiles(dir: string, pattern: RegExp): string[] {
    try {
        const allFiles = fs.readdirSync(dir);
        return allFiles.filter(file => pattern.test(file));
    } catch (error) {
        // Directory doesn't exist or permission error
        return [];
    }
}
```

### Date Parsing from Filename
```typescript
// Source: Research-based pattern from rotation.ts
// Uses YYYY-MM-DD format which is ISO 8601 compliant

function parseDateFromFilename(filename: string): Date | null {
    // Match YYYY-MM-DD pattern in filename
    const match = filename.match(/(\d{4}-\d{2}-\d{2})/);

    if (!match) {
        return null;
    }

    // Parse as UTC date to avoid timezone issues
    const dateStr = match[1];
    return new Date(dateStr + 'T00:00:00.000Z');
}
```

### Best-Effort Cleanup Pattern
```typescript
// Source: Research-based pattern from compression.ts error handling
// Fire-and-forget cleanup with error logging

async function cleanupWithErrors(dir: string, files: string[]): Promise<void> {
    const errors: string[] = [];
    let deleted = 0;

    for (const file of files) {
        const filePath = path.join(dir, file);

        try {
            await fs.unlink(filePath);
            deleted++;
        } catch (error) {
            const err = error as NodeJS.ErrnoException;
            errors.push(`${file}: ${err.message}`);

            // Continue with remaining files (best-effort)
        }
    }

    // Log results
    console.log(`Cleanup complete: ${deleted} deleted, ${errors.length} errors`);

    if (errors.length > 0) {
        console.error('Cleanup errors:', errors);
    }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Scheduled cleanup (cron) | After-rotation cleanup | Ongoing | Simpler integration, no external dependencies |
| OR logic (maxFiles OR maxAge) | AND logic (maxFiles AND maxAge) | Industry best practice | More conservative, prevents accidental data loss |
| fs.stat for file age | Filename date parsing | Performance optimization | Faster, avoids race conditions, uses existing format |
| Stop-on-first-error | Best-effort cleanup | Production hardening | More robust, handles edge cases gracefully |

**Deprecated/outdated:**
- **Scheduled cleanup jobs**: Overly complex for single-process applications
- **OR-based retention**: Too aggressive, can delete recent logs
- **Sync file operations**: Blocks event loop, causes performance issues
- **Retry logic for locked files**: Unreliable in multi-process scenarios

## Open Questions

Things that couldn't be fully resolved:

1. **Multi-process cleanup coordination**
   - What we know: Multiple processes writing to same log directory is not supported in v1.1
   - What's unclear: Should we document this limitation explicitly or add process ID to filenames
   - Recommendation: Document as unsupported for v1.1, consider for v2.0

2. **Cleanup failure severity**
   - What we know: CONTEXT.md says this is at Claude's discretion
   - What's unclear: Should cleanup failure be fatal (stop logging) or non-fatal (continue logging)
   - Recommendation: Make cleanup failure non-fatal but emit 'error' event for observability

3. **Cleanup timing strategy**
   - What we know: After-rotation is simpler, scheduled is more flexible
   - What's unclear: Whether to support both or just one
   - Recommendation: Start with after-rotation only, add scheduled later if needed

## Sources

### Primary (HIGH confidence)
- [Node.js File System Documentation v25.3.0](https://nodejs.org/api/fs.html) - fs.promises.unlink, fs.readdirSync, error codes
- [winston-daily-rotate-file npm package](https://www.npmjs.com/package/winston-daily-rotate-file) - maxFiles and maxAge options, retention policy implementation
- [Existing codebase: compression.ts](src/utils/compression.ts) - Error handling pattern, fire-and-forget approach
- [Existing codebase: rotation.ts](src/utils/rotation.ts) - Date parsing, filename pattern matching, UTC usage
- [Existing codebase: file-transport.ts](src/transports/file-transport.ts) - Rotation flow, stream management

### Secondary (MEDIUM confidence)
- [StackOverflow: fs.unlink EBUSY error](https://stackoverflow.com/questions/46892738/fs-unlink-ebusy-error) - File locking behavior on Windows
- [Building a Robust Logging System with Winston in Node.js](https://medium.com/@anusthan2019/building-a-robust-logging-system-with-winston-in-node-js-backend-1fffd47d0d4e) - Automatic cleanup strategies
- [Logrotate: How and why you should use it properly](https://www.learnsteps.com/logrotate-how-and-why-you-should-use-it-properly/) - Postrotate cleanup pattern
- [Rolling Policies and File Retention (Serilog)](https://zread.ai/serilog/serilog-sinks-file/9-rolling-policies-and-file-retention) - File deletion order based on timestamp and sequence

### Tertiary (LOW confidence)
- [Node.js - a smarter cleanup process on a working directory](https://ciysys.com/blog/nodejs-a-smarter-dir-cleanup-process-on-a-working-directory.htm) - Scheduled cleanup with setInterval (verified but not adopted)
- [How to read list of files from directory, sorted on date modified](https://stackoverflow.com/questions/30727864/how-to-read-list-of-files-from-directory-sorted-on-date-modified-in-node-js) - Alternative sorting approach (verified but filename parsing preferred)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Based on Node.js built-in modules and existing codebase patterns
- Architecture: HIGH - Verified against existing rotation.ts and compression.ts patterns
- Pitfalls: HIGH - Verified with official Node.js documentation and StackOverflow discussions
- Code examples: HIGH - Based on official Node.js docs and existing codebase

**Research date:** 2026-01-18
**Valid until:** 2026-02-17 (30 days - stable domain, Node.js API unlikely to change)

**Key decisions locked by CONTEXT.md:**
- Both maxFiles AND maxAge required (both must be specified)
- File deleted only if BOTH conditions met (too many files AND too old)
- Default values: maxFiles = 20, maxAge = 30 days
- maxFiles counts total files (including current active file)
- Delete oldest files first based on filename date parsing
- All files treated together (.gz and uncompressed)
- Current active file protected (never leave zero files)
- Cleanup timing, retry behavior, fatality at Claude's discretion

**Claude's discretion areas:**
- Cleanup trigger timing (after rotation recommended)
- Cleanup operation logging verbosity
- Retry behavior for failed deletions (no retry recommended)
- Whether cleanup failure is fatal (non-fatal recommended)
