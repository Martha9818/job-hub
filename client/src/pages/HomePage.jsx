import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../lib/api';
import { getHomeUpdateCardContent } from './homeUpdateCard';

const HOT_CATEGORIES = [
  { icon: '⚙️', label: '机械设计', keyword: '机械设计' },
  { icon: '🔧', label: '数控编程', keyword: '数控编程' },
  { icon: '🧩', label: '模具设计', keyword: '模具设计' },
  { icon: '💧', label: '液压工程师', keyword: '液压工程师' },
  { icon: '🤖', label: '自动化', keyword: '自动化工程师' },
  { icon: '🏗️', label: '结构工程师', keyword: '结构工程师' },
  { icon: '🏭', label: '工艺工程师', keyword: '工艺工程师' },
  { icon: '📏', label: '质量工程师', keyword: '质量工程师' },
];

export default function HomePage() {
  const [stats, setStats] = useState(null);
  const [hotJobs, setHotJobs] = useState([]);
  const [updateStatus, setUpdateStatus] = useState(null);
  const [keyword, setKeyword] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    apiClient.get('/jobs/meta/stats').then((res) => setStats(res.data)).catch(() => {});
    apiClient.get('/jobs/meta/update-status').then((res) => setUpdateStatus(res.data)).catch(() => {});
    apiClient.get('/jobs?industry=机械&page_size=6&sort=latest').then((res) => setHotJobs(res.data || [])).catch(() => {});
  }, []);

  const updateCard = useMemo(() => getHomeUpdateCardContent(updateStatus), [updateStatus]);

  const handleSearch = (event) => {
    event.preventDefault();
    navigate(`/jobs?keyword=${encodeURIComponent(keyword)}`);
  };

  return (
    <div className="animate-fade-in">
      <section className="text-center py-16 md:py-24 bg-gradient-to-br from-primary-50 via-white to-accent-50 rounded-2xl mb-10 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMzYjgyZjYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djJIMjR2LTJoMTJ6bTAtNHYySDI0di0yaDEyem0wLTR2MkgyNHYtMmgxMnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-50" />
        <div className="relative z-10">
          <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
            🔧 机械行业招聘聚合平台
          </h1>
          <p className="text-base md:text-lg text-gray-500 mb-8 max-w-2xl mx-auto px-4">
            自动聚合机械行业岗位信息，支持快速筛选、校招实习浏览与官网投递跳转。
          </p>
          <form onSubmit={handleSearch} className="max-w-xl mx-auto flex gap-3 px-4">
            <input
              type="text"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索岗位名称、公司名..."
              className="flex-1 px-5 py-3 border border-gray-300 rounded-xl text-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none shadow-sm"
            />
            <button type="submit" className="btn-primary btn-lg rounded-xl shadow-sm">
              搜索
            </button>
          </form>
        </div>
      </section>

      {stats && (
        <>
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-6">
            <div className="card p-5 md:p-6 text-center">
              <div className="text-2xl md:text-3xl font-bold text-primary-600">{stats.totalJobs?.toLocaleString()}</div>
              <div className="text-gray-500 mt-1 text-sm md:text-base">在线岗位</div>
            </div>
            <div className="card p-5 md:p-6 text-center">
              <div className="text-2xl md:text-3xl font-bold text-accent-600">{stats.mechanicalJobs?.toLocaleString()}</div>
              <div className="text-gray-500 mt-1 text-sm md:text-base">机械岗位</div>
            </div>
            <div className="card p-5 md:p-6 text-center">
              <div className="text-2xl md:text-3xl font-bold text-orange-500">{stats.totalCompanies?.toLocaleString()}</div>
              <div className="text-gray-500 mt-1 text-sm md:text-base">招聘企业</div>
            </div>
            <div className="card p-5 md:p-6 text-center">
              <div className="text-2xl md:text-3xl font-bold text-blue-500">{stats.todayJobs}</div>
              <div className="text-gray-500 mt-1 text-sm md:text-base">当前展示</div>
            </div>
          </section>

          <section className="card p-5 md:p-6 mb-10 border border-primary-100 bg-gradient-to-r from-white to-primary-50/70">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-primary-700 mb-1">{updateCard.intervalText}</div>
                <h2 className="text-lg md:text-xl font-bold text-gray-900">岗位数据更新节奏</h2>
                <p className="text-sm text-gray-500 mt-1">时间按上海时区展示，以上次实际入库时间为基准推算下一次更新时间。</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-[280px]">
                <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                  <div className="text-xs text-gray-500 mb-1">上次更新时间</div>
                  <div className="text-base font-semibold text-gray-900">{updateCard.lastUpdatedText}</div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                  <div className="text-xs text-gray-500 mb-1">下次预计更新时间</div>
                  <div className="text-base font-semibold text-gray-900">{updateCard.nextExpectedText}</div>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">热门岗位分类</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {HOT_CATEGORIES.map((category) => (
            <Link
              key={category.keyword}
              to={`/jobs?keyword=${encodeURIComponent(category.keyword)}`}
              className="card-interactive p-4 flex items-center gap-3"
            >
              <span className="text-2xl">{category.icon}</span>
              <span className="font-medium text-gray-800">{category.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {hotJobs.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">最新岗位</h2>
            <Link to="/jobs" className="text-primary-600 hover:underline text-sm font-medium">查看全部 →</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {hotJobs.map((job) => (
              <Link
                key={job.id}
                to={`/jobs/${job.id}`}
                className="card-interactive p-4 flex justify-between items-start"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 mb-1 truncate">{job.title}</h3>
                  <p className="text-primary-600 text-sm mb-1">{job.company}</p>
                  <div className="flex gap-3 text-xs text-gray-500">
                    {job.location && <span>📍 {job.location}</span>}
                    {job.experience && <span>📋 {job.experience}</span>}
                  </div>
                </div>
                <div className="text-right ml-3 shrink-0">
                  <div className="text-red-500 font-bold text-sm">{job.salary_text || '面议'}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Link to="/campus" className="card-interactive p-6 group">
          <div className="text-3xl mb-3">🎓</div>
          <h3 className="text-base font-semibold text-gray-900 mb-1 group-hover:text-primary-600">校招实习</h3>
          <p className="text-gray-500 text-xs">浏览春招、实习、大厂与国企专场岗位。</p>
        </Link>
        <Link to="/jobs?industry=机械" className="card-interactive p-6 group">
          <div className="text-3xl mb-3">📋</div>
          <h3 className="text-base font-semibold text-gray-900 mb-1 group-hover:text-primary-600">浏览岗位</h3>
          <p className="text-gray-500 text-xs">按城市、薪资、经验等条件筛选机械行业岗位。</p>
        </Link>
        <Link to="/resumes" className="card-interactive p-6 group">
          <div className="text-3xl mb-3">📄</div>
          <h3 className="text-base font-semibold text-gray-900 mb-1 group-hover:text-primary-600">我的简历</h3>
          <p className="text-gray-500 text-xs">上传和管理简历，用于岗位匹配分析。</p>
        </Link>
        <Link to="/apply" className="card-interactive p-6 group">
          <div className="text-3xl mb-3">🚀</div>
          <h3 className="text-base font-semibold text-gray-900 mb-1 group-hover:text-primary-600">收藏投递</h3>
          <p className="text-gray-500 text-xs">管理收藏岗位，并快速跳转到招聘官网。</p>
        </Link>
      </section>
    </div>
  );
}
