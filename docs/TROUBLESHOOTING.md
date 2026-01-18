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

## Permission Errors (EACCES)

### Symptoms

- Logs fail to write immediately on startup
- Application may crash or fail to start
- Console message: `[FileTransport] Write error: EACCES - Permission denied`
- `permission-denied` event emitted if you're listening

### Causes

- Log directory owned by different user
- Insufficient permissions on log directory or file
- Running as different user than created log files

### Diagnostic Steps

1. Check directory ownership:
   ```bash
   ls -ld /path/to/logs
   ```

2. Check file ownership:
   ```bash
   ls -l /path/to/logs
   ```

3. Check current user:
   ```bash
   whoami
   ```

### Solutions

**Fix ownership:**
```bash
# Change ownership to current user
sudo chown -R $USER:$USER /path/to/logs
```

**Fix permissions:**
```bash
# Grant read/write/execute to owner
chmod 700 /path/to/logs

# Grant read/write to owner and group
chmod 770 /path/to/logs

# Grant read/write to all users (less secure)
chmod 777 /path/to/logs
```

**Run with correct user:**
```bash
# Start application with log directory owner
sudo -u loguser node app.js
```

## Directory Issues

### Symptoms

- `ENOENT: no such file or directory` errors
- Directory deleted during runtime
- External process cleaning up log directory

### Diagnostic Steps

1. Check if directory exists:
   ```bash
   ls -la /path/to/logs
   ```

2. Monitor directory changes:
   ```bash
   watch -n 5 'ls -la /path/to/logs'
   ```

3. Check for cleanup processes:
   ```bash
   ps aux | grep -E 'logrotate|tmpwatch|cleanup'
   ```

### Solutions

**Manual recreation:**
```bash
mkdir -p /path/to/logs
chmod 755 /path/to/logs
```

**Prevent external cleanup:**
- Exclude log directory from tmpwatch/tmpreaper
- Configure logrotate to use `copytruncate` instead of deleting
- Set appropriate retention policy instead of external cleanup

**Handle in application:**
log-vibe will attempt to recreate the directory if it's deleted during rotation. Monitor for `error` events.

## Multi-Process Limitations

### Symptoms

- Log entries missing or corrupted
- Rotation fails intermittently
- Sequence numbers collide in rotated files

### Cause

log-vibe does NOT support multi-process writing to the same log file. Multiple processes writing to the same file can cause:
- Data corruption
- Lost log entries
- Rotation failures
- Race conditions

### Solutions

**Use separate log files per process:**
```typescript
// Process 1
configure({ file: './logs/app-1.log' });

// Process 2
configure({ file: './logs/app-2.log' });
```

**Use process ID in filename:**
```typescript
configure({
  file: `./logs/app-${process.pid}.log`
});
```

**Use a logging server (recommended for production):**
- Run a dedicated logging process
- Other processes send logs via IPC/network
- Centralized logger writes to disk safely

**Alternative: Use syslog:**
```typescript
import { configure, SyslogTransport } from 'log-vibe';

configure({
  transports: [new SyslogTransport()]
});
```

## Log File Not Growing

### Symptoms

- Log file exists but no new entries
- Application logs work in console but not file
- No errors reported

### Diagnostic Steps

1. Check if file transport is configured:
   ```typescript
   console.log(require('log-vibe').getConfig());
   ```

2. Check file permissions:
   ```bash
   ls -la /path/to/logs/app.log
   ```

3. Monitor file for changes:
   ```bash
   tail -f /path/to/logs/app.log
   ```

### Solutions

**Verify configuration:**
```typescript
import { configure } from 'log-vibe';

configure({
  file: './logs/app.log',  // Make sure this is set
  console: false           // Ensure file logging is enabled
});
```

**Check error events:**
```typescript
import { FileTransport } from 'log-vibe';

const transport = new FileTransport('./logs/app.log');
transport.on('error', (err) => {
  console.error('Transport error:', err);
});

configure({ transports: [transport] });
```

## Rotation Not Working

### Symptoms

- Log file grows beyond maxSize
- No rotated files created
- Daily rotation doesn't occur

### Diagnostic Steps

1. Verify rotation config:
   ```bash
   grep -A 5 "rotation:" config.js
   ```

2. Check current file size:
   ```bash
   ls -lh /path/to/logs/app.log
   ```

3. Look for rotated files:
   ```bash
   ls -lh /path/to/logs/app-*.log.*
   ```

### Solutions

**Enable rotation:**
```typescript
configure({
  file: './logs/app.log',
  rotation: {
    maxSize: '100MB',    // Size-based
    pattern: 'daily'     // Time-based
  }
});
```

**Check size format:**
- Valid: `'100MB'`, `'1.5GB'`, `104857600` (bytes)
- Invalid: `'100'` (needs unit), `'100 mb'` (no space)

**Verify rotation isn't blocked by errors:**
- Check console for rotation errors
- Listen for 'error' events on transport
- Ensure disk isn't full (rotation requires disk space)
