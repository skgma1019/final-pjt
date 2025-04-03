import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import commentRouter from './comment_controller.js';
import articleRouter from './article_controller.js';
import playerRouter from './player_controller.js';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use('/uploads', express.static('uploads')); // 이미지 접근 경로 추가
app.use(express.json());  // JSON 파싱 미들웨어
app.use('/users', playerRouter);  // '/users' 경로에서 playerRouter 사용
app.use('/', articleRouter);
app.use('/', playerRouter);
app.use('/', commentRouter);

app.listen(PORT, () => {
  console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
});