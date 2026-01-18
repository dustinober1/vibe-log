---
phase: 03-time-based-rotation
plan: 01
subsystem: rotation-infrastructure
tags: utc-timezone, midnight-calculation, daily-rotation, time-based-scheduling

# Dependency graph
requires:
  - phase: 02-core-rotation-infrastructure
    provides: RotationConfig interface, FileTransport with size-based rotation
provides:
  - Extended RotationConfig interface with pattern field for time-based rotation
  - getMsUntilNextMidnightUTC utility function for midnight scheduling
  - Foundation for daily log rotation at midnight UTC
affects:
  - FileTransport rotation scheduling logic
  - Timer-based rotation triggers in next plans

# Tech tracking
tech-stack:
  added: []
  patterns:
    - UTC-based time calculations for timezone consistency
    - Optional configuration pattern for backward compatibility
    - Hybrid rotation strategy (size + time-based)

key-files:
  created:
    - src/utils/rotation.ts
  modified:
    - src/types.ts

key-decisions:
  - "UTC midnight for daily rotation to avoid DST and timezone issues"
  - "Optional pattern field to maintain backward compatibility"
  - "Hybrid rotation support (size OR time-based, whichever triggers first)"

patterns-established:
  - "UTC-based calculations: Use Date.UTC() and getUTC*() methods for time-based features"
  - "Optional configuration: New rotation features are opt-in via optional fields"
  - "Internal utilities: Time-based scheduling functions in src/utils/rotation.ts"

# Metrics
duration: 1.4min
completed: 2026-01-18
---

# Phase 3 Plan 1: Time-based Rotation Configuration Summary

**Daily rotation configuration with UTC midnight calculation using Date.UTC() for timezone-independent scheduling**

## Performance

- **Duration:** 1.4 min (84 seconds)
- **Started:** 2026-01-18T19:26:54Z
- **Completed:** 2026-01-18T19:28:13Z
- **Tasks:** 2
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments

- Extended RotationConfig interface with pattern field for daily rotation configuration
- Created getMsUntilNextMidnightUTC utility function using UTC-based calculations
- Documented hybrid rotation strategy (size + time-based combined)
- Established timezone-independent rotation scheduling infrastructure

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend RotationConfig with pattern field** - `ab35a53` (feat)
2. **Task 2: Create getMsUntilNextMidnightUTC utility function** - `261663d` (feat)

**Plan metadata:** (to be committed after SUMMARY.md creation)

## Files Created/Modified

- `src/types.ts` - Extended RotationConfig with pattern?: 'daily' field and comprehensive JSDoc
- `src/utils/rotation.ts` - Created getMsUntilNextMidnightUTC() function with UTC calculation logic

## Decisions Made

- **UTC midnight for daily rotation:** Use Date.UTC() and getUTC*() methods to calculate next midnight in UTC timezone, avoiding Daylight Saving Time complications and timezone inconsistencies across servers
- **Optional pattern field:** Made pattern optional in RotationConfig to maintain backward compatibility - existing size-based rotation continues working without changes
- **Hybrid rotation support:** Documented that pattern and maxSize can be combined for hybrid rotation (triggers on whichever occurs first)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all tasks completed without issues.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for next phase:**
- RotationConfig interface supports time-based rotation configuration
- getMsUntilNextMidnightUTC utility function ready for timer scheduling
- UTC-based calculation pattern established for future time-based features

**Next steps:**
- Integrate getMsUntilNextMidnightUTC into FileTransport rotation scheduling
- Add timer-based rotation triggers alongside size-based checks
- Implement hybrid rotation logic (size OR time-based triggers)

---
*Phase: 03-time-based-rotation*
*Completed: 2026-01-18*
