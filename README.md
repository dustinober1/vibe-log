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
