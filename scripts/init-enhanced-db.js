/**
 * 初始化增强的数据库结构
 * 运行: node scripts/init-enhanced-db.js
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'papers.db');
const db = new Database(dbPath);

console.log('🔧 Initializing enhanced database schema...\n');

// 创建papers表
db.exec(`
  CREATE TABLE IF NOT EXISTS papers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    total_pages INTEGER DEFAULT 0,
    extracted_pages INTEGER DEFAULT 0,
    is_extraction_complete INTEGER DEFAULT 0,
    analyzed_pages INTEGER DEFAULT 0,
    is_analysis_complete INTEGER DEFAULT 0,
    extracted_text TEXT DEFAULT '',
    summary TEXT,
    ocr_used INTEGER DEFAULT 0,
    extraction_method TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`);
console.log('✅ Created papers table');

// 创建paper_pages表
db.exec(`
  CREATE TABLE IF NOT EXISTS paper_pages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    paper_id INTEGER NOT NULL,
    page_number INTEGER NOT NULL,
    page_text TEXT DEFAULT '',
    text_length INTEGER DEFAULT 0,
    ai_analysis TEXT DEFAULT '',
    is_analyzed INTEGER DEFAULT 0,
    extract_status TEXT DEFAULT 'pending',
    error_message TEXT,
    extraction_method TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (paper_id) REFERENCES papers(id) ON DELETE CASCADE
  );
`);
console.log('✅ Created paper_pages table');

// 创建paper_chats表
db.exec(`
  CREATE TABLE IF NOT EXISTS paper_chats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    paper_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    context_pages TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (paper_id) REFERENCES papers(id) ON DELETE CASCADE
  );
`);
console.log('✅ Created paper_chats table');

// 创建索引
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_paper_pages_paper_id ON paper_pages(paper_id);
  CREATE INDEX IF NOT EXISTS idx_paper_pages_page_number ON paper_pages(paper_id, page_number);
  CREATE INDEX IF NOT EXISTS idx_paper_chats_paper_id ON paper_chats(paper_id);
  CREATE INDEX IF NOT EXISTS idx_paper_chats_created_at ON paper_chats(created_at);
`);
console.log('✅ Created indexes');

console.log('\n🎉 Database initialization complete!');
console.log(`📁 Database location: ${dbPath}`);

db.close();
