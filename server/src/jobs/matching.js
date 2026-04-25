const { profileToSearchText } = require('../resume/profile');

const RISK_WORDS = ['培训', '高薪', '名额有限', '急聘', '无需经验', '包过', '收费', '押金'];
const REQUIRED_FIELDS = ['title', 'company', 'location', 'salary_text', 'description', 'requirements'];

function includesAny(text, words = []) {
  const lower = String(text || '').toLowerCase();
  return words.filter(word => lower.includes(String(word).toLowerCase()));
}

function buildJobText(job) {
  return [
    job.title,
    job.company,
    job.location,
    job.category,
    job.industry,
    job.education,
    job.experience,
    job.description,
    job.requirements,
    job.benefits,
  ].filter(Boolean).join(' ');
}

function getDedupKey(job) {
  return [job.company, job.title, job.location].map(v => String(v || '').trim().toLowerCase()).join('|');
}

function getCompleteness(job) {
  const present = REQUIRED_FIELDS.filter(field => String(job[field] || '').trim()).length;
  const score = Math.round((present / REQUIRED_FIELDS.length) * 100);
  return {
    score,
    missing: REQUIRED_FIELDS.filter(field => !String(job[field] || '').trim()),
    level: score >= 80 ? 'high' : score >= 55 ? 'medium' : 'low',
  };
}

function analyzeJobMatch(job, profile = {}) {
  const jobText = buildJobText(job);
  const profileText = profileToSearchText(profile);
  const matchedSkills = includesAny(jobText, profile.skills);
  const matchedDirections = includesAny(jobText, profile.directions);
  const cityMatched = profile.target_cities?.length
    ? includesAny(job.location || '', profile.target_cities).length > 0
    : false;
  const educationMatched = profile.education
    ? String(job.education || '').includes(profile.education) || String(job.education || '').includes('及以上')
    : false;
  const quality = getCompleteness(job);
  const risks = includesAny(jobText, RISK_WORDS);

  let score = 35;
  score += Math.min(matchedSkills.length * 12, 30);
  score += Math.min(matchedDirections.length * 14, 28);
  if (cityMatched) score += 12;
  if (educationMatched) score += 8;
  score += Math.round(quality.score * 0.12);
  score -= Math.min(risks.length * 8, 20);
  score = Math.max(0, Math.min(100, score));

  const short_reasons = [];
  if (matchedSkills.length) short_reasons.push(`技能匹配 ${matchedSkills.slice(0, 3).join('、')}`);
  if (matchedDirections.length) short_reasons.push(`方向匹配 ${matchedDirections.slice(0, 2).join('、')}`);
  if (cityMatched) short_reasons.push('城市匹配');
  if (quality.level !== 'high') short_reasons.push('信息不完整');
  if (risks.length) short_reasons.push(`风险提示 ${risks[0]}`);
  if (!short_reasons.length && profileText) short_reasons.push('匹配信息较少，建议谨慎查看');

  return {
    score,
    level: score >= 75 ? 'high' : score >= 55 ? 'medium' : 'low',
    short_reasons,
    skills: { matched: matchedSkills, missing: (profile.skills || []).filter(skill => !matchedSkills.includes(skill)) },
    directions: { matched: matchedDirections, missing: (profile.directions || []).filter(direction => !matchedDirections.includes(direction)) },
    city: { matched: cityMatched, expected: profile.target_cities || [], actual: job.location || '' },
    education: { matched: educationMatched, expected: profile.education || '', actual: job.education || '' },
    quality,
    risks,
    duplicate: { is_duplicate: false, group_key: getDedupKey(job) },
  };
}

function enrichJobsWithMatch(jobs = [], profile = {}, mode = 'smart') {
  const seen = new Map();
  const enriched = jobs.map(job => {
    const match = analyzeJobMatch(job, profile);
    const count = seen.get(match.duplicate.group_key) || 0;
    seen.set(match.duplicate.group_key, count + 1);
    match.duplicate.is_duplicate = count > 0;
    return { ...job, match };
  });

  const sorted = mode === 'all'
    ? enriched
    : [...enriched].sort((a, b) => {
        if (a.match.duplicate.is_duplicate !== b.match.duplicate.is_duplicate) return a.match.duplicate.is_duplicate ? 1 : -1;
        return b.match.score - a.match.score;
      });

  const filtered = mode === 'compact'
    ? sorted.filter(job => !job.match.duplicate.is_duplicate && job.match.quality.level !== 'low' && job.match.score >= 50)
    : sorted;

  const duplicates = enriched.filter(job => job.match.duplicate.is_duplicate).length;
  const lowQuality = enriched.filter(job => job.match.quality.level === 'low').length;
  const lowMatch = enriched.filter(job => job.match.score < 50).length;

  return {
    items: filtered,
    summary: {
      mode,
      total: jobs.length,
      shown: filtered.length,
      hidden: jobs.length - filtered.length,
      duplicates,
      low_quality: lowQuality,
      low_match: lowMatch,
    },
  };
}

module.exports = {
  analyzeJobMatch,
  enrichJobsWithMatch,
  getDedupKey,
};
