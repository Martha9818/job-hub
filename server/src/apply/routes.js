const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { run, get, query } = require('../common/database');
const { authenticate } = require('../auth/middleware');
const { validate, applySchema } = require('../common/validation');
const { executeAutoApply, getApplyTasks, getApplySteps } = require('./auto-apply');

const router = express.Router();

// 批量投递
router.post('/', authenticate, validate(applySchema), async (req, res, next) => {
  try {
    const { job_ids, resume_id, auto_apply } = req.validated;
    const userId = req.user.id;

    const resume = get('SELECT id, filepath FROM resumes WHERE id = ? AND user_id = ?', [resume_id, userId]);
    if (!resume) return res.status(404).json({ code: 'NOT_FOUND', message: '简历未找到或不属于当前用户' });

    const results = [];
    const validApps = [];

    for (const jobId of job_ids) {
      const job = get('SELECT id, title, company, source_url, source_id FROM jobs WHERE id = ? AND is_active = 1', [jobId]);
      if (!job) { results.push({ job_id: jobId, status: 'failed', error: '岗位不存在或已下线' }); continue; }

      const existing = get('SELECT id FROM applications WHERE user_id = ? AND job_id = ?', [userId, jobId]);
      if (existing) { results.push({ job_id: jobId, status: 'skipped', error: '已投递过该岗位' }); continue; }

      const appId = uuidv4();
      run('INSERT INTO applications (id, user_id, job_id, resume_id, status) VALUES (?, ?, ?, ?, ?)',
        [appId, userId, jobId, resume_id, auto_apply ? 'pending' : 'submitted']);

      results.push({ job_id: jobId, application_id: appId, status: auto_apply ? 'pending' : 'submitted', title: job.title, company: job.company });

      if (auto_apply && job.source_url) {
        validApps.push({ id: appId, job_id: jobId, source_id: job.source_id, source_url: job.source_url, title: job.title, company: job.company, resume_id });
      }
    }

    // 如果请求自动投递且有有效岗位，启动浏览器自动化
    if (auto_apply && validApps.length > 0) {
      // 审计日志：记录自动投递操作
      console.warn(`[AUDIT] 自动投递: user=${userId}, jobs=${validApps.length}, ip=${req.ip}, time=${new Date().toISOString()}`);

      // 异步执行，不阻塞响应
      executeAutoApply(validApps, resume.filepath)
        .then(applyResults => {
          console.log(`[Apply] 自动投递完成: ${applyResults.length} 个结果`);
        })
        .catch(err => {
          console.error('[Apply] 自动投递异常:', err.message);
          // 标记失败
          for (const app of validApps) {
            run('UPDATE applications SET status = ?, error_message = ? WHERE id = ?',
              ['failed', `自动投递失败: ${err.message}`, app.id]);
          }
        });

      res.status(201).json({
        message: `投递请求已提交，正在自动投递 ${validApps.length} 个岗位`,
        data: results,
        auto_apply: true,
        note: '浏览器窗口已打开，请在弹出的浏览器中确认投递操作',
        compliance_warning: '⚠️ 自动投递可能违反招聘网站服务条款，账号有被封禁风险。建议对少量重点岗位使用自动投递，其余手动投递。',
      });
    } else {
      res.status(201).json({
        message: '投递请求已提交',
        data: results,
        auto_apply: false,
      });
    }
  } catch (err) { next(err); }
});

// 投递记录
router.get('/', authenticate, (req, res, next) => {
  try {
    const { status } = req.query;
    let sql = `SELECT a.*, j.title, j.company, j.salary_text, j.location, j.source_url, j.source_id, r.filename as resume_name
       FROM applications a JOIN jobs j ON a.job_id = j.id JOIN resumes r ON a.resume_id = r.id
       WHERE a.user_id = ?`;
    const params = [req.user.id];

    if (status) {
      sql += ' AND a.status = ?';
      params.push(status);
    }
    sql += ' ORDER BY a.applied_at DESC';

    const applications = query(sql, params);
    res.json({ data: applications });
  } catch (err) { next(err); }
});

// 投递统计
router.get('/stats', authenticate, (req, res, next) => {
  try {
    const userId = req.user.id;
    const total = get('SELECT COUNT(*) as count FROM applications WHERE user_id = ?', [userId])?.count || 0;
    const success = get("SELECT COUNT(*) as count FROM applications WHERE user_id = ? AND status = 'success'", [userId])?.count || 0;
    const pending = get("SELECT COUNT(*) as count FROM applications WHERE user_id = ? AND status IN ('pending', 'submitted', 'applying')", [userId])?.count || 0;
    const failed = get("SELECT COUNT(*) as count FROM applications WHERE user_id = ? AND status = 'failed'", [userId])?.count || 0;

    res.json({ data: { total, success, pending, failed } });
  } catch (err) { next(err); }
});

// 获取自动投递任务状态
router.get('/tasks', authenticate, (req, res) => {
  const tasks = getApplyTasks();
  res.json({ data: tasks });
});

// 获取平台投递步骤说明
router.get('/steps/:sourceId', authenticate, (req, res) => {
  const steps = getApplySteps(req.params.sourceId);
  if (!steps) return res.status(404).json({ code: 'NOT_FOUND', message: '不支持的平台' });
  res.json({ data: steps });
});

module.exports = router;
