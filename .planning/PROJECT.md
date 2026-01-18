# log-vibe

## What This Is

A beautiful zero-dependency logging library for Node.js with transport abstraction, file logging, and custom transport API. Delivers colored console output, flexible log destinations, and extensible architecture while maintaining simplicity and zero runtime dependencies.

## Core Value

**Beautiful, flexible logging without dependencies** - Transport system must preserve log-vibe's visual appeal while adding output flexibility. Zero runtime dependencies philosophy continues.

## Requirements

### Validated

- ✓ Zero-dependency logging library — v1.0
- ✓ Colored console output with icons — v1.0
- ✓ 5 log levels with filtering — v1.0
- ✓ Scoped loggers via `createScope()` — v1.0
- ✓ Transport abstraction interface — v1.0
- ✓ File transport (basic write to file) — v1.0
- ✓ Multiple transports support — v1.0
- ✓ Custom transport API for users — v1.0
- ✓ TypeScript types for transports — v1.0
- ✓ Tests for transport system — v1.0 (97.24% coverage)
- ✓ Documentation and examples — v1.0

### Active

(No active requirements — planning for v1.1 required)

### Out of Scope

- Log rotation — defer to v1.1
- Remote service transports (Datadog, ELK) — users can build via custom transport API
- Built-in compression — defer to v1.1
- Transport buffering/batching — not aligned with simplicity philosophy
- Log aggregation — out of scope for logging library

## Context

**Current State (v1.0 shipped):**
- 1,048 lines of TypeScript
- Transport abstraction with Transport interface
- FileTransport and ConsoleTransport implementations
- 97.24% test coverage with 124 passing tests
- Complete documentation with custom transport guide
- Zero breaking changes (full backward compatibility)

**Technical Environment:**
- Node.js >=14.0.0
- Zero runtime dependencies (design principle)
- Vitest for testing
- tsup for building

**User Feedback:**
- Transport system enables flexible log output
- Custom transport API provides extensibility
- File logging meets production needs

## Constraints

- **Zero runtime dependencies**: Must maintain zero-dependency philosophy
- **Backward compatibility**: Existing API must continue working
- **Performance**: Transport system shouldn't slow down logging
- **Simplicity**: Easy to use, easy to understand
- **Type safety**: Full TypeScript support

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Synchronous `log()` method | Logging must not block; async handled internally | ✓ Fast logging, no promise overhead |
| Both formatted string AND raw entry | Enables simple and advanced use cases | ✓ Maximum flexibility |
| Stream-based FileTransport | Node.js built-in, no dependencies | ✓ Efficient async file writes |
| File shorthand `{ file: './app.log' }` | Simple configuration for common case | ✓ Great DX, reduced boilerplate |
| Optional `close()` method | Transports without resources don't need stubs | ✓ Cleaner interface |
| Transport errors caught in try-catch | Prevent transport failures from crashing app | ✓ Graceful degradation |
| Forward reference for Transport type | Avoids circular dependency | ✓ Clean separation, type safety |
| Default ConsoleTransport on module load | Backward compatibility | ✓ Existing code works unchanged |
| `configure()` returns `LoggerConfig` | File/transports/console are optional | ✓ Type safety maintained |

---
*Last updated: 2026-01-18 after v1.0 milestone*
