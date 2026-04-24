import { useState, useEffect } from 'react';
import { apiClient } from '../lib/api';

// 合规风险等级颜色映射
const RISK_COLORS = {
  high: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', badge: 'bg-red-100 text-red-700' },
  medium: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', badge: 'bg-yellow-100 text-yellow-700' },
  low: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', badge: 'bg-green-100 text-green-700' },
  unknown: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', badge: 'bg-gray-100 text-gray-700' },
};

const RISK_LABELS = { high: '高风险', medium: '中风险', low: '低风险', unknown: '未知' };

export default function AdminPage() {
  const [sources, setSources] = useState([]);
  const [scheduler, setScheduler] = useState(null);
  const [complianceData, setComplianceData] = useState({});
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [scrapeResult, setScrapeResult] = useState(null);
  const [scrapeConfig, setScrapeConfig] = useState({
    source_id: '',
    keyword: '机械工程师',
    city: '',
    mode: 'compliant',
  });
  const [showRiskConfirm, setShowRiskConfirm] = useState(false);
  const [showCompliancePanel, setShowCompliancePanel] = useState(false);

  const loadData = () => {
    Promise.all([
      apiClient.get('/scraper/status').catch(() => ({ data: { sources: [], active_tasks: [] } })),
      apiClient.get('/scheduler/status').catch(() => ({ data: null })),
      apiClient.get('/scraper/compliance').catch(() => ({ data: {} })),
    ]).then(([scraperRes, schedulerRes, compRes]) => {
      setSources(scraperRes.data?.sources || []);
      setScheduler(schedulerRes.data);
      setComplianceData(compRes.data || {});
    }).finally(() => setLoading(false));
  };

  useEffect(loadData, []);

  const handleScrape = async (acknowledgeRisk = false) => {
    setScraping(true);
    setScrapeResult(null);
    setShowRiskConfirm(false);
    try {
      const payload = { ...scrapeConfig, acknowledge_risk: acknowledgeRisk };
      const res = await apiClient.post('/scraper/run', payload);
      setScrapeResult(res.data?.data || res.data);
      loadData();
    } catch (err) {
      const errData = err.body || {};
      if (errData.code === 'COMPLIANCE_BLOCKED') {
        setScrapeResult([{
          error: `⛔ 合规拦截: ${errData.message}`,
          recommendation: errData.suggestion,
          compliance: errData.compliance,
        }]);
      } else if (errData.code === 'RISK_ACKNOWLEDGEMENT_REQUIRED') {
        setShowRiskConfirm(errData);
      } else {
        setScrapeResult([{ error: errData.message || err.message }]);
      }
    } finally {
      setScraping(false);
    }
  };

  const handleScheduler = async (action) => {
    try {
      await apiClient.post(`/scheduler/${action}`, {});
      loadData();
    } catch (err) {
      alert(err.body?.message || '操作失败');
    }
  };

  const handleCleanup = async () => {
    if (!confirm('确定清理30天前的过期岗位？')) return;
    try {
      const res = await apiClient.post('/scraper/cleanup', { days: 30 });
      alert(res.message);
      loadData();
    } catch (err) {
      alert('清理失败');
    }
  };

  const toggleSource = async (sourceId, isActive) => {
    try {
      await apiClient.put(`/scraper/sources/${sourceId}`, { is_active: !isActive });
      loadData();
    } catch (err) {
      alert('操作失败');
    }
  };

  if (loading) return <div className="text-center py-20 text-gray-400">加载中...</div>;

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">⚙️ 数据管理</h1>

      {/* 合规提醒横幅 */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <span className="text-xl">⚖️</span>
          <div className="flex-1">
            <h3 className="font-semibold text-amber-800 mb-1">合规提醒</h3>
            <p className="text-sm text-amber-700 mb-2">
              抓取招聘网站数据可能违反其服务条款。系统已内置合规检查机制，默认仅允许低风险数据源自动爬取。
            </p>
            <div className="flex gap-3 text-xs">
              <span className="px-2 py-1 rounded bg-green-100 text-green-700">低风险 = 可自动爬取</span>
              <span className="px-2 py-1 rounded bg-red-100 text-red-700">高风险 = 需手动确认</span>
            </div>
          </div>
          <button onClick={() => setShowCompliancePanel(!showCompliancePanel)}
            className="text-xs text-amber-700 hover:underline whitespace-nowrap">
            {showCompliancePanel ? '收起详情' : '查看详情'}
          </button>
        </div>

        {/* 合规详情面板 */}
        {showCompliancePanel && (
          <div className="mt-4 pt-4 border-t border-amber-200 space-y-3">
            <h4 className="font-medium text-amber-800 text-sm">各数据源合规评估</h4>
            {Object.entries(complianceData).map(([id, info]) => {
              const risk = info.riskLevel || 'unknown';
              const colors = RISK_COLORS[risk];
              return (
                <div key={id} className={`${colors.bg} ${colors.border} border rounded-lg p-3`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors.badge}`}>
                      {RISK_LABELS[risk]}
                    </span>
                    <span className="font-medium text-sm">{info.name}</span>
                  </div>
                  <div className="text-xs text-gray-600 space-y-0.5">
                    <div>robots.txt 合规: {info.robotsCompliant ? '✅ 是' : '❌ 否'}</div>
                    <div>用户协议合规: {info.tosCompliant ? '✅ 是' : '❌ 否'}</div>
                    {info.recommendation && <div className="mt-1 text-amber-700">💡 {info.recommendation}</div>}
                  </div>
                </div>
              );
            })}
            <div className="text-xs text-amber-600 mt-2">
              <strong>合规建议：</strong>
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                <li>优先使用官方API或合作渠道获取数据</li>
                <li>只抓取公开可浏览的岗位信息（标题、薪资、要求）</li>
                <li>不抓取HR联系方式等个人信息</li>
                <li>数据仅供个人求职使用，不做二次分发</li>
                <li>如不确定，可手动录入岗位信息（完全合规）</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* 调度状态 */}
      <div className="card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">定时爬取</h2>
          <div className="flex gap-2">
            {scheduler?.scheduled ? (
              <button onClick={() => handleScheduler('stop')} className="btn-danger btn-sm">停止</button>
            ) : (
              <button onClick={() => handleScheduler('start')} className="btn-primary btn-sm">启动</button>
            )}
            <button onClick={() => handleScheduler('run-now')} className="btn-secondary btn-sm" disabled={scraping}>
              立即执行一次
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>
            <span className="text-gray-500">状态:</span>
            <span className={`ml-2 font-medium ${scheduler?.scheduled ? 'text-green-600' : 'text-gray-400'}`}>
              {scheduler?.scheduled ? '✅ 运行中' : '⏸️ 已停止'}
            </span>
          </div>
          <div>
            <span className="text-gray-500">正在爬取:</span>
            <span className="ml-2 font-medium">{scheduler?.is_running ? '🔄 是' : '—'}</span>
          </div>
        </div>
      </div>

      {/* 手动爬取 */}
      <div className="card p-5 mb-6">
        <h2 className="text-lg font-semibold mb-4">手动爬取</h2>

        {/* 爬取模式选择 */}
        <div className="flex items-center gap-4 mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="mode" value="compliant" checked={scrapeConfig.mode === 'compliant'}
              onChange={e => setScrapeConfig(p => ({ ...p, mode: e.target.value }))} />
            <span className="text-sm font-medium text-green-700">🟢 合规模式</span>
            <span className="text-xs text-gray-500">（仅低风险数据源，遵守robots.txt）</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="mode" value="manual" checked={scrapeConfig.mode === 'manual'}
              onChange={e => setScrapeConfig(p => ({ ...p, mode: e.target.value }))} />
            <span className="text-sm font-medium text-amber-700">🟡 手动模式</span>
            <span className="text-xs text-gray-500">（需确认风险，自行承担法律责任）</span>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <select value={scrapeConfig.source_id} onChange={e => setScrapeConfig(p => ({ ...p, source_id: e.target.value }))}
            className="select">
            <option value="">{scrapeConfig.mode === 'compliant' ? '合规数据源' : '全部数据源'}</option>
            {sources.map(s => {
              const risk = s.compliance?.riskLevel || 'unknown';
              const blocked = scrapeConfig.mode === 'compliant' && risk === 'high';
              return (
                <option key={s.id} value={s.id} disabled={blocked}>
                  {risk === 'high' ? '⛔' : risk === 'low' ? '✅' : '⚠️'} {s.name}
                  {blocked ? ' (合规模式不可用)' : ''}
                </option>
              );
            })}
          </select>
          <input type="text" value={scrapeConfig.keyword} onChange={e => setScrapeConfig(p => ({ ...p, keyword: e.target.value }))}
            placeholder="关键词" className="input" />
          <input type="text" value={scrapeConfig.city} onChange={e => setScrapeConfig(p => ({ ...p, city: e.target.value }))}
            placeholder="城市（可选）" className="input" />
          <button onClick={() => handleScrape(false)} disabled={scraping}
            className={`btn-primary ${scrapeConfig.mode === 'manual' ? '!bg-amber-600 hover:!bg-amber-700' : ''}`}>
            {scraping ? '爬取中...' : scrapeConfig.mode === 'compliant' ? '🔍 合规爬取' : '⚠️ 手动爬取'}
          </button>
        </div>

        {/* 风险确认弹窗 */}
        {showRiskConfirm && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-red-800 mb-2">⚠️ 法律风险确认</h3>
            <p className="text-sm text-red-700 mb-3">
              手动爬取模式可能涉及以下法律风险，请仔细阅读：
            </p>
            <ul className="text-sm text-red-700 space-y-1 mb-4 list-disc list-inside">
              {(showRiskConfirm.risks || []).map((risk, i) => (
                <li key={i}>{risk}</li>
              ))}
            </ul>
            <h4 className="font-medium text-green-700 text-sm mb-2">✅ 更安全的替代方案：</h4>
            <ul className="text-sm text-green-700 space-y-1 mb-4 list-disc list-inside">
              {(showRiskConfirm.safe_alternatives || []).map((alt, i) => (
                <li key={i}>{alt}</li>
              ))}
            </ul>
            <div className="flex gap-3">
              <button onClick={() => handleScrape(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">
                我已了解风险，继续手动爬取
              </button>
              <button onClick={() => setShowRiskConfirm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300">
                取消
              </button>
            </div>
          </div>
        )}

        {scrapeResult && (
          <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2">
            <h3 className="font-medium">爬取结果</h3>
            {(Array.isArray(scrapeResult) ? scrapeResult : [scrapeResult]).map((r, i) => (
              <div key={i} className={`p-2 rounded ${r.error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                {r.error ? (
                  <div>
                    <div>❌ {r.error}</div>
                    {r.recommendation && <div className="mt-1 text-amber-600">💡 {r.recommendation}</div>}
                  </div>
                ) : (
                  <div>{r.source_id || r.source}: 发现 {r.found} 个, 入库 {r.saved} 个 {r.compliant ? '✅合规' : ''}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 数据源列表 */}
      <div className="card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">数据源</h2>
          <button onClick={handleCleanup} className="btn-secondary btn-sm">🗑️ 清理过期岗位</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-2 font-medium text-gray-500">名称</th>
                <th className="text-left py-3 px-2 font-medium text-gray-500">网站</th>
                <th className="text-center py-3 px-2 font-medium text-gray-500">合规风险</th>
                <th className="text-left py-3 px-2 font-medium text-gray-500">类型</th>
                <th className="text-right py-3 px-2 font-medium text-gray-500">岗位数</th>
                <th className="text-left py-3 px-2 font-medium text-gray-500">最近爬取</th>
                <th className="text-center py-3 px-2 font-medium text-gray-500">状态</th>
                <th className="text-center py-3 px-2 font-medium text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody>
              {sources.map(s => {
                const risk = s.compliance?.riskLevel || 'unknown';
                const colors = RISK_COLORS[risk];
                return (
                  <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-2 font-medium">{s.name}</td>
                    <td className="py-3 px-2">
                      <a href={s.website} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline text-xs">
                        {s.website?.replace(/^https?:\/\//, '').slice(0, 25)}
                      </a>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors.badge}`}>
                        {RISK_LABELS[risk]}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <span className={`badge ${s.scraper_type === 'playwright' ? 'badge-primary' : 'badge-gray'}`}>
                        {s.scraper_type}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right font-medium">{s.job_count || 0}</td>
                    <td className="py-3 px-2 text-xs text-gray-500">{s.last_crawled_at ? new Date(s.last_crawled_at).toLocaleString() : '—'}</td>
                    <td className="py-3 px-2 text-center">
                      <span className={s.is_active ? 'text-green-600' : 'text-gray-400'}>
                        {s.is_active ? '✅ 启用' : '⏸️ 停用'}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <button onClick={() => toggleSource(s.id, s.is_active)}
                        className="text-xs text-primary-600 hover:underline">
                        {s.is_active ? '停用' : '启用'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 手动录入入口 */}
      <div className="card p-5 mb-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">✍️</span>
          <div className="flex-1">
            <h2 className="text-lg font-semibold">手动录入岗位</h2>
            <p className="text-sm text-gray-500">完全合规的方式——你在招聘网站看到感兴趣的岗位，手动录入系统管理</p>
          </div>
          <a href="/jobs" className="btn-primary btn-sm">去录入</a>
        </div>
      </div>
    </div>
  );
}
