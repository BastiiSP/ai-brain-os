import { loadConfig } from './config.js';
import { startServer } from './http.js';
try { await startServer(await loadConfig()); } catch (error) { console.error('Start fehlgeschlagen:', (error as Error).message); process.exitCode = 1; }
