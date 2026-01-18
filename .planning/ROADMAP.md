# log-vibe Project Roadmap

**Last Updated:** 2026-01-18

## Overview

This roadmap tracks the development of log-vibe, a beautiful zero-dependency logging library for Node.js. The project is organized into milestones, each containing one or more phases delivering specific functionality.

## Current Status

**Active Milestone:** v1.1 - Log Rotation
**Status:** Phase 3 planned, ready for execution

---

## Milestones

- ✅ **v1.0 Transport System** — Phase 1 (shipped 2026-01-18)
- 🔨 **v1.1 Log Rotation** — Phases 2-6 (in progress)
- 📋 **v2.0 Advanced Transports** — Future

---

## Phases

<details>
<summary>✅ v1.0 Transport System (Phase 1) — SHIPPED 2026-01-18</summary>

**Goal:** Add transport abstraction and file logging to enable logs to be written to files and custom destinations.

**Status:** ✅ Complete (4 plans executed, goal verified)

**Completed:** 2026-01-18

**Plans:**

| Plan | Wave | Description | Status |
|------|------|-------------|--------|
| [01-01-PLAN.md](./phases/01-transport-system/01-01-PLAN.md) | 1 | Create transport interface and extend types | ✅ Complete |
| [01-02-PLAN.md](./phases/01-transport-system/01-02-PLAN.md) | 2 | Implement FileTransport and ConsoleTransport | ✅ Complete |
| [01-03-PLAN.md](./phases/01-transport-system/01-03-PLAN.md) | 3 | Integrate transports into logger and config | ✅ Complete |
| [01-04-PLAN.md](./phases/01-transport-system/01-04-PLAN.md) | 4 | Write tests and documentation | ✅ Complete |

**Key Deliverables:**
- ✅ Transport interface with `log()` and optional `close()` methods
- ✅ FileTransport using Node.js streams
- ✅ ConsoleTransport for backward compatibility
- ✅ `configure({ file: './app.log' })` shorthand
- ✅ Multiple transports support
- ✅ Custom transport API
- ✅ 97.24% test coverage
- ✅ Complete documentation

**Out of Scope:**
- ❌ Log rotation (deferred to v1.1)
- ❌ Remote service transports (users can build via custom API)
- ❌ Built-in compression (deferred to v1.1)

</details>

### ✅ Phase 2: Core Rotation Infrastructure — SHIPPED 2026-01-18

**Goal:** Implement size-based rotation with atomic file switching to prevent log data loss.

**Status:** ✅ Complete (6 plans executed, goal verified)

**Completed:** 2026-01-18

**Dependencies:** Phase 1 (Transport System) complete

**Requirements Mapped:**
- CONFIG-01: Rotation configured via `configure({ file, rotation })`
- CONFIG-02: Backward compatible — no rotation config means no rotation
- RELIABLE-01: Rotation is atomic — no log entries lost during rotation
- RELIABLE-02: Stream properly closed and cleaned up during rotation
- ROTATE-02: Size-based rotation when file exceeds threshold (default 100MB)
- TEST-01: Unit tests for rotation logic

**Success Criteria:**
1. User can configure size-based rotation via `configure({ file: './app.log', rotation: { maxSize: '100MB' } })`
2. When log file exceeds configured size threshold, rotation occurs automatically with no data loss
3. During rotation, writes are temporarily gated and no log entries are lost
4. After rotation, original file is renamed to date-stamped name and new active file is created
5. Existing code without rotation config continues working unchanged (backward compatibility)

**Plans:**

