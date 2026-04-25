const COMPANIES = [
  ['三一重工股份有限公司', 'https://www.sanygroup.com', '上海'],
  ['徐工集团', 'https://www.xcmg.com', '徐州'],
  ['中联重科', 'https://www.zoomlion.com', '长沙'],
  ['大族激光', 'https://www.hanslaser.com', '深圳'],
  ['格力电器', 'https://www.gree.com', '珠海'],
  ['宁德时代', 'https://www.catl.com', '宁德'],
  ['汇川技术', 'https://www.inovance.com', '苏州'],
  ['大疆创新', 'https://www.dji.com', '深圳'],
  ['北方华创', 'https://www.naura.com', '北京'],
  ['西门子中国', 'https://new.siemens.com/cn', '北京'],
  ['博世力士乐', 'https://www.boschrexroth.com', '上海'],
  ['潍柴动力', 'https://www.weichaipower.com', '潍坊'],
];

const ROLES = [
  ['机械结构工程师', '结构设计', '负责机械结构方案设计、零部件选型、3D建模和工程图输出', '熟练SolidWorks/AutoCAD，理解机械原理和公差配合'],
  ['机械工艺工程师', '机械工艺', '负责生产工艺文件编制、工装夹具优化和现场工艺问题分析', '了解机加工、装配工艺和精益生产方法'],
  ['自动化设备工程师', '自动化', '参与非标自动化设备方案设计、机构选型和调试跟进', '熟悉气动、传感器、运动机构，有项目经验优先'],
  ['液压系统工程师', '液压', '负责液压回路设计、元件选型、样机测试和故障分析', '掌握液压原理，了解泵阀缸和密封件选型'],
  ['模具设计工程师', '模具设计', '负责注塑或冲压模具结构设计、试模问题分析和设计优化', '熟悉UG/Creo，了解模具加工和成型工艺'],
  ['数控编程工程师', '数控', '负责CNC加工程序编制、刀具路径优化和加工质量提升', '熟悉FANUC或西门子系统，能阅读机械图纸'],
  ['质量工程师', '质量管理', '负责机械零部件质量检验、问题闭环和质量体系推进', '了解ISO9001、8D、SPC，沟通协调能力好'],
  ['CAE仿真工程师', '仿真分析', '负责结构强度、模态、热分析等仿真建模和结果评估', '熟悉ANSYS/Abaqus，力学基础扎实'],
  ['机器人应用工程师', '机器人', '负责工业机器人应用方案、夹具设计和现场调试支持', '了解FANUC/KUKA，具备自动化项目经验'],
  ['智能制造工程师', '智能制造', '参与产线规划、设备联网、MES对接和效率提升项目', '了解智能工厂、数据采集和生产管理流程'],
  ['设备维护工程师', '设备维护', '负责生产设备点检、预防性维护、故障排查和备件管理', '机电基础扎实，能适应现场问题处理'],
  ['机械设计实习生', '机械设计', '协助工程师完成建模、出图、样件测试和资料整理', '机械相关专业在读，熟悉CAD软件，每周稳定出勤'],
];

const EXPERIENCES = ['应届生', '实习', '1-3年', '3-5年', '5-10年'];
const EDUCATIONS = ['本科及以上'];
const SOURCES = ['boss', 'zhilian', '51job', 'liepin', 'mechanical-cn'];

function salaryFor(index, experience) {
  if (experience === '实习') return [3000, 7000, '3K-7K'];
  if (experience === '应届生') return [7000, 14000, '7K-14K'];
  const min = 9000 + (index % 5) * 2000;
  return [min, min + 9000, `${Math.round(min / 1000)}K-${Math.round((min + 9000) / 1000)}K`];
}

function buildSupplementalJobs() {
  const jobs = [];
  let index = 1;

  for (const [company, sourceUrl, fallbackCity] of COMPANIES) {
    for (const [role, category, description, requirements] of ROLES) {
      const experience = EXPERIENCES[index % EXPERIENCES.length];
      const [salaryMin, salaryMax, salaryText] = salaryFor(index, experience);
      const sourceId = SOURCES[index % SOURCES.length];
      const publishDay = String(1 + (index % 24)).padStart(2, '0');
      const title = experience === '实习' || experience === '应届生'
        ? `${role}（${experience === '实习' ? '实习' : '校招'}）`
        : role;

      jobs.push([
        `sj${index}`,
        sourceId,
        `supplemental_${String(index).padStart(3, '0')}`,
        title,
        company,
        salaryMin,
        salaryMax,
        salaryText,
        fallbackCity,
        category,
        '机械',
        experience,
        EDUCATIONS[index % EDUCATIONS.length],
        description,
        requirements,
        '五险一金、项目奖金、培训机会、带薪年假',
        experience === '实习' ? '实习' : '全职',
        `2026-04-${publishDay}`,
        sourceUrl,
      ]);
      index += 1;
    }
  }

  return jobs;
}

module.exports = { buildSupplementalJobs };
