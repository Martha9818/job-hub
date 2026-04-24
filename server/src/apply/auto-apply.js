/**
 * 自动投递模块 - 基于 Playwright 的浏览器自动化投递
 * 
 * 核心流程：
 * 1. 用户选择岗位 + 简历
 * 2. 系统根据岗位来源（BOSS直聘/智联/猎聘等）确定投递策略
 * 3. 启动浏览器自动化，模拟用户登录和投递操作
 * 4. 实时更新投递状态
 * 
 * 注意：实际投递需要用户已在对应招聘网站有账号并授权登录
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { run, get, query } = require('../common/database');

// 投递任务队列
const applyQueue = new Map();

/**
 * 各平台的投递自动化脚本模板
 * 这些脚本会通过 Playwright 在浏览器中执行
 */
const APPLY_SCRIPTS = {
  boss: {
    name: 'BOSS直聘',
    // 投递页面URL模板
    applyUrl: (sourceUrl) => sourceUrl,
    // 自动化步骤（伪代码，实际由 Playwright 执行）
    steps: [
      '1. 打开岗位详情页',
      '2. 检查登录状态（如未登录，提示用户先登录）',
      '3. 点击"立即沟通"按钮',
      '4. 如果弹出发送消息框，自动发送默认问候语',
      '5. 确认投递成功',
    ],
  },
  zhilian: {
    name: '智联招聘',
    applyUrl: (sourceUrl) => sourceUrl,
    steps: [
      '1. 打开岗位详情页',
      '2. 检查登录状态',
      '3. 点击"申请职位"按钮',
      '4. 选择简历并确认',
      '5. 确认投递成功',
    ],
  },
  liepin: {
    name: '猎聘',
    applyUrl: (sourceUrl) => sourceUrl,
    steps: [
      '1. 打开岗位详情页',
      '2. 检查登录状态',
      '3. 点击"投递简历"按钮',
      '4. 选择简历并确认',
      '5. 确认投递成功',
    ],
  },
};

/**
 * 创建自动投递 Playwright 脚本
 * 根据岗位来源动态生成投递脚本
 */
