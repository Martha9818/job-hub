import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../lib/api';

const HOT_CATEGORIES = [
  { icon: '⚙️', label: '机械设计', keyword: '机械设计' },
  { icon: '🔧', label: '数控编程', keyword: '数控编程' },
  { icon: '🔩', label: '模具设计', keyword: '模具设计' },
  { icon: '🏗️', label: '液压工程师', keyword: '液压工程师' },
  { icon: '🤖', label: '自动化', keyword: '自动化工程师' },
  { icon: '📐', label: '结构工程师', keyword: '结构工程师' },
  { icon: '🏭', label: '工艺工程师', keyword: '工艺工程师' },
  { icon: '📊', label: '质量工程师', keyword: '质量工程师' },
];

export default function HomePage() {
  const [stats, setStats] = useState(null);
  const [hotJobs, setHotJobs] = useState([]);
  const [keyword, setKeyword] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    apiClient.get('/jobs/meta/stats').then(res => setStats(res.data)).catch(() => {});
    // 加载热门岗位
    apiClient.get('/jobs?industry=机械&page_size=6&sort=latest').then(res => setHotJobs(res.data || [])).catch(() => {});
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(`/jobs?keyword=${encodeURIComponent(keyword)}`);
  };

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="text-center py-16 md:py-24 bg-gradient-to-br from-primary-50 via-white to-accent-50 rounded-2xl mb-10 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMzYjgyZjYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djJIMjR2LTJoMTJ6bTAtNHYySDI0di0yaDEyem0wLTR2MkgyNHYtMmgxMnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-50"></div>
        <div className="relative z-10">
          <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
            🔧 机械行业招聘聚合平台
          </h1>
          <p className="text-base md:text-lg text-gray-500 mb-8 max-w-2xl mx-auto px-4">
            自动聚合 BOSS直聘、智联招聘、猎聘等平台机械行业岗位，上传简历一键投递
          </p>
          <form onSubmit={handleSearch} className="max-w-xl mx-auto flex gap-3 px-4">
            <input
              type="text"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              placeholder="搜索岗位名称、公司名..."
              className="flex-1 px-5 py-3 border border-gray-300 rounded-xl text-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none shadow-sm"
            />
            <button type="submit" className="btn-primary btn-lg rounded-xl shadow-sm">
              搜索
            </button>
          </form>
        </div>
      </section>

      {/* 统计 */}
      {stats && (
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-10">
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
            <div className="text-gray-500 mt-1 text-sm md:text-base">今日新增</div>
          </div>
        </section>
      )}

      {/* 热门分类 */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">热门岗位分类</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {HOT_CATEGORIES.map(cat => (
            <Link key={cat.keyword} to={`/jobs?keyword=${encodeURIComponent(cat.keyword)}`}
              className="card-interactive p-4 flex items-center gap-3">
              <span className="text-2xl">{cat.icon}</span>
              <span className="font-medium text-gray-800">{cat.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* 热门岗位 */}
      {hotJobs.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">最新岗位</h2>
            <Link to="/jobs" className="text-primary-600 hover:underline text-sm font-medium">查看全部 →</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {hotJobs.map(job => (
              <Link key={job.id} to={`/jobs/${job.id}`}
                className="card-interactive p-4 flex justify-between items-start">
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

      {/* 快捷入口 */}
      <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Link to="/campus" className="card-interactive p-6 group">
          <div className="text-3xl mb-3">🎓</div>
          <h3 className="text-base font-semibold text-gray-900 mb-1 group-hover:text-primary-600">校招实习</h3>
          <p className="text-gray-500 text-xs">2026春招校招信息汇总，应届生专场</p>
        </Link>
        <Link to="/jobs?industry=机械" className="card-interactive p-6 group">
          <div className="text-3xl mb-3">🔍</div>
          <h3 className="text-base font-semibold text-gray-900 mb-1 group-hover:text-primary-600">浏览岗位</h3>
          <p className="text-gray-500 text-xs">按地区、薪资、经验筛选机械行业招聘</p>
        </Link>
        <Link to="/resumes" className="card-interactive p-6 group">
          <div className="text-3xl mb-3">📄</div>
          <h3 className="text-base font-semibold text-gray-900 mb-1 group-hover:text-primary-600">上传简历</h3>
          <p className="text-gray-500 text-xs">上传简历文件，收藏心仪岗位</p>
        </Link>
        <Link to="/apply" className="card-interactive p-6 group">
          <div className="text-3xl mb-3">🚀</div>
          <h3 className="text-base font-semibold text-gray-900 mb-1 group-hover:text-primary-600">收藏投递</h3>
          <p className="text-gray-500 text-xs">收藏岗位，一键跳转企业官网完成投递</p>
        </Link>
      </section>
    </div>
  );
}
