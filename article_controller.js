import express from 'express';
import sqlite3 from 'sqlite3';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { authenticateToken } from './auth.js';
dotenv.config();

const SECRET = process.env.SECRET;
const router = express.Router();

// POST /articles - 게시글 생성
router.post('/articles', authenticateToken, (req, res) => {
  const db = new sqlite3.Database('./clash_community.db');
  const { title, content, tags } = req.body;
  const user_id = req.user.id; // ⬅️ 로그인된 사용자 ID

  if (!title || !content) {
    return res.status(400).json({ error: 'title과 content는 필수입니다.' });
  }

  const createdAt = new Date().toISOString();

  const query = `
    INSERT INTO articles (user_id, title, content, created_at, tags)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.run(query, [user_id, title, content, createdAt, tags], function (err) {
    if (err) {
      console.error('❌ 게시글 작성 오류:', err.message);
      return res.status(500).json({ error: '게시글 작성 실패' });
    }

    res.status(201).json({ message: '게시글이 작성되었습니다.', articleId: this.lastID });
    db.close();
  });
});


// GET /articles - 전체 게시글 조회
router.get('/articles', (req, res) => {
  const db = new sqlite3.Database('./clash_community.db');

  const query = `
    SELECT articles.id, articles.title, articles.content, articles.user_id, articles.tags, articles.created_at, users_tag.nickname, articles.likes
    FROM articles
    LEFT JOIN users_tag ON articles.user_id = users_tag.user_id
    ORDER BY articles.created_at DESC

  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('❌ 게시글 조회 오류:', err.message);
      return res.status(500).json({ error: '게시글을 불러오지 못했습니다' });
    }

    res.json(rows);
    db.close();
  });
});


// GET /articles/:id - 특정 게시글 조회
router.get('/articles/:id', (req, res) => {
  const db = new sqlite3.Database('./clash_community.db');
  const articleId = req.params.id;

  const query = `
    SELECT articles.id, articles.title, articles.content, articles.user_id, articles.tags, articles.created_at, users_tag.nickname, articles.likes
    FROM articles
    LEFT JOIN users_tag ON articles.user_id = users_tag.user_id
    ORDER BY articles.created_at DESC
  `;

  db.get(query, [articleId], (err, row) => {
    if (err) {
      console.error('❌ 게시글 조회 오류:', err.message);
      return res.status(500).json({ error: '게시글을 불러오는 데 실패했습니다' });
    }

    if (!row) {
      return res.status(404).json({ error: '해당 게시글을 찾을 수 없습니다' });
    }

    res.json(row);
    db.close();
  });
});


// PUT /articles/:id - 게시글 수정
router.put('/articles/:id', authenticateToken, (req, res) => {
  const db = new sqlite3.Database('./clash_community.db');
  const articleId = req.params.id;
  const { title, content, tags } = req.body;
  const updatedAt = new Date().toISOString();

  if (!title || !content) {
    return res.status(400).json({ error: 'title과 content는 필수입니다.' });
  }

  // 1. 해당 게시글의 작성자 조회
  db.get(`SELECT * FROM articles WHERE id = ?`, [articleId], (err, article) => {
    if (err || !article) {
      return res.status(404).json({ error: '게시글이 존재하지 않습니다.' });
    }

    // 2. 로그인한 유저와 작성자 비교
    if (article.user_id !== req.user.id) {
      return res.status(403).json({ error: '작성자만 수정할 수 있습니다.' });
    }

    // 3. 수정
    const query = `
      UPDATE articles
      SET title = ?, content = ?, tags = ?, updated_at = ?
      WHERE id = ?
    `;

    db.run(query, [title, content, tags, updatedAt, articleId], function (err) {
      if (err) return res.status(500).json({ error: '수정 실패' });
      res.json({ message: '게시글이 수정되었습니다.', updatedId: articleId });
      db.close();
    });
  });
});


// PATCH /articles/:id - 게시글 일부 수정 (로그인 + 작성자만)
router.patch('/articles/:id', authenticateToken, (req, res) => {
  const db = new sqlite3.Database('./clash_community.db');
  const articleId = req.params.id;
  const { title, content, tags } = req.body;
  const updatedAt = new Date().toISOString();

  // 1. 해당 게시글의 작성자 조회
  db.get(`SELECT * FROM articles WHERE id = ?`, [articleId], (err, article) => {
    if (err || !article) {
      return res.status(404).json({ error: '게시글이 존재하지 않습니다.' });
    }

    if (article.user_id !== req.user.id) {
      return res.status(403).json({ error: '작성자만 수정할 수 있습니다.' });
    }

    // 2. 수정할 필드 구성
    const fields = [];
    const values = [];

    if (title) {
      fields.push('title = ?');
      values.push(title);
    }
    if (content) {
      fields.push('content = ?');
      values.push(content);
    }
    if (tags) {
      fields.push('tags = ?');
      values.push(tags);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: '수정할 항목이 없습니다.' });
    }

    fields.push('updated_at = ?');
    values.push(updatedAt);
    values.push(articleId);

    const query = `
      UPDATE articles
      SET ${fields.join(', ')}
      WHERE id = ?
    `;

    db.run(query, values, function (err) {
      if (err) {
        console.error('❌ 게시글 PATCH 수정 오류:', err.message);
        return res.status(500).json({ error: '게시글 일부 수정 실패' });
      }

      res.json({ message: '게시글이 일부 수정되었습니다.', updatedId: articleId });
      db.close();
    });
  });
});

// DELETE /articles/:id - 게시글 삭제 (로그인 + 작성자만)
router.delete('/articles/:id', authenticateToken, (req, res) => {
  const db = new sqlite3.Database('./clash_community.db');
  const articleId = req.params.id;

  // 1. 해당 게시글의 작성자 조회
  db.get(`SELECT * FROM articles WHERE id = ?`, [articleId], (err, article) => {
    if (err || !article) {
      return res.status(404).json({ error: '게시글이 존재하지 않습니다.' });
    }

    if (article.user_id !== req.user.id) {
      return res.status(403).json({ error: '작성자만 삭제할 수 있습니다.' });
    }

    // 2. 삭제
    db.run(`DELETE FROM articles WHERE id = ?`, [articleId], function (err) {
      if (err) {
        console.error('❌ 게시글 삭제 오류:', err.message);
        return res.status(500).json({ error: '게시글 삭제 실패' });
      }

      res.json({ message: '게시글이 성공적으로 삭제되었습니다.', deletedId: articleId });
      db.close();
    });
  });
});

// GET /my-articles - 로그인한 유저의 글만 조회
router.get('/my-articles', authenticateToken, (req, res) => {
  const db = new sqlite3.Database('./clash_community.db');
  const userId = req.user.id;

  const query = `
    SELECT articles.id, articles.title, articles.content, articles.user_id, articles.tags, articles.created_at, users_tag.nickname, articles.likes
    FROM articles
    LEFT JOIN users_tag ON articles.user_id = users_tag.user_id
    ORDER BY articles.created_at DESC

  `;

  db.all(query, [userId], (err, rows) => {
    if (err) {
      console.error('❌ 내 글 조회 오류:', err.message);
      return res.status(500).json({ error: '내 글을 불러오지 못했습니다' });
    }

    res.json(rows);
    db.close();
  });
});






export default router;