| Plan | Wave | Description | Status |
|------|------|-------------|--------|
| [02-01-PLAN.md](./phases/02-core-rotation-infrastructure/02-01-PLAN.md) | 1 | Add RotationConfig types and parseSize utility | ✅ Complete |
| [02-02-PLAN.md](./phases/02-core-rotation-infrastructure/02-02-PLAN.md) | 2 | Create generateRotatedName utility | ✅ Complete |
| [02-03-PLAN.md](./phases/02-core-rotation-infrastructure/02-03-PLAN.md) | 2 | Implement atomic rotation sequence | ✅ Complete |
| [02-04-PLAN.md](./phases/02-core-rotation-infrastructure/02-04-PLAN.md) | 3 | Add size checking and write gating | ✅ Complete |
| [02-05-PLAN.md](./phases/02-core-rotation-infrastructure/02-05-PLAN.md) | 4 | Write rotation tests (TDD) | ✅ Complete |
| [02-06-PLAN.md](./phases/02-core-rotation-infrastructure/02-06-PLAN.md) | 5 | Integrate API and document rotation | ✅ Complete |

**Key Deliverables:**
- ✅ RotationConfig interface with human-readable size parsing ('100MB', '1.5GB')
- ✅ generateRotatedName utility with UTC dates and sequence incrementing
- ✅ Atomic rotation sequence (close → rename → create)
- ✅ Size checking and write gating for automatic rotation
- ✅ 18 new rotation tests (142 total tests passing)
- ✅ README rotation documentation with examples
- ✅ Full backward compatibility maintained

**Out of Scope:** Time-based rotation (Phase 3), compression (Phase 4), retention (Phase 5)

---

### 🔨 Phase 3: Time-based Rotation

**Goal:** Add daily log rotation at midnight with date-stamped filenames for organized log management.

**Status:** 📋 Planned

**Dependencies:** Phase 2 (Core Rotation Infrastructure)

**Requirements Mapped:**
- ROTATE-01: Daily rotation at midnight creates date-stamped file
- FILE-01: Rotated files use date-stamped names (app-2026-01-18.log.gz)
- FILE-02: Active file maintains base name (app.log)

**Success Criteria:**
1. User can configure daily rotation via `configure({ file: './app.log', rotation: { pattern: 'daily' } })`
2. At midnight, log file is automatically rotated to `app-YYYY-MM-DD.log` format
3. Active file always maintains base name (e.g., `app.log`)
4. Timer for midnight scheduling is automatically cleaned up when logger is closed
5. User can combine size-based and daily rotation (hybrid strategy)

**Plans:**

| Plan | Wave | Description | Status |
|------|------|-------------|--------|
| [03-01-PLAN.md](./phases/03-time-based-rotation/03-01-PLAN.md) | 1 | Add pattern config and midnight calculation utility | 📋 Planned |
| [03-02-PLAN.md](./phases/03-time-based-rotation/03-02-PLAN.md) | 2 | Implement timer scheduling and cleanup | 📋 Planned |
| [03-03-PLAN.md](./phases/03-time-based-rotation/03-03-PLAN.md) | 3 | Implement time-based rotation trigger (TDD) | 📋 Planned |
| [03-04-PLAN.md](./phases/03-time-based-rotation/03-04-PLAN.md) | 4 | Integrate pattern into public API | 📋 Planned |
| [03-05-PLAN.md](./phases/03-time-based-rotation/03-05-PLAN.md) | 5 | Document time-based rotation | 📋 Planned |

**Out of Scope:** Compression (Phase 4), retention cleanup (Phase 5)

---

### 🔨 Phase 4: Async Compression

**Goal:** Compress rotated log files with gzip to reduce storage overhead without blocking the event loop.

**Status:** 📋 Planned

**Dependencies:** Phase 3 (Time-based Rotation) - requires rotated files to compress

**Requirements Mapped:**
- COMPRESS-01: Rotated files are compressed with gzip
- COMPRESS-02: Compression is non-blocking and async
- ERROR-02: Compression failures don't block logging
- TEST-02: Unit tests for compression

