const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const databaseSource = fs.readFileSync(path.join(__dirname, '..', 'common', 'database.js'), 'utf8');
const supplementalSource = fs.readFileSync(path.join(__dirname, 'supplemental-jobs.js'), 'utf8');
const campusSource = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'client', 'src', 'pages', 'CampusPage.jsx'), 'utf8');

test('database initialization normalizes all persisted job education values', () => {
  assert.match(databaseSource, /UPDATE jobs SET education = '本科及以上' WHERE education IS NOT NULL/);
});

test('supplemental jobs only generate 本科及以上 education values', () => {
  assert.match(supplementalSource, /const EDUCATIONS = \['本科及以上'\]/);
  assert.equal(supplementalSource.includes('大专及以上'), false);
  assert.equal(supplementalSource.includes('硕士及以上'), false);
});

test('campus education filter is simplified to 不限 and 本科及以上', () => {
  assert.match(campusSource, /const EDU_OPTIONS = \['不限', '本科及以上'\]/);
  assert.equal(campusSource.includes("'大专'"), false);
  assert.equal(campusSource.includes("'硕士'"), false);
  assert.equal(campusSource.includes("'博士'"), false);
});
