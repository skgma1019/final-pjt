import express from 'express';
import sqlite3 from 'sqlite3';
import { authenticateToken } from './auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// 업로드 폴더 생성
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

export default router;

// 댓글 작성 (이미지 포함)
router.post('/articles/:id/comments', authenticateToken, upload.single('image'), (req, res) => {
  const db = new sqlite3.Database('./clash_community.db');
  const articleId = req.params.id;
  const userId = req.user.id;
  const { content } = req.body;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

  if (!content) return res.status(400).json({ error: '댓글 내용을 입력해주세요.' });

  const createdAt = new Date().toISOString();

  const query = `
    INSERT INTO comments (article_id, user_id, content, created_at, image_url)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.run(query, [articleId, userId, content, createdAt, imageUrl], function (err) {
    if (err) {
      console.error('❌ 댓글 작성 오류:', err.message);
      return res.status(500).json({ error: '댓글 작성 실패' });
    }
    res.status(201).json({ message: '댓글이 작성되었습니다.', commentId: this.lastID });
    db.close();
  });
});

// 댓글 조회
router.get('/articles/:id/comments', (req, res) => {
  const db = new sqlite3.Database('./clash_community.db');
  const articleId = req.params.id;

  const query = `
    SELECT c.id, c.user_id, c.content, c.created_at, u.nickname,
           c.image_url,
           (SELECT COUNT(*) FROM comment_likes WHERE comment_id = c.id) AS likes
    FROM comments c
    LEFT JOIN users_tag u ON c.user_id = u.user_id
    WHERE c.article_id = ?
    ORDER BY c.created_at DESC
  `;

  db.all(query, [articleId], (err, rows) => {
    if (err) {
      console.error('❌ 댓글 조회 오류:', err.message);
      return res.status(500).json({ error: '댓글을 불러오는 데 실패했습니다.' });
    }
    res.json(rows);
    db.close();
  });
});

// 댓글 삭제
router.delete('/comments/:id', authenticateToken, (req, res) => {
  const db = new sqlite3.Database('./clash_community.db');
  const commentId = req.params.id;

  db.get(`SELECT * FROM comments WHERE id = ?`, [commentId], (err, comment) => {
    if (err || !comment) return res.status(404).json({ error: '해당 댓글이 존재하지 않습니다.' });
    if (comment.user_id !== req.user.id) return res.status(403).json({ error: '작성자만 삭제할 수 있습니다.' });

    db.run(`DELETE FROM comments WHERE id = ?`, [commentId], function (err) {
      if (err) return res.status(500).json({ error: '댓글 삭제 실패' });
      res.json({ message: '댓글이 성공적으로 삭제되었습니다.', deletedId: commentId });
      db.close();
    });
  });
});

// 댓글 수정
router.patch('/comments/:id', authenticateToken, (req, res) => {
  const db = new sqlite3.Database('./clash_community.db');
  const commentId = req.params.id;
  const { content } = req.body;

  if (!content) return res.status(400).json({ error: '수정할 내용이 없습니다.' });

  db.get(`SELECT * FROM comments WHERE id = ?`, [commentId], (err, comment) => {
    if (err || !comment) return res.status(404).json({ error: '해당 댓글이 존재하지 않습니다.' });
    if (comment.user_id !== req.user.id) return res.status(403).json({ error: '작성자만 수정할 수 있습니다.' });

    const query = `UPDATE comments SET content = ? WHERE id = ?`;
    db.run(query, [content, commentId], function (err) {
      if (err) return res.status(500).json({ error: '댓글 수정 실패' });
      res.json({ message: '댓글이 수정되었습니다.', updatedId: commentId });
      db.close();
    });
  });
});

// 댓글 좋아요 토글
router.post('/comments/:id/like', authenticateToken, (req, res) => {
  const db = new sqlite3.Database('./clash_community.db');
  const commentId = req.params.id;
  const userId = req.user.id;

  db.get(`SELECT * FROM comment_likes WHERE comment_id = ? AND user_id = ?`, [commentId, userId], (err, row) => {
    if (err) return res.status(500).json({ error: '조회 실패' });

    if (row) {
      db.run(`DELETE FROM comment_likes WHERE comment_id = ? AND user_id = ?`, [commentId, userId], function (err) {
        if (err) return res.status(500).json({ error: '좋아요 취소 실패' });
        res.json({ message: '댓글 좋아요 취소됨' });
        db.close();
      });
    } else {
      db.run(`INSERT INTO comment_likes (comment_id, user_id) VALUES (?, ?)`, [commentId, userId], function (err) {
        if (err) return res.status(500).json({ error: '좋아요 추가 실패' });
        res.json({ message: '댓글 좋아요 추가됨' });
        db.close();
      });
    }
  });
});
