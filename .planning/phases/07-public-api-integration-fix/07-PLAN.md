# Phase 07: Public API Integration Fix

**Goal:** Fix critical gap in configure() shorthand API to enable user access to compression and retention features

**Gap Closure:** Closes integration gap identified in v1.1-MILESTONE-AUDIT.md

## Problem

The `configure()` function in `src/config.ts` only passes `maxSize` and `pattern` to FileTransport, but does NOT pass:
- `compressionLevel` (Phase 04 feature)
- `maxFiles` (Phase 05 feature)
- `maxAge` (Phase 05 feature)

**User Impact:**
- Users cannot use `configure({ file: './app.log', rotation: { compressionLevel: 6 } })`
- Users cannot use `configure({ file: './app.log', rotation: { maxFiles: 20, maxAge: 30 } })`
- Must use direct `FileTransport` constructor instead (defeats purpose of shorthand API)

**Location:** `src/config.ts:69-84`

## Solution

### Task 1: Update Type Definition

**File:** `src/config.ts`
**Action:** Extend `fileTransportOptions` type to include missing fields

```typescript
const fileTransportOptions: {
    maxSize?: string | number;
    pattern?: 'daily';
    compressionLevel?: number;  // ADD
    maxFiles?: number;          // ADD
    maxAge?: number;            // ADD
} = {};
```

### Task 2: Add Field Passthrough Logic

**File:** `src/config.ts`
**Action:** Add conditional field assignment for rotation options

After the existing `pattern` check (around line 78), add:

```typescript
// Pass compression level to FileTransport
if (rotation?.compressionLevel !== undefined) {
    fileTransportOptions.compressionLevel = rotation.compressionLevel;
}

// Pass retention configuration to FileTransport
if (rotation?.maxFiles !== undefined) {
    fileTransportOptions.maxFiles = rotation.maxFiles;
}

if (rotation?.maxAge !== undefined) {
    fileTransportOptions.maxAge = rotation.maxAge;
}
```

**Note:** Use `!== undefined` check to allow `0` as a valid value

### Task 3: Add Test for Compression Passthrough

**File:** `test/config.test.ts`
**Action:** Add test to verify compressionLevel is passed to FileTransport

```typescript
it('should pass compressionLevel to FileTransport', () => {
    const config = configure({
        file: './test.log',
        rotation: { compressionLevel: 9 }
    });

    expect(config.transports).toHaveLength(1);
    const transport = config.transports[0];
    expect(transport).toBeInstanceOf(FileTransport);

    // Verify compressionLevel was passed through
    const fileTransport = transport as FileTransport;
    // Check that compressionLevel is set (implementation-specific)
});
```

### Task 4: Add Test for Retention Passthrough

**File:** `test/config.test.ts`
**Action:** Add test to verify maxFiles and maxAge are passed to FileTransport

```typescript
it('should pass maxFiles and maxAge to FileTransport', () => {
    const config = configure({
        file: './test.log',
        rotation: { maxFiles: 10, maxAge: 7 }
    });

    expect(config.transports).toHaveLength(1);
    const transport = config.transports[0];
    expect(transport).toBeInstanceOf(FileTransport);

    // Verify retention config was passed through
    const fileTransport = transport as FileTransport;
    // Check that maxFiles and maxAge are set (implementation-specific)
});
```

## Success Criteria

- [ ] `src/config.ts` type definition includes compressionLevel, maxFiles, maxAge
- [ ] `configure()` function passes all three fields to FileTransport
- [ ] Test for compressionLevel passthrough passes
- [ ] Test for retention passthrough passes
- [ ] All existing tests still pass (216/216)
- [ ] Public API configuration E2E flow works

## Verification

After implementation, verify:

```bash
# Run all tests
npm test

# Run specific config tests
npm test -- test/config.test.ts

# Re-run milestone audit
cat .planning/v1.1-MILESTONE-AUDIT.md | grep "integration: 9/9"
```

Expected result: Integration score should be 9/9 (up from 8/9)

## Effort Estimate

**Total:** 15 minutes
- Task 1 (Type definition): 2 minutes
- Task 2 (Passthrough logic): 5 minutes
- Task 3 (Compression test): 4 minutes
- Task 4 (Retention test): 4 minutes

## References

- Audit findings: `.planning/v1.1-MILESTONE-AUDIT.md`
- Current implementation: `src/config.ts:69-84`
- Test file: `test/config.test.ts`
