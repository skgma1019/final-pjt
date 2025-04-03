import jwt from 'jsonwebtoken';

// 필수 인증
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  console.log('👉 Authorization Header:', authHeader); // 디버깅용, 실제 배포시 삭제

  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: '토큰이 필요합니다' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret'); // 'secret' 기본값 사용
    req.user = decoded;
    next();
  } catch (err) {
    console.log('❌ 토큰 에러:', err.message);  // 디버깅용, 실제 배포시 삭제
    if (err.name === 'TokenExpiredError') {
      return res.status(403).json({ error: '토큰이 만료되었습니다' });  // 토큰 만료 처리
    }
    return res.status(403).json({ error: '유효하지 않은 토큰입니다' });
  }
}

// 선택 인증
function authenticateTokenOptional(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      req.user = decoded;
    } catch (err) {
      // 유효하지 않은 토큰이면 무시하고 계속
    }
  }
  next();
}

export { authenticateToken, authenticateTokenOptional };
