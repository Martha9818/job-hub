/**
 * Playwright 爬虫桥接模块
 * 后端API通过子进程调用 Playwright 爬虫脚本，并将结果自动入库
 */

const { spawn } = require('child_process');
const path = require('path');
const { saveJobs } = require('./core');

const SCRAPER_SCRIPT = path.join(__dirname, '..', '..', '..', 'scraper-scripts', 'scraper-stealth.js');

// 活跃的爬虫任务
const activeTasks = new Map();

/**
 * 执行 Playwright 爬虫并入库
 * @param {string} sourceId - 数据源ID (boss, zhilian, liepin, 51job)
 * @param {string} keyword - 搜索关键词
 * @param {string} city - 城市
 * @returns {Promise<{task_id: string, found: number, saved: number}>}
 */
function runPlaywrightScraper(sourceId, keyword = '机械工程师', city = '') {
  return new Promise((resolve, reject) => {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const nodePath = process.execPath;

    const args = [
      SCRAPER_SCRIPT,
      `--source=${sourceId}`,
      `--keyword=${keyword}`,
    ];
    if (city) args.push(`--city=${city}`);

    console.log(`[ScraperBridge] 启动爬虫任务 ${taskId}: source=${sourceId}, keyword=${keyword}, city=${city}`);

    const child = spawn(nodePath, args, {
      cwd: path.join(__dirname, '..', '..', '..'),
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    activeTasks.set(taskId, {
      id: taskId,
      source_id: sourceId,
      keyword,
      city,
      status: 'running',
      started_at: new Date().toISOString(),
      child,
    });

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
      // 只打印关键错误，不打印 Playwright 的正常日志
      const errStr = data.toString();
      if (errStr.includes('Error') || errStr.includes('error')) {
        console.error(`[ScraperBridge] 任务 ${taskId} 错误: ${errStr.slice(0, 200)}`);
      }
    });

    child.on('close', (code) => {
      const task = activeTasks.get(taskId);
      if (task) task.status = code === 0 ? 'completed' : 'failed';

      if (code !== 0) {
        console.error(`[ScraperBridge] 任务 ${taskId} 失败，退出码: ${code}`);
        activeTasks.delete(taskId);
        return reject(new Error(`爬虫进程异常退出 (code=${code}): ${stderr.slice(0, 300)}`));
      }

      // 解析输出中的 JSON 数据
      let jobs = [];
      try {
        // 尝试从 ---JSON_OUTPUT--- 标记后提取
        const jsonMarker = '---JSON_OUTPUT---';
        const markerIdx = stdout.indexOf(jsonMarker);
        if (markerIdx !== -1) {
          const jsonStr = stdout.slice(markerIdx + jsonMarker.length).trim();
          jobs = JSON.parse(jsonStr);
        } else {
          // 尝试找最后一段 JSON 数组
          const jsonMatch = stdout.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            jobs = JSON.parse(jsonMatch[0]);
          }
        }
      } catch (err) {
        console.error(`[ScraperBridge] 解析爬虫输出失败: ${err.message}`);
        activeTasks.delete(taskId);
        return reject(new Error(`解析爬虫输出失败: ${err.message}`));
      }

      // 入库
      const { saved } = saveJobs(jobs, sourceId);

      console.log(`[ScraperBridge] 任务 ${taskId} 完成: 发现 ${jobs.length} 个岗位, 入库 ${saved} 个`);

      activeTasks.delete(taskId);
      resolve({
        task_id: taskId,
        source_id: sourceId,
        found: jobs.length,
        saved,
      });
    });

    child.on('error', (err) => {
      console.error(`[ScraperBridge] 启动爬虫进程失败: ${err.message}`);
      activeTasks.delete(taskId);
      reject(new Error(`启动爬虫进程失败: ${err.message}`));
    });

    // 超时保护（2分钟）
    setTimeout(() => {
      if (activeTasks.has(taskId)) {
        child.kill();
        activeTasks.delete(taskId);
        reject(new Error('爬虫任务超时'));
      }
    }, 120000);
  });
}

/**
 * 获取活跃任务列表
 */
function getActiveTasks() {
  return Array.from(activeTasks.values()).map(t => ({
    id: t.id,
    source_id: t.source_id,
    keyword: t.keyword,
    city: t.city,
    status: t.status,
    started_at: t.started_at,
  }));
}

/**
 * 取消任务
 */
function cancelTask(taskId) {
  const task = activeTasks.get(taskId);
  if (task && task.child) {
    task.child.kill();
    activeTasks.delete(taskId);
    return true;
  }
  return false;
}

module.exports = { runPlaywrightScraper, getActiveTasks, cancelTask };
