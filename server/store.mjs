import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { initialState, reduce } from './engine.mjs';

export class Store {
  constructor(path) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS state (id INTEGER PRIMARY KEY CHECK (id=1), value TEXT NOT NULL); CREATE TABLE IF NOT EXISTS commands (id TEXT PRIMARY KEY, body TEXT NOT NULL);');
    if (!this.db.prepare('SELECT id FROM state WHERE id=1').get()) this.db.prepare('INSERT INTO state VALUES(1,?)').run(JSON.stringify(initialState()));
  }
  read() { return JSON.parse(this.db.prepare('SELECT value FROM state WHERE id=1').get().value); }
  execute(command) {
    if (typeof command.requestId !== 'string' || !/^[a-zA-Z0-9_-]{8,100}$/.test(command.requestId)) {
      const error = new Error('A unique requestId is required.'); error.statusCode = 400; throw error;
    }
    const body = JSON.stringify(command);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const existing = this.db.prepare('SELECT body FROM commands WHERE id=?').get(command.requestId);
      if (existing && existing.body !== body) { const e = new Error('This requestId belongs to a different command.'); e.statusCode = 409; throw e; }
      if (existing) { this.db.exec('COMMIT'); return this.read(); }
      const next = reduce(this.read(), command);
      this.db.prepare('UPDATE state SET value=? WHERE id=1').run(JSON.stringify(next));
      this.db.prepare('INSERT INTO commands VALUES(?,?)').run(command.requestId, body);
      this.db.exec('COMMIT');
      return next;
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  // Only replaces wording on a message still present, never touches authority or action state.
  updateReply(id, text) {
    const state = this.read(); const message = state.messages.find(m => m.id === id);
    if (!message || message.source !== 'conversation') return;
    message.text = text; message.source = 'local_model';
    this.db.prepare('UPDATE state SET value=? WHERE id=1').run(JSON.stringify(state));
  }
  close() { this.db.close(); }
}
