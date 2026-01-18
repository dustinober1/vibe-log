# log-vibe Transport System

## What This Is

Add transport abstraction and file logging to log-vibe, a beautiful zero-dependency logging library for Node.js. This feature will enable users to output logs to files and create custom transports while maintaining the library's aesthetic appeal and simplicity.

## Core Value

**Beautiful, flexible logging without dependencies** - Transport system must preserve log-vibe's visual appeal while adding output flexibility. Zero runtime dependencies philosophy continues.

## Requirements

### Validated

- ✓ Zero-dependency logging library - existing
- ✓ Colored console output with icons - existing
- ✓ 5 log levels with filtering - existing
- ✓ Scoped loggers via `createScope()` - existing
- ✓ 99.41% test coverage - existing

### Active

- [ ] Transport abstraction interface
- [ ] File transport (basic write to file)
- [ ] Multiple transports support
- [ ] Custom transport API for users
- [ ] TypeScript types for transports
- [ ] Tests for transport system
- [ ] Documentation and examples

### Out of Scope

- Log rotation - defer to Phase 2
- Remote service transports - defer to Phase 2
- Built-in compression - defer to Phase 2
- Transport buffering/batching - not aligned with simplicity

## Context

**Existing Codebase:**
- Pure TypeScript with Node.js streams
- Global configuration via `configure()`
- Formatting pipeline in `formatter.ts`
- All output goes to console methods

**Technical Environment:**
- Node.js >=14.0.0
- Zero runtime dependencies (design principle)
- Vitest for testing
- tsup for building

**User Feedback:**
- Users want file logging capability
- Multiple transports requested for production use
- Custom transport API for extensibility

## Constraints

- **Zero runtime dependencies**: Must maintain zero-dependency philosophy
- **Backward compatibility**: Existing API must continue working
- **Performance**: Transport system shouldn't slow down logging
- **Simplicity**: Easy to use, easy to understand
- **Type safety**: Full TypeScript support

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Stream-based API | Node.js built-in, no dependencies | — Pending |
| Transport array in config | Familiar pattern from Winston | — Pending |
| File transport as separate export | Keeps core small, optional feature | — Pending |

---
*Last updated: 2026-01-18 after transport feature initialization*