function generateApplyScript(applications, resumePath) {
  // 按 source_id 分组
  const grouped = {};
  for (const app of applications) {
    if (!grouped[app.source_id]) grouped[app.source_id] = [];
    grouped[app.source_id].push(app);
  }

  return `
/**
 * 自动投递脚本 - 由 JobHub 自动生成
 * 生成时间: ${new Date().toISOString()}
 * 投递岗位数: ${applications.length}
 */

const { chromium } = require('playwright');
const path = require('path');

const STEALTH_SCRIPT = \`
  Object.defineProperty(navigator, 'webdriver', { get: () => false });
  Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
  Object.defineProperty(navigator, 'languages', { get: () => ['zh-CN', 'zh', 'en'] });
  window.chrome = { runtime: {} };
\`;

const APPLICATIONS = ${JSON.stringify(applications, null, 2)};

// 各平台的选择器配置
const SELECTORS = {
  boss: {
    loginCheck: '.user-info, .nav-figure',
    applyBtn: '.btn-greet, .op-btn-chat, [ka="job-detail-chat"]',
    successIndicator: '.dialog-btn-sure, .chat-input',
    loginUrl: 'https://www.zhipin.com/web/user/?ka=header-login',
  },
  zhilian: {
    loginCheck: '.user-info, .userinfo',
    applyBtn: '.apply-btn, [class*="apply"], .sou-button',
    successIndicator: '.success-tip, .applied',
    loginUrl: 'https://passport.zhaopin.com/login',
  },
  liepin: {
    loginCheck: '.user-info, .header-user',
    applyBtn: '.apply-btn, [class*="apply"], .job-apply',
    successIndicator: '.apply-success, .applied',
    loginUrl: 'https://www.liepin.com/ilogin/',
  },
};

async function autoApply() {
  // 使用用户本地浏览器（已登录状态）
  const browser = await chromium.launchPersistentContext(
    path.join(process.env.USERPROFILE || process.env.HOME, '.jobhub-browser'),
    {
      headless: false,  // 必须有头模式，用户可以看到操作过程
      viewport: { width: 1440, height: 900 },
      locale: 'zh-CN',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    }
  );

  // 注入隐身脚本
  await browser.addInitScript(STEALTH_SCRIPT);

  const page = await browser.newPage();
  const results = [];

  for (const app of APPLICATIONS) {
    const sourceId = app.source_id;
    const sels = SELECTORS[sourceId];
    
    if (!sels) {
      results.push({ application_id: app.id, status: 'failed', error: '不支持的平台' });
      continue;
    }

    try {
      console.log('[AutoApply] 正在投递:', app.title, '-', app.company);

      // 1. 打开岗位页面
      await page.goto(app.source_url || '', { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(2000);

      // 2. 检查登录状态
      const isLoggedIn = await page.evaluate((checkSel) => {
        return document.querySelector(checkSel) !== null;
      }, sels.loginCheck);

      if (!isLoggedIn) {
        console.log('[AutoApply] 未登录，跳转登录页:', sels.loginUrl);
        await page.goto(sels.loginUrl, { waitUntil: 'domcontentloaded' });
        
        // 等待用户手动登录（最多3分钟）
        console.log('[AutoApply] 等待用户手动登录...');
        await page.waitForTimeout(3000);
        
        // 检查是否登录成功
        try {
          await page.waitForSelector(sels.loginCheck.split(',')[0].trim(), { timeout: 180000 });
        } catch {
          results.push({ application_id: app.id, status: 'failed', error: '登录超时' });
          continue;
        }
        
        // 登录成功后回到岗位页
        await page.goto(app.source_url || '', { waitUntil: 'domcontentloaded', timeout: 20000 });
        await page.waitForTimeout(2000);
      }

      // 3. 点击投递按钮
      const applyBtnSelectors = sels.applyBtn.split(',').map(s => s.trim());
      let clicked = false;
      
      for (const sel of applyBtnSelectors) {
        try {
          const btn = await page.$(sel);
          if (btn) {
            await btn.click();
            clicked = true;
            await page.waitForTimeout(2000);
            break;
          }
        } catch {}
      }

      if (!clicked) {
        results.push({ application_id: app.id, status: 'failed', error: '未找到投递按钮' });
        continue;
      }

      // 4. 处理可能出现的弹窗（选择简历、确认等）
      await page.waitForTimeout(3000);

      // 尝试点击确认按钮
      try {
        const confirmBtn = await page.$('.dialog-btn-sure, .confirm-btn, [class*="confirm"]');
        if (confirmBtn) await confirmBtn.click();
      } catch {}

      // 5. 检查投递结果
      const successSelectors = sels.successIndicator.split(',').map(s => s.trim());
      let success = false;
      
      for (const sel of successSelectors) {
        try {
          const el = await page.$(sel);
          if (el) { success = true; break; }
        } catch {}
      }

      results.push({
        application_id: app.id,
        status: success ? 'success' : 'applied',  // applied = 可能成功但无法确认
        title: app.title,
        company: app.company,
      });

      console.log('[AutoApply]', success ? '✅ 投递成功' : '⚠️ 投递已提交（结果未确认）', app.title);

      // 延迟，避免过快操作
      await page.waitForTimeout(3000 + Math.random() * 3000);

    } catch (err) {
      results.push({
        application_id: app.id,
        status: 'failed',
        error: err.message,
        title: app.title,
        company: app.company,
      });
      console.error('[AutoApply] 投递失败:', app.title, err.message);
    }
  }

  // 不关闭浏览器，让用户可以看到结果
  console.log('\\n[AutoApply] 投递完成，结果:', JSON.stringify(results, null, 2));
  console.log('\\n[AutoApply] 浏览器保持打开状态，请手动关闭');
  console.log('---APPLY_RESULTS---');
  console.log(JSON.stringify(results));

  return results;
}

autoApply().catch(err => {
  console.error('[AutoApply] 异常:', err.message);
  process.exit(1);
});
`;
}

