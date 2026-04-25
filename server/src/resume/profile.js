const EDUCATION_LEVELS = ['博士', '硕士', '本科', '大专', '高中'];
const CITY_WORDS = ['北京', '上海', '广州', '深圳', '杭州', '苏州', '南京', '成都', '重庆', '武汉', '长沙', '合肥', '宁波', '佛山', '珠海', '徐州', '大连', '青岛', '潍坊', '洛阳', '东莞', '济南', '常州', '保定', '宁德'];
const SKILL_WORDS = [
  'SolidWorks', 'AutoCAD', 'UG', 'Pro-E', 'Creo', 'CATIA', 'ANSYS', 'Abaqus',
  'CAD', 'CAE', 'CAM', 'CNC', 'FANUC', 'KUKA', 'ROS', 'MES', 'PLM',
  '液压', '气动', '焊接', '铸造', '热处理', '注塑', '钣金', '有限元',
];
const DIRECTION_WORDS = [
  '机械设计', '结构设计', '自动化', '机械工艺', '数控', '模具设计',
  '液压', '机器人', '质量管理', '仿真分析', '智能制造', '半导体设备',
  '汽车', '工业设计', '设备维护', '技术支持', '增材制造',
];

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return value.split(/[,，、\n]/);
  return [];
}

function uniqueClean(values) {
  const seen = new Set();
  const result = [];
  for (const raw of asArray(values)) {
    const value = String(raw || '').trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}

function findWords(text, words) {
  const lower = text.toLowerCase();
  return words.filter(word => lower.includes(word.toLowerCase()));
}

function normalizeProfile(input = {}) {
  return {
    name: String(input.name || '').trim(),
    education: String(input.education || '').trim(),
    years: Number.isFinite(Number(input.years)) ? Number(input.years) : 0,
    target_cities: uniqueClean(input.target_cities),
    target_salary_min: Number.isFinite(Number(input.target_salary_min)) ? Number(input.target_salary_min) : 0,
    skills: uniqueClean(input.skills),
    directions: uniqueClean(input.directions),
    notes: String(input.notes || '').trim(),
    updated_at: new Date().toISOString(),
  };
}

function buildProfileFromText(text = '', base = {}) {
  const source = String(text || '');
  const yearsMatch = source.match(/(\d+)\s*(?:年|年以上|年工作经验)/);
  const profile = normalizeProfile({
    ...base,
    education: base.education || EDUCATION_LEVELS.find(level => source.includes(level)) || '',
    years: base.years || (yearsMatch ? Number(yearsMatch[1]) : 0),
    target_cities: [...asArray(base.target_cities), ...findWords(source, CITY_WORDS)],
    skills: [...asArray(base.skills), ...findWords(source, SKILL_WORDS)],
    directions: [...asArray(base.directions), ...findWords(source, DIRECTION_WORDS)],
    notes: base.notes || '',
  });
  return profile;
}

function profileToSearchText(profile = {}) {
  return [
    profile.name,
    profile.education,
    profile.years ? `${profile.years}年` : '',
    ...asArray(profile.target_cities),
    ...asArray(profile.skills),
    ...asArray(profile.directions),
    profile.notes,
  ].filter(Boolean).join(' ');
}

function parseProfileJson(raw) {
  if (!raw) return normalizeProfile();
  try {
    return normalizeProfile(JSON.parse(raw));
  } catch {
    return normalizeProfile();
  }
}

module.exports = {
  buildProfileFromText,
  normalizeProfile,
  parseProfileJson,
  profileToSearchText,
};
