# Phase 3: Time-based Rotation - Research

**Researched:** 2026-01-18
**Domain:** Node.js timer scheduling, date calculation, rotation triggers
**Confidence:** HIGH

## Summary

This phase adds daily log rotation at midnight using Node.js built-in timer APIs. The research confirms that Node.js provides sufficient built-in functionality (`setTimeout`, `clearTimeout`) without requiring external scheduling libraries. The key challenges are: (1) calculating milliseconds until next UTC midnight accurately, (2) ensuring timer cleanup on logger close to prevent memory leaks, (3) integrating time-based triggers with existing size-based rotation without conflicts, and (4) handling edge cases like DST transitions, clock changes, and system time adjustments.

**Primary recommendation:** Use `setTimeout()` with recursive rescheduling for midnight rotation, store timer reference for cleanup, and trigger rotation using existing `performRotation()` method. Implement hybrid rotation by checking both size and time conditions in the rotation trigger logic. Use Vitest's built-in timer mocking for testing without additional dependencies.

## Standard Stack

### Core
| Library/API | Version | Purpose | Why Standard |
|-------------|---------|---------|--------------|
| Node.js `timers` module | Built-in (Node.js >= 14.0.0) | `setTimeout()` for scheduling, `clearTimeout()` for cleanup | Zero-dependency, stable API, sufficient for daily scheduling |
| JavaScript `Date` object | ES5+ | UTC date calculations, midnight time arithmetic | Built-in, timezone-aware methods available |

### Testing
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest timer mocks | Built-in (vi.useFakeTimers()) | Fake timers for testing time-based logic without real delays | All time-based rotation tests |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Node.js `setTimeout()` | node-schedule, node-cron | External dependencies add complexity, overkill for simple daily rotation |
| Date object UTC methods | date-fns, luxon, moment-timezone | Additional dependencies unnecessary for UTC midnight calculation (no DST issues) |
| Vitest timer mocks | @sinonjs/fake-timers | Vitest has built-in support, no extra dependency needed |

**Installation:**
```bash
# No additional dependencies required
# All functionality uses Node.js built-ins and existing Vitest setup
```

## Architecture Patterns

### Recommended Project Structure
```
src/transports/file-transport.ts  # Add time-based rotation to existing FileTransport
src/utils/rotation.ts             # Add midnight calculation utility
test/file-transport-time-rotation.test.ts  # New test file for time-based rotation
```

### Pattern 1: Midnight Calculation with UTC
**What:** Calculate milliseconds until next midnight in UTC timezone to avoid DST issues
**When to use:** For scheduling daily rotation triggers
**Example:**
```typescript
// Source: Web search verification (Stack Overflow, MDN)
function getMsUntilNextMidnightUTC(): number {
    const now = new Date();
    const tomorrow = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,  // Next day
        0, 0, 0, 0              // Midnight UTC
    ));
    return tomorrow.getTime() - now.getTime();
}
```

**Why UTC:** Existing rotation infrastructure uses UTC dates (`toISOString()`) for rotated filenames. Consistent UTC usage avoids DST transition issues (spring forward/fall back) and ensures consistent rotation across servers in different timezones.

### Pattern 2: Recursive Timer Scheduling
**What:** Use `setTimeout()` recursively to schedule daily rotations, with timer reference stored for cleanup
**When to use:** For recurring daily rotation at midnight
**Example:**
```typescript
// Source: Node.js timers documentation (v25.3.0)
class FileTransport {
    private rotationTimer?: NodeJS.Timeout;

    private scheduleMidnightRotation(): void {
        const msUntilMidnight = getMsUntilNextMidnightUTC();
        this.rotationTimer = setTimeout(() => {
            // Trigger rotation at midnight
            this.performRotation().catch((err) => {
                console.error(`[FileTransport] Midnight rotation error: ${err.message}`);
            });
            // Reschedule for next day
            this.scheduleMidnightRotation();
        }, msUntilMidnight);
    }

    private clearRotationTimer(): void {
        if (this.rotationTimer) {
            clearTimeout(this.rotationTimer);
            this.rotationTimer = undefined;
        }
    }
}
```

