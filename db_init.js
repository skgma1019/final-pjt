import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./clash_community.db');

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `, (err) => {
    if (err) console.error('❌ 테이블 생성 오류:', err.message);
    else console.log('✅ users 테이블 생성 완료');
  });
});

db.close();
