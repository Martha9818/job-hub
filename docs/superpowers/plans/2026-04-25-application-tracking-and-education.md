# Application Tracking and Education Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build local applied-job tracking, remove duplicate detail actions, show applied badges in lists, and normalize education to "本科及以上".

**Architecture:** Add a small local-storage layer and hook for applied records. Pages consume the hook without needing a backend migration for this iteration. Server initialization normalizes education data so API responses and filters are consistent.

**Tech Stack:** React 18, Vite, localStorage, Express/sql.js, Node test runner.

---

### Task 1: Applied Jobs Storage

**Files:**
- Create: `client/src/hooks/appliedJobsStorage.js`
- Test: `client/src/hooks/appliedJobsStorage.test.js`

- [ ] **Step 1: Write failing tests**

Run: `node client/src/hooks/appliedJobsStorage.test.js`

Expected: FAIL because `appliedJobsStorage.js` does not exist.

- [ ] **Step 2: Implement storage helpers**

Create helpers: `loadAppliedJobs`, `saveAppliedJobs`, `markJobApplied`, `undoJobApplied`, and `isJobApplied`.

- [ ] **Step 3: Verify tests pass**

Run: `node client/src/hooks/appliedJobsStorage.test.js`

Expected: PASS.

### Task 2: Applied Jobs Hook and Pages

**Files:**
- Create: `client/src/hooks/useAppliedJobs.jsx`
- Modify: `client/src/pages/JobDetailPage.jsx`
- Modify: `client/src/pages/ApplicationsPage.jsx`
- Modify: `client/src/pages/JobsPage.jsx`
- Modify: `client/src/pages/CampusPage.jsx`
- Test: `client/src/pages/applicationTracking.integration.test.js`

- [ ] **Step 1: Write integration source checks**

Run: `node client/src/pages/applicationTracking.integration.test.js`

Expected: FAIL until pages import/use the applied jobs hook and detail actions are no longer duplicate external anchors.

- [ ] **Step 2: Implement hook and page wiring**

Use the hook in detail, list, campus, and applications pages.

- [ ] **Step 3: Verify tests pass**

Run: `node client/src/pages/applicationTracking.integration.test.js`

Expected: PASS.

### Task 3: Education Normalization

**Files:**
- Modify: `server/src/common/database.js`
- Modify: `server/src/jobs/supplemental-jobs.js`
- Modify: `client/src/pages/CampusPage.jsx`
- Test: `server/src/jobs/education-normalization.test.js`

- [ ] **Step 1: Write failing tests**

Run: `node server/src/jobs/education-normalization.test.js`

Expected: FAIL until all supplemental education options and migration update to "本科及以上".

- [ ] **Step 2: Normalize data and filter labels**

Set all generated/seeded job education to "本科及以上" and simplify campus education options.

- [ ] **Step 3: Verify tests pass**

Run: `node server/src/jobs/education-normalization.test.js`

Expected: PASS.

### Task 4: Full Verification

- [ ] Run `node client/src/hooks/appliedJobsStorage.test.js`.
- [ ] Run `node client/src/pages/applicationTracking.integration.test.js`.
- [ ] Run `node server/src/jobs/education-normalization.test.js`.
- [ ] Run `npm.cmd run build` from `client`.
- [ ] Use browser automation to mark and undo applied status on a job detail page.
