import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { apiClient } from '../lib/api';

export default function ApplyPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [selectedJobs, setSelectedJobs] = useState(new Set());
  const [selectedResume, setSelectedResume] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [applying, setApplying] = useState(false);
  const [autoApply, setAutoApply] = useState(false);
  const [results, setResults] = useState(null);
  const [keyword, setKeyword] = useState('机械');

  useEffect(() => {
    setLoading(true);
    setLoadError('');
    Promise.all([
      apiClient.get(`/jobs?industry=机械&keyword=${encodeURIComponent(keyword)}&page_size=50`),
      apiClient.get('/resumes'),
    ]).then(([jobsRes, resumesRes]) => {
      setJobs(jobsRes.data || []);
      setResumes(resumesRes.data || []);
      const def = resumesRes.data?.find(r => r.is_default);
      if (def) setSelectedResume(def.id);
      else if (resumesRes.data?.length > 0) setSelectedResume(resumesRes.data[0].id);
    }).catch(err => {
      console.error('投递页面加载失败:', err);
      if (err.status === 401) {
        setLoadError('登录已过期，请重新登录');
      } else {
        setLoadError(err.body?.message || err.message || '数据加载失败，请刷新重试');
      }
    }).finally(() => setLoading(false));
  }, [keyword]);

  const toggleJob = (id) => {
    const next = new Set(selectedJobs);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedJobs(next);
  };

  const selectAll = () => {
    if (selectedJobs.size === jobs.length) setSelectedJobs(new Set());
    else setSelectedJobs(new Set(jobs.map(j => j.id)));
  };

  const handleApply = async () => {
    if (selectedJobs.size === 0) return alert('请选择至少一个岗位');
    if (!selectedResume) return alert('请选择简历');
    setApplying(true); setResults(null);
    try {
      const res = await apiClient.post('/applications', {
        job_ids: Array.from(selectedJobs),
        resume_id: selectedResume,
        auto_apply: autoApply,
      });
      setResults(res.data);
      if (res.auto_apply) {
        alert('浏览器窗口即将打开，请在浏览器中确认投递操作。如需登录招聘网站，请在弹出的浏览器中手动登录。');
      }
    } catch (err) {
      const msg = err.body?.message || err.body?.errors?.map(e => e.message).join('; ') || '投递失败';
      alert(msg);
    } finally { setApplying(false); }
  };

  if (loading) return <div className="text-center py-20 text-gray-400">加载中...</div>;

  if (loadError) {
    return (
      <div className="max-w-4xl mx-auto animate-fade-in">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">🚀 一键投递</h1>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <p className="text-red-700 mb-3">{loadError}</p>
          {loadError.includes('登录') ? (
            <a href="/login" className="btn-primary inline-block">去登录</a>
          ) : (
            <button onClick={() => window.location.reload()} className="btn-primary">刷新重试</button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">🚀 一键投递</h1>

      {/* 简历选择 */}
      {resumes.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-6">
          <p className="text-yellow-700 mb-2">请先上传简历后再投递</p>
          <a href="/resumes" className="text-primary-600 font-medium underline">→ 前往上传简历</a>
        </div>
      ) : (
        <div className="card p-4 mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="text-sm font-medium text-gray-700 shrink-0">选择简历：</label>
          <select value={selectedResume} onChange={e => setSelectedResume(e.target.value)}
            className="select flex-1">
            <option value="" disabled>请选择简历</option>
            {resumes.map(r => <option key={r.id} value={r.id}>{r.filename} {r.is_default ? '(默认)' : ''}</option>)}
          </select>
        </div>
      )}

      {/* 自动投递选项 */}
      {resumes.length > 0 && (
        <div className="card p-4 mb-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={autoApply}
              onChange={e => setAutoApply(e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded"
            />
            <div>
              <span className="font-medium text-gray-900">启用浏览器自动投递</span>
              <p className="text-xs text-gray-500 mt-0.5">
                勾选后将打开浏览器窗口，自动在招聘网站投递简历。如未登录，需在浏览器中手动登录。
              </p>
            </div>
          </label>
          {autoApply && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-800 font-medium mb-1">⚠️ 自动投递风险提示</p>
              <ul className="text-xs text-amber-700 space-y-0.5 list-disc list-inside">
                <li>大部分招聘网站禁止自动化投递，账号可能被封禁</li>
                <li>频繁自动投递可能触发平台反作弊机制</li>
                <li>建议：手动投递更安全，或只对少量目标岗位使用自动投递</li>
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 搜索 */}
      <div className="flex gap-3 mb-4">
        <input type="text" value={keyword} onChange={e => setKeyword(e.target.value)}
          placeholder="搜索岗位..." className="input flex-1" />
        <button onClick={selectAll} className="btn-secondary btn-sm">
          {selectedJobs.size === jobs.length ? '取消全选' : '全选'}
        </button>
      </div>

      <p className="text-sm text-gray-500 mb-3">已选 {selectedJobs.size} 个岗位</p>

      {/* 岗位列表 */}
      <div className="space-y-2 mb-6 max-h-96 overflow-y-auto pr-1">
        {jobs.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p>未找到匹配岗位，请尝试其他关键词</p>
          </div>
        ) : (
          jobs.map(job => (
            <label key={job.id}
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${selectedJobs.has(job.id) ? 'bg-primary-50 border border-primary-200' : 'bg-white border border-gray-100 hover:bg-gray-50'}`}>
              <input type="checkbox" checked={selectedJobs.has(job.id)} onChange={() => toggleJob(job.id)}
                className="w-4 h-4 text-primary-600 rounded shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="font-medium text-gray-900 text-sm">{job.title}</span>
                <span className="text-gray-500 mx-2">·</span>
                <span className="text-gray-600 text-sm">{job.company}</span>
              </div>
              <span className="text-red-500 font-medium text-sm shrink-0">{job.salary_text || '面议'}</span>
            </label>
          ))
        )}
      </div>

      {/* 投递按钮 */}
      <button onClick={handleApply} disabled={applying || selectedJobs.size === 0 || !selectedResume}
        className="w-full py-4 bg-primary-600 text-white rounded-xl text-lg font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-sm">
        {applying ? '投递中...' : `🚀 ${autoApply ? '自动' : ''}投递选中的 ${selectedJobs.size} 个岗位`}
      </button>

      {/* 结果 */}
      {results && (
        <div className="mt-6 card p-6">
          <h3 className="font-semibold mb-3">投递结果</h3>
          <div className="space-y-2">
            {results.map((r, i) => (
              <div key={i} className={`text-sm p-2 rounded ${
                r.status === 'success' || r.status === 'submitted' || r.status === 'pending' ? 'bg-green-50 text-green-700' :
                r.status === 'skipped' ? 'bg-yellow-50 text-yellow-700' :
                'bg-red-50 text-red-700'}`}>
                {r.title ? `${r.company} - ${r.title}` : r.job_id}: {
                  r.status === 'success' ? '✅ 投递成功' :
                  r.status === 'submitted' ? '✅ 已提交' :
                  r.status === 'pending' ? '⏳ 等待自动投递' :
                  r.status === 'skipped' ? `⏭️ ${r.error || '已跳过'}` :
                  `❌ ${r.error || '投递失败'}`
                }
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
