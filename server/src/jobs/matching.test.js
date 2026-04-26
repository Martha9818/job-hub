const assert = require('node:assert/strict');
const test = require('node:test');
const {
  analyzeJobMatch,
  enrichJobsWithMatch,
} = require('./matching');

const profile = {
  education: '本科',
  years: 1,
  target_cities: ['上海'],
  skills: ['SolidWorks', 'AutoCAD'],
  directions: ['机械设计', '结构设计'],
};

test('analyzeJobMatch rewards profile skill and city matches', () => {
  const result = analyzeJobMatch({
    title: '机械设计工程师',
    company: '三一重工',
    location: '上海',
    category: '机械设计',
    education: '本科及以上',
    experience: '应届生',
    salary_text: '10K-16K',
    description: '负责结构设计和 3D 建模',
    requirements: '熟练使用 SolidWorks 和 AutoCAD',
  }, profile);

  assert.equal(result.city.matched, true);
  assert.ok(result.skills.matched.includes('SolidWorks'));
  assert.ok(result.directions.matched.includes('机械设计'));
  assert.ok(result.score >= 75);
  assert.equal(result.quality.level, 'high');
});

test('analyzeJobMatch keeps direction plus education only matches below 40 without skills', () => {
  const result = analyzeJobMatch({
    title: '机械设计工程师',
    company: '某设备公司',
    location: '杭州',
    category: '机械设计',
    education: '本科及以上',
    experience: '应届生',
    salary_text: '10K-15K',
    description: '负责机械设计方案评审和结构设计文档整理',
    requirements: '机械相关专业，本科及以上',
  }, profile);

  assert.equal(result.skills.matched.length, 0);
  assert.ok(result.directions.matched.includes('机械设计'));
  assert.equal(result.education.matched, true);
  assert.ok(result.score <= 40);
  assert.equal(result.level, 'low');
});

test('analyzeJobMatch does not allow a single skill match to reach high score without enough support', () => {
  const result = analyzeJobMatch({
    title: '机械设计工程师',
    company: '某设备公司',
    location: '杭州',
    category: '机械设计',
    education: '本科及以上',
    experience: '应届生',
    salary_text: '11K-16K',
    description: '负责机械结构设计与图纸输出',
    requirements: '熟练使用 SolidWorks，机械专业本科及以上',
  }, profile);

  assert.deepEqual(result.skills.matched, ['SolidWorks']);
  assert.ok(result.score >= 55);
  assert.ok(result.score < 75);
  assert.equal(result.level, 'medium');
});

test('analyzeJobMatch flags incomplete and risky jobs', () => {
  const result = analyzeJobMatch({
    title: '高薪机械学徒',
    company: '',
    location: '',
    category: '',
    education: '',
    experience: '',
    salary_text: '',
    description: '培训上岗，名额有限',
    requirements: '',
  }, profile);

  assert.equal(result.quality.level, 'low');
  assert.ok(result.risks.length > 0);
  assert.ok(result.score < 60);
});

test('enrichJobsWithMatch marks duplicate jobs and supports compact mode filtering', () => {
  const jobs = [
    { id: '1', title: '机械设计工程师', company: '三一重工', location: '上海', salary_text: '10K-16K', description: 'SolidWorks', requirements: 'AutoCAD' },
    { id: '2', title: '机械设计工程师', company: '三一重工', location: '上海', salary_text: '10K-16K', description: 'SolidWorks', requirements: 'AutoCAD' },
    { id: '3', title: '电话销售', company: '', location: '', salary_text: '', description: '培训', requirements: '' },
  ];

  const smart = enrichJobsWithMatch(jobs, profile, 'smart');
  assert.equal(smart.items.some(job => job.match.duplicate.is_duplicate), true);
  assert.equal(smart.summary.duplicates, 1);

  const compact = enrichJobsWithMatch(jobs, profile, 'compact');
  assert.equal(compact.items.length, 1);
  assert.equal(compact.summary.hidden, 2);
});
