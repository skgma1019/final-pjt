// playerRouter.js
import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import sqlite3 from 'sqlite3';
import { authenticateToken } from './auth.js';


dotenv.config();
const SECRET = process.env.SECRET;




const router = express.Router();

// GET /api/player/:tag
router.get('/api/player/:tag', async (req, res) => {
  const tag = req.params.tag.toUpperCase().replace('#', '');
  const encodedTag = encodeURIComponent(`#${tag}`);

  try {
    const response = await axios.get(`https://proxy.royaleapi.dev/v1/players/${encodedTag}`, {
      headers: {
        Authorization: `Bearer ${process.env.CLASH_API_TOKEN}`,
      },
    });

    console.log('💡 현재 토큰:', process.env.CLASH_API_TOKEN);
    console.log('[🎯 받은 데이터]', response.data);

    res.json(response.data);
  } catch (error) {
    console.error('[❌ 오류]', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      message: '플레이어 정보를 불러오는 데 실패했습니다.',
      error: error.response?.data || error.message,
    });
  }
});

// ✅ [2] 회원가입
router.post('/register', async (req, res) => {
  const db = new sqlite3.Database('./clash_community.db');
  const { email, password } = req.body;

  if (!email || !password) return res.status(400).json({ error: '이메일과 비밀번호는 필수입니다.' });

  const hashedPassword = await bcrypt.hash(password, 10);

  const query = `INSERT INTO users (email, password) VALUES (?, ?)`;

  db.run(query, [email, hashedPassword], function (err) {
    if (err) {
      if (err.message.includes('UNIQUE')) {
        return res.status(409).json({ error: '이미 존재하는 이메일입니다.' });
      }
      return res.status(500).json({ error: '회원가입 실패' });
    }

    res.status(201).json({ message: '회원가입 성공', userId: this.lastID });
    db.close();
  });
});

// ✅ [3] 로그인
router.post('/login', (req, res) => {
  const db = new sqlite3.Database('./clash_community.db');
  const { email, password } = req.body;

  const query = `SELECT * FROM users WHERE email = ?`;

  db.get(query, [email], async (err, user) => {
    if (err) return res.status(500).json({ error: '로그인 실패' });
    if (!user) return res.status(404).json({ error: '존재하지 않는 이메일입니다.' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: '비밀번호가 틀렸습니다.' });

    const token = jwt.sign({ id: user.id, email: user.email }, SECRET, { expiresIn: '1h' });

    res.json({ message: '로그인 성공', token });
    db.close();
  });
});

// ✅ 로그인한 유저 정보 확인 (토큰 필요)
router.get('/me', authenticateToken, (req, res) => {
  res.json({
    message: '인증된 사용자입니다.',
    user: req.user, // { id, email } 형태
  });
});

export default router;
