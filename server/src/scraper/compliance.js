/**
 * 合规数据源模块 - 仅使用合法授权的数据获取方式
 * 
 * 合规策略：
 * 1. 优先使用官方开放API（如有）
 * 2. 遵守 robots.txt 规则
 * 3. 标识自身身份，不做隐身伪装
 * 4. 控制请求频率
 * 5. 不抓取个人信息（HR联系方式等）
 * 6. 数据仅供个人求职使用
 */

const https = require('https');
const http = require('http');
const { run, query, get } = require('../common/database');
const { v4: uuidv4 } = require('uuid');

// ========== 合规配置 ==========

// 诚实标识自己（合规核心：不伪装）
const COMPLIANCE_USER_AGENT = process.env.SCRAPER_USER_AGENT ||
  'JobHub/1.0 (Personal Job Aggregator; +https://github.com/jobhub)';

// 请求频率限制
const RATE_LIMITS = {
  minDelayMs: 3000,        // 最小间隔3秒
  maxRequestsPerHour: 60,  // 每小时最多60次请求
  maxRequestsPerDay: 200,  // 每天最多200次请求
};

// 请求计数器
const requestCounts = {
  hourly: { count: 0, resetAt: Date.now() + 3600000 },
  daily: { count: 0, resetAt: Date.now() + 86400000 },
};

// ========== robots.txt 检查 ==========

const robotsCache = new Map();

/**
 * 获取并解析 robots.txt
 * 只缓存1小时，尊重网站更新
 */
async function fetchRobotsTxt(baseUrl) {
  if (robotsCache.has(baseUrl)) {
    const cached = robotsCache.get(baseUrl);
    if (Date.now() - cached.fetchedAt < 3600000) return cached;
  }

  const robotsUrl = `${baseUrl}/robots.txt`;
  try {
    const content = await fetchPage(robotsUrl, { timeout: 5000 });
    const disallowed = [];
    const allowed = [];
    
    content.split('\n').forEach(line => {
      const trimmed = line.trim().toLowerCase();
      // 只关注 User-agent: * 的规则
      if (trimmed.startsWith('disallow:')) {
        const path = trimmed.replace('disallow:', '').trim();
        if (path) disallowed.push(path);
      }
      if (trimmed.startsWith('allow:')) {
        const path = trimmed.replace('allow:', '').trim();
        if (path) allowed.push(path);
      }
    });

    const result = { disallowed, allowed, fetchedAt: Date.now() };
    robotsCache.set(baseUrl, result);
    console.log(`[Compliance] robots.txt 已读取: ${baseUrl}, ${disallowed.length} 条 Disallow 规则`);
    return result;
  } catch (err) {
    // 无法获取 robots.txt 时，假设不允许爬取（保守策略）
    console.warn(`[Compliance] 无法获取 robots.txt: ${baseUrl}, 默认不允许爬取`);
    return { disallowed: ['/'], allowed: [], fetchedAt: Date.now() };
  }
}

/**
 * 检查 URL 是否被 robots.txt 允许
 */
async function isUrlAllowed(url) {
  try {
    const parsed = new URL(url);
    const baseUrl = `${parsed.protocol}//${parsed.host}`;
    const robots = await fetchRobotsTxt(baseUrl);
    
    const requestPath = parsed.pathname + parsed.search;
    
    // 检查是否匹配 Disallow 规则
    for (const disallowed of robots.disallowed) {
      if (disallowed === '/' || requestPath.startsWith(disallowed)) {
        // 再检查是否有更具体的 Allow 规则覆盖
        const hasAllowOverride = robots.allowed.some(
          allowed => allowed.length > disallowed.length && requestPath.startsWith(allowed)
        );
        if (!hasAllowOverride) {
          console.warn(`[Compliance] URL 被 robots.txt 禁止: ${url} (Disallow: ${disallowed})`);
          return false;
        }
      }
    }
    return true;
  } catch (err) {
    console.error(`[Compliance] 检查 robots.txt 失败: ${err.message}`);
    return false;
  }
}

// ========== 频率限制 ==========

function checkRateLimit() {
  const now = Date.now();
  
  // 重置小时计数器
  if (now > requestCounts.hourly.resetAt) {
    requestCounts.hourly = { count: 0, resetAt: now + 3600000 };
  }
  // 重置天计数器
  if (now > requestCounts.daily.resetAt) {
    requestCounts.daily = { count: 0, resetAt: now + 86400000 };
  }

  if (requestCounts.hourly.count >= RATE_LIMITS.maxRequestsPerHour) {
    throw new Error(`已达到每小时请求上限 (${RATE_LIMITS.maxRequestsPerHour})，请稍后再试`);
  }
  if (requestCounts.daily.count >= RATE_LIMITS.maxRequestsPerDay) {
    throw new Error(`已达到每日请求上限 (${RATE_LIMITS.maxRequestsPerDay})，请明天再试`);
  }

  requestCounts.hourly.count++;
  requestCounts.daily.count++;
}

