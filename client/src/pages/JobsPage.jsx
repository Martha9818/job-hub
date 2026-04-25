import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiClient } from '../lib/api';
import { useFavorites } from '../hooks/useFavorites';
import { updateJobSearchParams } from './jobsSearchParams';

export default function JobsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, total_pages: 0 });
  const [filters, setFilters] = useState(null);
  const [loading, setLoading] = useState(true);
  const [matchSummary, setMatchSummary] = useState(null);
  const [searchInput, setSearchInput] = useState(searchParams.get('keyword') || '');
  const { isFavorite, toggleFavorite } = useFavorites();

  const keyword = searchParams.get('keyword') || '';
  const location = searchParams.get('location') || '';
  const industry = searchParams.get('industry') || '';
  const category = searchParams.get('category') || '';
  const nature = searchParams.get('nature') || '';
  const salaryMin = searchParams.get('salary_min') || '';
  const sort = searchParams.get('sort') || 'latest';
  const matchMode = searchParams.get('match_mode') || 'smart';
  const page = parseInt(searchParams.get('page') || '1');

  useEffect(() => {
    apiClient.get('/jobs/meta/filters').then(res => setFilters(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (keyword) params.set('keyword', keyword);
    if (location) params.set('location', location);
    if (industry) params.set('industry', industry);
    if (category) params.set('category', category);
    if (nature) params.set('nature', nature);
    if (salaryMin) params.set('salary_min', salaryMin);
    if (sort !== 'latest') params.set('sort', sort);
    if (matchMode !== 'all') params.set('match_mode', matchMode);
    params.set('page', page);

    apiClient.get(`/jobs?${params.toString()}`)
      .then(res => {
        setJobs(res.data || []);
        setPagination(res.pagination || {});
        setMatchSummary(res.match_summary || null);
      })
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  }, [keyword, location, industry, category, nature, salaryMin, sort, matchMode, page]);

  // 岗位性质映射
  const getNature = (experience) => {
    if (experience === '应届生') return { label: '校招', color: 'bg-blue-100 text-blue-700' };
    if (experience === '实习') return { label: '实习', color: 'bg-green-100 text-green-700' };
    return { label: '社招', color: 'bg-orange-100 text-orange-700' };
  };

  const updateSearch = (key, value) => {
    setSearchParams(updateJobSearchParams(searchParams, key, value));
  };

  const matchBadgeClass = (level) => {
    if (level === 'high') return 'bg-green-100 text-green-700';
    if (level === 'medium') return 'bg-blue-100 text-blue-700';
    return 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">岗位搜索</h1>
        {pagination.total > 0 && (
          <span className="text-sm text-gray-500">共 {pagination.total} 个岗位</span>
        )}
      </div>

      {/* 搜索栏 */}
      <div className="card p-4 mb-6">
        <div className="flex flex-wrap gap-3">
          <div className="flex flex-1 min-w-[200px]">
            <input
              type="text" value={searchInput} placeholder="搜索岗位名称、公司名..."
              className="input flex-1 rounded-r-none"
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') updateSearch('keyword', searchInput); }}
            />
            <button
              onClick={() => updateSearch('keyword', searchInput)}
              className="btn-primary rounded-l-none px-4"
            >
              🔍
            </button>
          </div>
          <select value={location} onChange={e => updateSearch('location', e.target.value)} className="select w-auto">
            <option value="">全部地区</option>
            {filters?.locations?.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <select value={category} onChange={e => updateSearch('category', e.target.value)} className="select w-auto">
            <option value="">全部类别</option>
            {filters?.categories?.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={nature} onChange={e => updateSearch('nature', e.target.value)} className="select w-auto">
            <option value="">全部性质</option>
            <option value="校招">校招</option>
            <option value="实习">实习</option>
            <option value="社招">社招</option>
          </select>
          <select value={salaryMin} onChange={e => updateSearch('salary_min', e.target.value)} className="select w-auto">
            <option value="">薪资不限</option>
            <option value="5000">5K以上</option>
            <option value="10000">10K以上</option>
            <option value="15000">15K以上</option>
            <option value="20000">20K以上</option>
            <option value="30000">30K以上</option>
          </select>
          <select value={sort} onChange={e => updateSearch('sort', e.target.value)} className="select w-auto">
            <option value="latest">最新发布</option>
            <option value="salary_high">薪资最高</option>
            <option value="salary_low">薪资最低</option>
          </select>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
          <span className="text-sm text-gray-500 mr-1">智能筛选：</span>
          {[
            ['all', '完整列表'],
            ['smart', '智能排序'],
            ['compact', '精简推荐'],
          ].map(([value, label]) => (
            <button key={value} onClick={() => updateSearch('match_mode', value)}
              className={`btn-sm ${matchMode === value ? 'btn-primary' : 'btn-secondary'}`}>
              {label}
            </button>
          ))}
          {matchSummary && (
            <span className="text-xs text-gray-500 ml-0 md:ml-2">
              已识别 {matchSummary.duplicates} 个重复岗位，{matchSummary.low_quality} 个信息不完整岗位，当前显示 {matchSummary.shown} 个
            </span>
          )}
        </div>
      </div>

      {/* 结果列表 */}
      {loading ? (
        <div className="text-center py-20 text-gray-400">加载中...</div>
      ) : jobs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <p className="empty-state-text">暂无匹配岗位，试试调整搜索条件</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {jobs.map(job => (
              <div key={job.id}
                className="card-interactive p-4 md:p-5 flex items-start gap-3 animate-slide-up">
                <Link to={`/jobs/${job.id}`} className="flex-1 min-w-0">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-1 truncate">{job.title}</h3>
                      <p className="text-primary-600 font-medium text-sm mb-2">{job.company}</p>
                      <div className="flex flex-wrap gap-2 md:gap-4 text-xs md:text-sm text-gray-500">
                        {(() => { const n = getNature(job.experience); return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${n.color}`}>{n.label}</span>; })()}
                        {job.match && <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${matchBadgeClass(job.match.level)}`}>匹配 {job.match.score}</span>}
                        {job.location && <span>📍 {job.location}</span>}
                        {job.experience && <span>📋 {job.experience}</span>}
                        {job.education && <span>🎓 {job.education}</span>}
                        {job.industry && <span className="badge-primary">{job.industry}</span>}
                      </div>
                      {job.match?.short_reasons?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {job.match.short_reasons.slice(0, 3).map(reason => (
                            <span key={reason} className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">{reason}</span>
                          ))}
                          {job.match.duplicate?.is_duplicate && <span className="text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-700">疑似重复</span>}
                        </div>
                      )}
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
                  {isFavorite(job.id) ? (
                    <span className="text-red-500 text-lg">❤️</span>
                  ) : (
                    <span className="text-gray-300 text-lg hover:text-red-400">🤍</span>
                  )}
                </button>
              </div>
            ))}
          </div>

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

          {/* 校招专区 */}
          {nature === '' && (() => {
            const campusJobs = jobs.filter(j => j.experience === '应届生');
            if (campusJobs.length === 0) return null;
            return (
              <div className="mt-10">
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-xl font-bold text-blue-700">🎓 校招专区</h2>
                  <button onClick={() => updateSearch('nature', '校招')} className="text-xs text-primary-600 hover:underline">查看全部校招 →</button>
                </div>
                <div className="space-y-3">
                  {campusJobs.slice(0, 6).map(job => (
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
                            </div>
                          </div>
                          <div className="text-left md:text-right shrink-0">
                            <div className="text-lg font-bold text-red-500">{job.salary_text || '面议'}</div>
                          </div>
                        </div>
                      </Link>
                      <button onClick={(e) => { e.preventDefault(); toggleFavorite(job.id); }} className="shrink-0 p-1 hover:bg-gray-100 rounded-lg transition-colors">
                        {isFavorite(job.id) ? <span className="text-red-500 text-lg">❤️</span> : <span className="text-gray-300 text-lg hover:text-red-400">🤍</span>}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* 实习专区 */}
          {nature === '' && (() => {
            const internJobs = jobs.filter(j => j.experience === '实习');
            if (internJobs.length === 0) return null;
            return (
              <div className="mt-10">
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-xl font-bold text-green-700">💼 实习专区</h2>
                  <button onClick={() => updateSearch('nature', '实习')} className="text-xs text-primary-600 hover:underline">查看全部实习 →</button>
                </div>
                <div className="space-y-3">
                  {internJobs.slice(0, 6).map(job => (
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
                            </div>
                          </div>
                          <div className="text-left md:text-right shrink-0">
                            <div className="text-lg font-bold text-red-500">{job.salary_text || '面议'}</div>
                          </div>
                        </div>
                      </Link>
                      <button onClick={(e) => { e.preventDefault(); toggleFavorite(job.id); }} className="shrink-0 p-1 hover:bg-gray-100 rounded-lg transition-colors">
                        {isFavorite(job.id) ? <span className="text-red-500 text-lg">❤️</span> : <span className="text-gray-300 text-lg hover:text-red-400">🤍</span>}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}
