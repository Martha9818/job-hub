# Resume Profile and Job Quality Design

## Goal

Add a lightweight resume profile and intelligent job filtering loop so JobHub can use a user's resume tags to rank jobs, explain recommendations, and reduce duplicate or low-quality listings.

## Scope

This version does not depend on an external AI API. It uses rule-based parsing from pasted resume text, plus editable user fields, to create a resume profile. The profile is then used by fixed matching rules in the job list and job detail pages.

## User Flow

1. A user uploads or selects a resume on the resume page.
2. The user can paste resume text or key experience notes and click "解析到画像".
3. The system extracts education, target cities, skills, and target directions when recognizable.
4. The user edits the profile with a form and tag-style comma-separated fields.
5. The user saves the profile.
6. The job list defaults to smart sorting and shows compact match labels.
7. The user can switch between full list, smart sorting, and compact recommendation modes.
8. The job detail page shows a fuller breakdown of skills, direction, city, education, quality, duplicate, and risk signals.

## Functional Requirements

- Resume profiles store name, education, years of experience, target cities, minimum salary, skills, target directions, and notes.
- Resume profiles are saved in the existing `resumes.parsed_data` JSON field.
- Rule parsing recognizes common mechanical industry skills, tools, target cities, education levels, and target directions.
- Users can manually edit all profile fields after parsing.
- Job matching returns a numeric score, a high/medium/low level, short reasons, detailed dimension matches, quality completeness, duplicate status, and risk words.
- Job list modes:
  - Full list: keep the original result set and show match hints when available.
  - Smart sorting: sort higher quality, higher match, non-duplicate jobs first.
  - Compact recommendation: hide obvious duplicates, low-quality jobs, and very low match jobs.
- The default job list mode is smart sorting.
- The job detail page shows detailed explanation only when a logged-in user has a saved resume profile.

## Non-Goals

- No AI resume parsing in this release.
- No PDF/DOCX text extraction in this release.
- No user-configurable matching weights in this release.
- No permanent changes to job records for match scores; matching is computed at request time.

## Acceptance Criteria

- A logged-in user can save a resume profile from the resume page.
- Pasted resume text containing known mechanical skills and cities produces useful draft tags.
- `/api/jobs?match_mode=smart` returns jobs with `match` metadata for authenticated users with a profile.
- `/api/jobs?match_mode=compact` hides duplicates, low-quality jobs, and very low match jobs.
- Job cards show short match labels without making the list hard to scan.
- Job details show a dimension-by-dimension explanation.
- Existing search, filter, favorite, resume upload, and application flows remain usable.