**Success Criteria:**
1. User can enable compression via `configure({ file: './app.log', rotation: { compress: true } })`
2. After rotation completes, original file is compressed to `.gz` format and deleted
3. Compression executes asynchronously without blocking log writes
4. Compression errors are logged but don't crash the logging system or block new writes
5. Compressed files follow naming pattern `app-YYYY-MM-DD.log.gz`

**Out of Scope:** Retention cleanup (Phase 5)

---

### 🔨 Phase 5: Retention Cleanup

**Goal:** Automatically delete expired log files based on configurable retention policy to manage disk space.

**Status:** 📋 Planned

**Dependencies:** Phase 4 (Async Compression) - cleans up compressed files

**Requirements Mapped:**
- RETAIN-01: Retention period is configurable (default 14 days)
- RETAIN-02: Expired log files are automatically deleted
- ERROR-03: Cleanup errors are logged but don't stop rotation
- TEST-03: Unit tests for retention cleanup

**Success Criteria:**
1. User can configure retention via `configure({ file: './app.log', rotation: { retention: 14 } })` (days)
2. After each rotation, files older than retention period are automatically deleted
3. Cleanup executes asynchronously without blocking log writes
4. Cleanup errors (permission issues, file not found) are logged but don't stop rotation
5. Newest log files are always preserved, only files exceeding retention age are deleted

**Out of Scope:** Comprehensive error handling (Phase 6)

---

### 🔨 Phase 6: Error Handling & Production Hardening

**Goal:** Comprehensive error handling, edge case coverage, and production-ready reliability for the rotation system.

**Status:** 📋 Planned

**Dependencies:** Phase 5 (Retention Cleanup) - all features must work before hardening

**Requirements Mapped:**
- ERROR-01: Rotation errors don't crash the logging system
- TEST-04: Integration tests for full rotation workflow
- TEST-05: Error handling tests
- TEST-06: Maintain 97%+ test coverage
- DOCS-01: README section on log rotation
- DOCS-02: Configuration examples for rotation options
- DOCS-03: Migration guide from basic file logging

**Success Criteria:**
1. Rotation errors (disk full, permission denied, file locked) are caught and logged without crashing application
2. Integration tests verify end-to-end rotation workflow (configure → write → rotate → compress → cleanup)
3. Error paths are tested (ENOSPC, EACCES, EROFS, stream errors, compression failures)
4. Test coverage meets or exceeds 97% across all rotation code
5. README documents rotation configuration with examples for common use cases
6. Migration guide shows how to upgrade from basic file logging to rotation-enabled logging

**Out of Scope:** None (this phase completes v1.1)

---

### 📋 Phase 7+: v2.0 Advanced Transports (Future)

**Goal:** Built-in remote transports and advanced features.

**Status:** 📋 Not Planned

**Potential Features:**
- Built-in remote transports (Datadog, ELK, etc.)
- Transport buffering/batching
- Transport filtering by log level
- Advanced rotation patterns (hourly, weekly, custom schedules)

---

## Progress

| Phase             | Milestone | Plans Complete | Status      | Completed  |
| ----------------- | --------- | -------------- | ----------- | ---------- |
| 1. Transport System | v1.0      | 4/4            | Complete    | 2026-01-18 |
| 2. Core Rotation Infrastructure | v1.1 | 6/6 | Complete | 2026-01-18 |
| 3. Time-based Rotation | v1.1 | 0/5 | Planned | - |
| 4. Async Compression | v1.1 | 0/5 | Not started | - |
| 5. Retention Cleanup | v1.1 | 0/5 | Not started | - |
| 6. Error Handling & Production Hardening | v1.1 | 0/6 | Not started | - |

---

## Quick Links

- [Project Overview](./PROJECT.md)
- [Requirements](./REQUIREMENTS.md)
- [Milestones](./MILESTONES.md)
- [Codebase Analysis](./codebase/)
- [Research Summary](./research/SUMMARY.md)

---
*Roadmap maintained by: GSD planning workflow*
*Last updated: 2026-01-18*
