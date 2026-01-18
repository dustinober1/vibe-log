# Phase 2: Core Rotation Infrastructure - Context

**Gathered:** 2026-01-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement size-based log file rotation with atomic file switching within the FileTransport class. This phase delivers size-checking logic, atomic rotation sequence, write gating during rotation, and backward-compatible configuration API. Rotation is an internal concern of FileTransport — no breaking changes to the public API.

</domain>

<decisions>
## Implementation Decisions

### Size threshold design
- Default size limit: 100MB
- Accept both byte numbers (104857600) and human-readable strings ('100MB', '1.5GB', '500KB')
- No enforced minimum, but log warning if size is below reasonable threshold (e.g., < 1KB)
- Invalid size formats: throw error immediately on configure() — fail fast with clear feedback

### Rotation triggering behavior
- Hybrid size checking: track accumulated bytes written between checks, trigger when threshold exceeded
- Threshold comparison: exceeds threshold (size > maxSize) triggers rotation
- Startup behavior: if existing log file is already over threshold, rotate immediately
- Size measurement: hybrid approach — track bytes written for performance, validate with fs.stat() periodically or on rotation

### Rotated file naming pattern
- Format: date + sequence → `app-2026-01-18.log.1`, `app-2026-01-18.log.2`
- Time zone: UTC for consistency across servers and to avoid DST issues
- Extension placement: extension before sequence number → `basename-YYYY-MM-DD.ext.N`
- Collision handling: increment sequence number if rotated file already exists

### Write gating strategy
- Block writes synchronously during rotation — pause log() calls, wait for rotation to complete, then resume
- No timeout on rotation — wait indefinitely to ensure no data loss
- Rotation state: internal only — not exposed to users (Claude's discretion)
- Error handling: retry rotation once, on failure continue with old file and log error

### Claude's Discretion
- Exact frequency of fs.stat() validation in hybrid size checking
- Threshold for "reasonable minimum size" warning
- Rotation state exposure (decided: internal only, but could add monitoring hooks later if needed)
- Retry count and delay for rotation failures

</decisions>

<specifics>
## Specific Ideas

- "I want rotation to be transparent — users shouldn't need to think about it happening"
- "Data integrity is critical —宁愿 block than lose log entries during rotation"
- "UTC timestamps prevent confusion when servers span time zones"

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-core-rotation-infrastructure*
*Context gathered: 2026-01-18*
