import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const SECRET = process.env.SECRET;

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '토큰이 없습니다. 로그인 후 이용해주세요.' });
  }

  jwt.verify(token, SECRET, (err, user) => {
    if (err) {
      console.error('❌ 토큰 검증 실패:', err.message);
      return res.status(403).json({ error: '유효하지 않은 토큰입니다.' });
    }

    req.user = user;
    next();
  });
}
