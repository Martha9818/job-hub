const assert = require('node:assert/strict');
const test = require('node:test');

const {
  PRESET_COMPANY_ALIASES,
  buildPresetSearchCondition,
  jobMatchesPreset,
} = require('./presets');

test('state preset includes key state-owned company aliases', () => {
  assert.ok(PRESET_COMPANY_ALIASES.state.includes('三一'));
  assert.ok(PRESET_COMPANY_ALIASES.state.includes('中国中车'));
  assert.ok(PRESET_COMPANY_ALIASES.state.includes('潍柴'));
});

test('tech preset includes key large-company aliases', () => {
  assert.ok(PRESET_COMPANY_ALIASES.tech.includes('华为'));
  assert.ok(PRESET_COMPANY_ALIASES.tech.includes('大疆'));
  assert.ok(PRESET_COMPANY_ALIASES.tech.includes('宁德时代'));
});

test('buildPresetSearchCondition expands aliases into OR LIKE clauses', () => {
  const condition = buildPresetSearchCondition('state');

  assert.ok(condition);
  assert.match(condition.sql, /\(j\.company LIKE \? OR j\.title LIKE \? OR j\.description LIKE \?\)/);
  assert.equal(condition.params.length, PRESET_COMPANY_ALIASES.state.length * 3);
});

test('jobMatchesPreset matches company and title text by alias', () => {
  assert.equal(jobMatchesPreset({ company: '中国中车', title: '机械设计工程师', description: '' }, 'state'), true);
  assert.equal(jobMatchesPreset({ company: '某制造企业', title: '大疆飞控结构设计工程师', description: '' }, 'tech'), true);
  assert.equal(jobMatchesPreset({ company: '普通机械厂', title: '设备工程师', description: '' }, 'tech'), false);
});
