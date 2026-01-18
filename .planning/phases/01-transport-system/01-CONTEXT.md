# Phase 1: Transport System - Context

**Gathered:** 2026-01-18
**Status:** Ready for planning

## Phase Boundary

Add transport abstraction and file logging to enable logs to be written to files and custom destinations. Users can configure multiple transports that receive log output. Log rotation and remote transports are Phase 2.

## Implementation Decisions

### Transport data contract
- Transports receive **both** formatted string AND raw LogEntry object
- Transports also receive configuration settings (colors, icons, timestamp format)
- This gives transport implementers maximum flexibility for custom formatting

### Configuration pattern
- **Convenience option required**: `configure({ file: './app.log' })` shorthand for single file transport
- Simplifies the common case of just wanting file logging

### Console behavior
- **Console always on by default** — backward compatible with existing code
- Users can disable if they want file-only logging

### Claude's Discretion

**Transport data contract:**
- Whether log level is passed separately vs accessed via LogEntry.level property
- Whether LogEntry is mutable or read-only (likely read-only for safety)

**Configuration pattern:**
- Primary API for configuring transports (array of instances, factory functions, or config objects)
- How users configure transport-specific options (constructor params vs nested config)
- Whether transports can be reconfigured at runtime or only at initialization

**Console behavior:**
- How users disable console output (explicit `console: false` flag or other pattern)
- Whether there's a built-in ConsoleTransport class or console is handled specially internally
- Whether console and file share formatting or have different defaults (file=plain, console=colors)

**Error handling:**
- What happens when transport throws error (silent, log to console, throw)
- Whether other transports continue when one fails
- How transports report success/failure (return boolean, async promise, or fire-and-forget)
- Whether there's an error callback/hook for custom error handling

## Specific Ideas

- Keep backward compatibility — existing code should continue working
- Zero runtime dependencies — use Node.js built-in modules only
- Make the simple case simple (just add a file path)
- Make the complex case possible (full custom transport API)

## Deferred Ideas

- Log rotation — Phase 2
- Remote service transports (Datadog, ELK, etc.) — users can build via custom transport API
- Built-in compression — Phase 2
- Transport buffering/batching — not aligned with simplicity philosophy

---

*Phase: 01-transport-system*
*Context gathered: 2026-01-18*
