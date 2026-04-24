/**
 * Playwright Stealth 爬虫脚本 - 招聘信息抓取
 * 
 * 用法: node scraper-stealth.js --source boss --keyword "机械工程师" --city "上海"
 * 
 * 支持: BOSS直聘、智联招聘、前程无忧、猎聘
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// 隐身脚本 - 隐藏自动化特征
const stealthScript = `
  Object.defineProperty(navigator, 'webdriver', { get: () => false });
  Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
  Object.defineProperty(navigator, 'languages', { get: () => ['zh-CN', 'zh', 'en'] });
  window.chrome = { runtime: {} };
  Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
`;

// 数据源配置
const SOURCES = {
  boss: {
    name: 'BOSS直聘',
    searchUrl: (keyword, city) => `https://www.zhipin.com/web/geek/job?query=${encodeURIComponent(keyword)}&city=${encodeURIComponent(city || '全国')}`,
    selectors: {
      jobCard: '.job-list-wrapper .job-card-wrapper',
      title: '.job-name',
      salary: '.salary',
      company: '.company-name a',
      location: '.job-area',
      tags: '.tag-list li',
      link: '.job-name a',
    },
  },
  zhilian: {
    name: '智联招聘',
    searchUrl: (keyword, city) => `https://sou.zhaopin.com/?jl=${encodeURIComponent(city || '')}&kw=${encodeURIComponent(keyword)}`,
    selectors: {
      jobCard: '.joblist-box__item',
      title: '.iteminfo__line1__jobname__name',
      salary: '.iteminfo__line1__jobname__salary',
      company: '.iteminfo__line1__compname__name',
      location: '.iteminfo__line2__jobdesc__demand',
      tags: '',
      link: 'a',
    },
  },
  liepin: {
    name: '猎聘',
    searchUrl: (keyword, city) => `https://www.liepin.com/zhaopin/?key=${encodeURIComponent(keyword)}&city=${encodeURIComponent(city || '')}`,
    selectors: {
      jobCard: '.job-list-item',
      title: '.job-title',
      salary: '.job-salary',
      company: '.company-name',
      location: '.job-area',
      tags: '',
      link: '.job-title a',
    },
  },
};

async function scrape(sourceKey, keyword, city, options = {}) {
  const source = SOURCES[sourceKey];
  if (!source) {
    console.error(`未知数据源: ${sourceKey}`);
    console.log(`支持的数据源: ${Object.keys(SOURCES).join(', ')}`);
    process.exit(1);
  }

  const url = source.searchUrl(keyword, city);
  console.log(`[Scraper] 开始爬取 ${source.name}: ${url}`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
    locale: 'zh-CN',
  });

  // 注入隐身脚本
  await context.addInitScript(stealthScript);

  const page = await context.newPage();

  try {
    // 隐藏图片加载以加速
    await page.route('**/*.{png,jpg,jpeg,gif,webp,svg,woff,woff2}', route => route.abort());

    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    // 等待页面加载
    await page.waitForTimeout(3000 + Math.random() * 2000);

    // 尝试滚动加载更多
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollBy(0, 800));
      await page.waitForTimeout(1000);
    }

    const jobs = await page.evaluate((sels) => {
      const results = [];
      const cards = document.querySelectorAll(sels.jobCard);
      cards.forEach((card, i) => {
        const title = card.querySelector(sels.title)?.textContent?.trim() || '';
        const salary = card.querySelector(sels.salary)?.textContent?.trim() || '';
        const company = card.querySelector(sels.company)?.textContent?.trim() || '';
        const location = card.querySelector(sels.location)?.textContent?.trim() || '';
        const link = card.querySelector(sels.link)?.getAttribute('href') || '';

        if (title && company) {
          results.push({
            source_job_id: `boss_${i}_${Date.now()}`,
            title,
            salary_text: salary,
            company,
            location,
            industry: '机械',
            source_url: link ? (link.startsWith('http') ? link : `https://www.zhipin.com${link}`) : '',
          });
        }
      });
      return results;
    }, source.selectors);

    console.log(`[Scraper] ${source.name}: 解析到 ${jobs.length} 个岗位`);

    // 保存结果
    const outputDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    const outputFile = path.join(outputDir, `${sourceKey}_${Date.now()}.json`);
    fs.writeFileSync(outputFile, JSON.stringify(jobs, null, 2), 'utf-8');
    console.log(`[Scraper] 结果已保存到: ${outputFile}`);

    // 同时输出到 stdout 供后端读取
    console.log('---JSON_OUTPUT---');
    console.log(JSON.stringify(jobs));

    return jobs;
  } catch (err) {
    console.error(`[Scraper] 爬取失败: ${err.message}`);
    
    // 保存截图用于调试
    try {
      const screenshotDir = path.join(__dirname, '..', 'data', 'screenshots');
      if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
      await page.screenshot({ path: path.join(screenshotDir, `${sourceKey}_error_${Date.now()}.png`) });
    } catch {}
    
    return [];
  } finally {
    await browser.close();
  }
}

// 命令行入口
const args = process.argv.slice(2);
const params = {};
args.forEach(arg => {
  const [key, ...vals] = arg.replace(/^--/, '').split('=');
  params[key] = vals.join('=') || true;
});

if (require.main === module) {
  const source = params.source || 'boss';
  const keyword = params.keyword || '机械工程师';
  const city = params.city || '';
  scrape(source, keyword, city);
}

module.exports = { scrape, SOURCES };
