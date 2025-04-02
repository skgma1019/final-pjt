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


// 로그인 라우터
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

    res.json({
      message: '로그인 성공',
      token,
      userId: user.id // ✅ 이거 꼭 있어야 한다!
    });

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

// PATCH /me/tag - 로그인한 유저의 태그 업데이트
router.patch('/me/tag', authenticateToken, (req, res) => {
  const db = new sqlite3.Database('./clash_community.db');
  const userId = req.user.id;
  const { tag } = req.body;

  if (!tag) return res.status(400).json({ error: '태그가 필요합니다.' });

  const updateQuery = `UPDATE users_tag SET tag = ?, last_updated = CURRENT_TIMESTAMP WHERE user_id = ?`;

  db.run(updateQuery, [tag, userId], function (err) {
    if (err) {
      console.error('❌ 태그 저장 오류:', err.message);
      return res.status(500).json({ error: '태그 저장 실패' });
    }

    res.json({ message: '태그가 저장되었습니다.' });
    db.close();
  });
});

// GET /me/info - 회원 정보 조회용
router.get('/me/info', authenticateToken, (req, res) => {
  const db = new sqlite3.Database('./clash_community.db');
  const userId = req.user.id;

  const query = `
    SELECT u.email, ut.nickname, ut.tag, ut.trophies, ut.clan_name, ut.arena, ut.last_updated
    FROM users u
    LEFT JOIN users_tag ut ON u.id = ut.user_id
    WHERE u.id = ?
  `;

  db.get(query, [userId], (err, row) => {
    if (err) return res.status(500).json({ error: '회원 정보 불러오기 실패' });
    if (!row) return res.status(404).json({ error: '회원 정보를 찾을 수 없습니다.' });
    res.json(row);
    db.close();
  });
});

router.patch('/me/profile', authenticateToken, async (req, res) => {
  const db = new sqlite3.Database('./clash_community.db');
  const userId = req.user.id;
  const { nickname, tag } = req.body;

  if (!nickname && !tag) {
    return res.status(400).json({ error: '수정할 항목이 없습니다.' });
  }

  try {
    // 중복 닉네임/태그 체크
    const checkQuery = `
      SELECT * FROM users_tag WHERE (nickname = ? OR tag = ?) AND user_id != ?
    `;
    db.get(checkQuery, [nickname, tag, userId], async (err, existing) => {
      if (err) return res.status(500).json({ error: '중복 확인 실패' });

      if (existing) {
        if (nickname && existing.nickname === nickname) {
          return res.status(409).json({ error: '이미 존재하는 닉네임입니다.' });
        }
        if (tag && existing.tag === tag) {
          return res.status(409).json({ error: '이미 존재하는 태그입니다.' });
        }
      }

      // 업데이트할 필드 구성
      const fields = [];
      const values = [];

      if (nickname) {
        fields.push('nickname = ?');
        values.push(nickname);
      }

      let trophies = null, clanName = null, arena = null;
      if (tag) {
        // ✅ 태그 정규화: #붙이기 + 대문자화
        const normalizedTag = `#${tag.toUpperCase().replace(/^#/, '')}`;
        fields.push('tag = ?');
        values.push(normalizedTag);

        // ✅ Clash Royale API 호출
        try {
          const encodedTag = encodeURIComponent(normalizedTag);
          const clashRes = await axios.get(`https://proxy.royaleapi.dev/v1/players/${encodedTag}`, {
            headers: {
              Authorization: `Bearer ${process.env.CLASH_API_TOKEN}`
            }
          });

          const data = clashRes.data;
          trophies = data.trophies;
          clanName = data.clan?.name ?? null;
          arena = data.arena?.name ?? null;

          fields.push('trophies = ?');
          values.push(trophies);
          fields.push('clan_name = ?');
          values.push(clanName);
          fields.push('arena = ?');
          values.push(arena);
        } catch (apiErr) {
          console.error('❌ Clash API 오류:', apiErr.message);
          return res.status(500).json({ error: 'Clash Royale API 호출 실패' });
        }
      }

      fields.push('last_updated = CURRENT_TIMESTAMP');
      values.push(userId);

      const updateQuery = `
        UPDATE users_tag SET ${fields.join(', ')} WHERE user_id = ?
      `;

      db.run(updateQuery, values, function (err) {
        if (err) {
          console.error('❌ DB 업데이트 오류:', err.message);
          return res.status(500).json({ error: '프로필 업데이트 실패' });
        }

        res.json({ message: '프로필 정보가 업데이트되었습니다.' });
        db.close();
      });
    });
  } catch (err) {
    console.error('❌ 예외 발생:', err.message);
    res.status(500).json({ error: '서버 오류 발생' });
    db.close();
  }
});

// GET /users/:id/info - 다른 유저의 Clash Royale 프로필 정보 조회
router.get('/users/:id/info', (req, res) => {
  const db = new sqlite3.Database('./clash_community.db');
  const userId = req.params.id;

  const query = `
     SELECT u.email, ut.nickname, ut.tag, ut.trophies, ut.clan_name, ut.arena, ut.last_updated
    FROM users u
    LEFT JOIN users_tag ut ON u.id = ut.user_id
    WHERE u.id = ?
  `;

  db.get(query, [userId], (err, row) => {
    if (err) {
      console.error('❌ 유저 정보 조회 오류:', err.message);
      return res.status(500).json({ error: '유저 정보 불러오기 실패' });
    }

    if (!row) {
      return res.status(404).json({ error: '해당 유저를 찾을 수 없습니다' });
    }

    res.json(row);
    db.close();
  });
});

// 유저 공개 여부 기반 정보 제공 API
router.get('/users/:id/info', (req, res) => {
  const db = new sqlite3.Database('./clash_community.db');
  const userId = req.params.id;

  const query = `
    SELECT nickname, tag, trophies, clan_name, arena, last_updated, is_public
    FROM users_tag
    WHERE user_id = ?
  `;

  db.get(query, [userId], (err, row) => {
    if (err) {
      console.error('❌ 유저 정보 조회 오류:', err.message);
      return res.status(500).json({ error: '유저 정보를 불러오지 못했습니다' });
    }

    if (!row || row.is_public === 0) {
      return res.status(403).json({ error: '비공개 처리한 계정입니다.' });
    }


    
    res.json(row);
    db.close();
  });
});


router.patch('/me/privacy', authenticateToken, (req, res) => {
  const db = new sqlite3.Database('./clash_community.db');
  const userId = req.user.id;
  const { is_public } = req.body;

  if (typeof is_public !== 'number') {
    return res.status(400).json({ error: 'is_public은 숫자(0 또는 1)여야 합니다.' });
  }
  
  const query = `UPDATE users_tag SET is_public = ? WHERE user_id = ?`;
  
  db.run(query, [is_public, userId], function (err) {
    if (err) {
      console.error('❌ 공개 설정 변경 오류:', err.message);
      return res.status(500).json({ error: '공개 설정 저장 실패' });
    }
  
    res.json({ message: '공개 설정이 저장되었습니다.' });
    db.close();
  });
  
    });

export default router;
