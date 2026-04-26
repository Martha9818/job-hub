import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../lib/api';
import { useFavorites } from '../hooks/useFavorites';
import { useAppliedJobs } from '../hooks/useAppliedJobs';

export default function JobDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { markApplied, undoApplied, isApplied } = useAppliedJobs();
  const [job, setJob] = useState(null);
  const [relatedJobs, setRelatedJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiClient.get(`/jobs/${id}`).catch(() => null),
      apiClient.get(`/jobs?industry=机械&page_size=4`).catch(() => ({ data: [] })),
    ]).then(([jobRes, relatedRes]) => {
      if (jobRes) setJob(jobRes.data);
      if (relatedRes?.data) setRelatedJobs(relatedRes.data.filter(j => j.id !== id).slice(0, 3));
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-center py-20 text-gray-400">加载中...</div>;
  if (!job) return <div className="empty-state"><div className="empty-state-icon">😕</div><p className="empty-state-text">岗位未找到</p></div>;

  const matchLevelClass = job.match?.level === 'high'
    ? 'bg-green-50 text-green-700 border-green-200'
    : job.match?.level === 'medium'
      ? 'bg-blue-50 text-blue-700 border-blue-200'
      : 'bg-gray-50 text-gray-600 border-gray-200';
  const applied = isApplied(job.id);

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="btn-ghost btn-sm">← 返回</button>
        <Link to="/jobs" className="text-primary-600 hover:underline text-sm">岗位列表</Link>
      </div>
      
      <div className="card p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-6">
          <div className="flex-1">
            <div className="flex items-start gap-3">
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">{job.title}</h1>
              <button
                onClick={() => toggleFavorite(job.id)}
                className="shrink-0 p-1 hover:bg-gray-100 rounded-lg transition-colors"
                title={isFavorite(job.id) ? '取消收藏' : '收藏'}>
                {isFavorite(job.id) ? '❤️' : '🤍'}
              </button>
            </div>
            <p className="text-lg text-primary-600 font-medium">{job.company}</p>
          </div>
          <div className="text-left md:text-right">
            <div className="text-2xl font-bold text-red-500">{job.salary_text || '面议'}</div>
            {job.source_name && <div className="text-sm text-gray-400 mt-2">来源: {job.source_name}</div>}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-8 p-4 bg-gray-50 rounded-lg">
          {job.location && <div><span className="text-gray-500 text-sm">📍 工作地点</span><div className="font-medium mt-0.5">{job.location}</div></div>}
          {job.experience && <div><span className="text-gray-500 text-sm">📋 经验要求</span><div className="font-medium mt-0.5">{job.experience}</div></div>}
          <div><span className="text-gray-500 text-sm">🎓 学历要求</span><div className="font-medium mt-0.5">本科及以上</div></div>
          {job.industry && <div><span className="text-gray-500 text-sm">🏭 所属行业</span><div className="font-medium mt-0.5">{job.industry}</div></div>}
          {job.job_type && <div><span className="text-gray-500 text-sm">💼 工作类型</span><div className="font-medium mt-0.5">{job.job_type}</div></div>}
          {job.publish_date && <div><span className="text-gray-500 text-sm">📅 发布日期</span><div className="font-medium mt-0.5">{job.publish_date}</div></div>}
        </div>

        {job.match && (
          <div className={`mb-8 rounded-xl border p-4 ${matchLevelClass}`}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
              <div>
                <h2 className="text-lg font-semibold">岗位匹配分析</h2>
                <p className="text-sm opacity-80">基于默认简历画像生成，可在“我的简历”中调整标签</p>
              </div>
              <div className="text-2xl font-bold">匹配 {job.match.score}</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="bg-white/70 rounded-lg p-3">
                <div className="font-medium mb-1">技能</div>
                <p>{job.match.skills.matched.length ? `匹配：${job.match.skills.matched.join('、')}` : '暂无技能命中'}</p>
                {job.match.skills.missing.length > 0 && <p className="opacity-70 mt-1">未命中：{job.match.skills.missing.slice(0, 5).join('、')}</p>}
              </div>
              <div className="bg-white/70 rounded-lg p-3">
                <div className="font-medium mb-1">方向</div>
                <p>{job.match.directions.matched.length ? `匹配：${job.match.directions.matched.join('、')}` : '暂无方向命中'}</p>
                {job.match.directions.missing.length > 0 && <p className="opacity-70 mt-1">未命中：{job.match.directions.missing.slice(0, 5).join('、')}</p>}
              </div>
              <div className="bg-white/70 rounded-lg p-3">
                <div className="font-medium mb-1">城市与学历</div>
                <p>城市：{job.match.city.matched ? '匹配' : '未匹配'}{job.match.city.actual ? `（${job.match.city.actual}）` : ''}</p>
                <p className="mt-1">学历：{job.match.education.matched ? '匹配' : '待确认'}{job.match.education.actual ? `（${job.match.education.actual}）` : ''}</p>
              </div>
              <div className="bg-white/70 rounded-lg p-3">
                <div className="font-medium mb-1">质量与风险</div>
                <p>信息完整度：{job.match.quality.score}</p>
                {job.match.duplicate?.is_duplicate && <p className="mt-1">疑似重复岗位</p>}
                {job.match.risks.length > 0 && <p className="mt-1">风险词：{job.match.risks.join('、')}</p>}
                {job.match.risks.length === 0 && !job.match.duplicate?.is_duplicate && <p className="mt-1">未发现明显风险提示</p>}
              </div>
            </div>
          </div>
        )}

        {job.description && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">职位描述</h2>
            <div className="text-gray-600 whitespace-pre-wrap leading-relaxed text-sm md:text-base">{job.description}</div>
          </div>
        )}

        {job.requirements && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">任职要求</h2>
            <div className="text-gray-600 whitespace-pre-wrap leading-relaxed text-sm md:text-base">{job.requirements}</div>
          </div>
        )}

        {job.benefits && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">福利待遇</h2>
            <div className="text-gray-600 whitespace-pre-wrap leading-relaxed text-sm md:text-base">{job.benefits}</div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 mt-8 pt-6 border-t border-gray-200">
          {job.source_url && (
            <a href={job.source_url} target="_blank" rel="noopener noreferrer"
              className="btn-primary btn-lg rounded-xl text-center">
              {job.source_url.includes('zhipin.com') ? '🔍 打开招聘搜索页' : '🏢 打开招聘页'}
            </a>
          )}
          {applied ? (
            <div className="flex flex-col sm:flex-row gap-3">
              <button type="button" disabled className="btn-secondary btn-lg rounded-xl text-center text-green-700 bg-green-50 border-green-200">
                ✅ 已投递
              </button>
              <button type="button" onClick={() => undoApplied(job.id)}
                className="btn-secondary btn-lg rounded-xl text-center">
                撤销
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => markApplied(job)}
              className="btn-secondary btn-lg rounded-xl text-center">
              🚀 标记已投递
            </button>
          )}
        </div>

        {/* 合规声明 */}
        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-xs text-gray-500 leading-relaxed">
            ⚖️ <strong>免责声明</strong>：本页面信息来源于公开渠道聚合，仅供参考。薪资、岗位要求等信息以原始发布页面为准。
            请前往原始招聘页面核实信息并投递。本平台不对信息准确性、完整性或时效性承担责任。
            如发现信息有误，请及时反馈。
          </p>
        </div>
      </div>

      {/* 相关岗位 */}
      {relatedJobs.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">相关岗位推荐</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {relatedJobs.map(rj => (
              <Link key={rj.id} to={`/jobs/${rj.id}`} className="card-interactive p-4">
                <h3 className="font-medium text-gray-900 mb-1 truncate">{rj.title}</h3>
                <p className="text-sm text-primary-600 mb-1">{rj.company}</p>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">{rj.location}</span>
                  <span className="text-sm font-bold text-red-500">{rj.salary_text || '面议'}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
