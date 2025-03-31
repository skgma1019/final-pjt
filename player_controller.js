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
  const { email, password, nickname, tag } = req.body;

  // 필수 항목 검사
  if (!email || !password || !nickname || !tag) {
    return res.status(400).json({ error: '이메일, 비밀번호, 닉네임, 태그는 필수입니다.' });
  }

  try {
    // 비밀번호 암호화
    const hashedPassword = await bcrypt.hash(password, 10);

    // 닉네임과 태그 중복 체크
    const checkQuery = `SELECT * FROM users_tag WHERE nickname = ? OR tag = ?`;
    db.get(checkQuery, [nickname, tag], (err, existing) => {
      if (err) {
        return res.status(500).json({ error: '중복 체크에 실패했습니다.' });
      }
      if (existing) {
        // 어떤 값이 중복되었는지 확인
        if (existing.nickname === nickname) {
          return res.status(409).json({ error: '이미 존재하는 닉네임입니다.' });
        }
        if (existing.tag === tag) {
          return res.status(409).json({ error: '이미 존재하는 태그입니다.' });
        }
      }

      // users 테이블에 사용자 등록
      const userInsertQuery = `INSERT INTO users (email, password) VALUES (?, ?)`;
      db.run(userInsertQuery, [email, hashedPassword], function (err) {
        if (err) {
          if (err.message.includes('UNIQUE')) {
            return res.status(409).json({ error: '이미 존재하는 이메일입니다.' });
          }
          return res.status(500).json({ error: '회원가입 실패 (users)' });
        }

        const userId = this.lastID; // 새로 생성된 사용자 ID

        // users_tag 테이블에 tag와 nickname 등록
        const tagInsertQuery = `INSERT INTO users_tag (user_id, tag, nickname) VALUES (?, ?, ?)`;
        db.run(tagInsertQuery, [userId, tag, nickname], function (err) {
          if (err) {
            console.error('❌ users_tag 등록 실패:', err.message);
            return res.status(500).json({ error: '회원가입 실패 (users_tag)' });
          }

          res.status(201).json({ message: '회원가입 성공', userId });
          db.close();
        });
      });
    });
  } catch (error) {
    console.error('회원가입 예외:', error);
    res.status(500).json({ error: '회원가입 중 예외 발생' });
    db.close();
  }
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
