import Database from 'better-sqlite3';
import { app, safeStorage } from 'electron';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import type { HistoryEntry, PaginatedResult } from '../../shared/types/history';
import type { AppSettings } from '../../shared/types/settings';
import type { AIProvider } from '../../shared/types/ai';
import { DEFAULT_SETTINGS } from '../../shared/constants/defaults';

class StorageService {
  private db!: Database.Database;
  private settingsPath: string;
  private screenshotsDir: string;
  private settingsCache: AppSettings | null = null;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.settingsPath = path.join(userDataPath, 'settings.json');
    this.screenshotsDir = path.join(userDataPath, 'screenshots');
  }

  init(): void {
    // Ensure directories exist
    if (!fs.existsSync(this.screenshotsDir)) {
      fs.mkdirSync(this.screenshotsDir, { recursive: true });
    }

    // Init SQLite
    const dbPath = path.join(app.getPath('userData'), 'history.db');
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS queries (
        id TEXT PRIMARY KEY,
        created_at INTEGER NOT NULL,
        screenshot_path TEXT,
        answer_summary TEXT,
        answer_full TEXT,
        model_used TEXT NOT NULL,
        provider_name TEXT NOT NULL,
        source_type TEXT NOT NULL,
        source_url TEXT,
        source_title TEXT,
        latency_ms INTEGER,
        status TEXT DEFAULT 'success',
        error_message TEXT,
        tags TEXT DEFAULT '[]',
        is_pinned INTEGER DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_queries_created_at ON queries(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_queries_status ON queries(status);

      CREATE VIRTUAL TABLE IF NOT EXISTS queries_fts USING fts5(
        answer_summary,
        answer_full,
        source_title,
        source_url,
        content='queries',
        content_rowid='rowid'
      );

      CREATE TRIGGER IF NOT EXISTS queries_ai AFTER INSERT ON queries BEGIN
        INSERT INTO queries_fts(rowid, answer_summary, answer_full, source_title, source_url)
        VALUES (new.rowid, new.answer_summary, new.answer_full, new.source_title, new.source_url);
      END;

      CREATE TRIGGER IF NOT EXISTS queries_ad AFTER DELETE ON queries BEGIN
        INSERT INTO queries_fts(queries_fts, rowid, answer_summary, answer_full, source_title, source_url)
        VALUES ('delete', old.rowid, old.answer_summary, old.answer_full, old.source_title, old.source_url);
      END;

      CREATE TRIGGER IF NOT EXISTS queries_au AFTER UPDATE ON queries BEGIN
        INSERT INTO queries_fts(queries_fts, rowid, answer_summary, answer_full, source_title, source_url)
        VALUES ('delete', old.rowid, old.answer_summary, old.answer_full, old.source_title, old.source_url);
        INSERT INTO queries_fts(rowid, answer_summary, answer_full, source_title, source_url)
        VALUES (new.rowid, new.answer_summary, new.answer_full, new.source_title, new.source_url);
      END;
    `);
  }

  // === Settings ===

  getSettings(): AppSettings {
    if (this.settingsCache) return this.settingsCache;

    try {
      if (fs.existsSync(this.settingsPath)) {
        const raw = fs.readFileSync(this.settingsPath, 'utf-8');
        const data = JSON.parse(raw);
        // Decrypt API keys
        if (data.providers) {
          data.providers = data.providers.map((p: any) => ({
            ...p,
            apiKey: this.decryptApiKey(p.apiKey) || p.apiKey,
          }));
        }
        const result = { ...DEFAULT_SETTINGS, ...data };
        this.settingsCache = result;
        return result;
      }
    } catch { /* fall through to defaults */ }

    this.settingsCache = { ...DEFAULT_SETTINGS };
    return this.settingsCache;
  }

  saveSettings(settings: AppSettings): void {
    const toSave = { ...settings };
    // Encrypt API keys before saving
    if (toSave.providers) {
      toSave.providers = toSave.providers.map((p: any) => ({
        ...p,
        apiKey: this.encryptApiKey(p.apiKey) || p.apiKey,
      }));
    }
    this.settingsCache = settings;
    fs.writeFileSync(this.settingsPath, JSON.stringify(toSave, null, 2), 'utf-8');
  }

  private encryptApiKey(key: string): string {
    if (!key || key.startsWith('$enc:')) return key;
    try {
      if (safeStorage.isEncryptionAvailable()) {
        const encrypted = safeStorage.encryptString(key);
        return '$enc:' + encrypted.toString('base64');
      }
    } catch { /* fallback to plain text */ }
    return key;
  }

  private decryptApiKey(key: string): string {
    if (!key || !key.startsWith('$enc:')) return key;
    try {
      if (safeStorage.isEncryptionAvailable()) {
        const buf = Buffer.from(key.slice(5), 'base64');
        return safeStorage.decryptString(buf);
      }
    } catch { /* fallback */ }
    return key;
  }

  // === History ===

  addEntry(entry: Omit<HistoryEntry, 'id' | 'createdAt'>): HistoryEntry {
    const id = uuidv4();
    const createdAt = Date.now();

    const stmt = this.db.prepare(`
      INSERT INTO queries (id, created_at, screenshot_path, answer_summary, answer_full,
        model_used, provider_name, source_type, source_url, source_title,
        latency_ms, status, error_message, tags, is_pinned)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id, createdAt,
      entry.screenshotPath || null,
      entry.answerSummary,
      entry.answerFull,
      entry.modelUsed,
      entry.providerName,
      entry.sourceType,
      entry.sourceUrl || null,
      entry.sourceTitle || null,
      entry.latencyMs || 0,
      entry.status,
      entry.errorMessage || null,
      JSON.stringify(entry.tags || []),
      entry.isPinned ? 1 : 0
    );

    return { id, createdAt, ...entry };
  }

  listEntries(page: number, pageSize: number): PaginatedResult<HistoryEntry> {
    const countRow = this.db.prepare('SELECT COUNT(*) as total FROM queries').get() as any;
    const total = countRow.total;

    const rows = this.db.prepare(
      'SELECT * FROM queries ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).all(pageSize, (page - 1) * pageSize) as any[];

    return {
      items: rows.map(this.rowToEntry),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  searchEntries(query: string, page: number, pageSize: number): PaginatedResult<HistoryEntry> {
    const countStmt = this.db.prepare(
      'SELECT COUNT(*) as total FROM queries_fts WHERE queries_fts MATCH ?'
    );
    const countRow = countStmt.get(query) as any;
    const total = countRow?.total || 0;

    const rows = this.db.prepare(`
      SELECT q.* FROM queries q
      JOIN queries_fts fts ON q.rowid = fts.rowid
      WHERE queries_fts MATCH ?
      ORDER BY q.created_at DESC
      LIMIT ? OFFSET ?
    `).all(query, pageSize, (page - 1) * pageSize) as any[];

    return {
      items: rows.map(this.rowToEntry),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  getEntry(id: string): HistoryEntry | null {
    const row = this.db.prepare('SELECT * FROM queries WHERE id = ?').get(id) as any;
    return row ? this.rowToEntry(row) : null;
  }

  deleteEntry(id: string): void {
    this.db.prepare('DELETE FROM queries WHERE id = ?').run(id);
  }

  deleteEntries(ids: string[]): void {
    const stmt = this.db.prepare('DELETE FROM queries WHERE id = ?');
    const tx = this.db.transaction(() => {
      for (const id of ids) stmt.run(id);
    });
    tx();
  }

  clearAll(): void {
    this.db.prepare('DELETE FROM queries').run();
  }

  private rowToEntry(row: any): HistoryEntry {
    return {
      id: row.id,
      createdAt: row.created_at,
      screenshotPath: row.screenshot_path,
      answerSummary: row.answer_summary,
      answerFull: row.answer_full,
      modelUsed: row.model_used,
      providerName: row.provider_name,
      sourceType: row.source_type,
      sourceUrl: row.source_url,
      sourceTitle: row.source_title,
      latencyMs: row.latency_ms,
      status: row.status,
      errorMessage: row.error_message,
      tags: JSON.parse(row.tags || '[]'),
      isPinned: row.is_pinned === 1,
    };
  }
}

export const storageService = new StorageService();
