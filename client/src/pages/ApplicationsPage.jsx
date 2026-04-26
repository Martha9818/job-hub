import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../lib/api';
import { useAppliedJobs } from '../hooks/useAppliedJobs';
import { buildApplicationViewModel } from './applicationStats';

const STATUS_MAP = {
  pending: { label: '待处理', color: 'bg-yellow-100 text-yellow-700', icon: '⏳' },
  submitted: { label: '已提交', color: 'bg-blue-100 text-blue-700', icon: '📩' },
  applying: { label: '投递中', color: 'bg-indigo-100 text-indigo-700', icon: '🔄' },
  success: { label: '投递成功', color: 'bg-green-100 text-green-700', icon: '✅' },
  applied: { label: '已投递', color: 'bg-green-100 text-green-700', icon: '✅' },
  failed: { label: '投递失败', color: 'bg-red-100 text-red-700', icon: '❌' },
  skipped: { label: '已跳过', color: 'bg-gray-100 text-gray-500', icon: '⏭️' },
};

export default function ApplicationsPage() {
  const { localApplications } = useAppliedJobs();
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const loadData = () => {
    Promise.all([
      apiClient.get('/applications').catch(() => ({ data: [] })),
      apiClient.get('/applications/stats').catch(() => ({ data: null })),
    ])
      .then(([appsRes, statsRes]) => {
        setApplications(appsRes.data || []);
        setStats(statsRes.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(loadData, []);

  const { applications: mergedApplications, stats: displayStats } = buildApplicationViewModel({
    localApplications,
    remoteApplications: applications,
    apiStats: stats,
  });

  const filteredApps = filter ? mergedApplications.filter((a) => a.status === filter) : mergedApplications;

  if (loading) return <div className="text-center py-20 text-gray-400">加载中...</div>;

  return (
    <section className="max-w-5xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">投递记录</h1>
        <p className="text-sm text-gray-500 mt-2">统一查看投递进度，快速定位待跟进的岗位。</p>
      </div>

      {displayStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="metric-card">
            <div className="metric-value text-gray-900">{displayStats.total}</div>
            <div className="metric-label">总投递</div>
          </div>
          <div className="metric-card">
            <div className="metric-value text-green-600">{displayStats.success}</div>
            <div className="metric-label">已投递</div>
          </div>
          <div className="metric-card">
            <div className="metric-value text-yellow-600">{displayStats.pending || 0}</div>
            <div className="metric-label">处理中</div>
          </div>
          <div className="metric-card">
            <div className="metric-value text-red-600">{displayStats.failed || 0}</div>
            <div className="metric-label">失败</div>
          </div>
        </div>
      )}

      <div className="panel mb-4">
        <div className="chip-group">
          <button
            onClick={() => setFilter('')}
            className={filter ? 'chip-button' : 'chip-button chip-button-active'}
          >
            全部
          </button>
          {Object.entries(STATUS_MAP).map(([key, val]) => (
            <button
              key={key}
              onClick={() => setFilter(key === filter ? '' : key)}
              className={filter === key ? 'chip-button chip-button-active' : 'chip-button'}
            >
              {val.icon} {val.label}
            </button>
          ))}
        </div>
      </div>

      {filteredApps.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📤</div>
          <p className="empty-state-text">{filter ? '当前筛选下暂无记录' : '暂无投递记录'}</p>
          {!filter && (
            <Link to="/apply" className="btn-primary mt-4 inline-block">去投递</Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredApps.map((app) => {
            const status = STATUS_MAP[app.status] || STATUS_MAP.pending;
            return (
              <article key={app.id} className="card p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{app.title}</h3>
                  <p className="text-sm text-gray-500 truncate">
                    {app.company} · {app.location} · {app.salary_text || '面议'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {app.resume_name ? `简历：${app.resume_name} · ` : ''}
                    投递时间：{new Date(app.applied_at).toLocaleString()}
                  </p>
                  {app.error_message && (
                    <p className="text-xs text-red-500 mt-1">错误：{app.error_message}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${status.color}`}>
                    {status.label}
                  </span>
                  {app.source_url && (
                    <a
                      href={app.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary-600 hover:underline"
                    >
                      查看原始招聘页
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
