import log, { createScope } from '../src/index';

console.log('\n--- log-vibe Demo ---\n');

log.info('App', 'Application starting...');
log.debug('Config', 'Loading configuration', { env: 'production' });
log.success('Database', 'Connected to PostgreSQL');
log.info('Server', 'Listening on port 3000');
log.warn('Cache', 'Redis connection slow', { latency: '150ms' });
log.error('API', 'External service unavailable', new Error('ECONNREFUSED'));

console.log('\n--- Scoped Logger ---\n');

const dbLog = createScope('Database');
dbLog.info('Executing query...');
dbLog.success('Query completed', { rows: 42, duration: '12ms' });

console.log('\n--- End Demo ---\n');