/**
 * 执行自动投递
 * @param {Array} applications - 投递记录列表 [{id, job_id, source_id, source_url, title, company, resume_id}]
 * @param {string} resumePath - 简历文件路径
 * @returns {Promise<Array>} 投递结果
 */
function executeAutoApply(applications, resumePath) {
  return new Promise((resolve, reject) => {
    const taskId = `apply_${Date.now()}`;
    const nodePath = process.execPath;

    // 生成临时投递脚本
    const scriptContent = generateApplyScript(applications, resumePath);
    const scriptDir = path.join(__dirname, '..', '..', '..', 'data', 'temp-scripts');
    if (!fs.existsSync(scriptDir)) fs.mkdirSync(scriptDir, { recursive: true });
    
    const scriptPath = path.join(scriptDir, `apply_${Date.now()}.js`);
    fs.writeFileSync(scriptPath, scriptContent, 'utf-8');

    console.log(`[AutoApply] 启动自动投递任务 ${taskId}, 共 ${applications.length} 个岗位`);

    const child = spawn(nodePath, [scriptPath], {
      cwd: path.join(__dirname, '..', '..', '..', 'scraper-scripts'),
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    applyQueue.set(taskId, {
      id: taskId,
      status: 'running',
      started_at: new Date().toISOString(),
      total: applications.length,
      child,
    });

    child.stdout.on('data', (data) => { stdout += data.toString(); });
    child.stderr.on('data', (data) => {
      stderr += data.toString();
      const str = data.toString();
      if (str.includes('[AutoApply]')) {
        console.log(str.trim());
      }
    });

    child.on('close', (code) => {
      // 解析结果
      let results = [];
      try {
        const marker = '---APPLY_RESULTS---';
        const idx = stdout.indexOf(marker);
        if (idx !== -1) {
          results = JSON.parse(stdout.slice(idx + marker.length).trim());
        }
      } catch (err) {
        console.error('[AutoApply] 解析投递结果失败:', err.message);
      }

      // 更新数据库中的投递状态
      for (const r of results) {
        if (r.application_id) {
          try {
            const status = r.status === 'success' ? 'success' : r.status === 'applied' ? 'applied' : 'failed';
            run('UPDATE applications SET status = ?, result = ?, error_message = ? WHERE id = ?',
              [status, r.status, r.error || null, r.application_id]);
          } catch (err) {
            console.error(`[AutoApply] 更新投递状态失败 (${r.application_id}):`, err.message);
          }
        }
      }

      // 清理临时脚本
      try { fs.unlinkSync(scriptPath); } catch {}

      applyQueue.delete(taskId);
      console.log(`[AutoApply] 任务 ${taskId} 完成, 结果数: ${results.length}`);
      resolve(results);
    });

    child.on('error', (err) => {
      console.error('[AutoApply] 启动投递进程失败:', err.message);
      applyQueue.delete(taskId);
      try { fs.unlinkSync(scriptPath); } catch {}
      reject(new Error(`启动投递进程失败: ${err.message}`));
    });

    // 超时保护（10分钟）
    setTimeout(() => {
      if (applyQueue.has(taskId)) {
        child.kill();
        applyQueue.delete(taskId);
        try { fs.unlinkSync(scriptPath); } catch {}
        reject(new Error('投递任务超时'));
      }
    }, 600000);
  });
}

/**
 * 获取投递任务状态
 */
function getApplyTasks() {
  return Array.from(applyQueue.values()).map(t => ({
    id: t.id,
    status: t.status,
    started_at: t.started_at,
    total: t.total,
  }));
}

/**
 * 获取平台投递步骤说明
 */
function getApplySteps(sourceId) {
  const config = APPLY_SCRIPTS[sourceId];
  return config ? { name: config.name, steps: config.steps } : null;
}

module.exports = { executeAutoApply, getApplyTasks, getApplySteps, APPLY_SCRIPTS };
