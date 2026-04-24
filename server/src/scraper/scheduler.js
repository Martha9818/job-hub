/**
 * 定时爬取调度模块
 * 使用 node-cron 实现自动定期抓取新岗位
 */

const cron = require('node-cron');
const { get, query, run } = require('../common/database');
const { runPlaywrightScraper } = require('./playwright-bridge');
const { runScraper: runHttpScraper } = require('./core');

// 默认爬取关键词
const DEFAULT_KEYWORDS = ['机械工程师', '机械设计', '数控编程', '模具设计', '液压工程师', '自动化工程师'];
const DEFAULT_CITIES = ['', '上海', '深圳', '苏州', '东莞', '长沙', '徐州'];

let scheduledTask = null;
let isRunning = false;

/**
 * 执行一轮自动爬取
 */
async function runAutoScrape() {
  if (isRunning) {
    console.log('[Scheduler] 上一轮爬取仍在进行，跳过本次');
    return;
  }

  isRunning = true;
  console.log('[Scheduler] 开始自动爬取任务...');

  // 获取活跃的数据源
  const sources = query('SELECT * FROM sources WHERE is_active = 1');
  const playwrightSources = sources.filter(s => s.scraper_type === 'playwright');
  const staticSources = sources.filter(s => s.scraper_type === 'static');

  const results = [];

  // Playwright 数据源
  for (const source of playwrightSources) {
    // 轮换关键词
    const keywordIdx = Math.floor(Math.random() * DEFAULT_KEYWORDS.length);
    const cityIdx = Math.floor(Math.random() * DEFAULT_CITIES.length);
    const keyword = DEFAULT_KEYWORDS[keywordIdx];
    const city = DEFAULT_CITIES[cityIdx];

    try {
      console.log(`[Scheduler] 爬取 ${source.name}: keyword=${keyword}, city=${city || '全国'}`);
      const result = await runPlaywrightScraper(source.id, keyword, city);
      results.push({ source: source.name, ...result });
      // 延迟避免被封
      await new Promise(r => setTimeout(r, 5000 + Math.random() * 5000));
    } catch (err) {
      console.error(`[Scheduler] ${source.name} 爬取失败: ${err.message}`);
      results.push({ source: source.name, error: err.message });
    }
  }

  // 静态 HTTP 数据源
  for (const keyword of DEFAULT_KEYWORDS.slice(0, 3)) {
    try {
      const httpResults = await runHttpScraper(null, keyword, '机械');
      results.push(...httpResults);
    } catch (err) {
      console.error(`[Scheduler] HTTP爬取失败: ${err.message}`);
    }
  }

  // 清理30天前的旧岗位
  try {
    run("UPDATE jobs SET is_active = 0 WHERE crawled_at < datetime('now', '-30 days') AND is_active = 1");
  } catch (err) {
    console.error('[Scheduler] 清理旧岗位失败:', err.message);
  }

  console.log('[Scheduler] 自动爬取任务完成:', JSON.stringify(results));
  isRunning = false;
  return results;
}

/**
 * 启动定时任务
 * @param {string} cronExpression - cron 表达式，默认每6小时执行一次
 */
function startScheduler(cronExpression = '0 */6 * * *') {
  if (scheduledTask) {
    console.log('[Scheduler] 定时任务已在运行');
    return;
  }

  // 验证 cron 表达式
  if (!cron.validate(cronExpression)) {
    console.error(`[Scheduler] 无效的 cron 表达式: ${cronExpression}`);
    return;
  }

  scheduledTask = cron.schedule(cronExpression, () => {
    runAutoScrape().catch(err => {
      console.error('[Scheduler] 自动爬取异常:', err.message);
      isRunning = false;
    });
  }, {
    scheduled: true,
    timezone: 'Asia/Shanghai',
  });

  console.log(`[Scheduler] 定时爬取已启动 (${cronExpression})`);
}

/**
 * 停止定时任务
 */
function stopScheduler() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    console.log('[Scheduler] 定时爬取已停止');
  }
}

/**
 * 获取调度状态
 */
function getSchedulerStatus() {
  return {
    is_running: isRunning,
    scheduled: !!scheduledTask,
    next_run: scheduledTask ? '按cron配置' : null,
  };
}

module.exports = { startScheduler, stopScheduler, runAutoScrape, getSchedulerStatus };
