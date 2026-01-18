# Phase 5: Retention Cleanup - Context

**Gathered:** 2026-01-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Automatic cleanup of old log files based on retention policy to prevent disk exhaustion. Both maxFiles AND maxAge must be satisfied before a file is deleted. Cleanup is triggered by Claude's discretion during implementation.

</domain>

<decisions>
## Implementation Decisions

### Retention policy triggers
- Both `maxFiles` AND `maxAge` must be specified together (both required)
- File deleted only if BOTH conditions are met (too many files AND too old)
- Default values: maxFiles = 20, maxAge = 30 days
- maxFiles counts total files in directory (including current active file)

### Cleanup timing (Claude's discretion)
- Cleanup trigger timing is at Claude's discretion
- Balance between implementation complexity and performance

### Cleanup selection logic
- Delete oldest files first based on filename date parsing (YYYY-MM-DD sequence)
- All files treated together — .gz and uncompressed rotated files sorted by age
- Current active file protected only if other files exist (never leave zero files)

### Safety mechanisms
- No minimum file count enforcement — respect user's maxFiles setting exactly
- Best-effort deletion: skip locked files, delete what we can, log partial results
- Cleanup operation logging: Claude's discretion

### Failure handling
- Cleanup surfaced via: console.error log + 'error' event emission + throw on next log()
- Retry behavior: Claude's discretion
- Fatal vs non-fatal: Claude's discretion

### Claude's Discretion
- Cleanup trigger timing (after rotation, daily schedule, or hybrid)
- Whether to log cleanup operations verbosely
- Retry behavior for failed deletions
- Whether cleanup failure is fatal (stops logging) or non-fatal (continues)

</decisions>

<specifics>
## Specific Ideas

- 20 files + 30 days defaults prioritize production safety
- Filename date parsing for age-based sorting (consistent with rotation naming)
- Best-effort cleanup handles multi-process scenarios gracefully

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 05-retention-cleanup*
*Context gathered: 2026-01-18*
