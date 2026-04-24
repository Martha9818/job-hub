const express = require('express');
const { query, get } = require('../common/database');
const { jobSearchSchema } = require('../common/validation');

const router = express.Router();

// 搜索岗位
router.get('/', (req, res, next) => {
  try {
    const { keyword, location, category, industry, salary_min, salary_max, experience, education, page = 1, page_size = 20, sort } = req.query;

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

    const whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    let orderClause = 'ORDER BY j.publish_date DESC, j.crawled_at DESC';
    if (sort === 'salary_high') orderClause = 'ORDER BY j.salary_max DESC, j.salary_min DESC';
    if (sort === 'salary_low') orderClause = 'ORDER BY j.salary_min ASC, j.salary_max ASC';

    const countResult = query(`SELECT COUNT(*) as total FROM jobs j ${whereClause}`, params);
    const total = countResult[0]?.total || 0;

    const offset = (Number(page) - 1) * Number(page_size);
    const jobs = query(
      `SELECT j.*, s.name as source_name FROM jobs j LEFT JOIN sources s ON j.source_id = s.id ${whereClause} ${orderClause} LIMIT ? OFFSET ?`,
      [...params, Number(page_size), offset]
    );

    res.json({
      data: jobs,
      pagination: { page: Number(page), page_size: Number(page_size), total, total_pages: Math.ceil(total / Number(page_size)) },
    });
  } catch (err) { next(err); }
});

// 岗位详情
router.get('/:id', (req, res, next) => {
  try {
    const job = get(`SELECT j.*, s.name as source_name, s.website as source_website FROM jobs j LEFT JOIN sources s ON j.source_id = s.id WHERE j.id = ?`, [req.params.id]);
    if (!job) return res.status(404).json({ code: 'NOT_FOUND', message: '岗位未找到' });
    res.json({ data: job });
  } catch (err) { next(err); }
});

// 筛选选项
router.get('/meta/filters', (req, res) => {
  const industries = query("SELECT DISTINCT industry FROM jobs WHERE industry IS NOT NULL ORDER BY industry").map(r => r.industry);
  const locations = query("SELECT DISTINCT location FROM jobs WHERE location IS NOT NULL ORDER BY location").map(r => r.location);
  const categories = query("SELECT DISTINCT category FROM jobs WHERE category IS NOT NULL ORDER BY category").map(r => r.category);
  const experiences = query("SELECT DISTINCT experience FROM jobs WHERE experience IS NOT NULL ORDER BY experience").map(r => r.experience);
  const educations = query("SELECT DISTINCT education FROM jobs WHERE education IS NOT NULL ORDER BY education").map(r => r.education);
  res.json({ data: { industries, locations, categories, experiences, educations } });
});

// 统计数据
router.get('/meta/stats', (req, res) => {
  const totalJobs = get("SELECT COUNT(*) as count FROM jobs WHERE is_active = 1")?.count || 0;
  const totalCompanies = get("SELECT COUNT(DISTINCT company) as count FROM jobs WHERE is_active = 1")?.count || 0;
  const mechanicalJobs = get("SELECT COUNT(*) as count FROM jobs WHERE is_active = 1 AND industry LIKE '%机械%'")?.count || 0;
  const todayJobs = get("SELECT COUNT(*) as count FROM jobs WHERE is_active = 1")?.count || 0;
  res.json({ data: { totalJobs, totalCompanies, mechanicalJobs, todayJobs } });
});

module.exports = router;
