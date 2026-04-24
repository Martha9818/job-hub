/**
 * JobHub - 机械行业招聘信息聚合平台 - 主入口
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

// 加载环境变量
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const val = match[2].trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  });
}

const { initDatabase, query, saveDb } = require('./common/database');
const { globalErrorHandler } = require('./common/errors');
const authRoutes = require('./auth/routes');
const jobRoutes = require('./jobs/routes');
const resumeRoutes = require('./resume/routes');
const applyRoutes = require('./apply/routes');
const scraperRoutes = require('./scraper/routes');
const { startScheduler, stopScheduler, getSchedulerStatus, runAutoScrape } = require('./scraper/scheduler');

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    process.env.FRONTEND_URL,
    // Vercel 预览和正式域名
    /^https:\/\/[a-z0-9-]+\.vercel\.app$/,
  ].filter(Boolean),
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// 静态文件
const uploadDir = process.env.UPLOAD_DIR || './uploads/resumes';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/applications', applyRoutes);
app.use('/api/scraper', scraperRoutes);

// 调度管理接口
app.get('/api/scheduler/status', (req, res) => {
  res.json({ data: getSchedulerStatus() });
});

app.post('/api/scheduler/start', (req, res) => {
  const { cron: cronExpr } = req.body || {};
  startScheduler(cronExpr);
  res.json({ message: '定时爬取已启动', data: getSchedulerStatus() });
});

app.post('/api/scheduler/stop', (req, res) => {
  stopScheduler();
  res.json({ message: '定时爬取已停止', data: getSchedulerStatus() });
});

app.post('/api/scheduler/run-now', async (req, res) => {
  try {
    const results = await runAutoScrape();
    res.json({ message: '手动爬取完成', data: results });
  } catch (err) {
    res.status(500).json({ message: '爬取失败', error: err.message });
  }
});

// 健康检查
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.get('/ready', (req, res) => {
  try {
    query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch {
    res.status(503).json({ status: 'degraded', database: 'disconnected' });
  }
});

// 全局错误处理
app.use(globalErrorHandler);

// 启动
async function start() {
  await initDatabase();
  console.log('✅ 数据库初始化完成');

  // 启动定时爬取（默认每6小时）
  if (process.env.ENABLE_SCHEDULER !== 'false') {
    const cronExpr = process.env.SCHEDULER_CRON || '0 */6 * * *';
    startScheduler(cronExpr);
  }

  const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
  app.listen(PORT, HOST, () => {
    console.log(`
  ╔══════════════════════════════════════════╗
  ║   🔧 JobHub 机械行业招聘聚合平台          ║
  ║   服务运行在: http://${HOST}:${PORT}       ║
  ║   API文档: http://${HOST}:${PORT}/health   ║
  ╚══════════════════════════════════════════╝
    `);
  });
}

// 优雅退出
process.on('SIGINT', () => {
  console.log('\n正在关闭服务...');
  stopScheduler();
  saveDb();
  process.exit(0);
});

process.on('SIGTERM', () => {
  stopScheduler();
  saveDb();
  process.exit(0);
});

start().catch(err => { console.error('启动失败:', err); process.exit(1); });
