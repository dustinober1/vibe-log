# Phase 4: Async Compression - Context

**Gathered:** 2026-01-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement fire-and-forget gzip compression of rotated log files using Node.js built-in zlib module. Compression runs asynchronously without blocking the log() method or event loop.

</domain>

<decisions>
## Implementation Decisions

### Compression timing
- Start compression after a tiny fixed delay (10ms) following rotation
- Use delayed (debounced) timing rather than immediate
- Rationale: Avoid CPU spike during active logging periods

### Error handling
- Log compression errors and continue (don't crash)
- Use both console.error and emit 'error' event on FileTransport
- Include filename, error message, and timestamp in error logs
- Claude's discretion: Decide whether to retry based on error type

### File handling
- Keep uncompressed file until compression succeeds, then delete
- If compression fails: move uncompressed file to failed/ subdirectory in log directory
- Clean up partial .gz files if compression fails partway through

### Compression level
- Add `compressionLevel` field to RotationConfig (1-9 range)
- Default to level 6 (balanced speed/size) if not specified
- User selected fastest (level 1) for their use case
- Rationale: Configurable allows users to trade speed for compression ratio

</decisions>

<specifics>
## Specific Ideas

- 10ms delay is enough to avoid CPU spikes during active logging
- Level 1 compression prioritizes speed over smallest file size
- Keep failed files in failed/ folder for manual inspection/retry

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 04-async-compression*
*Context gathered: 2026-01-18*
