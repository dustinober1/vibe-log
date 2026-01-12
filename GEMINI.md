# log-vibe

A beautiful, zero-dependency TypeScript logging library for Node.js.

## Project Status

- **Phase**: Phase 2 Complete - Documentation & README
- **Next Step**: Phase 3 - Publishing to npm

## Key Files

- `project_plan.md` - Original vision and phased roadmap
- `TASKS.md` - Detailed task breakdown for implementation (64+ tasks)

## Architecture Decisions

- **Zero dependencies** - No runtime dependencies
- **TypeScript first** - Full type safety
- **Dual module support** - CommonJS and ES Modules
- **Build tool**: tsup
- **Test framework**: Vitest

## API Design

```typescript
import log, { createScope } from 'log-vibe';

// Basic usage
log.info('Context', 'Message', ...data);
log.debug('Context', 'Message', ...data);
log.success('Context', 'Message', ...data);
log.warn('Context', 'Message', ...data);
log.error('Context', 'Message', ...data);

// Scoped logger
const dbLog = createScope('Database');
dbLog.info('Connected');
```

## Log Levels

| Level | Icon | Color | Use Case |
|-------|------|-------|----------|
| debug | 🔍 | Gray | Development debugging |
| info | ℹ️ | Cyan | Application flow |
| success | ✅ | Green | Completed operations |
| warn | ⚠️ | Yellow | Potential issues |
| error | ❌ | Red | Failures |
