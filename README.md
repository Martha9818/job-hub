# 🔧 JobHub - 机械行业招聘信息聚合平台

自动聚合各大招聘平台机械行业岗位信息，上传简历一键投递，让求职更高效。

## ✨ 功能特性

### 🔍 岗位聚合
- 自动从 BOSS直聘、智联招聘、猎聘等平台爬取机械行业招聘信息
- Playwright Stealth 爬虫，绕过反爬检测
- 定时自动爬取（每6小时），保持数据新鲜

### 🏭 行业聚焦
- 重点覆盖机械制造、机械设计、数控、模具、液压、自动化等机械类岗位
- 按地区、薪资、经验、学历多维度筛选
- 热门分类快捷入口

### 📄 简历管理
- 上传 PDF/DOC/DOCX 简历，支持多份简历管理
- 设定默认简历，投递时自动选择

### 🚀 一键投递
- 选择岗位批量投递，自动追踪投递状态
- **浏览器自动投递**：打开浏览器窗口，自动在招聘网站投递简历
- 投递统计面板，实时查看投递状态

### ⚙️ 数据管理后台
- 数据源管理（启用/停用）
- 手动触发爬取
- 定时任务调度控制
- 过期岗位清理

### 💎 用户体验
- 响应式设计，支持桌面和移动端
- 岗位收藏功能
- 相关岗位推荐
- 投递记录筛选和统计

## 🏗️ 项目架构

```
job-hub/
├── server/                  # 后端 (Express + sql.js + JWT)
│   └── src/
│       ├── auth/            # 认证模块（注册/登录/JWT）
│       ├── jobs/            # 岗位模块（搜索/筛选/详情/统计）
│       ├── resume/          # 简历模块（上传/管理/默认设置）
│       ├── apply/           # 投递模块（批量投递/自动投递/记录）
│       │   └── auto-apply.js  # 浏览器自动投递核心
│       ├── scraper/         # 爬虫模块
│       │   ├── core.js      # HTTP爬虫（Cheerio）
│       │   ├── playwright-bridge.js  # Playwright桥接
│       │   └── scheduler.js # 定时调度（node-cron）
│       └── common/          # 公共模块（数据库/错误/验证）
├── client/                  # 前端 (React 18 + Vite + Tailwind)
│   └── src/
│       ├── pages/           # 8个页面组件
│       ├── components/      # 通用组件（导航栏）
│       ├── hooks/           # React Hooks（认证/收藏）
│       └── lib/             # API客户端
└── scraper-scripts/         # Playwright Stealth 爬虫脚本
    └── scraper-stealth.js   # 独立爬虫脚本（支持BOSS/智联/猎聘）
```

## 🚀 快速开始

### 1. 安装依赖

```bash
# 后端
cd server && npm install

# 前端
cd client && npm install

# 爬虫脚本
cd scraper-scripts && npm install && npx playwright install chromium
```

### 2. 配置环境

```bash
cd server
cp .env.example .env
# 编辑 .env 修改配置（开发环境用默认配置即可）
```

### 3. 启动服务

```bash
# 启动后端 (端口 3001)
cd server && npm start

# 启动前端 (端口 3000)
cd client && npm run dev
```

访问 http://localhost:3000 即可使用。

### 4. 运行爬虫

```bash
# 命令行方式
cd scraper-scripts
node scraper-stealth.js --source=boss --keyword="机械工程师" --city="上海"
node scraper-stealth.js --source=zhilian --keyword="机械设计"
node scraper-stealth.js --source=liepin --keyword="自动化"

# 通过API方式（需登录）
curl -X POST http://localhost:3001/api/scraper/run \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"source_id": "boss", "keyword": "机械工程师", "city": "上海", "scraper_type": "playwright"}'
```

## 📡 API 接口

### 认证
| 方法 | 路径 | 说明 | 需认证 |
|------|------|------|--------|
| POST | /api/auth/register | 用户注册 | ❌ |
| POST | /api/auth/login | 用户登录 | ❌ |

### 岗位
| 方法 | 路径 | 说明 | 需认证 |
|------|------|------|--------|
| GET | /api/jobs | 搜索岗位（支持keyword/location/category/salary_min/sort/page/page_size） | ❌ |
| GET | /api/jobs/:id | 岗位详情 | ❌ |
| GET | /api/jobs/meta/filters | 筛选选项 | ❌ |
| GET | /api/jobs/meta/stats | 统计数据 | ❌ |

### 简历
| 方法 | 路径 | 说明 | 需认证 |
|------|------|------|--------|
| POST | /api/resumes/upload | 上传简历（multipart/form-data） | ✅ |
| GET | /api/resumes | 简历列表 | ✅ |
| PUT | /api/resumes/:id/default | 设默认简历 | ✅ |
| DELETE | /api/resumes/:id | 删除简历 | ✅ |

### 投递
| 方法 | 路径 | 说明 | 需认证 |
|------|------|------|--------|
| POST | /api/applications | 批量投递（支持auto_apply参数） | ✅ |
| GET | /api/applications | 投递记录（支持status筛选） | ✅ |
| GET | /api/applications/stats | 投递统计 | ✅ |
| GET | /api/applications/steps/:sourceId | 平台投递步骤说明 | ✅ |

### 爬虫管理
| 方法 | 路径 | 说明 | 需认证 |
|------|------|------|--------|
| GET | /api/scraper/sources | 数据源列表 | ✅ |
| PUT | /api/scraper/sources/:id | 更新数据源 | ✅ |
| POST | /api/scraper/run | 触发爬虫（支持playwright/http模式） | ✅ |
| GET | /api/scraper/status | 爬虫状态 | ✅ |
| POST | /api/scraper/cleanup | 清理过期岗位 | ✅ |

### 调度管理
| 方法 | 路径 | 说明 | 需认证 |
|------|------|------|--------|
| GET | /api/scheduler/status | 调度状态 | ❌ |
| POST | /api/scheduler/start | 启动定时爬取 | ✅ |
| POST | /api/scheduler/stop | 停止定时爬取 | ✅ |
| POST | /api/scheduler/run-now | 立即执行一次 | ✅ |

## 🔧 技术栈

- **后端**: Express.js + sql.js (纯JS SQLite) + JWT + bcryptjs + node-cron
- **前端**: React 18 + Vite 5 + Tailwind CSS 3 + React Router 6
- **爬虫**: Playwright (Stealth模式) + Cheerio
- **数据库**: sql.js/SQLite (开发) / PostgreSQL (生产推荐)

## ⚠️ 重要提示

1. **爬虫合规** - 本项目仅用于学习交流，请遵守各招聘网站的服务条款和 robots.txt
2. **自动投递** - 大部分招聘网站禁止自动化投递，实际使用可能面临账号风险
3. **数据隐私** - 用户简历属于敏感个人信息，生产环境需加密存储并符合《个人信息保护法》
4. **建议** - 优先考虑与招聘平台合作获取 API 授权

## 📄 License

MIT
