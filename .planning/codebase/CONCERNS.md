# Codebase Concerns

**Analysis Date:** 2026-01-18

## Tech Debt

**Type definitions lack runtime coverage:**
- Issue: `src/types.ts` contains only interface/type definitions with no executable code
- Files: `src/types.ts`
- Impact: 0% test coverage reported for types file (expected but noted)
- Fix approach: This is expected behavior for type-only files. No action needed.

**Module coupling through global configuration:**
- Issue: All modules depend on `src/config.ts` for runtime settings via `getConfig()` calls
- Files: `src/prettyPrint.ts`, `src/formatter.ts`, `src/timestamp.ts`, `src/icons.ts`
- Impact: Makes testing more difficult as modules cannot be easily isolated from global state
- Fix approach: Consider dependency injection pattern for config in future versions

## Known Bugs

**No known bugs detected:**
- Symptoms: None
- Files: N/A
- Trigger: N/A
- Workaround: N/A

## Security Considerations

**Error message exposure in validation:**
- Risk: Input validation errors throw descriptive messages but do not sanitize user input
- Files: `src/logger.ts` (lines 22-28)
- Current mitigation: Errors only thrown for empty/whitespace strings, low risk
- Recommendations: Consider sanitizing context/message if used in security-sensitive contexts

**Object enumeration side effects:**
- Risk: `prettyPrint()` accesses object properties which could trigger getter side effects
- Files: `src/prettyPrint.ts` (lines 155-166)
- Current mitigation: Try-catch wrapping around property access with error display
- Recommendations: Document this behavior for users logging objects with aggressive getters

**ANSI code injection through context/message:**
- Risk: If user input is logged as context/message, ANSI escape codes could be injected
- Files: `src/logger.ts`, `src/formatter.ts`
- Current mitigation: No input sanitization for ANSI codes
- Recommendations: Add option to strip ANSI codes from user input if logging untrusted data

## Performance Bottlenecks

**Object depth traversal:**
- Problem: Deep objects cause recursive pretty-printing through all levels
- Files: `src/prettyPrint.ts`
- Cause: Recursive traversal with depth counter but no optimization for shallow inspection
- Improvement path: Current `maxDepth` config (default 10) provides reasonable protection

**Repeated config reads:**
- Problem: `getConfig()` called on every log operation, accessing global state
- Files: All formatters (`prettyPrint.ts`, `formatter.ts`, `timestamp.ts`, `icons.ts`)
- Cause: Singleton pattern requires runtime config lookup
- Improvement path: Consider caching config if performance becomes critical

**Array/object string concatenation:**
- Problem: String building uses `+` operator and `join()` in loops
- Files: `src/prettyPrint.ts` (lines 123, 155), `src/formatter.ts` (line 46)
- Cause: Manual string assembly for formatted output
- Improvement path: Current approach is simple and readable; optimization likely unnecessary

## Fragile Areas

**Logger implementation duplication:**
- Files: `src/logger.ts` (lines 82-124 for log methods, 150-189 for scoped methods)
- Why fragile: Methods follow identical pattern with level parameter hardcoded - refactoring risk
- Safe modification: Extract to factory function or use higher-order function to generate methods
- Test coverage: 100% coverage, but branching not fully tested (lines 83, 103 show branch gap)

**Color detection environment assumptions:**
- Files: `src/colors.ts` (lines 39-67)
- Why fragile: Relies on specific environment variables and `process.stdout.isTTY` detection
- Safe modification: Add tests for various terminal environments; document assumptions
- Test coverage: 100% coverage, all branches tested

**Circular reference tracking:**
- Files: `src/prettyPrint.ts` (lines 112-126, 140-168)
- Why fragile: Manual WeakSet add/delete pattern - error-prone if cleanup path missed
- Safe modification: Use try-finally to ensure seen.delete always executes
- Test coverage: 98.5% coverage with gap on line 81 (fallback return)

