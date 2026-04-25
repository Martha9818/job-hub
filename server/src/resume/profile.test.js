const assert = require('node:assert/strict');
const test = require('node:test');
const {
  buildProfileFromText,
  normalizeProfile,
  profileToSearchText,
} = require('./profile');

test('buildProfileFromText extracts mechanical skills, target roles, cities and education', () => {
  const profile = buildProfileFromText(`
    本科 机械设计制造及其自动化，目标城市上海、苏州。
    熟练 SolidWorks、AutoCAD、UG，了解液压系统和非标自动化设备。
    求职方向：机械设计工程师、结构设计。
  `);

  assert.equal(profile.education, '本科');
  assert.deepEqual(profile.target_cities, ['上海', '苏州']);
  assert.ok(profile.skills.includes('SolidWorks'));
  assert.ok(profile.skills.includes('AutoCAD'));
  assert.ok(profile.skills.includes('UG'));
  assert.ok(profile.directions.includes('机械设计'));
  assert.ok(profile.directions.includes('结构设计'));
});

test('normalizeProfile accepts comma separated strings and removes duplicates', () => {
  const profile = normalizeProfile({
    name: ' 张三 ',
    years: '2',
    education: '本科',
    target_cities: '上海, 上海,苏州',
    skills: ['SolidWorks', 'solidworks', 'AutoCAD'],
    directions: '机械设计，自动化',
  });

  assert.equal(profile.name, '张三');
  assert.equal(profile.years, 2);
  assert.deepEqual(profile.target_cities, ['上海', '苏州']);
  assert.deepEqual(profile.skills, ['SolidWorks', 'AutoCAD']);
  assert.deepEqual(profile.directions, ['机械设计', '自动化']);
});

test('profileToSearchText combines useful fields for matching', () => {
  const text = profileToSearchText({
    education: '本科',
    target_cities: ['上海'],
    skills: ['SolidWorks'],
    directions: ['机械设计'],
  });

  assert.match(text, /本科/);
  assert.match(text, /上海/);
  assert.match(text, /SolidWorks/);
  assert.match(text, /机械设计/);
});
