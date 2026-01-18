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
