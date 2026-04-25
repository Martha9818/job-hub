/**
 * 数据库模块 - 使用 sql.js (纯JS SQLite实现，无需原生编译)
 */

const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || './data/jobhub.db';

let db = null;

// 确保数据目录存在
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// 保存数据库到文件
function saveDb() {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (err) {
    console.error('保存数据库失败:', err.message);
  }
}

// 自动保存定时器
let saveTimer = null;
function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(saveDb, 2000);
}

// 初始化数据库
async function initDatabase() {
  const SQL = await initSqlJs();

  // 尝试加载已有数据库
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
    console.log('📂 已加载现有数据库');
  } else {
    db = new SQL.Database();
    console.log('📝 创建新数据库');
  }

  // 创建表
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS resumes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      filepath TEXT NOT NULL,
      file_size INTEGER,
      parse_status TEXT DEFAULT 'pending',
      parsed_data TEXT,
      is_default INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sources (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      website TEXT NOT NULL,
      scraper_type TEXT NOT NULL DEFAULT 'static',
      category TEXT DEFAULT 'general',
      is_active INTEGER DEFAULT 1,
      last_crawled_at DATETIME,
      config TEXT
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      source_id TEXT,
      source_job_id TEXT,
      title TEXT NOT NULL,
      company TEXT NOT NULL,
      salary_min INTEGER,
      salary_max INTEGER,
      salary_text TEXT,
      location TEXT,
      category TEXT,
      industry TEXT DEFAULT '机械',
      experience TEXT,
      education TEXT,
      description TEXT,
      requirements TEXT,
      benefits TEXT,
      job_type TEXT,
      publish_date TEXT,
      source_url TEXT,
      is_active INTEGER DEFAULT 1,
      crawled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (source_id) REFERENCES sources(id)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_source_dedup 
      ON jobs(source_id, source_job_id);

    CREATE INDEX IF NOT EXISTS idx_jobs_title ON jobs(title);
    CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company);
    CREATE INDEX IF NOT EXISTS idx_jobs_industry ON jobs(industry);
    CREATE INDEX IF NOT EXISTS idx_jobs_active ON jobs(is_active);

    CREATE TABLE IF NOT EXISTS applications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      job_id TEXT NOT NULL,
      resume_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      result TEXT,
      error_message TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (job_id) REFERENCES jobs(id),
      FOREIGN KEY (resume_id) REFERENCES resumes(id)
    );

    CREATE INDEX IF NOT EXISTS idx_applications_user ON applications(user_id);
  `);

  // 插入默认数据源
  const sourceResult = query('SELECT COUNT(*) as count FROM sources');
  if (sourceResult[0].count === 0) {
    run(`INSERT INTO sources (id, name, website, scraper_type, category, config) VALUES ('boss', 'BOSS直聘', 'https://www.zhipin.com', 'playwright', 'comprehensive', ?)`,
      [JSON.stringify({ searchPath: '/web/geek/job', queryParam: 'query' })]);
    run(`INSERT INTO sources (id, name, website, scraper_type, category, config) VALUES ('zhilian', '智联招聘', 'https://www.zhaopin.com', 'playwright', 'comprehensive', ?)`,
      [JSON.stringify({ searchPath: '/sou', queryParam: 'jl' })]);
    run(`INSERT INTO sources (id, name, website, scraper_type, category, config) VALUES ('51job', '前程无忧', 'https://www.51job.com', 'playwright', 'comprehensive', ?)`,
      [JSON.stringify({})]);
    run(`INSERT INTO sources (id, name, website, scraper_type, category, config) VALUES ('liepin', '猎聘', 'https://www.liepin.com', 'playwright', 'comprehensive', ?)`,
      [JSON.stringify({ searchPath: '/zhaopin', queryParam: 'key' })]);
    run(`INSERT INTO sources (id, name, website, scraper_type, category, config) VALUES ('mechanical-cn', '中国机械人才网', 'https://www.mechanical.com.cn', 'static', 'mechanical', ?)`,
      [JSON.stringify({})]);
  }

  // 创建演示用户（方便测试）
  const userCount = query('SELECT COUNT(*) as count FROM users');
  if (userCount[0].count === 0) {
    const bcrypt = require('bcryptjs');
    const { v4: uuidv4 } = require('uuid');
    const demoId = uuidv4();
    const demoHash = bcrypt.hashSync('demo123', 12);
    run('INSERT INTO users (id, username, password_hash, email) VALUES (?, ?, ?, ?)',
      [demoId, 'demo', demoHash, 'demo@jobhub.com']);
    console.log('👤 演示用户已创建 (demo/demo123)');
  }

  // 插入示例数据（重点覆盖应届生岗位）
  const jobCount = query('SELECT COUNT(*) as count FROM jobs');
  if (jobCount[0].count === 0) {
    const sampleJobs = [
      // ====== 应届生/校招岗位（40条）======
      ['j1', 'boss', 'boss_001', '机械设计工程师（2026届校招）', '三一重工股份有限公司', 10000, 16000, '10K-16K', '上海', '机械设计', '机械', '应届生', '本科', '参与工程机械产品的结构设计与3D出图，协助完成设计文档', '机械工程/机械设计制造及其自动化专业，熟练使用SolidWorks/UG，成绩排名前50%', '五险一金、应届生公寓、导师带教、免费三餐', '全职', '2026-04-23', 'https://www.sanygroup.com'],
      ['j2', 'boss', 'boss_002', '数控编程工程师（校招）', '大连机床集团', 8000, 13000, '8K-13K', '大连', '数控', '机械', '应届生', '大专', '学习数控编程，协助编制加工程序，参与工艺优化', '数控技术/机械制造专业，了解FANUC/西门子系统', '五险一金、免费工作餐、技能培训', '全职', '2026-04-22', 'https://www.dmtg.com'],
      ['j3', 'zhilian', 'zl_001', '管培生-机械方向（2026校招）', '中联重科', 12000, 18000, '12K-18K', '长沙', '管培生', '机械', '应届生', '硕士', '轮岗培养，深入了解工程机械研发/制造/质量管理全流程', '机械类硕士，有学生干部经历优先，综合素质强', '五险一金、股票期权、管培生专项培养、年终奖', '全职', '2026-04-21', 'https://www.zoomlion.com'],
      ['j4', 'liepin', 'lp_001', '模具设计助理工程师（应届）', '富士康科技集团', 7000, 11000, '7K-11K', '深圳', '模具设计', '机械', '应届生', '大专', '协助模具设计师完成3D建模和2D出图工作', '模具设计/机械制造专业，了解UG/Pro-E基本操作', '五险一金、绩效奖金、包食宿', '全职', '2026-04-23', 'https://www.foxconn.com'],
      ['j5', 'boss', 'boss_003', '液压系统助理工程师（校招）', '徐工集团', 9000, 14000, '9K-14K', '徐州', '液压', '机械', '应届生', '本科', '协助液压系统设计，参与回路设计与测试验证', '流体力学/液压专业优先，了解液压基本原理', '五险一金、应届生补贴、带薪年假', '全职', '2026-04-20', 'https://www.xcmg.com'],
      ['j6', '51job', '51_001', '机械工艺工程师（2026届）', '格力电器', 8000, 13000, '8K-13K', '珠海', '机械工艺', '机械', '应届生', '本科', '参与产品生产工艺编制，协助工艺改进与工装设计', '机械制造/工业工程专业，了解机加工工艺基础', '五险一金、年终奖、免费住宿', '全职', '2026-04-22', 'https://www.gree.com'],
      ['j7', 'boss', 'boss_004', '自动化设计工程师（校招）', '大族激光', 11000, 18000, '11K-18K', '深圳', '自动化', '机械', '应届生', '本科', '参与非标自动化设备的机械结构设计与方案制定', '机械/自动化专业，熟练SolidWorks，有竞赛或项目经验优先', '五险一金、股票期权、弹性工作', '全职', '2026-04-21', 'https://www.hanslaser.com'],
      ['j8', 'zhilian', 'zl_002', '轨道交通制造工程师（校招）', '中国中车', 9000, 15000, '9K-15K', '株洲', '机械制造', '机械', '应届生', '本科', '参与轨道车辆零部件制造工艺的学习与改进', '车辆工程/机械制造专业，了解精益生产基本概念', '五险一金、企业年金、年终奖', '全职', '2026-04-20', 'https://www.crrcgc.cc'],
      ['j9', 'boss', 'boss_005', '质量工程师-应届生（机械）', '海尔集团', 7000, 12000, '7K-12K', '青岛', '质量管理', '机械', '应届生', '本科', '参与机械产品质量检测，学习质量管理体系', '机械/质量相关专业，了解ISO9001基础知识', '五险一金、年终奖、员工宿舍', '全职', '2026-04-23', 'https://www.haier.com'],
      ['j10', 'mechanical-cn', 'mc_001', '铸造工艺助理工程师（校招）', '潍柴动力', 7000, 12000, '7K-12K', '潍坊', '铸造', '机械', '应届生', '本科', '协助铸造工艺制定，参与工艺试验与数据采集', '材料成型/铸造专业，了解砂铸/精密铸造基础', '五险一金、年终奖、员工宿舍', '全职', '2026-04-21', 'https://www.weichaipower.com'],
      ['j11', 'boss', 'boss_006', 'CNC操作员（应届培养）', '比亚迪股份有限公司', 6000, 9000, '6K-9K', '深圳', '数控', '机械', '应届生', '高中', '学习CNC加工中心操作，在师傅指导下完成零件加工', '机械/数控专业，能看懂基本图纸', '五险一金、包食宿、技能培训', '全职', '2026-04-22', 'https://www.byd.com'],
      ['j12', 'zhilian', 'zl_003', '焊接工艺工程师（校招）', '中国船舶集团', 8000, 14000, '8K-14K', '上海', '焊接', '机械', '应届生', '本科', '参与船舶焊接工艺研究，协助焊接试验与工艺评定', '焊接技术/材料工程专业，了解各类焊接方法', '五险一金、年终奖、带薪年假', '全职', '2026-04-20', 'https://www.cssc.net.cn'],
      ['j13', 'liepin', 'lp_003', 'CAE仿真工程师（2026届校招）', '西门子中国', 15000, 25000, '15K-25K', '北京', '仿真分析', '机械', '应届生', '硕士', '参与机械产品的CAE仿真建模与分析', '力学/机械硕士，熟练使用ANSYS/Abaqus，有课题研究经验', '五险一金、补充医疗、弹性工作', '全职', '2026-04-21', 'https://new.siemens.com/cn'],
      ['j14', '51job', '51_002', '设备维护工程师（应届）', '美的集团', 7000, 11000, '7K-11K', '佛山', '设备维护', '机械', '应届生', '大专', '学习生产设备维护保养，协助故障排除与维修', '机电一体化/设备维修专业，有实习经验优先', '五险一金、绩效奖金、节日福利', '全职', '2026-04-23', 'https://www.midea.com'],
      ['j15', 'boss', 'boss_007', '注塑模具设计助理（应届）', '立讯精密', 7000, 12000, '7K-12K', '苏州', '模具设计', '机械', '应届生', '大专', '协助注塑模具3D设计，学习模具结构设计要点', '模具设计专业，了解UG基本操作', '五险一金、年终奖、带薪年假', '全职', '2026-04-22', 'https://www.luxshare-ict.com'],
      ['j16', 'zhilian', 'zl_004', '结构研发工程师（校招）', '华为终端', 18000, 30000, '18K-30K', '东莞', '研发', '机械', '应届生', '硕士', '参与消费电子产品结构设计，负责模块级方案设计与验证', '机械/力学硕士，有精密结构设计项目经验，成绩优异', '五险一金、股票期权、弹性工作', '全职', '2026-04-20', 'https://www.huawei.com'],
      ['j17', 'boss', 'boss_008', '机器人应用工程师（校招）', '发那科机器人', 10000, 16000, '10K-16K', '上海', '机器人', '机械', '应届生', '本科', '学习工业机器人编程与系统集成，参与项目实施', '自动化/机器人专业，了解FANUC/KUKA基础操作', '五险一金、年终奖、培训机会', '全职', '2026-04-19', 'https://www.fanuc.com.cn'],
      ['j18', 'liepin', 'lp_004', '机械技术销售（校招）', '博世力士乐', 9000, 15000, '9K-15K', '广州', '销售', '机械', '应届生', '本科', '学习液压/传动产品的技术销售流程，协助客户对接', '机械专业，沟通表达能力强，有学生社团经验优先', '五险一金、销售提成、出差补贴', '全职', '2026-04-23', 'https://www.boschrexroth.com'],
      ['j19', 'boss', 'boss_009', '新能源汽车结构设计（校招）', '蔚来汽车', 13000, 22000, '13K-22K', '合肥', '汽车', '机械', '应届生', '硕士', '参与新能源汽车底盘/车身结构设计与分析', '车辆工程/机械硕士，熟悉CATIA，有有限元分析基础', '五险一金、股票期权、免费工作餐', '全职', '2026-04-22', 'https://www.nio.com'],
      ['j20', 'zhilian', 'zl_006', '机械制图员（应届）', '中国一拖集团', 5000, 8000, '5K-8K', '洛阳', '制图', '机械', '应届生', '大专', '负责零部件2D工程图绘制，协助设计变更标注', '机械制图/CAD专业，熟练AutoCAD，细心负责', '五险一金、提供住宿、带薪培训', '全职', '2026-04-21', 'https://www.yituo.com.cn'],
      ['j21', 'boss', 'boss_010', '智能制造工程师（2026校招）', '小米汽车', 12000, 20000, '12K-20K', '北京', '智能制造', '机械', '应届生', '硕士', '参与智能制造产线规划与数字化工厂方案设计', '工业工程/机械硕士，了解MES/数字孪生优先', '五险一金、股票期权、弹性工作', '全职', '2026-04-20', 'https://www.xiaomi.com'],
      ['j22', 'liepin', 'lp_005', '冲压工艺工程师（校招）', '吉利汽车', 8000, 13000, '8K-13K', '宁波', '冲压', '机械', '应届生', '本科', '参与汽车冲压件工艺开发与模具调试', '材料成型/机械专业，了解冲压工艺基础', '五险一金、年终奖、员工宿舍', '全职', '2026-04-22', 'https://www.geely.com'],
      ['j23', '51job', '51_003', '暖通机械工程师（应届）', '中国建筑集团', 8000, 14000, '8K-14K', '北京', '暖通', '机械', '应届生', '本科', '参与建筑暖通系统设计与设备选型', '暖通/建筑环境专业，了解CAD/BIM基础', '五险一金、项目奖金、提供住宿', '全职', '2026-04-21', 'https://www.cscec.com'],
      ['j24', 'boss', 'boss_011', '工业设计师（2026届校招）', '大疆创新', 15000, 25000, '15K-25K', '深圳', '工业设计', '机械', '应届生', '本科', '参与无人机/手持设备的外观造型与结构设计', '工业设计专业，手绘能力强，熟练Rhino/KeyShot，有获奖作品优先', '五险一金、股票期权、弹性工作、下午茶', '全职', '2026-04-23', 'https://www.dji.com'],
      ['j25', 'zhilian', 'zl_007', '机械检验员（应届培养）', '中国商飞', 7000, 11000, '7K-11K', '上海', '检验', '机械', '应届生', '大专', '学习航空零部件的尺寸检测与质量判定', '机械/检测专业，了解三坐标测量基础，严谨细致', '五险一金、年终奖、培训体系完善', '全职', '2026-04-20', 'https://www.comac.cc'],
      ['j26', 'boss', 'boss_012', '嵌入式机械工程师（校招）', '大华股份', 11000, 18000, '11K-18K', '杭州', '嵌入式', '机械', '应届生', '本科', '参与安防/物联网设备的结构设计与可靠性验证', '机械设计专业，了解注塑/钣金工艺，会用SolidWorks', '五险一金、年终奖、餐补', '全职', '2026-04-21', 'https://www.dahuatech.com'],
      ['j27', 'liepin', 'lp_006', '热处理工程师（校招）', '中国兵装集团', 7000, 12000, '7K-12K', '重庆', '热处理', '机械', '应届生', '本科', '参与零件热处理工艺制定与金相分析', '材料科学/热处理专业，了解渗碳/淬火/回火工艺', '五险一金、年终奖、员工宿舍', '全职', '2026-04-22', 'https://www.csgc.com.cn'],
      ['j28', 'mechanical-cn', 'mc_002', '机械技术支持（应届）', '山推股份', 6000, 10000, '6K-10K', '济宁', '技术支持', '机械', '应届生', '本科', '为客户提供工程机械技术支持与故障诊断', '机械专业，沟通能力好，能适应出差', '五险一金、出差补贴、培训机会', '全职', '2026-04-23', 'https://www.shantui.com'],
      ['j29', 'boss', 'boss_013', '减振降噪工程师（校招）', '宁德时代', 12000, 20000, '12K-20K', '宁德', 'NVH', '机械', '应届生', '硕士', '参与动力电池包及整车的NVH分析与优化', '力学/声学硕士，了解模态分析/频响分析', '五险一金、股票期权、人才公寓', '全职', '2026-04-20', 'https://www.catl.com'],
      ['j30', 'zhilian', 'zl_008', '包装机械工程师（应届）', '汇川技术', 9000, 15000, '9K-15K', '苏州', '包装', '机械', '应届生', '本科', '参与包装自动化设备的机械设计与调试', '机械设计专业，了解凸轮/连杆机构设计', '五险一金、年终奖、餐补', '全职', '2026-04-22', 'https://www.inovance.com'],
      ['j31', 'boss', 'boss_014', '3D打印应用工程师（校招）', '先临三维', 8000, 14000, '8K-14K', '杭州', '增材制造', '机械', '应届生', '本科', '负责3D打印设备的工艺开发与应用支持', '机械/材料专业，了解增材制造原理，有3D打印项目经验优先', '五险一金、弹性工作、技能培训', '全职', '2026-04-21', 'https://www.shining3d.com'],
      ['j32', '51job', '51_004', '涂装工艺工程师（校招）', '长城汽车', 7000, 12000, '7K-12K', '保定', '涂装', '机械', '应届生', '本科', '参与汽车涂装产线工艺优化与质量控制', '化工/机械专业，了解喷涂/电泳工艺基础', '五险一金、年终奖、提供住宿', '全职', '2026-04-23', 'https://www.gwm.com.cn'],
      ['j33', 'liepin', 'lp_007', '气动系统设计（校招）', '费斯托中国', 10000, 16000, '10K-16K', '济南', '气动', '机械', '应届生', '本科', '参与气动元件与系统的设计开发', '流体力学/机械专业，了解气动基本原理', '五险一金、补充医疗、弹性工作', '全职', '2026-04-20', 'https://www.festo.com'],
      ['j34', 'boss', 'boss_015', '半导体设备机械工程师（校招）', '北方华创', 13000, 22000, '13K-22K', '北京', '半导体设备', '机械', '应届生', '硕士', '参与半导体工艺装备的机械结构设计与仿真', '精密机械/仪器科学硕士，了解超精密运动控制', '五险一金、股票期权、人才公寓', '全职', '2026-04-22', 'https://www.naura.com'],
      ['j35', 'zhilian', 'zl_009', '机械维修技师（应届培养）', '宝钢股份', 6000, 10000, '6K-10K', '上海', '维修', '机械', '应届生', '大专', '学习钢铁生产设备维修保养，跟随师傅实操', '机电维修/机械设备专业，动手能力强', '五险一金、提供住宿、技能认证培训', '全职', '2026-04-21', 'https://www.baosteel.com'],
      ['j36', 'boss', 'boss_016', '车辆动力学工程师（校招）', '理想汽车', 15000, 25000, '15K-25K', '常州', '车辆动力学', '机械', '应届生', '硕士', '参与整车动力学仿真与悬架系统调校', '车辆工程硕士，了解多体动力学/ADAMS', '五险一金、股票期权、工作餐', '全职', '2026-04-23', 'https://www.lixiang.com'],
      ['j37', 'liepin', 'lp_008', '传动系统设计工程师（校招）', '采埃孚中国', 10000, 17000, '10K-17K', '上海', '传动', '机械', '应届生', '本科', '参与变速箱/减速器等传动系统设计与分析', '机械设计专业，了解齿轮传动设计原理', '五险一金、补充医疗、带薪年假', '全职', '2026-04-20', 'https://www.zf.com'],
      ['j38', '51job', '51_005', '生产计划员（机械方向-应届）', '三花控股', 6000, 10000, '6K-10K', '杭州', '生产管理', '机械', '应届生', '本科', '协助制定生产计划，跟踪生产进度与物料协调', '工业工程/机械专业，逻辑清晰，Excel熟练', '五险一金、绩效奖金、带薪年假', '全职', '2026-04-22', 'https://www.sanhuagroup.com'],
      ['j39', 'boss', 'boss_017', '精密仪器设计工程师（校招）', '海康威视', 12000, 20000, '12K-20K', '杭州', '仪器', '机械', '应届生', '硕士', '参与精密光学仪器的机械结构设计与公差分析', '仪器科学/精密机械硕士，了解光机结构设计', '五险一金、股票期权、弹性工作', '全职', '2026-04-21', 'https://www.hikvision.com'],
      ['j40', 'zhilian', 'zl_010', '机械类储备干部', '正泰电器', 7000, 11000, '7K-11K', '温州', '储备干部', '机械', '应届生', '本科', '从生产一线轮岗学习，逐步成长为技术/管理骨干', '机械类本科，吃苦耐劳，有志于制造业长期发展', '五险一金、包食宿、晋升通道明确', '全职', '2026-04-23', 'https://www.chint.com'],

      // ====== 社会招聘岗位（20条）======
      ['j41', 'boss', 'boss_018', '高级机械设计工程师', '三一重工股份有限公司', 20000, 35000, '20K-35K', '上海', '机械设计', '机械', '5-10年', '本科', '主导大型工程机械产品结构设计与技术方案评审', '5年以上机械设计经验，精通SolidWorks，有主导项目经验', '五险一金、年终奖、带薪年假', '全职', '2026-04-19', 'https://www.sanygroup.com'],
      ['j42', 'liepin', 'lp_009', '机械项目经理', 'ABB中国', 25000, 40000, '25K-40K', '上海', '项目管理', '机械', '5-10年', '本科', '负责机械类项目的全周期管理与客户对接', '5年以上项目管理经验，PMP优先', '五险一金、补充医疗、弹性工作', '全职', '2026-04-18', 'https://new.abb.com/cn'],
      ['j43', 'boss', 'boss_019', '非标自动化设计工程师', '大族激光', 20000, 35000, '20K-35K', '深圳', '自动化', '机械', '5-10年', '本科', '负责非标自动化设备的设计开发与方案输出', '5年以上非标设计经验，熟练SolidWorks', '五险一金、股票期权、弹性工作', '全职', '2026-04-20', 'https://www.hanslaser.com'],
      ['j44', 'zhilian', 'zl_011', '液压系统工程师', '徐工集团', 16000, 28000, '16K-28K', '徐州', '液压', '机械', '3-5年', '本科', '负责液压系统设计与调试', '熟悉液压原理，3年以上液压系统设计经验', '五险一金、住房补贴、带薪年假', '全职', '2026-04-18', 'https://www.xcmg.com'],
      ['j45', 'boss', 'boss_020', 'PLM实施顾问', 'PTC中国', 20000, 35000, '20K-35K', '北京', '信息化', '机械', '5-10年', '本科', '负责Windchill PLM系统的实施与交付', '5年以上PLM实施经验，了解制造业业务流程', '五险一金、补充医疗、弹性工作', '全职', '2026-04-19', 'https://www.ptc.com'],
      ['j46', 'liepin', 'lp_010', 'CAE高级仿真工程师', '西门子中国', 25000, 40000, '25K-40K', '北京', '仿真分析', '机械', '5-10年', '硕士', '负责复杂机械系统的CAE仿真与优化', '5年以上仿真经验，精通ANSYS/Abaqus', '五险一金、补充医疗、弹性工作', '全职', '2026-04-17', 'https://new.siemens.com/cn'],
      ['j47', '51job', '51_006', '质量主管（机械方向）', '海尔集团', 15000, 25000, '15K-25K', '青岛', '质量管理', '机械', '5-10年', '本科', '负责机械产品质量体系管理与团队建设', '8年以上质量管理经验，熟悉六西格玛', '五险一金、年终奖、员工宿舍', '全职', '2026-04-18', 'https://www.haier.com'],
      ['j48', 'boss', 'boss_021', '机器人系统集成工程师', '发那科机器人', 20000, 35000, '20K-35K', '上海', '机器人', '机械', '3-5年', '本科', '负责工业机器人系统集成项目的方案与实施', '3年以上集成经验，精通FANUC/KUKA编程', '五险一金、年终奖、培训机会', '全职', '2026-04-19', 'https://www.fanuc.com.cn'],
      ['j49', 'zhilian', 'zl_012', '焊接高级工程师', '中国船舶集团', 15000, 25000, '15K-25K', '上海', '焊接', '机械', '5-10年', '本科', '负责船舶焊接工艺研究与工艺标准制定', '8年以上焊接经验，有船级社认证', '五险一金、年终奖、带薪年假', '全职', '2026-04-17', 'https://www.cssc.net.cn'],
      ['j50', 'liepin', 'lp_011', '机械销售经理', '博世力士乐', 20000, 40000, '20K-40K', '广州', '销售', '机械', '5-10年', '本科', '负责液压/传动产品的区域销售管理与大客户开发', '5年以上机械行业销售经验，有大客户资源优先', '五险一金、销售提成、出差补贴', '全职', '2026-04-18', 'https://www.boschrexroth.com'],
      ['j51', 'boss', 'boss_022', '注塑模具高级设计师', '立讯精密', 16000, 26000, '16K-26K', '苏州', '模具设计', '机械', '5-10年', '大专', '负责精密注塑模具的全流程设计与技术攻关', '5年以上注塑模具设计经验，精通UG', '五险一金、年终奖、带薪年假', '全职', '2026-04-20', 'https://www.luxshare-ict.com'],
      ['j52', 'zhilian', 'zl_013', '机械工艺高级工程师', '格力电器', 15000, 25000, '15K-25K', '珠海', '机械工艺', '机械', '5-10年', '本科', '负责核心产品生产工艺优化与精益改进', '8年以上工艺经验，精通精益生产/DOE', '五险一金、年终奖、免费住宿', '全职', '2026-04-19', 'https://www.gree.com'],
      ['j53', 'mechanical-cn', 'mc_003', '铸造工艺高级工程师', '潍柴动力', 15000, 25000, '15K-25K', '潍坊', '铸造', '机械', '5-10年', '本科', '负责发动机核心铸件铸造工艺开发与改进', '5年以上铸造经验，精通砂铸/精密铸造', '五险一金、年终奖、员工宿舍', '全职', '2026-04-18', 'https://www.weichaipower.com'],
      ['j54', 'boss', 'boss_023', '新能源电驱结构设计', '蔚来汽车', 22000, 38000, '22K-38K', '合肥', '汽车', '机械', '3-5年', '硕士', '负责电驱动系统结构设计与轻量化', '3年以上电驱设计经验，精通CATIA', '五险一金、股票期权、免费工作餐', '全职', '2026-04-19', 'https://www.nio.com'],
      ['j55', 'liepin', 'lp_012', '半导体设备主任工程师', '北方华创', 30000, 50000, '30K-50K', '北京', '半导体设备', '机械', '5-10年', '博士', '负责半导体核心工艺装备的整机方案设计与技术攻关', '5年以上半导体设备研发经验，精通超精密设计', '五险一金、股票期权、人才公寓', '全职', '2026-04-17', 'https://www.naura.com'],
      ['j56', '51job', '51_007', 'CNC高级编程工程师', '大连机床集团', 15000, 25000, '15K-25K', '大连', '数控', '机械', '5-10年', '大专', '负责五轴数控编程与加工工艺优化', '5年以上五轴编程经验，精通FANUC/海德汉', '五险一金、加班补贴、免费工作餐', '全职', '2026-04-18', 'https://www.dmtg.com'],
      ['j57', 'boss', 'boss_024', 'NVH高级工程师', '宁德时代', 25000, 40000, '25K-40K', '宁德', 'NVH', '机械', '5-10年', '硕士', '负责动力电池包NVH优化与整车声学开发', '5年以上NVH经验，精通LMS/Head Acoustics', '五险一金、股票期权、人才公寓', '全职', '2026-04-17', 'https://www.catl.com'],
      ['j58', 'zhilian', 'zl_014', '设备管理主管', '美的集团', 12000, 20000, '12K-20K', '佛山', '设备管理', '机械', '5-10年', '本科', '负责工厂设备全生命周期管理与TPM推进', '5年以上设备管理经验，精通TPM/OEE', '五险一金、绩效奖金、节日福利', '全职', '2026-04-19', 'https://www.midea.com'],
      ['j59', 'liepin', 'lp_013', '智能制造高级工程师', '小米汽车', 25000, 45000, '25K-45K', '北京', '智能制造', '机械', '5-10年', '硕士', '负责智能工厂整体规划与数字化产线建设', '5年以上智能制造经验，精通MES/SCADA', '五险一金、股票期权、弹性工作', '全职', '2026-04-17', 'https://www.xiaomi.com'],
      ['j60', 'boss', 'boss_025', '精密结构设计专家', '华为终端', 35000, 60000, '35K-60K', '东莞', '研发', '机械', '10年以上', '博士', '负责旗舰产品精密结构技术规划与团队管理', '10年以上精密结构设计经验，有国家级项目经历', '五险一金、股票期权、弹性工作', '全职', '2026-04-16', 'https://www.huawei.com'],

      // ====== 实习岗位（20条）======
      ['j61', 'boss', 'boss_intern_01', '机械设计实习生', '三一重工股份有限公司', 4000, 6000, '4K-6K', '上海', '机械设计', '机械', '实习', '本科', '协助工程师完成机械零部件3D建模与工程图绘制', '机械专业大三/大四，会SolidWorks，每周出勤4天以上', '实习津贴、免费三餐、转正机会', '实习', '2026-04-24', 'https://www.sanygroup.com'],
      ['j62', 'boss', 'boss_intern_02', '结构设计实习生', '大疆创新', 5000, 8000, '5K-8K', '深圳', '结构设计', '机械', '实习', '本科', '参与无人机产品结构设计验证，协助做公差分析与样品测试', '机械/力学专业，熟练CAD，有竞赛经验优先', '实习津贴、弹性工作、转正机会', '实习', '2026-04-23', 'https://www.dji.com'],
      ['j63', 'zhilian', 'zl_intern_01', '仿真分析实习生', '西门子中国', 5000, 8000, '5K-8K', '北京', '仿真分析', '机械', '实习', '硕士', '协助完成CAE仿真建模与结果后处理', '力学/机械硕士在读，会用ANSYS/Abaqus', '实习津贴、补充医疗、转正机会', '实习', '2026-04-22', 'https://new.siemens.com/cn'],
      ['j64', 'boss', 'boss_intern_03', '新能源汽车结构实习', '蔚来汽车', 5000, 7000, '5K-7K', '合肥', '汽车', '机械', '实习', '硕士', '参与电池包结构设计与轻量化方案协助', '车辆工程硕士在读，了解CATIA', '实习津贴、工作餐、转正机会', '实习', '2026-04-23', 'https://www.nio.com'],
      ['j65', 'liepin', 'lp_intern_01', '模具设计实习生', '立讯精密', 3500, 5000, '3.5K-5K', '苏州', '模具设计', '机械', '实习', '大专', '协助模具设计师完成3D建模和出图', '模具设计专业，了解UG基本操作', '实习津贴、餐补、转正机会', '实习', '2026-04-24', 'https://www.luxshare-ict.com'],
      ['j66', '51job', '51_intern_01', '工艺工程实习生', '格力电器', 3000, 5000, '3K-5K', '珠海', '机械工艺', '机械', '实习', '本科', '协助编制生产工艺文件，参与工装夹具设计', '机械制造专业，了解CAD基础', '实习津贴、免费住宿、转正机会', '实习', '2026-04-22', 'https://www.gree.com'],
      ['j67', 'boss', 'boss_intern_04', '半导体设备机械实习', '北方华创', 5000, 8000, '5K-8K', '北京', '半导体设备', '机械', '实习', '硕士', '参与半导体设备精密机械结构的设计与仿真', '精密机械/仪器科学硕士在读', '实习津贴、股票期权、转正机会', '实习', '2026-04-21', 'https://www.naura.com'],
      ['j68', 'zhilian', 'zl_intern_02', '机器人算法实习', '发那科机器人', 4000, 6000, '4K-6K', '上海', '机器人', '机械', '实习', '硕士', '协助工业机器人运动学建模与轨迹规划', '自动化/机器人硕士在读，了解ROS优先', '实习津贴、培训机会、转正机会', '实习', '2026-04-23', 'https://www.fanuc.com.cn'],
      ['j69', 'boss', 'boss_intern_05', 'NVH分析实习生', '宁德时代', 5000, 7000, '5K-7K', '宁德', 'NVH', '机械', '实习', '硕士', '参与电池包NVH测试与数据分析', '力学/声学硕士在读，了解模态分析', '实习津贴、人才公寓、转正机会', '实习', '2026-04-22', 'https://www.catl.com'],
      ['j70', 'liepin', 'lp_intern_02', '自动化设备设计实习', '大族激光', 4000, 6000, '4K-6K', '深圳', '自动化', '机械', '实习', '本科', '协助非标自动化设备机械结构设计', '机械/自动化专业，会SolidWorks', '实习津贴、弹性工作、转正机会', '实习', '2026-04-24', 'https://www.hanslaser.com'],
      ['j71', 'boss', 'boss_intern_06', '智能制造实习工程师', '小米汽车', 5000, 8000, '5K-8K', '北京', '智能制造', '机械', '实习', '硕士', '参与智能工厂产线规划与MES系统对接', '工业工程/机械硕士在读', '实习津贴、股票期权、转正机会', '实习', '2026-04-21', 'https://www.xiaomi.com'],
      ['j72', '51job', '51_intern_02', 'CNC编程实习生', '大连机床集团', 3000, 4500, '3K-4.5K', '大连', '数控', '机械', '实习', '大专', '学习数控编程基础，协助简单零件加工程序编制', '数控技术专业，了解FANUC系统', '实习津贴、免费工作餐、转正机会', '实习', '2026-04-23', 'https://www.dmtg.com'],
      ['j73', 'zhilian', 'zl_intern_03', '液压系统设计实习', '博世力士乐', 4000, 6000, '4K-6K', '上海', '液压', '机械', '实习', '本科', '协助液压回路设计与元件选型', '流体力学/液压专业，了解基本原理', '实习津贴、补充医疗、转正机会', '实习', '2026-04-22', 'https://www.boschrexroth.com'],
      ['j74', 'boss', 'boss_intern_07', '车辆动力学仿真实习', '理想汽车', 5000, 8000, '5K-8K', '常州', '车辆动力学', '机械', '实习', '硕士', '协助悬架系统动力学仿真与参数调校', '车辆工程硕士在读，了解ADAMS', '实习津贴、股票期权、转正机会', '实习', '2026-04-20', 'https://www.lixiang.com'],
      ['j75', 'liepin', 'lp_intern_03', '铸造工艺实习生', '潍柴动力', 3000, 5000, '3K-5K', '潍坊', '铸造', '机械', '实习', '本科', '协助铸造工艺试验与数据采集', '材料成型专业，了解砂铸基础', '实习津贴、员工宿舍、转正机会', '实习', '2026-04-21', 'https://www.weichaipower.com'],
      ['j76', 'boss', 'boss_intern_08', '3D打印工艺实习', '先临三维', 3500, 5500, '3.5K-5.5K', '杭州', '增材制造', '机械', '实习', '本科', '协助3D打印设备工艺参数调试与样品制作', '机械/材料专业，了解增材制造原理', '实习津贴、弹性工作、转正机会', '实习', '2026-04-22', 'https://www.shining3d.com'],
      ['j77', 'zhilian', 'zl_intern_04', '热处理工艺实习生', '中国兵装集团', 3000, 5000, '3K-5K', '重庆', '热处理', '机械', '实习', '本科', '协助零件热处理工艺操作与金相观察', '材料科学专业，了解热处理基础', '实习津贴、员工宿舍、转正机会', '实习', '2026-04-23', 'https://www.csgc.com.cn'],
      ['j78', '51job', '51_intern_03', '质量检测实习生', '海尔集团', 3000, 4500, '3K-4.5K', '青岛', '质量管理', '机械', '实习', '大专', '协助机械零部件尺寸检测与质量记录', '机械/检测专业，细心负责', '实习津贴、员工宿舍、转正机会', '实习', '2026-04-24', 'https://www.haier.com'],
      ['j79', 'mechanical-cn', 'mc_intern_01', '机械技术支持实习', '山推股份', 3000, 4500, '3K-4.5K', '济宁', '技术支持', '机械', '实习', '本科', '协助客户技术支持工作，整理故障案例', '机械专业，沟通能力好', '实习津贴、出差补贴、转正机会', '实习', '2026-04-22', 'https://www.shantui.com'],
      ['j80', 'boss', 'boss_intern_09', '工业设计实习生', '大华股份', 4000, 6000, '4K-6K', '杭州', '工业设计', '机械', '实习', '本科', '参与安防设备外观造型设计与渲染出图', '工业设计专业，会用Rhino/KeyShot', '实习津贴、餐补、转正机会', '实习', '2026-04-21', 'https://www.dahuatech.com'],
    ];

    for (const j of sampleJobs) {
      run(`INSERT OR IGNORE INTO jobs (id, source_id, source_job_id, title, company, salary_min, salary_max, salary_text, location, category, industry, experience, education, description, requirements, benefits, job_type, publish_date, source_url) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, j);
    }
  }

  // === 数据迁移：学历要求统一为本科及以上 ===
  console.log('🎓 统一学历要求为本科及以上...');
  run("UPDATE jobs SET education = '本科及以上' WHERE education IN ('高中', '大专', '本科', '硕士', '博士')");
  console.log('✅ 学历要求已更新');

  // === 数据迁移：source_url 统一为公司官网首页 ===
  // 官网首页极其稳定，避免招聘深链接频繁404
  console.log('🔄 更新 source_url 为公司官网首页...');
  const urlMap = {
    '三一重工股份有限公司': 'https://www.sanygroup.com',
    '大连机床集团': 'https://www.dmtg.com',
    '中联重科': 'https://www.zoomlion.com',
    '富士康科技集团': 'https://www.foxconn.com',
    '徐工集团': 'https://www.xcmg.com',
    '格力电器': 'https://www.gree.com',
    '大族激光': 'https://www.hanslaser.com',
    '中国中车': 'https://www.crrcgc.cc',
    '海尔集团': 'https://www.haier.com',
    '潍柴动力': 'https://www.weichaipower.com',
    '比亚迪股份有限公司': 'https://www.byd.com',
    '中国船舶集团': 'https://www.cssc.net.cn',
    '西门子中国': 'https://new.siemens.com/cn',
    '美的集团': 'https://www.midea.com',
    '立讯精密': 'https://www.luxshare-ict.com',
    '华为终端': 'https://www.huawei.com',
    '发那科机器人': 'https://www.fanuc.com.cn',
    '博世力士乐': 'https://www.boschrexroth.com',
    '蔚来汽车': 'https://www.nio.com',
    '中国一拖集团': 'https://www.yituo.com.cn',
    '小米汽车': 'https://www.xiaomi.com',
    '吉利汽车': 'https://www.geely.com',
    '中国建筑集团': 'https://www.cscec.com',
    '大疆创新': 'https://www.dji.com',
    '中国商飞': 'https://www.comac.cc',
    '大华股份': 'https://www.dahuatech.com',
    '中国兵装集团': 'https://www.csgc.com.cn',
    '山推股份': 'https://www.shantui.com',
    '宁德时代': 'https://www.catl.com',
    '汇川技术': 'https://www.inovance.com',
    '先临三维': 'https://www.shining3d.com',
    '长城汽车': 'https://www.gwm.com.cn',
    '费斯托中国': 'https://www.festo.com',
    '北方华创': 'https://www.naura.com',
    '宝钢股份': 'https://www.baosteel.com',
    '理想汽车': 'https://www.lixiang.com',
    '采埃孚中国': 'https://www.zf.com',
    '三花控股': 'https://www.sanhuagroup.com',
    '海康威视': 'https://www.hikvision.com',
    '正泰电器': 'https://www.chint.com',
    'ABB中国': 'https://new.abb.com/cn',
    'PTC中国': 'https://www.ptc.com',
  };

  let urlCount = 0;
  for (const [company, url] of Object.entries(urlMap)) {
    run('UPDATE jobs SET source_url = ? WHERE company = ?', [url, company]);
    urlCount++;
  }
  console.log(`🔗 已更新 ${urlCount} 家公司的 source_url 为官网首页`);

  // === 安全网：urlMap 未覆盖的公司，自动生成 Boss直聘搜索链接 ===
  // Boss直聘搜索链接按公司名搜索，永远不会404，是最佳兜底方案
  const uncoveredJobs = query('SELECT DISTINCT company FROM jobs WHERE company NOT IN (' +
    Object.keys(urlMap).map(() => '?').join(',') + ')', Object.keys(urlMap));
  if (uncoveredJobs.length > 0) {
    let fallbackCount = 0;
    for (const { company } of uncoveredJobs) {
      const searchUrl = `https://www.zhipin.com/web/geek/job?query=${encodeURIComponent(company)}`;
      run('UPDATE jobs SET source_url = ? WHERE company = ?', [searchUrl, company]);
      fallbackCount++;
    }
    console.log(`🛡️ ${fallbackCount} 家未配置官网的公司已自动生成搜索链接兜底`);
  }

  // 扩展短描述
  const shortJobs = query("SELECT id, description, requirements, experience FROM jobs WHERE LENGTH(description) < 150");
  let descCount = 0;
  for (const job of shortJobs) {
    const isIntern = job.experience === '实习';
    const isFresh = job.experience === '应届生';
    const prefix = isIntern ? '实习' : (isFresh ? '校招' : '');

    const expandedDesc = job.description + '\n\n' +
      (isIntern || isFresh ?
        `${prefix}岗位说明：\n1. 公司将提供系统化的岗前培训和导师带教\n2. 具体工作内容将根据项目需求灵活安排\n3. 表现优异者可获得转正机会\n4. 提供行业领先的实践平台` :
        `岗位职责补充：\n1. 负责技术方案制定与评审\n2. 参与跨部门协作推动项目交付\n3. 持续优化产品和工艺\n4. 指导初级工程师`);

    const expandedReq = job.requirements + '\n\n' +
      (isIntern || isFresh ?
        `附加要求：\n1. 学习能力强，能短期内掌握岗位技能\n2. 团队协作精神和沟通表达能力\n3. 对机械行业有热情` :
        `附加要求：\n1. 项目管理和技术决策能力\n2. 跨部门沟通协调能力\n3. 快节奏环境下高效工作`);

    run('UPDATE jobs SET description = ?, requirements = ? WHERE id = ?', [expandedDesc, expandedReq, job.id]);
    descCount++;
  }
  console.log(`📝 已扩展 ${descCount} 条岗位的详细描述`);

  saveDb();
  console.log('✅ 数据迁移完成并已保存');

  saveDb();
  console.log('✅ 数据库初始化完成（含示例数据）');
}

// 查询辅助函数
function query(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  scheduleSave();
  return results;
}

// 执行辅助函数
function run(sql, params = []) {
  db.run(sql, params);
  scheduleSave();
  return { changes: db.getRowsModified() };
}

// 获取单行
function get(sql, params = []) {
  const results = query(sql, params);
  return results.length > 0 ? results[0] : null;
}

module.exports = { initDatabase, query, run, get, saveDb };
