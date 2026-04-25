import { useState, useEffect, useRef } from 'react';
import { apiClient } from '../lib/api';

export default function ResumesPage() {
  const [resumes, setResumes] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [drafts, setDrafts] = useState({});
  const [parseText, setParseText] = useState({});
  const fileRef = useRef();

  const loadResumes = () => {
    apiClient.get('/resumes').then(res => {
      const items = res.data || [];
      setResumes(items);
      const nextDrafts = {};
      items.forEach(item => {
        nextDrafts[item.id] = profileToDraft(item.profile);
      });
      setDrafts(nextDrafts);
    }).catch(() => {});
  };
  useEffect(loadResumes, []);

  const profileToDraft = (profile = {}) => ({
    name: profile.name || '',
    education: profile.education || '',
    years: profile.years || 0,
    target_salary_min: profile.target_salary_min || 0,
    target_cities: (profile.target_cities || []).join('，'),
    skills: (profile.skills || []).join('，'),
    directions: (profile.directions || []).join('，'),
    notes: profile.notes || '',
  });

  const draftToProfile = (draft = {}) => ({
    ...draft,
    years: Number(draft.years) || 0,
    target_salary_min: Number(draft.target_salary_min) || 0,
    target_cities: draft.target_cities || '',
    skills: draft.skills || '',
    directions: draft.directions || '',
  });

  const updateDraft = (id, key, value) => {
    setDrafts(prev => ({ ...prev, [id]: { ...(prev[id] || {}), [key]: value } }));
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setMessage('');
    try {
      await apiClient.upload('/resumes/upload', file);
      setMessage('上传成功！');
      loadResumes();
    } catch (err) {
      setMessage(err.body?.message || '上传失败');
    } finally { setUploading(false); }
  };

  const setDefault = async (id) => {
    await apiClient.put(`/resumes/${id}/default`, {});
    loadResumes();
  };

  const deleteResume = async (id) => {
    if (!confirm('确定删除此简历？')) return;
    await apiClient.delete(`/resumes/${id}`);
    loadResumes();
  };

  const parseProfile = async (id) => {
    const text = parseText[id]?.trim();
    if (!text) return setMessage('请先粘贴简历文本或关键经历');
    const res = await apiClient.post(`/resumes/${id}/parse-text`, { text });
    setDrafts(prev => ({ ...prev, [id]: profileToDraft(res.data) }));
    setMessage('简历画像已解析，请检查后保存');
    loadResumes();
  };

  const saveProfile = async (id) => {
    await apiClient.put(`/resumes/${id}/profile`, draftToProfile(drafts[id]));
    setMessage('简历画像已保存');
    loadResumes();
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">我的简历</h1>
      
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
        <label className="block mb-3 text-sm font-medium text-gray-700">上传新简历（支持 PDF/DOC/DOCX，最大10MB）</label>
        <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" onChange={handleUpload} className="hidden" />
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
          {uploading ? '上传中...' : '📄 选择文件上传'}
        </button>
        {message && <p className={`mt-3 text-sm ${message.includes('成功') ? 'text-green-600' : 'text-red-600'}`}>{message}</p>}
      </div>

      {resumes.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-4">📄</div>
          <p>暂无简历，请先上传</p>
        </div>
      ) : (
        <div className="space-y-3">
          {resumes.map(r => (
            <div key={r.id} className={`bg-white rounded-xl p-5 shadow-sm border ${r.is_default ? 'border-primary-300 ring-1 ring-primary-200' : 'border-gray-100'}`}>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
                <div className="flex items-center gap-4">
                  <span className="text-3xl">📄</span>
                  <div>
                    <p className="font-medium text-gray-900">{r.filename}</p>
                    <p className="text-sm text-gray-500">{(r.file_size / 1024).toFixed(1)} KB · {new Date(r.created_at).toLocaleDateString()} · {r.parse_status === 'confirmed' ? '画像已确认' : r.parse_status === 'parsed' ? '已解析待确认' : '待完善画像'}</p>
                  </div>
                  {r.is_default && <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded-full">默认</span>}
                </div>
                <div className="flex gap-2">
                  {!r.is_default && (
                    <button onClick={() => setDefault(r.id)} className="text-sm text-primary-600 hover:underline">设为默认</button>
                  )}
                  <button onClick={() => deleteResume(r.id)} className="text-sm text-red-500 hover:underline">删除</button>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-5">
                <h2 className="font-semibold text-gray-900 mb-3">简历画像</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <input className="input" placeholder="姓名" value={drafts[r.id]?.name || ''} onChange={e => updateDraft(r.id, 'name', e.target.value)} />
                  <select className="select" value={drafts[r.id]?.education || ''} onChange={e => updateDraft(r.id, 'education', e.target.value)}>
                    <option value="">学历</option>
                    <option value="大专">大专</option>
                    <option value="本科">本科</option>
                    <option value="硕士">硕士</option>
                    <option value="博士">博士</option>
                  </select>
                  <input className="input" type="number" min="0" placeholder="工作/项目经验年限" value={drafts[r.id]?.years || ''} onChange={e => updateDraft(r.id, 'years', e.target.value)} />
                  <input className="input" type="number" min="0" placeholder="期望最低月薪，例如 10000" value={drafts[r.id]?.target_salary_min || ''} onChange={e => updateDraft(r.id, 'target_salary_min', e.target.value)} />
                  <input className="input md:col-span-2" placeholder="目标城市，用逗号分隔，例如 上海，苏州" value={drafts[r.id]?.target_cities || ''} onChange={e => updateDraft(r.id, 'target_cities', e.target.value)} />
                  <input className="input md:col-span-2" placeholder="技能标签，用逗号分隔，例如 SolidWorks，AutoCAD，液压" value={drafts[r.id]?.skills || ''} onChange={e => updateDraft(r.id, 'skills', e.target.value)} />
                  <input className="input md:col-span-2" placeholder="求职方向，用逗号分隔，例如 机械设计，结构设计" value={drafts[r.id]?.directions || ''} onChange={e => updateDraft(r.id, 'directions', e.target.value)} />
                  <textarea className="input md:col-span-2 min-h-20" placeholder="补充说明，例如项目经历、偏好行业、避雷方向" value={drafts[r.id]?.notes || ''} onChange={e => updateDraft(r.id, 'notes', e.target.value)} />
                </div>

                <div className="bg-gray-50 rounded-lg p-3 mb-3">
                  <label className="block text-xs text-gray-500 mb-2">粘贴简历文本或关键经历，系统会用规则提取技能、方向、城市和学历</label>
                  <textarea className="input min-h-24 bg-white" value={parseText[r.id] || ''} onChange={e => setParseText(prev => ({ ...prev, [r.id]: e.target.value }))} placeholder="例如：本科机械设计制造及其自动化，熟练 SolidWorks、AutoCAD，目标城市上海，方向机械设计..." />
                  <button onClick={() => parseProfile(r.id)} className="btn-secondary btn-sm mt-3">解析到画像</button>
                </div>

                <button onClick={() => saveProfile(r.id)} className="btn-primary btn-sm">保存画像</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
