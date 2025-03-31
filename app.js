// app.js
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import commentRouter from './comment_controller.js';
import articleRouter from './article_controller.js';
import playerRouter from './player_controller.js'; // ← 추가


dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

// 라우터 등록
app.use('/', articleRouter);     // /articles 등
app.use('/', playerRouter);      // /api/player/:tag
app.use('/', commentRouter);

app.listen(PORT, () => {
  console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
});
