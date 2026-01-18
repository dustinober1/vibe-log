<div align="center">
  <h1>✨ log-vibe</h1>
  <p><strong>Beautiful, simple, contextual logging for the modern developer</strong></p>

  [![npm version](https://img.shields.io/npm/v/log-vibe.svg)](https://www.npmjs.com/package/log-vibe)
  [![npm downloads](https://img.shields.io/npm/dm/log-vibe.svg)](https://www.npmjs.com/package/log-vibe)
  [![license](https://img.shields.io/npm/l/log-vibe.svg)](https://github.com/dustinober1/vibe-log/blob/main/LICENSE)

  <br />
</div>

---

## Quick Start

```bash
npm install log-vibe
```

```typescript
import log from 'log-vibe';

log.info('App', 'Application started');
log.success('Database', 'Connected successfully');
log.warn('Cache', 'Cache miss for user_123');
log.error('API', 'Request failed', { status: 500 });
```

**Zero configuration. Zero dependencies. Just beautiful logs.**

---

## Features

- 🎨 **Beautiful Output** - Color-coded levels with icons and timestamps
- 📦 **Zero Dependencies** - Lightweight and fast
- 🏷️ **Contextual Logging** - Add context to every log message
- 🔍 **Pretty Printing** - Objects and errors are formatted beautifully
- 📝 **TypeScript First** - Full type safety out of the box
- ⚡ **Dual Module Support** - Works with both CommonJS and ES Modules

### Extended Capabilities

- ⚙️ **Configurable** - Customize colors, timestamps, icons, and more
- 🛡️ **Input Validation** - Prevents empty contexts and messages
- 🔄 **Circular Reference Safe** - Handles circular objects gracefully
- 🎯 **Log Level Filtering** - Control which logs are displayed
- 🚀 **Transport System** - Flexible log routing to console, files, or custom destinations

---

## Limitations

**Multi-Process Writing: NOT SUPPORTED**

log-vibe does **NOT** support multiple processes writing to the same log file. This is a known limitation that will cause:
- Data corruption
- Lost log entries
- Rotation failures
- Race conditions

**Workarounds:**
- Use separate log files per process: `./logs/app-${process.pid}.log`
- Use a dedicated logging server (recommended for production)
- Use syslog or external logging service

See [Production Deployment](#production-deployment) for examples.

**Other Limitations:**
- No built-in log aggregation (use ELK, Splunk, etc.)
- No structured logging output (plain text only)
- No multi-process safe rotation

---

## Transports

log-vibe supports multiple transports for flexible log output. Logs can be written to the console, files, or custom destinations.

### Default Behavior

By default, logs are written to the console:

```typescript
import log from 'log-vibe';

log.info('App', 'Started');  // Outputs to console
```

### File Logging

**Quick setup** (recommended for simple cases):

```typescript
import { configure } from 'log-vibe';

configure({ file: './app.log' });

import log from 'log-vibe';
log.info('App', 'Now writing to file');
```

This creates a `FileTransport` instance and configures it automatically.

**Multiple files**:

```typescript
import { configure, FileTransport } from 'log-vibe';

configure({
  transports: [
    new FileTransport('./app.log'),
    new FileTransport('./errors.log'),  // Could filter by level in Phase 2
  ]
});
```

### Console Output

Console is enabled by default. To disable:

```typescript
import { configure } from 'log-vibe';

configure({ console: false });

// File-only logging
configure({
  file: './app.log',
  console: false,
});
```

### Custom Transports

Create custom transports by implementing the `Transport` interface:

```typescript
import type { Transport } from 'log-vibe';

class SlackTransport implements Transport {
  log(formatted: string, entry: LogEntry): void {
    if (entry.level === 'error') {
      // Send to Slack webhook
      fetch('https://hooks.slack.com/...', {
        method: 'POST',
        body: JSON.stringify({ text: formatted }),
      }).catch(() => {});  // Don't throw
    }
  }
}

// Use with log-vibe
import { configure, FileTransport } from 'log-vibe';

configure({
  transports: [
    new FileTransport('./app.log'),
    new SlackTransport(),
  ]
});
```

### Transport Interface

```typescript
interface Transport {
  /**
   * Write a log entry
   * @param formatted - Formatted string (with colors, icons, etc.)
   * @param entry - Raw log entry for custom processing
   * @param config - Logger configuration
   */
  log(formatted: string, entry: LogEntry, config: LoggerConfig): void;

  /**
   * Optional cleanup for releasing resources
   * @returns Promise that resolves when cleanup is complete
   */
  close?(): Promise<void> | void;
}
```

**Key points**:
- `log()` must be **synchronous** (handle async internally if needed)
- `log()` must **not throw** (catch errors and handle gracefully)
- `close()` is optional (only for transports with resources)
- You receive both formatted string and raw entry for maximum flexibility

### Cleanup

Close transports to release resources (file handles, connections, etc.):

```typescript
import { configure, FileTransport } from 'log-vibe';
import log from 'log-vibe';

const fileTransport = new FileTransport('./app.log');
configure({ transports: [fileTransport] });

log.info('App', 'Started');

// On shutdown
await fileTransport.close();
```

For console transport, `close()` is a no-op (no resources to release).

### Migration Guide

**Existing code continues to work** without changes:

```typescript
import log from 'log-vibe';

// This still works exactly as before
log.info('App', 'Started');
log.success('Database', 'Connected');
```

To add file logging:

```typescript
import { configure } from 'log-vibe';

// Just add this line
configure({ file: './app.log' });

// Everything else stays the same
log.info('App', 'Now also writing to file');
```

### Troubleshooting and Monitoring

For production deployments, see:
- **[Troubleshooting Guide](./docs/TROUBLESHOOTING.md)** - Common errors and solutions
- **[Monitoring Guide](./docs/MONITORING.md)** - Health checks and alerting

---

## Log Rotation

log-vibe supports automatic log rotation based on file size. When a log file exceeds the configured size threshold, it's automatically rotated to a date-stamped archive and a new log file is created.

### Configuration

Enable rotation via the `rotation` option:

```typescript
import { configure } from 'log-vibe';

configure({
    file: './logs/app.log',
    rotation: {
        maxSize: '100MB'  // Rotate when file exceeds 100MB
    }
});
```

### Size Format

The `maxSize` option accepts:

- **String**: Human-readable format like `'100MB'`, `'1.5GB'`, `'500KB'`
- **Number**: Raw bytes like `104857600` (100MB)

Default: `'100MB'` if not specified.

### Time-based Rotation

log-vibe supports automatic daily log rotation using the `pattern` option:

```typescript
import { configure } from 'log-vibe';

configure({
    file: './logs/app.log',
    rotation: {
        pattern: 'daily'  // Rotate at midnight UTC every day
    }
});
```

**How it works:**
- Logs are automatically rotated at midnight UTC
- Rotated files are date-stamped (e.g., `app-2026-01-18.log.1`)
- A timer is scheduled to prevent timing drift
- Rotation is atomic and non-blocking

**Timezone:** All time-based rotation uses UTC to ensure consistency across servers in different timezones.

### Hybrid Rotation (Size + Time)

You can combine size-based and time-based rotation for maximum flexibility:

```typescript
import { configure } from 'log-vibe';

configure({
    file: './logs/app.log',
    rotation: {
        pattern: 'daily',   // Rotate at midnight
        maxSize: '100MB'    // Also rotate if file exceeds 100MB
    }
});
```

**Behavior:** Rotation occurs when EITHER condition is met:
- Daily at midnight UTC, OR
- When file size exceeds 100MB

This ensures logs are rotated regularly even if they don't reach the size threshold, and also prevents excessively large log files from accumulating.

### Rotated File Naming

Rotated files follow this pattern:

```
{basename}-{YYYY-MM-DD}.{ext}.{sequence}
```

Examples:
- `app-2026-01-18.log.1` (first rotation on Jan 18, 2026)
- `app-2026-01-18.log.2` (second rotation on same day)
- `app-2026-01-19.log.1` (first rotation on Jan 19, 2026)

**Timezone**: Uses UTC to ensure consistency across servers.

### Backward Compatibility

Rotation is **opt-in**. Existing code without rotation config continues working unchanged:

```typescript
// No rotation — logs grow indefinitely
configure({ file: './app.log' });

// With rotation — logs are automatically rotated
configure({
    file: './app.log',
    rotation: { maxSize: '100MB' }
});
```

### Custom FileTransport with Rotation

For advanced use cases with custom transports:

```typescript
import { configure } from 'log-vibe';
import { FileTransport } from 'log-vibe/transports';

const transport = new FileTransport('./logs/app.log', {
    maxSize: '50MB'
});

configure({ transports: [transport] });
```

### Migration Guide

**Adding daily rotation to existing size-based config:**

Before:
```typescript
configure({
    file: './logs/app.log',
    rotation: {
        maxSize: '100MB'
    }
});
```

After (with daily rotation):
```typescript
configure({
    file: './logs/app.log',
    rotation: {
        maxSize: '100MB',
        pattern: 'daily'  // Add daily rotation
    }
});
```

**Adding time-based rotation to file logging:**

Before (no rotation):
```typescript
configure({ file: './app.log' });
```

After (daily rotation):
```typescript
configure({
    file: './app.log',
    rotation: {
        pattern: 'daily'
    }
});
```

**Migrating from size-only to hybrid rotation:**

Before (size-based only):
```typescript
configure({
    file: './logs/app.log',
    rotation: {
        maxSize: '50MB'
    }
});
```

After (hybrid rotation):
```typescript
configure({
    file: './logs/app.log',
    rotation: {
        maxSize: '50MB',    // Rotate at 50MB
        pattern: 'daily'    // Also rotate at midnight
    }
});
```

**Benefits of hybrid rotation:**
- Ensures regular log rotation (daily) even for low-traffic applications
- Prevents excessively large files during high-traffic periods
- Provides predictable log file management
- Maintains backward compatibility with existing size-based configs

**Add Compression to Existing Rotation:**

Before (size-based rotation without compression):
```typescript
configure({
    file: './logs/app.log',
    rotation: {
        maxSize: '100MB'
    }
});
```

After (with compression):
```typescript
configure({
    file: './logs/app.log',
    rotation: {
        maxSize: '100MB',
        compressionLevel: 6  // Add compression
    }
});
```

**Benefits:** Rotated files compressed automatically, disk space reduced 5-10x

**Add Retention to Existing Rotation:**

Before (rotation with compression, no retention):
```typescript
configure({
    file: './logs/app.log',
    rotation: {
        maxSize: '100MB',
        compressionLevel: 6
    }
});
```

After (with retention cleanup):
```typescript
configure({
    file: './logs/app.log',
    rotation: {
        maxSize: '100MB',
        compressionLevel: 6,
        maxFiles: 20,    // Keep max 20 files
        maxAge: 30       // Delete files older than 30 days
    }
});
```

**Benefits:** Automatic cleanup of old log files prevents disk exhaustion

**Note:** Retention cleanup runs automatically after each rotation. Files are deleted only if they exceed BOTH maxFiles AND maxAge thresholds.

### How It Works

1. **Size Check**: After each log write, the file size is checked
2. **Rotation Trigger**: If size + write ≥ maxSize, rotation starts
3. **Write Gating**: Concurrent writes are blocked during rotation
4. **Atomic Rotation**: Stream closes → file renamed → new stream created
5. **Resume**: Logging continues with new file

**Important**: Rotation is atomic — no log entries are lost during rotation.

---

## Log Compression

Rotated log files can be automatically compressed using gzip to save disk space.
Compression runs asynchronously (fire-and-forget) without blocking your application.

### Compression Levels

Compression level controls the trade-off between speed and file size:

| Level | Speed | Size | Use Case |
|-------|-------|------|----------|
| 1 | Fastest | Largest | High-volume logging, fast rotation |
| 6 | Balanced | Balanced | Default, recommended for most cases |
| 9 | Slowest | Smallest | Limited disk space, infrequent rotation |

Default: `6` (balanced compression)

### Configuration

Enable compression by setting `compressionLevel` in rotation config:

```typescript
import { configure } from 'log-vibe';

// Compress rotated files with level 6 (balanced)
configure({
  file: './logs/app.log',
  rotation: {
    maxSize: '100MB',
    compressionLevel: 6,  // Balanced compression
  }
});

// Fast compression for high-volume logging
configure({
  file: './logs/app.log',
  rotation: {
    maxSize: '100MB',
    compressionLevel: 1,  // Fastest, larger files
  }
});

// Maximum compression for limited disk space
configure({
  file: './logs/app.log',
  rotation: {
    maxSize: '100MB',
    compressionLevel: 9,  // Slowest, smallest files
  }
});

// Compression with daily rotation
configure({
  file: './logs/app.log',
  rotation: {
    pattern: 'daily',
    compressionLevel: 6,
  }
});
```

### How It Works

1. **Rotation**: Log file rotates when size threshold exceeded or daily at midnight UTC
2. **Delay**: Compression starts after 10ms delay to avoid CPU spikes during active logging
3. **Compression**: Rotated file compressed to `.gz` using specified compression level
4. **Cleanup**: Original uncompressed file deleted after successful compression
5. **Fire-and-forget**: Compression runs asynchronously without blocking the `log()` method

### Error Handling

If compression fails (disk full, permissions, etc.):

- Error logged to console: `[FileTransport] Compression failed for {file}: {error}`
- Uncompressed file moved to `failed/` subdirectory in log directory
- Application continues logging (no crash)
- Manual inspection/retry required for failed files

Example failed file location:
```
./logs/failed/app-2026-01-18.log.1
```

### Benefits

- **Disk space**: Compressed files are typically 5-10x smaller than uncompressed
- **Performance**: Asynchronous compression doesn't block logging
- **Flexibility**: Choose speed or size based on your needs
- **Reliability**: Failed compression doesn't crash your application

---

## Log Retention

log-vibe supports automatic cleanup of old log files based on retention policy.
Retention cleanup runs after each rotation, ensuring your log directory doesn't grow indefinitely.

### Retention Policy

Cleanup uses **AND logic** - both conditions must be met before a file is deleted:

- **maxFiles**: Maximum number of log files to keep (including current active file)
- **maxAge**: Maximum age of log files in days

A file is deleted **ONLY IF**:
1. It exceeds the maxFiles limit (too many files), AND
2. It exceeds the maxAge threshold (too old)

This conservative approach prevents accidental data loss.

**Example:** With `maxFiles: 20` and `maxAge: 30`:
- Files newer than 30 days are kept (even if you have 100 files)
- Files older than 30 days are kept (if you have fewer than 20 files)
- Files older than 30 days AND beyond the 20-file limit are deleted

Default values (production-safe):
- `maxFiles: 20` - Keep maximum 20 log files
- `maxAge: 30` - Delete files older than 30 days

### Configuration

Enable retention cleanup by setting **both** `maxFiles` and `maxAge` in rotation config:

```typescript
import { configure } from 'log-vibe';

// Default retention (20 files, 30 days)
configure({
  file: './logs/app.log',
  rotation: {
    maxSize: '100MB',
    maxFiles: 20,   // Keep max 20 files
    maxAge: 30      // Delete files older than 30 days
  }
});

// Custom retention
configure({
  file: './logs/app.log',
  rotation: {
    maxSize: '100MB',
    maxFiles: 50,   // Keep max 50 files
    maxAge: 60      // Delete files older than 60 days
  }
});

// Combined with rotation and compression
configure({
  file: './logs/app.log',
  rotation: {
    pattern: 'daily',           // Rotate daily
    compressionLevel: 6,        // Compress rotated files
    maxFiles: 20,               // Keep max 20 files
    maxAge: 30                  // Delete files older than 30 days
  }
});
```

**Important:** Both `maxFiles` and `maxAge` must be specified together. Specifying only one will throw an error.

### How It Works

1. **Rotation**: Log file rotates when size threshold exceeded or daily at midnight UTC
2. **Compression**: (Optional) Rotated file compressed after 10ms delay
3. **Cleanup**: Retention cleanup runs 20ms after rotation (10ms compression + 10ms buffer)
4. **Selection**: Oldest files are checked first (sorted by filename date)
5. **Deletion**: File deleted only if BOTH maxFiles AND maxAge thresholds exceeded
6. **Fire-and-forget**: Cleanup runs asynchronously without blocking the `log()` method

### File Selection

Files are selected for deletion based on:

1. **Age**: Calculated from filename date (YYYY-MM-DD format)
2. **Position**: Oldest files checked first (sorted by date)
3. **Safety**: Current active file is never deleted

Both compressed (`.gz`) and uncompressed files are included in cleanup.

### Error Handling

If cleanup fails (locked files, permissions, etc.):

- Error logged to console: `[FileTransport] Failed to delete {file}: {error}`
- Error event emitted on stream (non-fatal)
- Application continues logging (no crash)
- Best-effort deletion continues with remaining files

### Benefits

- **Disk management**: Automatic cleanup prevents disk exhaustion
- **Safe defaults**: Conservative AND logic prevents accidental data loss
- **Flexible**: Configure thresholds based on your storage and compliance needs
- **Non-blocking**: Asynchronous cleanup doesn't impact logging performance

---

## Production Deployment

### Docker Deployment

**Dockerfile example:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Create log directory with proper permissions
RUN mkdir -p /app/logs && \
    chown -R node:node /app/logs

USER node

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "const fs=require('fs'); try{fs.statSync('/app/logs/app.log');process.exit(0)}catch{process.exit(1)}"

CMD ["node", "index.js"]
```

**docker-compose.yml example:**
```yaml
version: '3.8'

services:
  app:
    build: .
    volumes:
      # Persist logs outside container
      - ./logs:/app/logs
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('fs').statSync('/app/logs/app.log')"]
      interval: 30s
      timeout: 3s
      retries: 3
```

**Configuration for Docker:**
```typescript
import { configure } from 'log-vibe';

configure({
  file: '/app/logs/app.log',
  rotation: {
    maxSize: '100MB',
    pattern: 'daily',
    compressionLevel: 6,
    maxFiles: 20,
    maxAge: 30
  },
  console: false  // Disable console in production
});
```

### Kubernetes Deployment

**Deployment with persistent volume:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
spec:
  replicas: 3
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
      - name: app
        image: myapp:latest
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        volumeMounts:
        - name: logs
          mountPath: /app/logs
        env:
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
      volumes:
      - name: logs
        emptyDir: {}  # or use PersistentVolumeClaim
```

**Multi-pod logging (separate files per pod):**
```typescript
import { configure } from 'log-vibe';

// Use pod name or UID for separate log files
const logFile = `/app/logs/app-${process.env.POD_NAME || 'default'}.log`;

configure({
  file: logFile,
  rotation: {
    maxSize: '100MB',
    compressionLevel: 6,
    maxFiles: 10,
    maxAge: 7
  },
  console: false
});
```

**Sidecar logging pattern (recommended):**
```yaml
# Main application writes to stdout
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
spec:
  template:
    spec:
      containers:
      - name: app
        image: myapp:latest
        # Configure log-vibe to write to stdout only
        env:
        - name: LOG_TO_FILE
          value: "false"
      # Sidecar container collects logs and writes to disk
      - name: log-collector
        image: log-collector:latest
        volumeMounts:
        - name: logs
          mountPath: /logs
      volumes:
      - name: logs
        persistentVolumeClaim:
          claimName: log-pvc
```

### Cloud Logging Patterns

**Google Cloud Logging:**
```typescript
import { configure } from 'log-vibe';

// Write to stdout, let Cloud Logging agent handle it
configure({
  console: true,  // Cloud Logging picks up stdout
  useColors: false,  // Disable colors for cloud logs
  timestampFormat: 'iso'
});

// Or write to file for Cloud Logging agent
configure({
  file: '/var/log/app/app.log',
  rotation: { maxSize: '100MB' }
});
```

**AWS CloudWatch:**
```typescript
import { configure } from 'log-vibe';

// Write to file for CloudWatch agent
configure({
  file: '/var/log/nodejs/app.log',
  rotation: {
    maxSize: '100MB',
    pattern: 'daily',
    compressionLevel: 6
  },
  console: false
});
```

**CloudWatch agent configuration:**
```json
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/nodejs/app.log",
            "log_group_name": "/aws/nodejs/app",
            "log_stream_name": "{instance_id}"
          }
        ]
      }
    }
  }
}
```

**Azure Monitor:**
```typescript
import { configure } from 'log-vibe';

configure({
  file: '/var/log/app/app.log',
  rotation: { maxSize: '100MB' },
  console: false
});
```

**Log Analytics agent configuration:**
```yaml
- name: app-logs
  path: /var/log/app/*.log
  type: file
```

### Dedicated Logging Server (Multi-Process)

For applications requiring multi-process logging, use a dedicated logging server:

**Architecture:**
```
App Process 1 ──┐
App Process 2 ──┼──> Logging Server ──> Disk
App Process 3 ──┘
```

**Logging server example:**
```typescript
// server.js - Dedicated logging server
import express from 'express';
import { configure, log } from 'log-vibe';

configure({
  file: './logs/central.log',
  rotation: {
    maxSize: '500MB',
    pattern: 'daily',
    compressionLevel: 6,
    maxFiles: 30,
    maxAge: 90
  }
});

const app = express();
app.use(express.json());

app.post('/log', (req, res) => {
  const { level, context, message, data } = req.body;
  log[level](context, message, data);
  res.sendStatus(200);
});

app.listen(3001);
```

**Client applications send logs:**
```typescript
// client.js - Application process
import fetch from 'node-fetch';

async function sendLog(level: string, context: string, message: string, data?: any) {
  await fetch('http://localhost:3001/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ level, context, message, data })
  }).catch(() => {});  // Don't throw
}

// Use in application
await sendLog('info', 'App', 'Started');
await sendLog('error', 'Database', 'Connection failed', { code: 'ECONNREFUSED' });
```

### Additional Documentation

- **[Troubleshooting Guide](./docs/TROUBLESHOOTING.md)** - Diagnose and fix production issues
- **[Monitoring Guide](./docs/MONITORING.md)** - Set up health checks and alerts

---

## API

### Log Levels

| Method | Description | Use Case |
|--------|-------------|----------|
| `log.debug()` | Debug information | Development debugging |
| `log.info()` | General information | Application flow |
| `log.success()` | Success messages | Completed operations |
| `log.warn()` | Warnings | Potential issues |
| `log.error()` | Errors | Failures and exceptions |

### Basic Usage

```typescript
import log from 'log-vibe';

// Simple logging
log.info('Context', 'Your message here');

// With additional data
log.debug('Database', 'Query executed', { 
  query: 'SELECT * FROM users',
  duration: '45ms'
});

// Logging errors
try {
  throw new Error('Something went wrong');
} catch (error) {
  log.error('Handler', 'Failed to process request', error);
}
```

### Scoped Logging

Create a logger with a pre-bound context:

```typescript
import { createScope } from 'log-vibe';

const dbLog = createScope('Database');

dbLog.info('Connection established');
dbLog.success('Migration complete');
dbLog.error('Query failed', { table: 'users' });
```

### Configuration

Customize the logger behavior:

```typescript
import { configure } from 'log-vibe';

// Disable colors in CI environments
configure({ useColors: false });

// Hide timestamps
configure({ showTimestamp: false });

// Set minimum log level (only warn and error will be shown)
configure({ level: 'warn' });

// Use ISO 8601 timestamps
configure({ timestampFormat: 'iso' });

// Disable icons
configure({ showIcons: false });

// Set maximum depth for object printing
configure({ maxDepth: 5 });
```

**Configuration Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `level` | `LogLevel` | `'debug'` | Minimum log level to display |
| `showTimestamp` | `boolean` | `true` | Show timestamps in output |
| `showIcons` | `boolean` | `true` | Show icons in output |
| `useColors` | `boolean` | auto-detected | Use ANSI colors |
| `maxDepth` | `number` | `10` | Maximum depth for object printing |
| `timestampFormat` | `'time' \| 'iso'` | `'time'` | Timestamp format |
| `file` | `string` | `undefined` | Path to log file (creates FileTransport) |
| `rotation` | `RotationConfig` | `undefined` | Rotation config for file transport |
| `console` | `boolean` | `true` | Enable console transport |
| `transports` | `Transport[]` | `[ConsoleTransport]` | Custom transport instances |

**RotationConfig Options:**

The `rotation` option accepts an object with the following fields:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `maxSize` | `string \| number` | `'100MB'` | Maximum file size before rotation (e.g., `'100MB'`, `'1.5GB'`, or bytes as number) |
| `pattern` | `'daily'` | `undefined` | Time-based rotation pattern. Set to `'daily'` to rotate at midnight UTC |
| `compressionLevel` | `number` | `undefined` | Gzip compression level for rotated files (1-9, where 6 is balanced) |
| `maxFiles` | `number` | `undefined` | Maximum number of log files to keep (must specify with `maxAge`) |
| `maxAge` | `number` | `undefined` | Maximum age of log files in days (must specify with `maxFiles`) |

**Notes:**
- All rotation options (`maxSize`, `pattern`, `compressionLevel`, `maxFiles`, `maxAge`) are optional
- Rotation occurs when ANY specified condition is met (size, time, or both)
- Time-based rotation uses UTC timezone for consistency across servers
- `pattern: 'daily'` enables automatic rotation at midnight UTC
- `compressionLevel` enables async gzip compression of rotated files (1-9, default 6)
- `maxFiles` and `maxAge` must be specified together for retention cleanup (AND logic)

---

## Examples

### Express Middleware

```typescript
import log from 'log-vibe';

app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 400 ? 'error' : 'info';
    
    log[level]('HTTP', `${req.method} ${req.path}`, {
      status: res.statusCode,
      duration: `${duration}ms`
    });
  });
  
  next();
});
```

### Module-Scoped Loggers

```typescript
// services/database.ts
import { createScope } from 'log-vibe';

const log = createScope('Database');

export async function connect() {
  log.info('Connecting to database...');
  
  try {
    await db.connect();
    log.success('Connected!');
  } catch (error) {
    log.error('Connection failed', error);
    throw error;
  }
}
```

### CI/CD Environment

```typescript
import { configure } from 'log-vibe';

// Detect CI environment and disable colors
if (process.env.CI) {
  configure({ 
    useColors: false,
    timestampFormat: 'iso'
  });
}
```

---

## Environment Variables

log-vibe respects standard environment variables:

- `NO_COLOR` - Disable colors (https://no-color.org/)
- `FORCE_COLOR` - Force enable colors
- `CI` - Automatically detected, disables colors unless `FORCE_COLOR` is set

---

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT © [Dustin Ober](https://github.com/dustinober1)

---

<div align="center">
  <sub>Built with ❤️ for developers who appreciate beautiful logs</sub>
</div>
