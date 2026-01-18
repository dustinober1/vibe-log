# Phase 3: Time-based Rotation - Context

**Gathered:** 2026-01-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Add timer-based rotation that triggers automatically at scheduled intervals (daily or hourly). This extends the size-based rotation from Phase 2, enabling hybrid rotation strategies where both size and time triggers can work together.

</domain>

<decisions>
## Implementation Decisions

### Configuration API
- Schedule object configuration (not boolean flag or pattern string)
- Both size-based and time-based rotation can work together (AND logic — whichever happens first triggers rotation)
- Field name at Claude's discretion (type/schedule/pattern)
- Support both 'daily' and 'hourly' patterns in v1.1 (not just daily)

### Scheduling behavior
- Configurable timezone with UTC as default
- Missed rotation behavior at Claude's discretion
- Timer cleanup approach at Claude's discretion

### Filename strategy
- Date format: YYYY-MM-DD (simple, readable)
- Multiple rotations on same day: add sequence suffix (-1, -2, -3)
- Hourly rotation filename format at Claude's discretion

### Edge cases
- DST changes: dynamically recalculate next rotation time based on clock change
- Rotation failure (disk full, permission denied, file locked): allow rotation with warning via console/error log
- Process restart behavior at Claude's discretion

### Claude's Discretion
- Field name in rotation config object (type/schedule/pattern)
- Missed rotation behavior when process isn't running at scheduled time
- Timer cleanup mechanism
- Hourly rotation filename format
- Process restart behavior

</decisions>

<specifics>
## Specific Ideas

No specific product references or examples provided — standard scheduling infrastructure patterns are acceptable.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 03-time-based-rotation*
*Context gathered: 2026-01-18*
