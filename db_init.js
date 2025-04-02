import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./clash_community.db');

// users 테이블
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL
  );
`);

// users_tag 테이블
db.run(`
  CREATE TABLE IF NOT EXISTS users_tag (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    nickname TEXT NOT NULL UNIQUE,
    tag TEXT NOT NULL UNIQUE,
    trophies INTEGER,
    clan_name TEXT,
    arena TEXT,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_public INTEGER DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`, (err) => {
  if (err) {
    console.error('❌ users_tag 테이블 생성 오류:', err.message);
  } else {
    console.log('✅ users_tag 테이블 생성 완료');
  }
});

// articles 테이블
// 첫 번째 CREATE TABLE 쿼리 실행
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
    image_url TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`, (err) => {
  if (err) {
    console.error('❌ articles 테이블 생성 오류:', err.message);
  } else {
    console.log('✅ articles 테이블 생성 완료');

    // 두 번째 ALTER TABLE 쿼리 실행
    db.run(`
      ALTER TABLE articles 
      ADD COLUMN category TEXT;
    `, (err) => {
      if (err) {
        console.error('❌ category 컬럼 추가 오류:', err.message);
      } else {
        console.log('✅ category 컬럼 추가 완료');
      }
    });
  }
});

// comments 테이블
db.run(`
  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    image_url TEXT,
    FOREIGN KEY (article_id) REFERENCES articles(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`, (err) => {
  if (err) console.error('❌ comments 테이블 생성 오류:', err.message);
  else console.log('✅ comments 테이블 생성 완료');
});

// likes 테이블 (게시글 좋아요)
db.run(`
  CREATE TABLE IF NOT EXISTS likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    article_id INTEGER NOT NULL,
    UNIQUE(user_id, article_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (article_id) REFERENCES articles(id)
  );
`);

// comment_likes 테이블 (댓글 좋아요)
db.run(`
  CREATE TABLE IF NOT EXISTS comment_likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    comment_id INTEGER NOT NULL,
    UNIQUE(user_id, comment_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (comment_id) REFERENCES comments(id)
  );
`);

console.log('✅ DB 초기화 완료');
