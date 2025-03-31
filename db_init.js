import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./clash_community.db');

db.serialize(() => {
  // ✅ users 테이블 생성
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `, (err) => {
    if (err) console.error('❌ users 테이블 생성 오류:', err.message);
    else console.log('✅ users 테이블 생성 완료');
  });

  // ✅ articles 테이블 생성
  db.run(`
    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME,
      views INTEGER DEFAULT 0,
      likes INTEGER DEFAULT 0,
      is_published INTEGER DEFAULT 1,
      tags TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `, (err) => {
    if (err) console.error('❌ articles 테이블 생성 오류:', err.message);
    else console.log('✅ articles 테이블 생성 완료');
  });

  // ✅ users_tag 테이블 생성
  db.run(`
    CREATE TABLE IF NOT EXISTS users_tag (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      tag TEXT NOT NULL,
      nickname TEXT UNIQUE,
      trophies INTEGER,
      clan_name TEXT,
      arena TEXT,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `, (err) => {
    if (err) console.error('❌ users_tag 테이블 생성 오류:', err.message);
    else console.log('✅ users_tag 테이블 생성 완료');
  });
  
  db.run(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (article_id) REFERENCES articles(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `, (err) => {
    if (err) console.error('❌ comments 테이블 생성 오류:', err.message);
    else console.log('✅ comments 테이블 생성 완료');
  });
});

// ✅ 이건 serialize 블록 바깥에 있어도 괜찮음 (다 끝나고 나서 닫기)
db.close();
