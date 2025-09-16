import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createLogger } from '@research-study/shared';

dotenv.config();

const app = express();
const logger = createLogger('study-management');
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'study-management',
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  logger.info(`Study Management Service running on port ${PORT}`);
});