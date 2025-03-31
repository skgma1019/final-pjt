import { authenticateToken } from './auth.js';
import express from 'express';
import sqlite3 from 'sqlite3';





const router = express.Router();
export default router; // ← 이거 추가!




router.post('/articles/:id/comments', authenticateToken, (req, res) => {
  const db = new sqlite3.Database('./clash_community.db');
  const articleId = req.params.id;
  const userId = req.user.id;
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ error: '댓글 내용을 입력해주세요.' });
  }

  const createdAt = new Date().toISOString();

  const query = `
    INSERT INTO comments (article_id, user_id, content, created_at)
    VALUES (?, ?, ?, ?)
  `;

  db.run(query, [articleId, userId, content, createdAt], function (err) {
    if (err) {
      console.error('❌ 댓글 작성 오류:', err.message);
      return res.status(500).json({ error: '댓글 작성 실패' });
    }

    res.status(201).json({ message: '댓글이 작성되었습니다.', commentId: this.lastID });
    db.close();
  });

  
});
// GET /articles/:id/comments - 특정 게시글의 댓글 조회
router.get('/articles/:id/comments', (req, res) => {
  const db = new sqlite3.Database('./clash_community.db');
  const articleId = req.params.id;

  const query = `
    SELECT id, user_id, content, created_at
    FROM comments
    WHERE article_id = ?
    ORDER BY created_at DESC
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

// DELETE /comments/:id - 댓글 삭제 (작성자만 가능)
router.delete('/comments/:id', authenticateToken, (req, res) => {
    const db = new sqlite3.Database('./clash_community.db');
    const commentId = req.params.id;
  
    // 1. 댓글 존재 여부 확인 + 작성자 확인
    db.get(`SELECT * FROM comments WHERE id = ?`, [commentId], (err, comment) => {
      if (err || !comment) {
        return res.status(404).json({ error: '해당 댓글이 존재하지 않습니다.' });
      }
  
      if (comment.user_id !== req.user.id) {
        return res.status(403).json({ error: '작성자만 댓글을 삭제할 수 있습니다.' });
      }
  
      // 2. 삭제
      db.run(`DELETE FROM comments WHERE id = ?`, [commentId], function (err) {
        if (err) {
          console.error('❌ 댓글 삭제 오류:', err.message);
          return res.status(500).json({ error: '댓글 삭제 실패' });
        }
  
        res.json({ message: '댓글이 성공적으로 삭제되었습니다.', deletedId: commentId });
        db.close();
      });
    });
  });
  