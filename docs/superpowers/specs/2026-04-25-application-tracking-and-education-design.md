# Application Tracking and Education Design

## Goal

Remove duplicate external actions on the job detail page, add a lightweight local application record flow, surface applied status in job lists, and normalize job education requirements to "本科及以上".

## User-Approved Behavior

- Job detail has two distinct actions: open the original recruiting page and mark the job as applied.
- Marking a job as applied stores a local browser record first, with a future path to backend/account sync.
- After marking, the detail page shows "已投递" and an undo action.
- The applications page shows locally marked jobs with title, company, city, salary, applied time, and status.
- Job list and campus list rows/cards show an "已投递" badge for already marked jobs.
- Education filters and job education display should use "本科及以上" instead of split degree options.

## Design

- Add a focused local-storage utility for applied job records.
- Add a React hook that exposes applied records, `markApplied`, `undoApplied`, and `isApplied`.
- Update the job detail page to open the source page with the primary external action and use the local applied hook for status tracking.
- Update list pages to show the applied badge next to existing metadata.
- Update the applications page to merge local records with existing API records so the current page keeps working while local marks appear immediately.
- Normalize seeded and supplemental job education data at initialization.

## Verification

- Unit-style Node tests cover local record creation, idempotency, undo, and source-code integration checks.
- Build must pass with `npm run build`.
- Browser verification should mark a production/local job as applied, confirm the applications page entry, undo, and confirm the state clears.
