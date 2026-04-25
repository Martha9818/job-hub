const express = require('express');
const { query, get } = require('../common/database');
const { jobSearchSchema } = require('../common/validation');
const { optionalAuthenticate } = require('../auth/middleware');
const { parseProfileJson } = require('../resume/profile');
const { enrichJobsWithMatch, analyzeJobMatch } = require('./matching');
const { normalizeExternalUrl } = require('../common/url');

const router = express.Router();

function normalizeJobLink(job) {
  if (!job) return job;
  return {
    ...job,
    source_url: normalizeExternalUrl(job.source_url, { fallbackQuery: `${job.company || ''} ${job.title || ''}` }),
  };
}

function getResumeProfile(req, resumeId) {
  if (!req.user?.id) return null;
  const params = resumeId ? [resumeId, req.user.id] : [req.user.id];
  const sql = resumeId
    ? 'SELECT parsed_data FROM resumes WHERE id = ? AND user_id = ?'
    : 'SELECT parsed_data FROM resumes WHERE user_id = ? ORDER BY is_default DESC, created_at DESC LIMIT 1';
  const resume = get(sql, params);
  if (!resume?.parsed_data) return null;
  return parseProfileJson(resume.parsed_data);
}

// 手动触发数据迁移（管理员用）— 必须在 /:id 之前，用GET方便浏览器调用
router.get('/migrate', (req, res) => {
  try {
    const { query: q, run: r, saveDb: s } = require('../common/database');

    const urlMap = {
      '三一重工股份有限公司': 'https://sany.zhiye.com/campus?c=1',
      '大连机床集团': 'https://www.dmtg.com',
      '中联重科': 'https://wecruit.hotjob.cn/SU60a6449a2f9d2430fdc11a19/pb/custom.html?parentKey=campus',
      '富士康科技集团': 'https://hr.foxconn.com.cn/',
      '徐工集团': 'https://www.xcmg.com/aboutus/job_center.htm',
      '格力电器': 'https://zhaopin.greeyun.com/',
      '大族激光': 'https://app.mokahr.com/social-hiring/hanslaser',
      '中国中车': 'https://www.crrcgc.cc/g741.aspx',
      '海尔集团': 'https://maker.haier.net/',
      '潍柴动力': 'https://weichai.zhiye.com/campus/jobs',
      '比亚迪股份有限公司': 'https://job.byd.com/portal/mobile/school-home',
      '中国船舶集团': 'https://www.cssc.net.cn/column/col4487/index.html',
      '西门子中国': 'https://new.siemens.com/cn/zh/company/jobs.html',
      '美的集团': 'https://careers.midea.com/schoolOut/home',
      '立讯精密': 'https://www.luxshare-ict.com/joinus',
      '华为终端': 'https://career.huawei.com/reccampportal',
      '发那科机器人': 'https://www.fanuc.com.cn/joinus',
      '博世力士乐': 'https://www.boschrexroth.com/zh/cn/career',
      '蔚来汽车': 'https://campus.nio.com/',
      '中国一拖集团': 'https://www.yituo.com.cn',
      '小米汽车': 'https://hr.xiaomi.com/campus',
      '吉利汽车': 'https://job.geely.com/',
      '中国建筑集团': 'https://job.cscec.com',
      '大疆创新': 'https://we.dji.com/zh-CN/campus',
      '中国商飞': 'https://www.comac.cc/zpxx/zpxx.shtml',
      '大华股份': 'https://www.dahuatech.com/joinus/campus',
      '中国兵装集团': 'https://www.csgc.com.cn',
      '山推股份': 'https://www.shantui.com/join',
      '宁德时代': 'https://talent.catl.com/',
      '汇川技术': 'https://www.inovance.com/joinus',
      '先临三维': 'https://www.shining3d.com/joinus',
      '长城汽车': 'https://zhaopin.gwm.cn/',
      '费斯托中国': 'https://www.festo.com/cn/zh/career',
      '北方华创': 'https://www.naura.com/joinus/campus',
      '宝钢股份': 'https://www.baosteel.com/zhaopin',
      '理想汽车': 'https://www.lixiang.com/employ/campus.html',
      '采埃孚中国': 'https://www.zf.com/careers',
      '三花控股': 'https://www.sanhua.com/career',
      '海康威视': 'https://www.hikvision.com/cn/joinus',
      '正泰电器': 'https://www.chint.com/joinus',
      'ABB中国': 'https://new.abb.com/careers',
      'PTC中国': 'https://www.ptc.com/careers',
    };

    let urlUpdated = 0;
    for (const [company, url] of Object.entries(urlMap)) {
      r('UPDATE jobs SET source_url = ? WHERE company = ?', [url, company]);
      urlUpdated++;
    }

    // 扩展短描述
    const shortJobs = q("SELECT id, description, requirements, experience FROM jobs WHERE LENGTH(description) < 150");
    let descUpdated = 0;
    for (const job of shortJobs) {
      const isIntern = job.experience === '实习';
      const isFresh = job.experience === '应届生';

      const expandedDesc = job.description + '\n\n' +
        (isIntern || isFresh ?
          `${isIntern ? '实习' : '校招'}岗位说明：\n1. 公司将提供系统化的岗前培训和导师带教\n2. 具体工作内容将根据项目需求灵活安排\n3. 表现优异者可获得转正机会\n4. 提供行业领先的实践平台` :
          `岗位职责补充：\n1. 负责技术方案制定与评审\n2. 参与跨部门协作推动项目交付\n3. 持续优化产品和工艺\n4. 指导初级工程师`);

      const expandedReq = job.requirements + '\n\n' +
        (isIntern || isFresh ?
          `附加要求：\n1. 学习能力强，能短期内掌握岗位技能\n2. 团队协作精神和沟通表达能力\n3. 对机械行业有热情` :
          `附加要求：\n1. 项目管理和技术决策能力\n2. 跨部门沟通协调能力\n3. 快节奏环境下高效工作`);

      r('UPDATE jobs SET description = ?, requirements = ? WHERE id = ?', [expandedDesc, expandedReq, job.id]);
      descUpdated++;
    }

    s();

    res.json({
      message: '数据迁移完成',
      urls_updated: urlUpdated,
      descriptions_expanded: descUpdated,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 筛选选项 — 必须在 /:id 之前
router.get('/meta/filters', (req, res) => {
  const industries = query("SELECT DISTINCT industry FROM jobs WHERE industry IS NOT NULL ORDER BY industry").map(r => r.industry);
  const locations = query("SELECT DISTINCT location FROM jobs WHERE location IS NOT NULL ORDER BY location").map(r => r.location);
  const categories = query("SELECT DISTINCT category FROM jobs WHERE category IS NOT NULL ORDER BY category").map(r => r.category);
  const experiences = query("SELECT DISTINCT experience FROM jobs WHERE experience IS NOT NULL ORDER BY experience").map(r => r.experience);
  const educations = query("SELECT DISTINCT education FROM jobs WHERE education IS NOT NULL ORDER BY education").map(r => r.education);
  res.json({ data: { industries, locations, categories, experiences, educations } });
});

// 统计数据 — 必须在 /:id 之前
router.get('/meta/stats', (req, res) => {
  const totalJobs = get("SELECT COUNT(*) as count FROM jobs WHERE is_active = 1")?.count || 0;
  const totalCompanies = get("SELECT COUNT(DISTINCT company) as count FROM jobs WHERE is_active = 1")?.count || 0;
  const mechanicalJobs = get("SELECT COUNT(*) as count FROM jobs WHERE is_active = 1 AND industry LIKE '%机械%'")?.count || 0;
  const todayJobs = get("SELECT COUNT(*) as count FROM jobs WHERE is_active = 1")?.count || 0;
  res.json({ data: { totalJobs, totalCompanies, mechanicalJobs, todayJobs } });
});

// 搜索岗位
router.get('/', optionalAuthenticate, (req, res, next) => {
  try {
    const { keyword, location, category, industry, salary_min, salary_max, experience, education, nature, page = 1, page_size = 20, sort, match_mode = 'all', resume_id } = req.query;

    const conditions = ['j.is_active = 1'];
    const params = [];

    if (keyword) { conditions.push('(j.title LIKE ? OR j.company LIKE ? OR j.description LIKE ?)'); const kw = `%${keyword}%`; params.push(kw, kw, kw); }
    if (location) { conditions.push('j.location LIKE ?'); params.push(`%${location}%`); }
    if (category) { conditions.push('j.category = ?'); params.push(category); }
    if (industry) { conditions.push('j.industry LIKE ?'); params.push(`%${industry}%`); }
    if (salary_min) { conditions.push('(j.salary_max >= ? OR j.salary_max IS NULL)'); params.push(Number(salary_min)); }
    if (salary_max) { conditions.push('(j.salary_min <= ? OR j.salary_min IS NULL)'); params.push(Number(salary_max)); }
    if (experience) { conditions.push('j.experience LIKE ?'); params.push(`%${experience}%`); }
    if (education) { conditions.push('j.education LIKE ?'); params.push(`%${education}%`); }
    // 性质筛选：校招=应届生, 实习=实习, 社招=非应届非实习
    if (nature) {
      if (nature === '校招') { conditions.push("j.experience = '应届生'"); }
      else if (nature === '实习') { conditions.push("j.experience = '实习'"); }
      else if (nature === '社招') { conditions.push("j.experience NOT IN ('应届生', '实习')"); }
    }

    const whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    let orderClause = 'ORDER BY j.publish_date DESC, j.crawled_at DESC';
    if (sort === 'salary_high') orderClause = 'ORDER BY j.salary_max DESC, j.salary_min DESC';
    if (sort === 'salary_low') orderClause = 'ORDER BY j.salary_min ASC, j.salary_max ASC';

    const offset = (Number(page) - 1) * Number(page_size);
    const profile = getResumeProfile(req, resume_id);
    const shouldMatch = profile || match_mode !== 'all';
    const countResult = query(`SELECT COUNT(*) as total FROM jobs j ${whereClause}`, params);
    const rawTotal = countResult[0]?.total || 0;

    let jobs;
    let matchSummary = null;
    let total = rawTotal;

    if (shouldMatch) {
      const allJobs = query(
        `SELECT j.*, s.name as source_name FROM jobs j LEFT JOIN sources s ON j.source_id = s.id ${whereClause} ${orderClause} LIMIT 300`,
        params
      );
      const enriched = enrichJobsWithMatch(allJobs, profile || {}, match_mode);
      total = enriched.items.length;
      jobs = enriched.items.slice(offset, offset + Number(page_size));
      matchSummary = enriched.summary;
    } else {
      jobs = query(
        `SELECT j.*, s.name as source_name FROM jobs j LEFT JOIN sources s ON j.source_id = s.id ${whereClause} ${orderClause} LIMIT ? OFFSET ?`,
        [...params, Number(page_size), offset]
      );
    }

    res.json({
      data: jobs.map(normalizeJobLink),
      match_summary: matchSummary,
      pagination: { page: Number(page), page_size: Number(page_size), total, total_pages: Math.ceil(total / Number(page_size)) },
    });
  } catch (err) { next(err); }
});

// 岗位详情 — 必须在所有具体路由之后
router.get('/:id', optionalAuthenticate, (req, res, next) => {
  try {
    const job = get(`SELECT j.*, s.name as source_name, s.website as source_website FROM jobs j LEFT JOIN sources s ON j.source_id = s.id WHERE j.id = ?`, [req.params.id]);
    if (!job) return res.status(404).json({ code: 'NOT_FOUND', message: '岗位未找到' });
    const profile = getResumeProfile(req, req.query.resume_id);
    if (profile) job.match = analyzeJobMatch(job, profile);
    res.json({ data: normalizeJobLink(job) });
  } catch (err) { next(err); }
});

module.exports = router;
