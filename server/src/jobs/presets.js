const PRESET_COMPANY_ALIASES = {
  state: [
    '三一',
    '中联',
    '徐工',
    '中国中车',
    '中国船舶',
    '中国一拖',
    '中国建筑',
    '中国兵装',
    '宝钢',
    '潍柴',
    '山推',
  ],
  tech: [
    '华为',
    '大疆',
    '小米',
    '蔚来',
    '理想',
    '宁德时代',
    '比亚迪',
    '海康',
    '大华',
    '立讯',
    '北方华创',
  ],
};

function getPresetAliases(preset) {
  return PRESET_COMPANY_ALIASES[preset] || [];
}

function buildPresetSearchCondition(preset, fields = ['j.company', 'j.title', 'j.description']) {
  const aliases = getPresetAliases(preset);
  if (!aliases.length) {
    return null;
  }

  const sql = aliases
    .map(() => `(${fields.map((field) => `${field} LIKE ?`).join(' OR ')})`)
    .join(' OR ');
  const params = aliases.flatMap((alias) => fields.map(() => `%${alias}%`));

  return { sql: `(${sql})`, params, aliases };
}

function jobMatchesPreset(job, preset) {
  const aliases = getPresetAliases(preset);
  const haystack = [job.company, job.title, job.description].filter(Boolean).join(' ');
  return aliases.some((alias) => haystack.includes(alias));
}

module.exports = {
  PRESET_COMPANY_ALIASES,
  getPresetAliases,
  buildPresetSearchCondition,
  jobMatchesPreset,
};
