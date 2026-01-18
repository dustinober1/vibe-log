import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
    parseRotatedDate,
    getSortedRotatedFiles,
    calculateAgeInDays,
    cleanupOldLogs
} from '../src/utils/retention';

describe('Retention Utility Functions', () => {
    const TEST_DIR = path.join(__dirname, '../../test-logs-retention');

    beforeEach(() => {
        // Clean up test directory before each test
        if (fs.existsSync(TEST_DIR)) {
            fs.rmSync(TEST_DIR, { recursive: true, force: true });
        }
        fs.mkdirSync(TEST_DIR, { recursive: true });
    });

    afterEach(() => {
        // Clean up test directory after each test
        if (fs.existsSync(TEST_DIR)) {
            fs.rmSync(TEST_DIR, { recursive: true, force: true });
        }
    });

    describe('parseRotatedDate', () => {
        it('should return correct UTC date for valid rotated filename', () => {
            const filename = 'app-2026-01-15.log.1';
            const result = parseRotatedDate(filename, 'app', '.log');

            expect(result).toBeDefined();
            expect(result?.toISOString()).toBe('2026-01-15T00:00:00.000Z');
        });

        it('should return undefined for non-rotated filename', () => {
            const filename = 'app.log';
            const result = parseRotatedDate(filename, 'app', '.log');

            expect(result).toBeUndefined();
        });

        it('should handle .gz files by stripping .gz suffix before parsing', () => {
            const filename = 'app-2026-01-15.log.1.gz';
            const result = parseRotatedDate(filename, 'app', '.log');

            expect(result).toBeDefined();
            expect(result?.toISOString()).toBe('2026-01-15T00:00:00.000Z');
        });

        it('should use UTC date (no timezone issues)', () => {
            const filename = 'app-2026-06-15.log.5';
            const result = parseRotatedDate(filename, 'app', '.log');

            expect(result).toBeDefined();
            // Should be midnight UTC (use UTC getters)
            expect(result?.getUTCHours()).toBe(0);
            expect(result?.getUTCMinutes()).toBe(0);
            expect(result?.getUTCSeconds()).toBe(0);
        });

        it('should return undefined for filename with different base', () => {
            const filename = 'different-2026-01-15.log.1';
            const result = parseRotatedDate(filename, 'app', '.log');

            expect(result).toBeUndefined();
        });

        it('should return undefined for filename with different extension', () => {
            const filename = 'app-2026-01-15.txt.1';
            const result = parseRotatedDate(filename, 'app', '.log');

            expect(result).toBeUndefined();
        });
    });

    describe('getSortedRotatedFiles', () => {
        it('should return array of rotated filenames sorted by date (oldest first)', () => {
            // Create test files
            fs.writeFileSync(path.join(TEST_DIR, 'app-2026-01-15.log.1'), 'old');
            fs.writeFileSync(path.join(TEST_DIR, 'app-2026-01-17.log.1'), 'newer');
            fs.writeFileSync(path.join(TEST_DIR, 'app-2026-01-16.log.1'), 'middle');

            const result = getSortedRotatedFiles(TEST_DIR, 'app', '.log');

            expect(result).toHaveLength(3);
            expect(result[0]).toBe('app-2026-01-15.log.1');
            expect(result[1]).toBe('app-2026-01-16.log.1');
            expect(result[2]).toBe('app-2026-01-17.log.1');
        });

        it('should include both .gz and uncompressed files', () => {
            fs.writeFileSync(path.join(TEST_DIR, 'app-2026-01-15.log.1.gz'), 'compressed');
            fs.writeFileSync(path.join(TEST_DIR, 'app-2026-01-16.log.1'), 'uncompressed');

            const result = getSortedRotatedFiles(TEST_DIR, 'app', '.log');

            expect(result).toHaveLength(2);
            expect(result).toContain('app-2026-01-15.log.1.gz');
            expect(result).toContain('app-2026-01-16.log.1');
        });

        it('should return empty array if directory does not exist', () => {
            const nonExistentDir = path.join(TEST_DIR, 'does-not-exist');
            const result = getSortedRotatedFiles(nonExistentDir, 'app', '.log');

            expect(result).toEqual([]);
        });

        it('should filter out non-rotated files', () => {
            fs.writeFileSync(path.join(TEST_DIR, 'app-2026-01-15.log.1'), 'rotated');
            fs.writeFileSync(path.join(TEST_DIR, 'app.log'), 'active');
            fs.writeFileSync(path.join(TEST_DIR, 'other.txt'), 'other');

            const result = getSortedRotatedFiles(TEST_DIR, 'app', '.log');

            expect(result).toHaveLength(1);
            expect(result[0]).toBe('app-2026-01-15.log.1');
        });

        it('should handle files with same date but different sequences', () => {
            fs.writeFileSync(path.join(TEST_DIR, 'app-2026-01-15.log.1'), 'first');
            fs.writeFileSync(path.join(TEST_DIR, 'app-2026-01-15.log.2'), 'second');
            fs.writeFileSync(path.join(TEST_DIR, 'app-2026-01-15.log.3'), 'third');

            const result = getSortedRotatedFiles(TEST_DIR, 'app', '.log');

            expect(result).toHaveLength(3);
            // All have same date, so order doesn't matter much
            expect(result).toContain('app-2026-01-15.log.1');
            expect(result).toContain('app-2026-01-15.log.2');
            expect(result).toContain('app-2026-01-15.log.3');
        });
    });

    describe('calculateAgeInDays', () => {
        it('should return correct age in days for old file', () => {
            const oldDate = new Date('2026-01-01T00:00:00.000Z');
            // Mock current date to 2026-01-18
            const now = new Date('2026-01-18T12:00:00.000Z');

            // We need to mock Date globally for this test
            const originalDate = global.Date;
            global.Date = class extends Date {
                constructor(...args: any[]) {
                    if (args.length === 0) {
                        super(now);
                    } else {
                        super(...args);
                    }
                }
                static now() {
                    return now.getTime();
                }
            } as any;

            const age = calculateAgeInDays(oldDate);

            // Restore original Date
            global.Date = originalDate;

            expect(age).toBe(17);
        });

        it('should return 0 for today\'s file', () => {
            const today = new Date('2026-01-18T00:00:00.000Z');
            const now = new Date('2026-01-18T12:00:00.000Z');

            // Mock current date
            const originalDate = global.Date;
            global.Date = class extends Date {
                constructor(...args: any[]) {
                    if (args.length === 0) {
                        super(now);
                    } else {
                        super(...args);
                    }
                }
                static now() {
                    return now.getTime();
                }
            } as any;

            const age = calculateAgeInDays(today);

            // Restore original Date
            global.Date = originalDate;

            expect(age).toBe(0);
        });

        it('should round down (not up)', () => {
            const fileDate = new Date('2026-01-17T00:00:00.000Z');
            const now = new Date('2026-01-18T23:59:59.000Z'); // Almost 2 days, but not quite

            // Mock current date
            const originalDate = global.Date;
            global.Date = class extends Date {
                constructor(...args: any[]) {
                    if (args.length === 0) {
                        super(now);
                    } else {
                        super(...args);
                    }
                }
                static now() {
                    return now.getTime();
                }
            } as any;

            const age = calculateAgeInDays(fileDate);

            // Restore original Date
            global.Date = originalDate;

            // Should be 1 day, not 2 (rounds down)
            expect(age).toBe(1);
        });
    });

    describe('cleanupOldLogs', () => {
        beforeEach(() => {
            // Create some test files
            // Current active file (not in rotated list)
            fs.writeFileSync(path.join(TEST_DIR, 'app.log'), 'active log');

            // Old rotated files (should be deleted if both conditions met)
            fs.writeFileSync(path.join(TEST_DIR, 'app-2026-01-10.log.1'), 'very old');
            fs.writeFileSync(path.join(TEST_DIR, 'app-2026-01-11.log.1'), 'old');
            fs.writeFileSync(path.join(TEST_DIR, 'app-2026-01-12.log.1'), 'less old');
        });

        it('should delete files that exceed BOTH maxFiles AND maxAge thresholds', async () => {
            // Create scenario: 3 rotated files + 1 active = 4 total
            // maxFiles = 2, maxAge = 5 days
            // Files older than 5 days AND beyond index 1 should be deleted
            const now = new Date('2026-01-18T12:00:00.000Z');
            const originalDate = global.Date;
            global.Date = class extends Date {
                constructor(...args: any[]) {
                    if (args.length === 0) {
                        super(now);
                    } else {
                        super(...args);
                    }
                }
                static now() {
                    return now.getTime();
                }
            } as any;

            const result = await cleanupOldLogs(TEST_DIR, 'app', '.log', 2, 5);

            global.Date = originalDate;

            // Should delete files at index >= 1 (2nd file onwards) that are > 5 days old
            // app-2026-01-10.log.1: index 0, age 8 days - NOT deleted (index < 1)
            // app-2026-01-11.log.1: index 1, age 7 days - DELETED (index >= 1 AND age > 5)
            // app-2026-01-12.log.1: index 2, age 6 days - DELETED (index >= 1 AND age > 5)
            expect(result.deleted).toBe(2);
            expect(fs.existsSync(path.join(TEST_DIR, 'app-2026-01-10.log.1'))).toBe(true);
            expect(fs.existsSync(path.join(TEST_DIR, 'app-2026-01-11.log.1'))).toBe(false);
            expect(fs.existsSync(path.join(TEST_DIR, 'app-2026-01-12.log.1'))).toBe(false);
        });

        it('should NOT delete files that exceed only one threshold (AND logic)', async () => {
            // Create scenario: 3 rotated files
            // maxFiles = 5, maxAge = 5 days
            // File at index 0, age 8 days - exceeds maxAge but NOT maxFiles limit - NOT deleted
            const now = new Date('2026-01-18T12:00:00.000Z');
            const originalDate = global.Date;
            global.Date = class extends Date {
                constructor(...args: any[]) {
                    if (args.length === 0) {
                        super(now);
                    } else {
                        super(...args);
                    }
                }
                static now() {
                    return now.getTime();
                }
            } as any;

            const result = await cleanupOldLogs(TEST_DIR, 'app', '.log', 5, 5);

            global.Date = originalDate;

            // No files should be deleted (none exceed BOTH thresholds)
            expect(result.deleted).toBe(0);
            expect(fs.existsSync(path.join(TEST_DIR, 'app-2026-01-10.log.1'))).toBe(true);
            expect(fs.existsSync(path.join(TEST_DIR, 'app-2026-01-11.log.1'))).toBe(true);
            expect(fs.existsSync(path.join(TEST_DIR, 'app-2026-01-12.log.1'))).toBe(true);
        });

        it('should never delete all files (protects current active file)', async () => {
            // Only active file exists - should never be deleted
            const cleanDir = path.join(TEST_DIR, 'clean');
            fs.mkdirSync(cleanDir, { recursive: true });
            fs.writeFileSync(path.join(cleanDir, 'app.log'), 'active');

            const result = await cleanupOldLogs(cleanDir, 'app', '.log', 0, 0);

            expect(result.deleted).toBe(0);
            expect(fs.existsSync(path.join(cleanDir, 'app.log'))).toBe(true);
        });

        it('should continue on locked file errors (best-effort)', async () => {
            // This test simulates a file that can't be deleted
            // We'll test by making a directory instead of a file (which will cause error on delete)
            fs.mkdirSync(path.join(TEST_DIR, 'app-2026-01-13.log.1'));

            const now = new Date('2026-01-18T12:00:00.000Z');
            const originalDate = global.Date;
            global.Date = class extends Date {
                constructor(...args: any[]) {
                    if (args.length === 0) {
                        super(now);
                    } else {
                        super(...args);
                    }
                }
                static now() {
                    return now.getTime();
                }
            } as any;

            const result = await cleanupOldLogs(TEST_DIR, 'app', '.log', 1, 1);

            global.Date = originalDate;

            // Should have errors but still continue
            expect(result.errors.length).toBeGreaterThan(0);
            // Should still delete other files that can be deleted
            expect(result.deleted).toBeGreaterThan(0);
        });

        it('should return deleted count and errors array', async () => {
            const now = new Date('2026-01-18T12:00:00.000Z');
            const originalDate = global.Date;
            global.Date = class extends Date {
                constructor(...args: any[]) {
                    if (args.length === 0) {
                        super(now);
                    } else {
                        super(...args);
                    }
                }
                static now() {
                    return now.getTime();
                }
            } as any;

            const result = await cleanupOldLogs(TEST_DIR, 'app', '.log', 2, 5);

            global.Date = originalDate;

            expect(result).toHaveProperty('deleted');
            expect(result).toHaveProperty('errors');
            expect(typeof result.deleted).toBe('number');
            expect(Array.isArray(result.errors)).toBe(true);
        });

        it('should log deletion operations to console', async () => {
            const consoleLogSpy = [] as string[];
            const originalLog = console.log;
            console.log = (...args: any[]) => {
                consoleLogSpy.push(args.join(' '));
            };

            const now = new Date('2026-01-18T12:00:00.000Z');
            const originalDate = global.Date;
            global.Date = class extends Date {
                constructor(...args: any[]) {
                    if (args.length === 0) {
                        super(now);
                    } else {
                        super(...args);
                    }
                }
                static now() {
                    return now.getTime();
                }
            } as any;

            await cleanupOldLogs(TEST_DIR, 'app', '.log', 2, 5);

            global.Date = originalDate;
            console.log = originalLog;

            // Should have logged deletions
            const deleteLogs = consoleLogSpy.filter(log => log.includes('Deleted old log'));
            expect(deleteLogs.length).toBeGreaterThan(0);
        });
    });
});
