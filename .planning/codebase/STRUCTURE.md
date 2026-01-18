# Codebase Structure

**Analysis Date:** 2025-01-18

## Directory Layout

```
log-vibe/
├── src/                 # TypeScript source code
├── test/                # Test files (mirror of src structure)
├── dist/                # Compiled output (generated, not committed)
├── coverage/            # Test coverage reports (generated)
├── docs/                # Documentation and demos
├── node_modules/        # Dependencies (generated)
└── .planning/           # GSD planning documents
```

## Directory Purposes

**`src/`:**
- Purpose: Core library source code
- Contains: TypeScript modules for logging functionality
- Key files: `index.ts`, `logger.ts`, `types.ts`, `formatter.ts`, `config.ts`, `prettyPrint.ts`, `colors.ts`, `icons.ts`, `timestamp.ts`, `levels.ts`

**`test/`:**
- Purpose: Vitest test suites
- Contains: Test files mirroring `src/` structure
- Key files: `logger.test.ts`, `formatter.test.ts`, `prettyPrint.test.ts`, `colors.test.ts`, `config.test.ts`, `icons.test.ts`, `timestamp.test.ts`, `types.test.ts`, `index.test.ts`

**`dist/`:**
- Purpose: Compiled JavaScript output for distribution
- Contains: CJS (`*.js`), ESM (`*.mjs`), and TypeScript declarations (`*.d.ts`)
- Generated: Yes (by `npm run build`)
- Committed: Yes

**`docs/`:**
- Purpose: Documentation and demonstration scripts
- Contains: `demo.ts` (usage examples), `demo.png` (output screenshot)
- Generated: No

**`coverage/`:**
- Purpose: Test coverage reports
- Generated: Yes (by `npm run test:coverage`)
- Committed: Yes

## Key File Locations

**Entry Points:**
- `/Users/dustinober/Projects/log-vibe/src/index.ts`: Main public API export, default export
- `/Users/dustinober/Projects/log-vibe/package.json`: Package manifest, exports field, npm scripts

**Configuration:**
- `/Users/dustinober/Projects/log-vibe/tsconfig.json`: TypeScript compiler configuration
- `/Users/dustinober/Projects/log-vibe/vitest.config.ts`: Vitest test runner configuration
- `/Users/dustinober/Projects/log-vibe/tsup.config.ts`: tsup bundler configuration

**Core Logic:**
- `/Users/dustinober/Projects/log-vibe/src/logger.ts`: Main `log` object and `createScope` function
- `/Users/dustinober/Projects/log-vibe/src/formatter.ts`: Log entry formatting pipeline
- `/Users/dustinober/Projects/log-vibe/src/prettyPrint.ts`: Object/array/error pretty-printing
- `/Users/dustinober/Projects/log-vibe/src/config.ts`: Global configuration management

**Testing:**
- `/Users/dustinober/Projects/log-vibe/test/`: All test files (*.test.ts)
- `/Users/dustinober/Projects/log-vibe/vitest.config.ts`: Test configuration

## Naming Conventions

**Files:**
- PascalCase for type definition files: `types.ts`
- camelCase for implementation files: `logger.ts`, `formatter.ts`, `config.ts`
- Descriptive names matching primary export: `prettyPrint.ts`, `timestamp.ts`
- Test files: Source name + `.test.ts` suffix (e.g., `logger.test.ts`)

**Directories:**
- Lowercase names: `src`, `test`, `docs`, `coverage`, `dist`
- No special prefixes or suffixes

**Source Files (in `src/`):**
- `types.ts`: All TypeScript interfaces and type definitions
- `logger.ts`: Main logger object and factory function
- `formatter.ts`: Log formatting logic
- `prettyPrint.ts`: Object serialization and display
- `config.ts`: Configuration state and functions
- `colors.ts`: ANSI color code constants and detection
- `icons.ts`: Icon constants and Unicode/ASCII selection
- `timestamp.ts`: Timestamp formatting
- `levels.ts`: Log level priorities and colors
- `index.ts`: Public API barrel export

**Test Files (in `test/`):**
- Mirror source structure: Each `src/X.ts` has `test/X.test.ts`
- Tests use `describe` blocks for grouping related tests
- `beforeEach`/`afterEach` for setup/teardown

## Where to Add New Code

**New Feature:**
- Primary code: Create new file in `src/` following naming convention (camelCase)
- Tests: Create matching `src/X.ts` -> `test/X.test.ts`
- Export: Add to `src/index.ts` if part of public API

**New Component/Module:**
- Implementation: `/Users/dustinober/Projects/log-vibe/src/[moduleName].ts`
- Types: Add interfaces to `/Users/dustinober/Projects/log-vibe/src/types.ts` or inline in module
- Tests: `/Users/dustinober/Projects/log-vibe/test/[moduleName].test.ts`
- Export: Add to `/Users/dustinober/Projects/log-vibe/src/index.ts`

**Utilities:**
- Shared helpers: Create in `src/` with descriptive name (e.g., `stringUtils.ts`)
- Format utilities: Follow existing pattern (e.g., `timestamp.ts`, `colors.ts`)

**New Log Level:**
- Type: Add to `LogLevel` type in `/Users/dustinober/Projects/log-vibe/src/types.ts`
- Priority: Add to `LEVEL_PRIORITY` in `/Users/dustinober/Projects/log-vibe/src/levels.ts`
- Color: Add to `LEVEL_COLORS` in `/Users/dustinober/Projects/log-vibe/src/levels.ts`
- Icon: Add to `ICONS` and `ASCII_ICONS` in `/Users/dustinober/Projects/log-vibe/src/icons.ts`
- Method: Add to `Logger` and `ScopedLogger` interfaces in `types.ts`, implement in `logger.ts`

## Special Directories

**`dist/`:**
- Purpose: Compiled output for npm distribution
- Generated: Yes (by `npm run build`)
- Committed: Yes
- Contains: CJS, ESM, TypeScript declarations, source maps

**`node_modules/`:**
- Purpose: npm dependencies
- Generated: Yes (by `npm install`)
- Committed: No (.gitignore)

**`coverage/`:**
- Purpose: Test coverage reports
- Generated: Yes (by `npm run test:coverage`)
- Committed: Yes

**`.planning/`:**
- Purpose: GSD command planning documents
- Generated: Yes (by GSD commands)
- Committed: Yes
- Contains: Codebase analysis documents (this file, ARCHITECTURE.md, etc.)

---

*Structure analysis: 2025-01-18*
