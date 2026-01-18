# Monitoring Guide

This guide covers production monitoring for log-vibe, including health checks, error event handling, metrics collection, and alerting.

## Table of Contents

- [Health Checks](#health-checks)
- [Error Event Monitoring](#error-event-monitoring)
- [Log File Health](#log-file-health)
- [Rotation Monitoring](#rotation-monitoring)
- [Disk Usage Monitoring](#disk-usage-monitoring)
- [Alerting Strategies](#alerting-strategies)
- [Metrics Collection](#metrics-collection)

## Health Checks

### Basic Transport Health

Monitor the health of your log transports by listening to events:

```typescript
import { FileTransport } from 'log-vibe';

const transport = new FileTransport('./logs/app.log', {
  maxSize: '100MB',
  maxFiles: 20,
  maxAge: 30
});

// Monitor for any errors
transport.on('error', (err) => {
  console.error('[ALERT] Transport error:', {
    code: err.code,
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// Monitor for disk full
transport.on('disk-full', (err) => {
  console.error('[CRITICAL] Disk full - logging stopped:', {
    path: './logs/app.log',
    timestamp: new Date().toISOString()
  });
  // Send alert to monitoring system
  sendAlert('disk-full', { path: './logs/app.log' });
});

// Monitor for permission denied
transport.on('permission-denied', (err) => {
  console.error('[CRITICAL] Permission denied - logging stopped:', {
    path: './logs/app.log',
    timestamp: new Date().toISOString()
  });
  // Send alert to monitoring system
  sendAlert('permission-denied', { path: './logs/app.log' });
});

configure({ transports: [transport] });
```

### Health Check Endpoint

For web applications, add a health check endpoint:

```typescript
import express from 'express';
import { FileTransport } from 'log-vibe';

const app = express();
const transport = new FileTransport('./logs/app.log');

let healthStatus = 'healthy';
let lastError = null;

transport.on('error', (err) => {
  healthStatus = 'unhealthy';
  lastError = {
    code: err.code,
    message: err.message,
    timestamp: new Date().toISOString()
  };
});

transport.on('disk-full', () => {
  healthStatus = 'critical';
});

app.get('/health', (req, res) => {
  const health = {
    status: healthStatus,
    timestamp: new Date().toISOString(),
    logging: {
      healthy: healthStatus === 'healthy',
      lastError: lastError
    }
  };

  const statusCode = healthStatus === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

app.listen(3000);
```

### Health Check Script

Create a standalone health check script:

```bash
#!/bin/bash
# health-check.sh

LOG_DIR="./logs"
LOG_FILE="$LOG_DIR/app.log"
MAX_SIZE=$((100 * 1024 * 1024))  # 100MB

# Check if log file exists
if [ ! -f "$LOG_FILE" ]; then
  echo "CRITICAL: Log file does not exist"
  exit 2
fi

# Check if log file is writable
if [ ! -w "$LOG_FILE" ]; then
  echo "CRITICAL: Log file is not writable"
  exit 2
fi

# Check log file size
SIZE=$(stat -f%z "$LOG_FILE" 2>/dev/null || stat -c%s "$LOG_FILE" 2>/dev/null)
if [ "$SIZE" -gt "$MAX_SIZE" ]; then
  echo "WARNING: Log file exceeds $MAX_SIZE bytes"
  exit 1
fi

# Check disk space
DISK_USAGE=$(df "$LOG_DIR" | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 90 ]; then
  echo "CRITICAL: Disk usage at ${DISK_USAGE}%"
  exit 2
fi

echo "OK: Logging system healthy"
exit 0
```

## Error Event Monitoring

### Error Categories

log-vibe emits different error events based on the error type:

| Event | Error Code | Severity | Action Required |
|-------|-----------|----------|-----------------|
| `error` | Any | Warning | Monitor for patterns |
| `disk-full` | ENOSPC | Critical | Free disk space immediately |
| `permission-denied` | EACCES | Critical | Fix permissions or restart |

### Comprehensive Error Handler

```typescript
import { FileTransport } from 'log-vibe';
import { promisify } from 'util';

const transport = new FileTransport('./logs/app.log', {
  maxSize: '100MB'
});

// Error statistics
const errorStats = {
  total: 0,
  byCode: new Map<string, number>(),
  lastError: null as { code: string; message: string; time: Date } | null
};

// General error handler
transport.on('error', (err: NodeJS.ErrnoException) => {
  errorStats.total++;
  errorStats.byCode.set(err.code, (errorStats.byCode.get(err.code) || 0) + 1);
  errorStats.lastError = {
    code: err.code,
    message: err.message,
    time: new Date()
  };

  // Log for monitoring
  console.error('[MONITOR] Transport error:', {
    code: err.code,
    message: err.message,
    totalErrors: errorStats.total,
    errorsByCode: Object.fromEntries(errorStats.byCode)
  });

  // Alert on repeated errors
  const count = errorStats.byCode.get(err.code) || 0;
  if (count >= 5) {
    console.error(`[ALERT] Error ${err.code} occurred ${count} times`);
    sendAlert('repeated-error', { code: err.code, count });
  }
});

// Critical error handlers
transport.on('disk-full', (err) => {
  console.error('[CRITICAL] Disk full - take immediate action');
  sendAlert('disk-full', { path: './logs/app.log' });

  // Send to monitoring service
  notifyPagerDuty({
    summary: 'Log disk full',
    severity: 'critical',
    details: { path: './logs/app.log' }
  });
});

transport.on('permission-denied', (err) => {
  console.error('[CRITICAL] Permission denied - logging stopped');
  sendAlert('permission-denied', { path: './logs/app.log' });
});

// Get error stats for monitoring
function getErrorStats() {
  return {
    total: errorStats.total,
    byCode: Object.fromEntries(errorStats.byCode),
    lastError: errorStats.lastError
  };
}
```

## Log File Health

### File Size Monitoring

Monitor log file sizes to detect issues:

```typescript
import fs from 'fs/promises';
import path from 'path';

async function checkLogHealth(logDir: string, baseName: string) {
  const files = await fs.readdir(logDir);
  const logFiles = files.filter(f => f.startsWith(baseName));

  const health = {
    totalFiles: logFiles.length,
    totalSize: 0,
    oldestFile: null,
    newestFile: null,
    issues: []
  };

  for (const file of logFiles) {
    const filePath = path.join(logDir, file);
    const stats = await fs.stat(filePath);

    health.totalSize += stats.size;

    if (!health.oldestFile || stats.mtime < health.oldestFile.mtime) {
      health.oldestFile = { name: file, mtime: stats.mtime, size: stats.size };
    }

    if (!health.newestFile || stats.mtime > health.newestFile.mtime) {
      health.newestFile = { name: file, mtime: stats.mtime, size: stats.size };
    }

    // Check for very large files (may indicate rotation not working)
    const maxSize = 200 * 1024 * 1024; // 200MB
    if (stats.size > maxSize && !file.includes('.log.')) {
      health.issues.push(`Large active file: ${file} (${Math.round(stats.size / 1024 / 1024)}MB)`);
    }
  }

  return health;
}

// Usage
setInterval(async () => {
  const health = await checkLogHealth('./logs', 'app');
  console.log('[HEALTH] Log file status:', health);

  if (health.issues.length > 0) {
    console.error('[ALERT] Log health issues:', health.issues);
  }
}, 60000); // Check every minute
```

### File Age Monitoring

Monitor log file ages to detect stale logs:

```typescript
async function checkLogFreshness(logFile: string, maxAgeMinutes = 10) {
  try {
    const stats = await fs.stat(logFile);
    const ageMs = Date.now() - stats.mtimeMs;
    const ageMinutes = ageMs / 60000;

    if (ageMinutes > maxAgeMinutes) {
      console.error(`[ALERT] Log file is stale: ${logFile} (${Math.round(ageMinutes)} minutes old)`);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`[ALERT] Cannot access log file: ${logFile}`);
    return false;
  }
}
```