**Input validation throws synchronously:**
- Files: `src/logger.ts` (lines 22-28)
- Why fragile: Throws in hot path, could break applications if not handled
- Safe modification: Document throwing behavior clearly; consider silent fallback option
- Test coverage: 100% coverage but validation errors not tested

## Scaling Limits

**String output size:**
- Current capacity: Unbounded - large objects produce large strings
- Limit: No built-in truncation for log message size
- Scaling path: Consider adding `maxMessageLength` or `truncate` config option

**Concurrent logging:**
- Current capacity: No synchronization for concurrent writes
- Limit: Multiple async operations calling logger simultaneously could interleave output
- Scaling path: Current design assumes Node.js single-threaded event loop; no action needed unless worker threads used

**Memory - circular tracking:**
- Current capacity: WeakSet for circular references (garbage collected)
- Limit: No explicit limit on tracked objects
- Scaling path: WeakSet is appropriate - scales with GC, no action needed

## Dependencies at Risk

**No runtime dependencies:**
- Risk: Zero production dependencies by design
- Impact: Low risk - library is self-contained
- Migration plan: Not applicable

**Vitest 4.x:**
- Risk: Using Vitest 4.0.16 which is relatively new
- Impact: Test framework - could have breaking changes in minor versions
- Migration plan: Pin to `~4.0.0` range in package.json to allow patch updates only

**TypeScript 5.9.3:**
- Risk: TypeScript minor version pinning
- Impact: Build tooling - TypeScript 6.x may introduce breaking changes
- Migration plan: Test with TypeScript 6.x when released; update tsconfig if needed

## Missing Critical Features

**No log transport abstraction:**
- Problem: All output goes to console; cannot redirect to file, service, or custom handler
- Blocks: Integration with log aggregation services (Datadog, ELK, cloud providers)
- Planned: Phase 3 of project plan mentions "Custom Transport API" for v2.0

**No log filtering by context:**
- Problem: Can filter by level globally, but cannot enable/disable specific contexts
- Blocks: Selective logging (e.g., silence 'Database' logs while keeping 'API' logs)
- Planned: Not mentioned in roadmap but common feature request

**No structured logging support:**
- Problem: Output is formatted strings, not structured data (JSON)
- Blocks: Machine-readable log parsing, log querying systems
- Planned: Not mentioned in roadmap but would be valuable addition

**No child/inherited contexts:**
- Problem: `createScope` creates isolated loggers; cannot nest or inherit contexts
- Blocks: Hierarchical logging patterns (e.g., 'Database:Connection' as child of 'Database')
- Planned: Not mentioned in roadmap

**No log buffering/batching:**
- Problem: Each log writes immediately to console
- Blocks: Performance optimization for high-volume logging
- Planned: Not mentioned in roadmap

## Test Coverage Gaps

**Branch coverage in logger:**
- What's not tested: The data array conditional in log methods (line 83 in `src/logger.ts`)
- Files: `src/logger.ts`
- Risk: Untested code path for empty vs non-empty data arrays
- Priority: Low - coverage shows 83.33% branch coverage but core functionality is tested

**Fallback type handling:**
- What's not tested: The final fallback return in prettyPrint (line 81)
- Files: `src/prettyPrint.ts`
- Risk: Unknown types not covered by tests
- Priority: Low - theoretical edge case for exotic JavaScript types

**Input validation error paths:**
- What's not tested: Empty context/message throwing errors
- Files: `src/logger.ts` (lines 22-28)
- Risk: Validation logic not verified
- Priority: Medium - core feature that should be tested

**Config reset functionality:**
- What's not tested: `resetConfig()` function has no dedicated tests
- Files: `src/config.ts` (line 57)
- Risk: Developer API not verified
- Priority: Low - utility function likely only used in tests

**Edge case in timestamp formatting:**
- What's not tested: ISO format with different timezones
- Files: `src/timestamp.ts`
- Risk: ISO 8601 format assumes UTC from `toISOString()`
- Priority: Low - documented behavior of Date.toISOString()

---

*Concerns audit: 2026-01-18*
