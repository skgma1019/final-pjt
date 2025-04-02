import express from 'express';
import sqlite3 from 'sqlite3';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { authenticateToken } from './auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

dotenv.config();
const SECRET = process.env.SECRET;
const router = express.Router();

// 📦 업로드 폴더 준비
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + unique + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// POST /articles - 게시글 생성 (이미지 포함)
router.post('/articles', authenticateToken, upload.single('image'), (req, res) => {
  const db = new sqlite3.Database('./clash_community.db');
  const { title, content, tags, category } = req.body;
  const user_id = req.user.id;

  if (!title || !content || !category) {
    return res.status(400).json({ error: '제목, 내용, 카테고리는 필수입니다.' });
  }

  const createdAt = new Date().toISOString();
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

  const query = `
    INSERT INTO articles (user_id, title, content, created_at, tags, category, image_url)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(query, [user_id, title, content, createdAt, tags, category, imageUrl], function (err) {
    if (err) {
      console.error('❌ 게시글 작성 오류:', err.message);
      return res.status(500).json({ error: '게시글 작성 실패' });
    }

    res.status(201).json({ message: '게시글이 작성되었습니다.', articleId: this.lastID });
    db.close();
  });
});

// GET /articles - 전체 게시글 조회 (카테고리별로 조회할 수 있도록 수정)
router.get('/articles', (req, res) => {
  const db = new sqlite3.Database('./clash_community.db');
  const { category } = req.query; // 쿼리에서 카테고리 값을 받음

  let query = `
    SELECT articles.id, articles.title, articles.content, articles.user_id, articles.created_at, 
           users_tag.nickname, articles.category, articles.likes, articles.image_url
    FROM articles
    LEFT JOIN users_tag ON articles.user_id = users_tag.user_id
  `;

  if (category) {
    query += ` WHERE articles.category = ?`;
  }

  query += ` ORDER BY articles.created_at DESC`;

  db.all(query, category ? [category] : [], (err, rows) => {
    if (err) {
      console.error('❌ 게시글 조회 오류:', err.message);
      return res.status(500).json({ error: '게시글을 불러오지 못했습니다.' });
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
    SELECT articles.id, articles.title, articles.content, articles.user_id, articles.created_at, 
           users_tag.nickname, articles.category, articles.likes, articles.image_url
    FROM articles
    LEFT JOIN users_tag ON articles.user_id = users_tag.user_id
    WHERE articles.id = ?
  `;

  db.get(query, [articleId], (err, row) => {
    if (err) {
      console.error('❌ 게시글 조회 오류:', err.message);
      return res.status(500).json({ error: '게시글을 불러오는 데 실패했습니다.' });
    }

    if (!row) {
      return res.status(404).json({ error: '해당 게시글을 찾을 수 없습니다.' });
    }

    res.json(row);
    db.close();
  });
});

// PUT /articles/:id - 게시글 수정 (이미지 포함)
router.put('/articles/:id', authenticateToken, upload.single('image'), (req, res) => {
  const db = new sqlite3.Database('./clash_community.db');
  const articleId = req.params.id;
  const { title, content, tags, category } = req.body;
  const updatedAt = new Date().toISOString();

  if (!title || !content || !category) {
    return res.status(400).json({ error: '제목, 내용, 카테고리는 필수입니다.' });
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
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : article.image_url;
    const query = `
      UPDATE articles
      SET title = ?, content = ?, tags = ?, category = ?, updated_at = ?, image_url = ?
      WHERE id = ?
    `;

    db.run(query, [title, content, tags, category, updatedAt, imageUrl, articleId], function (err) {
      if (err) return res.status(500).json({ error: '수정 실패' });
      res.json({ message: '게시글이 수정되었습니다.', updatedId: articleId });
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
    SELECT articles.id, articles.title, articles.content, articles.user_id, articles.created_at, 
           users_tag.nickname, articles.category, articles.likes
    FROM articles
    LEFT JOIN users_tag ON articles.user_id = users_tag.user_id
    WHERE articles.user_id = ?
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

// POST /articles/:id/like - 좋아요 토글
router.post('/articles/:id/like', authenticateToken, (req, res) => {
  const db = new sqlite3.Database('./clash_community.db');
  const articleId = req.params.id;
  const userId = req.user.id;

  const checkQuery = `SELECT * FROM likes WHERE user_id = ? AND article_id = ?`;
  db.get(checkQuery, [userId, articleId], (err, row) => {
    if (err) return res.status(500).json({ error: '좋아요 상태 조회 실패' });

    if (row) {
      // 👉 이미 좋아요 했으면 삭제 (좋아요 취소)
      const deleteQuery = `DELETE FROM likes WHERE user_id = ? AND article_id = ?`;
      db.run(deleteQuery, [userId, articleId], function (err) {
        if (err) return res.status(500).json({ error: '좋아요 취소 실패' });

        const updateQuery = `UPDATE articles SET likes = likes - 1 WHERE id = ? AND likes > 0`;
        db.run(updateQuery, [articleId], function (err) {
          if (err) return res.status(500).json({ error: '좋아요 수 감소 실패' });

          res.json({ message: '좋아요 취소됨' });
          db.close();
        });
      });
    } else {
      // 👉 좋아요 추가
      const insertQuery = `INSERT INTO likes (user_id, article_id) VALUES (?, ?)`;
      db.run(insertQuery, [userId, articleId], function (err) {
        if (err) return res.status(500).json({ error: '좋아요 추가 실패' });

        const updateQuery = `UPDATE articles SET likes = likes + 1 WHERE id = ?`;
        db.run(updateQuery, [articleId], function (err) {
          if (err) return res.status(500).json({ error: '좋아요 수 증가 실패' });

          res.json({ message: '좋아요 추가됨' });
          db.close();
        });
      });
    }
  });
});

export default router;