**Why recursive:** `setInterval()` would drift over time (actual execution delays accumulate). Recursive `setTimeout()` recalculates midnight each day, ensuring rotation always happens at the correct time regardless of when the previous rotation completed.

### Pattern 3: Hybrid Rotation Trigger
**What:** Check both size and time conditions in rotation logic, allowing either trigger to initiate rotation
**When to use:** When both size-based and time-based rotation are configured
**Example:**
```typescript
// Source: Integration with existing checkSizeAndRotate pattern
private async checkAndRotate(): Promise<void> {
    if (this.rotating || this.rotationInProgress) {
        return;
    }

    const sizeTriggered = this.sizeEnabled && this.currentFileSize >= this.maxSize!;
    const timeTriggered = this.timeEnabled && this.isMidnightPassed();

    if (sizeTriggered || timeTriggered) {
        this.rotating = true;
        this.rotationInProgress = this.performRotation();

        try {
            await this.rotationInProgress;
        } finally {
            this.rotating = false;
            this.rotationInProgress = undefined;
        }
    }
}

private isMidnightPassed(): boolean {
    // Track last rotation date in UTC
    if (!this.lastRotationDate) {
        this.lastRotationDate = new Date();
        return false;
    }

    const now = new Date();
    const todayUTC = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate()
    ));

    const lastRotationUTC = new Date(Date.UTC(
        this.lastRotationDate.getUTCFullYear(),
        this.lastRotationDate.getUTCMonth(),
        this.lastRotationDate.getUTCDate()
    ));

    return todayUTC.getTime() > lastRotationUTC.getTime();
}
```

**Why hybrid pattern:** Users may want both daily rotation (for log organization) and size-based rotation (for disk management). Both triggers should independently initiate rotation without conflict.

### Pattern 4: Timer Cleanup on Close
**What:** Clear rotation timer when FileTransport is closed to prevent memory leaks
**When to use:** In the `close()` method, alongside stream cleanup
**Example:**
```typescript
// Source: Integration with existing close() method
async close(): Promise<void> {
    return new Promise((resolve, reject) => {
        if (this.closed) {
            resolve();
            return;
        }

        this.closed = true;

        // Clear rotation timer (new code)
        this.clearRotationTimer();

        // Remove error handler
        this.stream.removeAllListeners('error');

        // Close stream
        this.stream.end((err?: Error | null) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}
```

**Why critical:** Uncleared timers prevent garbage collection and can cause memory leaks in long-running applications. Timer cleanup is essential for production hardening.

### Anti-Patterns to Avoid
- **Using `setInterval()` for daily rotation:** Timing drift accumulates, rotation times shift over days. Use recursive `setTimeout()` instead.
- **Local timezone for midnight calculation:** DST transitions cause rotation to occur at wrong UTC offset. Always use UTC.
- **Not storing timer reference:** Impossible to clean up timer on close, causes memory leak. Always store `NodeJS.Timeout` returned by `setTimeout()`.
- **Checking time on every write:** Unnecessary overhead. Use timer callback to trigger rotation at midnight, then check date-based condition.
- **Assuming timer fires exactly at midnight:** System clock changes, process scheduling delays, and leap seconds can affect timing. Use date comparison (`isMidnightPassed()`) not timer precision.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Timezone-aware scheduling | Custom DST logic, timezone database | UTC dates (built-in) | DST has complex rules (dates change by region, historical rules vary). UTC has no DST, simpler and more reliable |
| Timer management | Custom timer tracking arrays | Store single `NodeJS.Timeout` reference | Simple daily rotation needs only one active timer. Arrays add complexity for no benefit |
| Fake timers for testing | Manual Date.now() mocking, custom time utilities | Vitest `vi.useFakeTimers()` | Built-in, well-tested, integrates with existing test setup |

