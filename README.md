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
- ⚙️ **Configurable** - Customize colors, timestamps, icons, and more
- 🛡️ **Input Validation** - Prevents empty contexts and messages
- 🔄 **Circular Reference Safe** - Handles circular objects gracefully
- 🎯 **Log Level Filtering** - Control which logs are displayed
- 🚀 **Transport System** - Flexible log routing to console, files, or custom destinations

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
| `console` | `boolean` | `true` | Enable console transport |
| `transports` | `Transport[]` | `[ConsoleTransport]` | Custom transport instances |

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
