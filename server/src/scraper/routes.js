const express = require('express');
const { query, get, run } = require('../common/database');
const { runScraper: runHttpScraper } = require('./core');
const { runPlaywrightScraper, getActiveTasks, cancelTask } = require('./playwright-bridge');
const {
  compliantScrape,
  getComplianceReport,
  isSourceCompliant,
  COMPLIANT_SOURCES,
  isUrlAllowed,
} = require('./compliance');

const router = express.Router();

// ========== 合规数据获取 ==========

// 获取数据源列表（含合规评估）
router.get('/sources', (req, res) => {
  const sources = query(`
    SELECT s.*, 
      (SELECT COUNT(*) FROM jobs WHERE source_id = s.id AND is_active = 1) as job_count
    FROM sources s ORDER BY s.name
  `);
  
  // 附加合规评估
  const enriched = sources.map(s => ({
    ...s,
    compliance: getComplianceReport(s.id),
  }));
  
  res.json({ data: enriched });
});

// 更新数据源
router.put('/sources/:id', (req, res, next) => {
  try {
    const { name, website, is_active, config } = req.body;
    const existing = get('SELECT id FROM sources WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ code: 'NOT_FOUND', message: '数据源未找到' });

    if (name !== undefined) run('UPDATE sources SET name = ? WHERE id = ?', [name, req.params.id]);
    if (website !== undefined) run('UPDATE sources SET website = ? WHERE id = ?', [website, req.params.id]);
    if (is_active !== undefined) run('UPDATE sources SET is_active = ? WHERE id = ?', [is_active ? 1 : 0, req.params.id]);
    if (config !== undefined) run('UPDATE sources SET config = ? WHERE id = ?', [JSON.stringify(config), req.params.id]);

    const updated = get('SELECT * FROM sources WHERE id = ?', [req.params.id]);
    res.json({ message: '数据源已更新', data: updated });
  } catch (err) { next(err); }
});

// ========== 合规抓取 ==========

/**
 * 触发抓取
 * 
 * mode 参数：
 * - 'compliant' (默认): 仅抓取合规数据源，遵守 robots.txt
 * - 'manual': 用户确认风险后手动抓取（需 acknowledge_risk=true）
 */
router.post('/run', async (req, res, next) => {
  try {
    const { source_id, keyword, city, mode = 'compliant', acknowledge_risk = false } = req.body;

    if (source_id) {
      const source = get('SELECT * FROM sources WHERE id = ? AND is_active = 1', [source_id]);
      if (!source) return res.status(404).json({ code: 'NOT_FOUND', message: '数据源未找到或已停用' });
    }

    // 合规模式：检查数据源合规性
    if (mode === 'compliant') {
      const targetSource = source_id || null;
      
      if (targetSource && !isSourceCompliant(targetSource)) {
        const report = getComplianceReport(targetSource);
        return res.status(403).json({
          code: 'COMPLIANCE_BLOCKED',
          message: `该数据源 (${targetSource}) 合规评估为高风险，不允许自动爬取`,
          compliance: report,
          suggestion: '如需获取该平台岗位信息，请使用"手动录入"功能，或直接前往平台网站搜索',
        });
      }

      // 合规抓取
      const results = [];
      if (targetSource) {
        const result = await compliantScrape(targetSource, keyword || '机械工程师', city || '');
        results.push(result);
      } else {
        // 只抓取合规数据源
        for (const [sid] of Object.entries(COMPLIANT_SOURCES)) {
          if (isSourceCompliant(sid)) {
            const result = await compliantScrape(sid, keyword || '机械工程师', city || '');
            results.push(result);
          }
        }
      }
      
      return res.json({ message: '合规抓取完成', data: results, mode: 'compliant' });
    }

    // 手动模式：需用户确认风险
    if (mode === 'manual') {
      if (!acknowledge_risk) {
        return res.status(400).json({
          code: 'RISK_ACKNOWLEDGEMENT_REQUIRED',
          message: '手动抓取模式需要确认法律风险',
          risks: [
            '⚠️ 抓取招聘网站数据可能违反其服务条款（robots.txt和用户协议）',
            '⚠️ 平台有权封禁违规账号并追究法律责任',
            '⚠️ 大规模抓取可能构成不正当竞争',
            '⚠️ 抓取个人信息（HR联系方式等）违反《个人信息保护法》',
          ],
          safe_alternatives: [
            '✅ 使用"合规抓取"模式（仅抓取允许的数据源）',
            '✅ 手动在平台搜索后将岗位信息录入系统',
            '✅ 使用平台官方API（如有）',
            '✅ 直接在招聘平台收藏岗位，使用本站做投递管理',
          ],
        });
      }

      // 用户已确认风险，执行抓取（记录审计日志）
      console.warn(`[AUDIT] 用户确认风险后手动抓取: source=${source_id}, keyword=${keyword}, city=${city}, ip=${req.ip}, time=${new Date().toISOString()}`);
      
      const results = await runHttpScraper(source_id || null, keyword || '机械');
      return res.json({ message: '手动抓取完成（已记录审计日志）', data: results, mode: 'manual' });
    }

    res.status(400).json({ code: 'INVALID_MODE', message: '无效的抓取模式，请使用 compliant 或 manual' });
  } catch (err) { next(err); }
});

// 爬虫状态
router.get('/status', (req, res) => {
  const sources = query(`
    SELECT s.*, 
      (SELECT COUNT(*) FROM jobs WHERE source_id = s.id AND is_active = 1) as job_count
    FROM sources s ORDER BY s.name
  `);
  const tasks = getActiveTasks();
  
  // 附加合规评估
  const enriched = sources.map(s => ({
    ...s,
    compliance: getComplianceReport(s.id),
  }));
  
  res.json({ data: { sources: enriched, active_tasks: tasks } });
});

// 取消爬虫任务
router.delete('/tasks/:id', (req, res) => {
  const success = cancelTask(req.params.id);
  if (success) {
    res.json({ message: '任务已取消' });
  } else {
    res.status(404).json({ code: 'NOT_FOUND', message: '任务未找到' });
  }
});

// 清理过期岗位
router.post('/cleanup', (req, res, next) => {
  try {
    const { days = 30 } = req.body;
    const result = run(
      "UPDATE jobs SET is_active = 0 WHERE crawled_at < datetime('now', ? || ' days') AND is_active = 1",
      [`-${days}`]
    );
    res.json({ message: `已标记 ${result.changes || 0} 个超过 ${days} 天的岗位为失效` });
  } catch (err) { next(err); }
});

// ========== 合规评估 API ==========

// 获取所有数据源的合规评估
router.get('/compliance', (req, res) => {
  const reports = {};
  for (const [sourceId, config] of Object.entries(COMPLIANT_SOURCES)) {
    reports[sourceId] = {
      name: config.name,
      ...config.compliance,
    };
  }
  res.json({ data: reports });
});

// 检查某个URL是否被robots.txt允许
router.post('/check-robots', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ message: '请提供URL' });
  
  try {
    const allowed = await isUrlAllowed(url);
    res.json({ url, allowed, message: allowed ? '该URL被robots.txt允许' : '该URL被robots.txt禁止' });
  } catch (err) {
    res.json({ url, allowed: false, message: `检查失败: ${err.message}` });
  }
});

module.exports = router;
