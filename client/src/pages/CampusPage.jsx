import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiClient } from '../lib/api';
import { useFavorites } from '../hooks/useFavorites';

// 快速筛选标签
const QUICK_TABS = [
  { key: 'all', label: '全部校招', icon: '📋' },
  { key: 'spring', label: '26届春招', icon: '🌸' },
  { key: 'intern', label: '实习岗位', icon: '💼' },
  { key: 'state', label: '国企央企', icon: '🏛️' },
  { key: 'tech', label: '大厂校招', icon: '🏢' },
  { key: 'mechanical', label: '机械专场', icon: '🔧' },
];

// 岗位性质映射
const getNature = (experience) => {
  if (experience === '应届生') return { label: '校招', color: 'bg-blue-100 text-blue-700' };
  if (experience === '实习') return { label: '实习', color: 'bg-green-100 text-green-700' };
  return { label: '社招', color: 'bg-orange-100 text-orange-700' };
};

// 热门城市
const HOT_CITIES = ['不限', '上海', '北京', '深圳', '杭州', '苏州', '广州', '南京', '武汉', '成都', '长沙', '合肥', '西安', '大连', '宁波'];

// 学历筛选
const EDU_OPTIONS = ['不限', '大专', '本科', '硕士', '博士'];

export default function CampusPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, total_pages: 0 });
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'card'
  const { isFavorite, toggleFavorite } = useFavorites();

  const activeTab = searchParams.get('tab') || 'all';
  const city = searchParams.get('location') || '';
  const edu = searchParams.get('education') || '';
  const keyword = searchParams.get('keyword') || '';
  const page = parseInt(searchParams.get('page') || '1');

  // 根据 tab 构建搜索条件
  const getTabFilters = (tab) => {
    switch (tab) {
      case 'spring': return { experience: '应届生', keyword: '' };
      case 'intern': return { experience: '实习' };
      case 'state': return { keyword: '国企 央企 中车 中联 潍柴 宝钢 一拖 兵装' };
      case 'tech': return { keyword: '华为 大疆 蔚来 理想 小米 宁德时代 比亚迪 海康 大华 立讯' };
      case 'mechanical': return { industry: '机械' };
      default: return {};
    }
  };

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    const tabFilters = getTabFilters(activeTab);

    // 始终筛选应届生/实习相关
    if (activeTab === 'all') {
      // 全部校招 = 应届生 + 实习，不设 experience 让后端返回全部，前端按性质分区展示
      params.set('page_size', '80'); // 加大页面确保拉到所有数据
    }

    // Tab 附加筛选
    if (tabFilters.experience) params.set('experience', tabFilters.experience);
    if (tabFilters.keyword) params.set('keyword', tabFilters.keyword);
    if (tabFilters.industry) params.set('industry', tabFilters.industry);

    // 用户手动筛选
    const searchKeyword = keyword || '';
    if (searchKeyword && !tabFilters.keyword) params.set('keyword', searchKeyword);
    if (city && city !== '不限') params.set('location', city);
    if (edu && edu !== '不限') params.set('education', edu);
    params.set('page', page);
    params.set('page_size', '30');

    apiClient.get(`/jobs?${params.toString()}`)
      .then(res => {
        setJobs(res.data || []);
        setPagination(res.pagination || {});
      })
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  }, [activeTab, city, edu, keyword, page]);

  const updateSearch = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value && value !== '不限') { params.set(key, value); } else { params.delete(key); }
    params.set('page', '1');
    setSearchParams(params);
  };

  const switchTab = (tab) => {
    const params = new URLSearchParams();
    params.set('tab', tab);
    setSearchParams(params);
  };

  return (
    <div className="animate-fade-in">
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🎓 校招实习</h1>
          <p className="text-sm text-gray-500 mt-1">2026春招校招 · 机械行业应届生岗位汇总</p>
        </div>
        {pagination.total > 0 && (
          <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">共 {pagination.total} 个岗位</span>
        )}
      </div>

      {/* 快速筛选标签 */}
      <div className="flex flex-wrap gap-2 mb-4">
        {QUICK_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => switchTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-primary-600 text-white shadow-md'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-primary-300 hover:text-primary-600'
            }`}
          >
            <span className="mr-1">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* 城市筛选 */}
      <div className="card p-3 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 font-medium shrink-0">📍 城市</span>
          {HOT_CITIES.map(c => (
            <button
              key={c}
              onClick={() => updateSearch('location', c)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                (city === c || (c === '不限' && !city))
                  ? 'bg-primary-100 text-primary-700 border border-primary-300'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* 学历+搜索+视图切换 */}
      <div className="card p-3 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium shrink-0">🎓 学历</span>
            {EDU_OPTIONS.map(e => (
              <button
                key={e}
                onClick={() => updateSearch('education', e)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  (edu === e || (e === '不限' && !edu))
                    ? 'bg-primary-100 text-primary-700 border border-primary-300'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {e}
              </button>
            ))}
          </div>
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              defaultValue={keyword}
              placeholder="搜索公司名、岗位名..."
              className="input w-full text-sm"
              onKeyDown={e => { if (e.key === 'Enter') updateSearch('keyword', e.target.value); }}
            />
          </div>
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'table' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500'
              }`}
            >
              表格
            </button>
            <button
              onClick={() => setViewMode('card')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'card' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500'
              }`}
            >
              卡片
            </button>
          </div>
        </div>
      </div>

      {/* 岗位列表 */}
      {loading ? (
        <div className="text-center py-20 text-gray-400">加载中...</div>
      ) : jobs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <p className="empty-state-text">暂无匹配的校招岗位</p>
          <p className="text-xs text-gray-400 mt-1">试试切换筛选条件</p>
        </div>
      ) : activeTab === 'all' ? (
        /* 全部校招tab - 校招专区 + 实习专区 */
        (() => {
          const campusJobs = jobs.filter(j => j.experience === '应届生');
          const internJobs = jobs.filter(j => j.experience === '实习');
          return (
            <div className="space-y-8">
              {/* 校招专区 */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-xl font-bold text-blue-700">🎓 校招专区</h2>
                  <span className="text-sm text-gray-500">{campusJobs.length} 个岗位</span>
                </div>
                {campusJobs.length === 0 ? (
                  <p className="text-gray-400 text-sm py-4">暂无校招岗位</p>
                ) : viewMode === 'table' ? (
                  <div className="card overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">更新</th>
                            <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">公司</th>
                            <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap min-w-[200px]">职位</th>
                            <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">性质</th>
                            <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">薪资</th>
                            <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">地点</th>
                            <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">学历</th>
                            <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">类别</th>
                            <th className="text-center px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {campusJobs.map((job, idx) => (
                            <tr key={job.id} className={`border-b border-gray-100 hover:bg-primary-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                              <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{job.publish_date?.slice(5) || '-'}</td>
                              <td className="px-4 py-3 whitespace-nowrap"><span className="font-medium text-gray-800 text-sm">{job.company}</span></td>
                              <td className="px-4 py-3"><Link to={`/jobs/${job.id}`} className="text-primary-600 hover:text-primary-800 font-medium hover:underline">{job.title}</Link></td>
                              <td className="px-4 py-3 whitespace-nowrap"><span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">校招</span></td>
                              <td className="px-4 py-3 whitespace-nowrap"><span className="text-red-500 font-semibold">{job.salary_text || '面议'}</span></td>
                              <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{job.location}</td>
                              <td className="px-4 py-3 whitespace-nowrap"><span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{job.education}</span></td>
                              <td className="px-4 py-3 whitespace-nowrap"><span className="px-2 py-0.5 bg-orange-50 text-orange-700 rounded text-xs">{job.category}</span></td>
                              <td className="px-4 py-3 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center gap-2">
                                  {job.source_url && <a href={job.source_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-600 hover:underline">{job.source_url.includes('zhipin.com') ? '搜索职位' : '企业官网'}</a>}
                                  <button onClick={() => toggleFavorite(job.id)} className="text-sm hover:scale-110 transition-transform" title={isFavorite(job.id) ? '取消收藏' : '收藏'}>{isFavorite(job.id) ? '❤️' : '🤍'}</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {campusJobs.map(job => (
                      <div key={job.id} className="card-interactive p-4 flex items-start gap-3">
                        <Link to={`/jobs/${job.id}`} className="flex-1 min-w-0">
                          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-base font-semibold text-gray-900 mb-1 truncate">{job.title}</h3>
                              <p className="text-primary-600 font-medium text-sm mb-2">{job.company}</p>
                              <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">校招</span>
                                {job.location && <span>📍 {job.location}</span>}
                                {job.education && <span>🎓 {job.education}</span>}
                                <span className="px-1.5 py-0.5 bg-orange-50 text-orange-600 rounded">{job.category}</span>
                              </div>
                            </div>
                            <div className="text-left md:text-right shrink-0"><div className="text-lg font-bold text-red-500">{job.salary_text || '面议'}</div></div>
                          </div>
                        </Link>
                        <button onClick={(e) => { e.preventDefault(); toggleFavorite(job.id); }} className="shrink-0 p-1 hover:bg-gray-100 rounded-lg transition-colors" title={isFavorite(job.id) ? '取消收藏' : '收藏'}>
                          {isFavorite(job.id) ? <span className="text-red-500 text-lg">❤️</span> : <span className="text-gray-300 text-lg hover:text-red-400">🤍</span>}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 实习专区 */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-xl font-bold text-green-700">💼 实习专区</h2>
                  <span className="text-sm text-gray-500">{internJobs.length} 个岗位</span>
                </div>
                {internJobs.length === 0 ? (
                  <p className="text-gray-400 text-sm py-4">暂无实习岗位</p>
                ) : viewMode === 'table' ? (
                  <div className="card overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">更新</th>
                            <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">公司</th>
                            <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap min-w-[200px]">职位</th>
                            <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">性质</th>
                            <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">薪资</th>
                            <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">地点</th>
                            <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">学历</th>
                            <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">类别</th>
                            <th className="text-center px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {internJobs.map((job, idx) => (
                            <tr key={job.id} className={`border-b border-gray-100 hover:bg-primary-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                              <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{job.publish_date?.slice(5) || '-'}</td>
                              <td className="px-4 py-3 whitespace-nowrap"><span className="font-medium text-gray-800 text-sm">{job.company}</span></td>
                              <td className="px-4 py-3"><Link to={`/jobs/${job.id}`} className="text-primary-600 hover:text-primary-800 font-medium hover:underline">{job.title}</Link></td>
                              <td className="px-4 py-3 whitespace-nowrap"><span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">实习</span></td>
                              <td className="px-4 py-3 whitespace-nowrap"><span className="text-red-500 font-semibold">{job.salary_text || '面议'}</span></td>
                              <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{job.location}</td>
                              <td className="px-4 py-3 whitespace-nowrap"><span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{job.education}</span></td>
                              <td className="px-4 py-3 whitespace-nowrap"><span className="px-2 py-0.5 bg-orange-50 text-orange-700 rounded text-xs">{job.category}</span></td>
                              <td className="px-4 py-3 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center gap-2">
                                  {job.source_url && <a href={job.source_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-600 hover:underline">{job.source_url.includes('zhipin.com') ? '搜索职位' : '企业官网'}</a>}
                                  <button onClick={() => toggleFavorite(job.id)} className="text-sm hover:scale-110 transition-transform" title={isFavorite(job.id) ? '取消收藏' : '收藏'}>{isFavorite(job.id) ? '❤️' : '🤍'}</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {internJobs.map(job => (
                      <div key={job.id} className="card-interactive p-4 flex items-start gap-3">
                        <Link to={`/jobs/${job.id}`} className="flex-1 min-w-0">
                          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-base font-semibold text-gray-900 mb-1 truncate">{job.title}</h3>
                              <p className="text-primary-600 font-medium text-sm mb-2">{job.company}</p>
                              <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">实习</span>
                                {job.location && <span>📍 {job.location}</span>}
                                {job.education && <span>🎓 {job.education}</span>}
                                <span className="px-1.5 py-0.5 bg-orange-50 text-orange-600 rounded">{job.category}</span>
                              </div>
                            </div>
                            <div className="text-left md:text-right shrink-0"><div className="text-lg font-bold text-red-500">{job.salary_text || '面议'}</div></div>
                          </div>
                        </Link>
                        <button onClick={(e) => { e.preventDefault(); toggleFavorite(job.id); }} className="shrink-0 p-1 hover:bg-gray-100 rounded-lg transition-colors" title={isFavorite(job.id) ? '取消收藏' : '收藏'}>
                          {isFavorite(job.id) ? <span className="text-red-500 text-lg">❤️</span> : <span className="text-gray-300 text-lg hover:text-red-400">🤍</span>}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })()
      ) : jobs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <p className="empty-state-text">暂无匹配的校招岗位</p>
          <p className="text-xs text-gray-400 mt-1">试试切换筛选条件</p>
        </div>
      ) : viewMode === 'table' ? (
        /* 表格视图 — 参考求职方舟 */
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">更新</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">公司</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap min-w-[200px]">职位</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">性质</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">薪资</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">地点</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">学历</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">类别</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">操作</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job, idx) => (
                  <tr key={job.id} className={`border-b border-gray-100 hover:bg-primary-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{job.publish_date?.slice(5) || '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-medium text-gray-800 text-sm">{job.company}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/jobs/${job.id}`} className="text-primary-600 hover:text-primary-800 font-medium hover:underline">
                        {job.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {(() => { const n = getNature(job.experience); return <span className={`px-2 py-0.5 rounded text-xs font-medium ${n.color}`}>{n.label}</span>; })()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-red-500 font-semibold">{job.salary_text || '面议'}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{job.location}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{job.education}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 bg-orange-50 text-orange-700 rounded text-xs">{job.category}</span>
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        {job.source_url && (
                          <a href={job.source_url} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-primary-600 hover:underline">
                            {job.source_url.includes('zhipin.com') ? '搜索职位' : '企业官网'}
                          </a>
                        )}
                        <button
                          onClick={() => toggleFavorite(job.id)}
                          className="text-sm hover:scale-110 transition-transform"
                          title={isFavorite(job.id) ? '取消收藏' : '收藏'}
                        >
                          {isFavorite(job.id) ? '❤️' : '🤍'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* 卡片视图 */
        <div className="space-y-3">
          {jobs.map(job => (
            <div key={job.id} className="card-interactive p-4 flex items-start gap-3 animate-slide-up">
              <Link to={`/jobs/${job.id}`} className="flex-1 min-w-0">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-gray-900 mb-1 truncate">{job.title}</h3>
                    <p className="text-primary-600 font-medium text-sm mb-2">{job.company}</p>
                    <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                      {(() => { const n = getNature(job.experience); return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${n.color}`}>{n.label}</span>; })()}
                      {job.location && <span>📍 {job.location}</span>}
                      {job.experience && <span>📋 {job.experience}</span>}
                      {job.education && <span>🎓 {job.education}</span>}
                      <span className="px-1.5 py-0.5 bg-orange-50 text-orange-600 rounded">{job.category}</span>
                    </div>
                  </div>
                  <div className="text-left md:text-right shrink-0">
                    <div className="text-lg font-bold text-red-500">{job.salary_text || '面议'}</div>
                    {job.source_name && <div className="text-xs text-gray-400 mt-1">来源: {job.source_name}</div>}
                  </div>
                </div>
              </Link>
              <button
                onClick={(e) => { e.preventDefault(); toggleFavorite(job.id); }}
                className="shrink-0 p-1 hover:bg-gray-100 rounded-lg transition-colors"
                title={isFavorite(job.id) ? '取消收藏' : '收藏'}>
                {isFavorite(job.id) ? <span className="text-red-500 text-lg">❤️</span> : <span className="text-gray-300 text-lg hover:text-red-400">🤍</span>}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 分页 */}
      {pagination.total_pages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          <button disabled={page <= 1} onClick={() => updateSearch('page', String(page - 1))}
            className="btn-secondary btn-sm disabled:opacity-40">上一页</button>
          <span className="px-4 py-2 text-gray-500 text-sm">{page} / {pagination.total_pages}</span>
          <button disabled={page >= pagination.total_pages} onClick={() => updateSearch('page', String(page + 1))}
            className="btn-secondary btn-sm disabled:opacity-40">下一页</button>
        </div>
      )}
    </div>
  );
}