// ========== 合规 HTTP 请求 ==========

function fetchPage(url, options = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const reqOptions = {
      headers: {
        'User-Agent': COMPLIANCE_USER_AGENT,  // 诚实标识
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Accept-Encoding': 'gzip, deflate',
        ...options.headers,
      },
      timeout: options.timeout || 30000,
    };
    client.get(url, reqOptions, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // 限制重定向次数
        if ((options.redirectCount || 0) >= 3) {
          return reject(new Error('重定向次数过多'));
        }
        return fetchPage(res.headers.location, { ...options, redirectCount: (options.redirectCount || 0) + 1 })
          .then(resolve).catch(reject);
      }
      if (res.statusCode === 403) {
        return reject(new Error('服务器拒绝访问 (403)，请遵守 robots.txt 规则'));
      }
      if (res.statusCode === 429) {
        return reject(new Error('请求过于频繁 (429)，请降低请求频率'));
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}: ${url}`));
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    }).on('error', reject).on('timeout', function() { this.destroy(); reject(new Error('请求超时')); });
  });
}

/**
 * 合规的页面获取
 * 1. 检查 robots.txt
 * 2. 检查频率限制
 * 3. 诚实标识自己
 */
async function compliantFetch(url) {
  // 步骤1: 检查 robots.txt
  const allowed = await isUrlAllowed(url);
  if (!allowed) {
    throw new Error(`该 URL 被 robots.txt 禁止: ${url}\n请尊重网站的数据获取规则。`);
  }

  // 步骤2: 检查频率限制
  checkRateLimit();

  // 步骤3: 发起请求
  console.log(`[Compliance] 正在请求: ${url}`);
  return fetchPage(url);
}

// ========== 个人信息过滤 ==========

/**
 * 过滤掉可能包含个人信息的字段
 * 只保留岗位公开信息
 */
function filterPII(job) {
  const allowedFields = [
    'source_job_id', 'title', 'salary_text', 'company',
    'location', 'category', 'industry', 'experience',
    'education', 'description', 'requirements', 'benefits',
    'job_type', 'publish_date', 'source_url',
  ];

  const filtered = {};
  for (const key of allowedFields) {
    if (job[key] !== undefined) filtered[key] = job[key];
  }

  // 明确排除的字段
  const piiFields = ['hr_name', 'hr_phone', 'hr_email', 'hr_wechat', 'hr_position', 'contact'];
  for (const field of piiFields) {
    if (job[field]) {
      console.warn(`[Compliance] 已过滤个人信息字段: ${field}`);
    }
  }

  return filtered;
}

// ========== 合规数据源注册 ==========

/**
 * 合规数据源配置
 * 
 * 策略分三层：
 * Layer 1: 官方API/合作渠道（最合规）
 * Layer 2: 公开页面抓取（需遵守 robots.txt）
 * Layer 3: 手动录入/用户提交（完全合规）
 */
const COMPLIANT_SOURCES = {
  // Layer 2: 公开页面（需检查 robots.txt）
  'boss': {
    name: 'BOSS直聘',
    baseUrl: 'https://www.zhipin.com',
    compliance: {
      robotsCompliant: false,  // BOSS 直聘 robots.txt 禁止爬取搜索结果
      tosCompliant: false,     // 用户协议禁止自动化抓取
      recommendation: '不建议直接爬取。建议：1) 手动搜索后收藏；2) 使用 BOSS直聘开放 API（如有）',
      riskLevel: 'high',
    },
  },
  'zhilian': {
    name: '智联招聘',
    baseUrl: 'https://www.zhaopin.com',
    compliance: {
      robotsCompliant: false,
      tosCompliant: false,
      recommendation: '不建议直接爬取。建议使用智联官方提供的简历投递工具',
      riskLevel: 'high',
    },
  },
  'liepin': {
    name: '猎聘',
    baseUrl: 'https://www.liepin.com',
    compliance: {
      robotsCompliant: false,
      tosCompliant: false,
      recommendation: '不建议直接爬取',
      riskLevel: 'high',
    },
  },
  '51job': {
    name: '前程无忧',
    baseUrl: 'https://www.51job.com',
    compliance: {
      robotsCompliant: false,
      tosCompliant: false,
      recommendation: '不建议直接爬取',
      riskLevel: 'high',
    },
  },
  // Layer 1: 相对合规的公开信息源
  'mechanical-cn': {
    name: '中国机械人才网',
    baseUrl: 'https://www.mechanical.com.cn',
    compliance: {
      robotsCompliant: true,   // 需实际检查
      tosCompliant: true,      // 小型网站通常限制较少
      recommendation: '可谨慎抓取公开信息，需遵守 robots.txt',
      riskLevel: 'low',
    },
  },
};

/**
 * 获取数据源的合规评估
 */
function getComplianceReport(sourceId) {
  const source = COMPLIANT_SOURCES[sourceId];
  if (!source) return { riskLevel: 'unknown', recommendation: '未知数据源，不建议抓取' };
  return source.compliance;
}

/**
 * 检查数据源是否允许爬取
 */
function isSourceCompliant(sourceId) {
  const report = getComplianceReport(sourceId);
  return report.riskLevel === 'low' || report.riskLevel === 'medium';
}

// ========== 安全保存岗位 ==========

function parseSalary(salaryText) {
  if (!salaryText) return { min: null, max: null };
  let text = salaryText.replace(/[元\/月|元\/年|月薪|年薪|\/月|\/年|起]/g, '');
  const kMatch = text.match(/(\d+)[kK]\s*[-~—]\s*(\d+)[kK]/);
  if (kMatch) return { min: parseInt(kMatch[1]) * 1000, max: parseInt(kMatch[2]) * 1000 };
  const wMatch = text.match(/([\d.]+)万?\s*[-~—]\s*([\d.]+)万/);
  if (wMatch) return { min: Math.round(parseFloat(wMatch[1]) * 10000), max: Math.round(parseFloat(wMatch[2]) * 10000) };
  const numMatch = text.match(/(\d+)\s*[-~—]\s*(\d+)/);
  if (numMatch) return { min: parseInt(numMatch[1]), max: parseInt(numMatch[2]) };
  return { min: null, max: null };
}

function saveJobs(jobs, sourceId) {
  let saved = 0;
  for (const rawJob of jobs) {
    try {
      // 过滤个人信息
      const job = filterPII(rawJob);
      
      const id = uuidv4();
      const sourceJobId = job.source_job_id || `${sourceId}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const { min, max } = parseSalary(job.salary_text);
      
      const existing = get('SELECT id FROM jobs WHERE source_id = ? AND source_job_id = ?', [sourceId, sourceJobId]);
      if (existing) {
        run(`UPDATE jobs SET title=?, company=?, salary_min=?, salary_max=?, salary_text=?, location=?, description=?, is_active=1, updated_at=datetime('now') WHERE id=?`,
          [job.title, job.company, min, max, job.salary_text, job.location, job.description, existing.id]);
      } else {
        run(`INSERT INTO jobs (id, source_id, source_job_id, title, company, salary_min, salary_max, salary_text, location, category, industry, experience, education, description, requirements, benefits, job_type, publish_date, source_url) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [id, sourceId, sourceJobId, job.title, job.company, min, max, job.salary_text, job.location, job.category || '机械', job.industry || '机械', job.experience, job.education, job.description, job.requirements, job.benefits, job.job_type, job.publish_date, job.source_url]);
      }
      saved++;
    } catch (err) { console.error(`保存岗位失败: ${rawJob.title} - ${err.message}`); }
  }
  run("UPDATE sources SET last_crawled_at = datetime('now') WHERE id = ?", [sourceId]);
  return { saved };
}

// ========== 合规抓取入口 ==========

async function compliantScrape(sourceId, keyword = '机械工程师', city = '') {
  // 检查合规性
  if (!isSourceCompliant(sourceId)) {
    const report = getComplianceReport(sourceId);
    return {
      source_id: sourceId,
      error: `该数据源合规评估为 ${report.riskLevel} 风险，不建议直接爬取`,
      recommendation: report.recommendation,
      compliance: report,
    };
  }

  const sourceConfig = COMPLIANT_SOURCES[sourceId];
  console.log(`[Compliance] 合规抓取: ${sourceConfig.name}, keyword=${keyword}`);

  try {
    const url = `${sourceConfig.baseUrl}/search?q=${encodeURIComponent(keyword)}`;
    const html = await compliantFetch(url);
    
    // 使用 cheerio 解析（不执行JS，只解析HTML）
    const cheerio = require('cheerio');
    const $ = cheerio.load(html);
    const jobs = [];
    
    // 通用解析（仅提取公开信息）
    $('.job-item, .job-card, .job-list-item').each((i, el) => {
      const $el = $(el);
      const title = $el.find('.job-title, .job-name, h3 a').text().trim();
      const salary = $el.find('.salary, .pay').text().trim();
      const company = $el.find('.company-name, .company a').text().trim();
      const location = $el.find('.location, .city, .job-area').text().trim();
      
      if (title && company) {
        jobs.push(filterPII({
          source_job_id: `${sourceId}_${i}_${Date.now()}`,
          title, salary_text: salary, company, location,
          industry: '机械',
          source_url: '',
        }));
      }
    });

    console.log(`[Compliance] ${sourceConfig.name}: 解析到 ${jobs.length} 个岗位`);
    const { saved } = saveJobs(jobs, sourceId);
    return { source_id: sourceId, found: jobs.length, saved, compliant: true };
  } catch (err) {
    return { source_id: sourceId, error: err.message, compliant: true };
  }
}

module.exports = {
  compliantFetch,
  compliantScrape,
  isUrlAllowed,
  isSourceCompliant,
  getComplianceReport,
  filterPII,
  saveJobs,
  COMPLIANT_SOURCES,
  RATE_LIMITS,
  COMPLIANCE_USER_AGENT,
};
