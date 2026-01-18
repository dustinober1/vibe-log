# Troubleshooting Guide

This guide helps you diagnose and resolve common production issues with log-vibe.

## Table of Contents

- [Disk Full Errors](#disk-full-errors-enospc)
- [Permission Errors](#permission-errors-eacces)
- [Directory Issues](#directory-issues)
- [Multi-Process Limitations](#multi-process-limitations)
- [Log File Not Growing](#log-file-not-growing)
- [Rotation Not Working](#rotation-not-working)
- [Compression Failures](#compression-failures)
- [Getting Help](#getting-help)

## Disk Full Errors (ENOSPC)

### Symptoms

- Logs stop appearing in file
- Application continues running but no new logs
- Console message: `[FileTransport] Write error: ENOSPC - No space left on device`
- `disk-full` event emitted if you're listening

### Causes

- Disk partition is full
- Log files filled available disk space
- Retention policy not configured or too permissive

### Diagnostic Steps

1. Check disk space:
   ```bash
   df -h /path/to/logs
   ```

2. Check log directory size:
   ```bash
   du -sh /path/to/logs
   ```

3. List oldest/largest log files:
   ```bash
   ls -lhS /path/to/logs  # Largest files
   ls -lht /path/to/logs  # Most recent
   ```

### Solutions

**Immediate:**
1. Free disk space by deleting old log files manually:
   ```bash
   cd /path/to/logs
   rm app-2025-*.log.*.gz  # Delete old compressed logs
   ```

2. Move log directory to larger partition:
   ```bash
   mv /path/to/logs /larger/partition/logs
   ln -s /larger/partition/logs /path/to/logs
   ```

**Long-term:**
1. Enable retention cleanup:
   ```typescript
   configure({
     file: './logs/app.log',
     rotation: {
       maxSize: '100MB',
       maxFiles: 20,    // Keep max 20 files
       maxAge: 30       // Delete files older than 30 days
     }
   });
   ```

2. Enable compression to reduce disk usage:
   ```typescript
   configure({
     file: './logs/app.log',
     rotation: {
       maxSize: '100MB',
       compressionLevel: 6  // 5-10x space savings
     }
   });
   ```

3. Monitor disk space and set up alerts:
   ```bash
   # Add to crontab for hourly checks
   0 * * * * df -h /path/to/logs | awk '{print $5}' | grep -E '9[0-9]%' && mail -s "Disk full alert" admin@example.com
   ```
