# Technology Stack

**Analysis Date:** 2026-01-18

## Languages

**Primary:**
- TypeScript 5.9.3 - All source code written in TypeScript with strict type checking enabled

**Secondary:**
- JavaScript (ES2020) - Compiled output target for Node.js compatibility

## Runtime

**Environment:**
- Node.js >=14.0.0 (specified in `package.json` engines field)

**Package Manager:**
- npm (inferred from package-lock.json presence)
- Lockfile: present (`package-lock.json`)

## Frameworks

**Core:**
- None (vanilla Node.js logging library)

**Testing:**
- Vitest 4.0.16 - Test runner and framework
- @vitest/coverage-v8 4.0.16 - Code coverage provider

**Build/Dev:**
- TypeScript 5.9.3 - Type checking and compilation
- tsup 8.5.1 - Build tool for bundling
- tsx 4.21.0 - TypeScript execution for development/testing

## Key Dependencies

**Critical:**
- None (zero runtime dependencies - this is a standalone library)

**Infrastructure:**
- @types/node 25.0.6 - TypeScript definitions for Node.js built-ins

## Configuration

**Environment:**
- No environment variables required for core functionality
- Respects standard env vars: `NO_COLOR`, `FORCE_COLOR`, `CI`, `TERM` (for color detection)
- Configured via `configure()` function API, not environment variables

**Build:**
- `tsconfig.json` - TypeScript compiler configuration
- `tsup.config.ts` - Build bundler configuration (CJS + ESM output)
- `vitest.config.ts` - Test runner configuration

## Platform Requirements

**Development:**
- Node.js >=14.0.0
- npm (for package management)
- TypeScript environment (handled by devDependencies)

**Production:**
- Node.js >=14.0.0
- Works in any terminal environment (TTY and non-TTY)
- Optional: Terminal with ANSI color support for colored output

---

*Stack analysis: 2026-01-18*