**Key insight:** For daily rotation at midnight, UTC is the "right" abstraction level. It eliminates DST complexity entirely. Only use timezone libraries if user explicitly requests local-time rotation (out of scope for v1.1).

## Common Pitfalls

### Pitfall 1: Timer Memory Leaks
**What goes wrong:** Rotation timer not cleared when FileTransport is closed, causing memory to accumulate in long-running applications
**Why it happens:** `setTimeout()` returns a Timeout object that must be explicitly cleared with `clearTimeout()`. If the reference is lost or not cleared in `close()`, the timer remains in memory.
**How to avoid:**
- Store timer reference as private field: `private rotationTimer?: NodeJS.Timeout`
- Always clear timer in `close()` method before other cleanup
- Use pattern: `if (this.rotationTimer) { clearTimeout(this.rotationTimer); this.rotationTimer = undefined; }`
**Warning signs:** Memory usage increases over time in applications with frequent logger reconfiguration. Node.js heap snapshot shows pending Timeout objects.

### Pitfall 2: DST Transition Bugs
**What goes wrong:** Rotation occurs at wrong time (or not at all) during DST spring-forward (hour 2:00-3:00 AM doesn't exist) or fall-back (hour 1:00-2:00 AM occurs twice).
**Why it happens:** Using local time methods (`getHours()`, `setHours()`) for midnight calculation. Local time has DST transitions that can skip or duplicate hours.
**How to avoid:**
- Always use UTC methods: `getUTCFullYear()`, `getUTCMonth()`, `getUTCDate()`, `getUTCHours()`
- Calculate next midnight using `Date.UTC()` constructor
- Consistent with existing `generateRotatedName()` which uses `toISOString()` (UTC-based)
**Warning signs:** Rotation logs show times shifting by 1 hour during DST transition dates (March and November in US). Integration tests fail on days around DST transitions.

### Pitfall 3: Clock Skew and System Time Changes
**What goes wrong:** Rotation doesn't occur when expected if system clock is adjusted backward or forward
**Why it happens:** Timer scheduled for "86400000 ms from now" can fire too early (clock moved forward) or too late (clock moved backward). Relying solely on timer precision without date comparison.
**How to avoid:**
- Use date comparison (`isMidnightPassed()`) not just timer callback
- Track last rotation date and compare with current date
- Timer is "trigger to check", not "authoritative trigger"
**Warning signs:** Rotation missed after system clock adjustments (NTP sync, manual time change, VM time sync). Logs show rotations at inconsistent times.

### Pitfall 4: Race Condition in Hybrid Rotation
**What goes wrong:** Size-based and time-based rotation triggers both fire simultaneously, causing duplicate rotation attempts
**Why it happens:** Timer callback fires at midnight while write operation also checks size condition. Both see rotation condition true and attempt rotation.
**How to avoid:**
- Use existing `rotationInProgress` promise tracking
- Check `this.rotating || this.rotationInProgress` at start of any rotation trigger
- Both triggers call same `checkAndRotate()` method which deduplicates
**Warning signs:** Rotated files have same timestamp with sequence numbers incrementing rapidly (e.g., `.1`, `.2`, `.3` within milliseconds).

### Pitfall 5: Timer Unref Causing Early Exit
**What goes wrong:** Application exits immediately after startup instead of keeping logger alive
**Why it happens:** Timer has `.unref()` called on it, which tells Node.js not to wait for this timer before exiting. For logging library, timers SHOULD keep process alive during application lifetime.
**How to avoid:**
- **DO NOT** call `.unref()` on rotation timer
- Let timer be part of event loop normally
- Only clear timer when explicitly closing logger
**Warning signs:** Application exits immediately after configuration, logs not written, "process exited with code 0" with no errors.

## Code Examples

Verified patterns from official sources:

### Midnight Calculation (UTC)
```typescript
// Source: Stack Overflow + MDN verification
// Confidence: HIGH (standard Date API)
function getMsUntilNextMidnightUTC(): number {
    const now = new Date();
    const msPerDay = 86400000; // 24 * 60 * 60 * 1000

    // Get current UTC time
    const utcNow = Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        now.getUTCHours(),
        now.getUTCMinutes(),
        now.getUTCSeconds(),
        now.getUTCMilliseconds()
    );

    // Calculate tomorrow midnight UTC
    const tomorrowMidnightUTC = Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
        0, 0, 0, 0
    );

    return tomorrowMidnightUTC - utcNow;
}
```

### Timer Scheduling with Cleanup
```typescript
// Source: Node.js timers documentation (v25.3.0)
// Confidence: HIGH (official Node.js API)
class TimeScheduler {
    private timer?: NodeJS.Timeout;

    scheduleDaily(callback: () => void): void {
        const msUntilMidnight = getMsUntilNextMidnightUTC();
        this.timer = setTimeout(() => {
            callback();
            // Reschedule for next day
            this.scheduleDaily(callback);
        }, msUntilMidnight);
    }

    cleanup(): void {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = undefined;
        }
    }
}
```

### Fake Timers Testing (Vitest)
```typescript
// Source: Vitest documentation (timer-mocks)
// Confidence: HIGH (official Vitest API)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Time-based rotation', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should rotate at midnight', () => {
        const transport = new FileTransport('./app.log', { pattern: 'daily' });

        // Advance time to midnight
        const msUntilMidnight = getMsUntilNextMidnightUTC();
        vi.advanceTimersByTime(msUntilMidnight);

        // Verify rotation triggered
        expect(performRotation).toHaveBeenCalled();
    });
});
```

### Date Comparison for Rotation
```typescript
// Source: Integration with existing rotation pattern
// Confidence: HIGH (derived from existing generateRotatedName)
class FileTransport {
    private lastRotationDate?: Date;

    private shouldRotateForTime(): boolean {
        const now = new Date();

        // If never rotated, don't rotate yet
        if (!this.lastRotationDate) {
            this.lastRotationDate = now;
            return false;
        }

        // Compare UTC dates (not timestamps) to detect day change
        const nowUTC = Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate()
        );

        const lastUTC = Date.UTC(
            this.lastRotationDate.getUTCFullYear(),
            this.lastRotationDate.getUTCMonth(),
            this.lastRotationDate.getUTCDate()
        );

        // If current UTC day > last rotation UTC day, rotate
        if (nowUTC > lastUTC) {
            this.lastRotationDate = now;
            return true;
        }

        return false;
    }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Local time scheduling | UTC-based scheduling | Project start (Phase 2 decision) | Eliminates DST complexity, consistent rotation across servers |
| Single rotation trigger | Hybrid size + time triggers | Phase 3 | Users can combine daily rotation with size limits for comprehensive log management |
| setInterval for recurring tasks | Recursive setTimeout | Node.js best practice (always) | Prevents timing drift, recalculates accurate midnight each day |

**Deprecated/outdated:**
- **Local timezone rotation:** Complicated DST handling, inconsistent behavior across regions. UTC is standard for server logs.
- **setInterval for daily scheduling:** Timing drift accumulates. Use recursive setTimeout with date recalculation.
- **External scheduling libraries:** node-schedule, node-cron are overkill for simple daily rotation. Built-in timers sufficient.

## Open Questions

### Q1: Should we support user-configurable timezones?
**What we know:** Phase 2 decision locked UTC dates for rotated filenames. Current implementation uses UTC throughout.
**What's unclear:** Whether users need local-time rotation (e.g., midnight in US/Pacific timezone) despite UTC filenames.
**Recommendation:** Stick with UTC for v1.1. Timezone support requires either (a) Temporal API polyfill (future-standard but adds dependency) or (b) date-fns-tz/luxon (adds dependencies). Defer to v2.0 as enhancement. Document UTC behavior clearly.

### Q2: How to handle system clock backward adjustments?
**What we know:** Date comparison (`isMidnightPassed()`) handles clock moving backward gracefully (won't double-rotate).
**What's unclear:** What if clock moves backward multiple days? Should we rotate for "missed" days?
**Recommendation:** For v1.1, simple behavior: rotate once when we detect day change. Don't attempt to backfill rotation for missed days. This is edge case (system clock adjustments are rare in production). Document behavior.

### Q3: Should timer use `.unref()` to not block process exit?
**What we know:** `.unref()` prevents timer from keeping process alive.
**What's unclear:** Is it ever desirable for logger to NOT keep process alive?
**Recommendation:** DO NOT use `.unref()`. Logger is typically core infrastructure. If app creates logger, it's expected to run until explicitly closed. Allowing early exit because of unref'd timer would be surprising and cause bugs (logs not written). Let timer be part of normal event loop.

## Sources

### Primary (HIGH confidence)
- [Node.js Timers Module v25.3.0](https://nodejs.org/api/timers.html) - Official Node.js documentation for setTimeout, clearTimeout, Timeout object
- [MDN: Date.now()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/now) - Date API for timestamp calculation
- [Vitest Timer Mocks](https://jestjs.io/docs/timer-mocks) - Official documentation for fake timers (Jest API, Vitest compatible)

### Secondary (MEDIUM confidence)
- [How do I find the number of milliseconds until midnight UTC](https://stackoverflow.com/questions/66947103/how-do-i-find-the-number-of-milliseconds-until-midnight-utc-in-javascript) - Stack Overflow discussion with multiple verified approaches for UTC midnight calculation
- [Master Python Log Rotation Techniques](https://choudharycodes.hashnode.dev/python-log-rotation-a-comprehensive-guide-to-better-log-management) - Confirms hybrid (size + time) rotation is standard practice
- [Time and Size-based Log Rotation (Thales)](https://docs-cybersec.thalesgroup.com/bundle/v8.18.0-cdsp-cadp-java/page/admin/cadp-for-java-trad-tasks/logging-tasks/time-size-rotatn/index.html) - Documentation showing hybrid rotation as enterprise pattern
- [Node.js Memory Management: How to Avoid Memory Leaks](https://medium.com/javarevisited/node-js-memory-management-how-to-avoid-memory-leaks-d2b8b84aac72) - Confirms timer cleanup is critical for memory management
- [Unblocking Node With Unref()](https://httptoolkit.com/blog/unblocking-node-with-unref/) - Explains `.unref()` behavior and when to use (or not use) it

### Tertiary (LOW confidence)
- [node-cron timezone working only when time-zone is same](https://stackoverflow.com/questions/63771373/node-cron-timezone-working-only-when-time-zone-is-same-as-machines-time-zone) - Confirms timezone handling complexity in scheduling libraries (reinforces UTC decision)
- [Cron jobs kicked off at wrong time for Daylight Savings Time](https://github.com/kelektiv/node-cron/issues/56) - GitHub issue documenting DST problems with cron libraries (validates UTC approach)
- [Log rotate on restart and at midnight](https://community.home-assistant.io/t/log-rotate-on-restart-and-at-midnight/769054) - Community discussion showing midnight rotation is common practice
- [Your Node is Leaking Memory? setTimeout Could Be...](https://lucumr.pocoo.org/2024/6/5/node-timeout/) - Blog post discussing timer-related memory issues (supports cleanup requirement)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Node.js built-ins are stable, well-documented, sufficient for requirements
- Architecture: HIGH - Timer scheduling patterns are standard Node.js practices, verified with official docs
- Pitfalls: HIGH - DST, memory leaks, clock skew are well-documented issues with established solutions
- Testing: MEDIUM - Vitest fake timers are well-documented, but specific time-based rotation test patterns need validation during implementation

**Research date:** 2026-01-18
**Valid until:** 30 days (stable domain - Node.js APIs stable, scheduling patterns well-established)
