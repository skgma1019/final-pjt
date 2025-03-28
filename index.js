// ES Module 방식
import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import cors from 'cors';

// 환경 변수 로드
dotenv.config();

const app = express();
const PORT = 3000;

// 미들웨어 설정
app.use(cors());
app.use(express.json());

// API 라우터
app.get('/api/player/:tag', async (req, res) => {
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

// 서버 실행
app.listen(PORT, () => {
  console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
});
