/**
 * 招聘信息爬虫核心模块（适配 sql.js）
 */

const { run, query, get } = require('../common/database');
const { v4: uuidv4 } = require('uuid');
const cheerio = require('cheerio');
const https = require('https');
const http = require('http');
const { normalizeExternalUrl } = require('../common/url');

const USER_AGENT = process.env.SCRAPER_USER_AGENT || 
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const DELAY_MS = parseInt(process.env.SCRAPER_DELAY_MS) || 2000;

function fetchPage(url, options = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const reqOptions = {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'zh-CN,zh;q=0.9', ...options.headers },
      timeout: options.timeout || 30000,
    };
    client.get(url, reqOptions, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchPage(res.headers.location, options).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}: ${url}`));
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    }).on('error', reject).on('timeout', function() { this.destroy(); reject(new Error('Request timeout')); });
  });
}

function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms + Math.random() * 500)); }

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
  for (const job of jobs) {
    try {
      const id = uuidv4();
      const sourceJobId = job.source_job_id || `${sourceId}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const { min, max } = parseSalary(job.salary_text);
      // 检查是否已存在
      const existing = get('SELECT id FROM jobs WHERE source_id = ? AND source_job_id = ?', [sourceId, sourceJobId]);
      if (existing) {
        run(`UPDATE jobs SET title=?, company=?, salary_min=?, salary_max=?, salary_text=?, location=?, description=?, is_active=1, updated_at=datetime('now') WHERE id=?`,
          [job.title, job.company, min, max, job.salary_text, job.location, job.description, existing.id]);
      } else {
        run(`INSERT INTO jobs (id, source_id, source_job_id, title, company, salary_min, salary_max, salary_text, location, category, industry, experience, education, description, requirements, benefits, job_type, publish_date, source_url) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [id, sourceId, sourceJobId, job.title, job.company, min, max, job.salary_text, job.location, job.category || '机械', job.industry || '机械', job.experience, job.education, job.description, job.requirements, job.benefits, job.job_type, job.publish_date, job.source_url]);
      }
      saved++;
    } catch (err) { console.error(`保存岗位失败: ${job.title} - ${err.message}`); }
  }
  run("UPDATE sources SET last_crawled_at = datetime('now') WHERE id = ?", [sourceId]);
  return { saved };
}

async function scrapeGeneric(sourceConfig, keyword = '机械') {
  const { id: sourceId, name, website, config } = sourceConfig;
  let parsedConfig = {};
  try { parsedConfig = JSON.parse(config || '{}'); } catch(e) {}
  console.log(`[Scraper] 开始爬取 ${name}: keyword=${keyword}`);
  try {
    const url = `${website}${parsedConfig.searchPath || ''}?${parsedConfig.queryParam || 'q'}=${encodeURIComponent(keyword)}`;
    const html = await fetchPage(url);
    const $ = cheerio.load(html);
    const jobs = [];
    const sels = parsedConfig.selectors || { jobCard: '.job-item, .job-card', title: '.job-title, h3 a', salary: '.salary, .pay', company: '.company-name, .company a', location: '.location, .city', link: 'a[href*="job"]' };
    $(sels.jobCard).each((i, el) => {
      const $el = $(el);
      const title = $el.find(sels.title).text().trim();
      const salary = $el.find(sels.salary).text().trim();
      const company = $el.find(sels.company).text().trim();
      const location = $el.find(sels.location).text().trim();
      const link = $el.find(sels.link).attr('href') || '';
      if (title && company) {
        jobs.push({ source_job_id: `${sourceId}_${i}_${Date.now()}`, title, company, salary_text: salary, location, source_url: normalizeExternalUrl(link, { baseUrl: website, fallbackQuery: `${company} ${title}` }), industry: '机械' });
      }
    });
    console.log(`[Scraper] ${name}: 解析到 ${jobs.length} 个岗位`);
    return jobs;
  } catch (err) {
    console.error(`[Scraper] ${name}爬取失败: ${err.message}`);
    return [];
  }
}

async function runScraper(sourceId = null, keyword = '机械', industry = '机械') {
  let sources;
  if (sourceId) {
    const s = get('SELECT * FROM sources WHERE id = ? AND is_active = 1', [sourceId]);
    sources = s ? [s] : [];
  } else {
    sources = query('SELECT * FROM sources WHERE is_active = 1');
  }
  const results = [];
  for (const source of sources) {
    try {
      const jobs = await scrapeGeneric(source, keyword);
      if (jobs.length > 0) { const { saved } = saveJobs(jobs, source.id); results.push({ source: source.name, found: jobs.length, saved }); }
      else { results.push({ source: source.name, found: 0, saved: 0, note: '可能需要 Playwright 支持' }); }
      await delay(DELAY_MS);
    } catch (err) { results.push({ source: source.name, error: err.message }); }
  }
  return results;
}

module.exports = { fetchPage, delay, saveJobs, parseSalary, scrapeGeneric, runScraper };
