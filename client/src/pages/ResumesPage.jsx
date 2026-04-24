import { useState, useEffect, useRef } from 'react';
import { apiClient } from '../lib/api';

export default function ResumesPage() {
  const [resumes, setResumes] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const fileRef = useRef();

  const loadResumes = () => {
    apiClient.get('/resumes').then(res => setResumes(res.data || [])).catch(() => {});
  };
  useEffect(loadResumes, []);

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
            <div key={r.id} className={`bg-white rounded-xl p-5 shadow-sm border ${r.is_default ? 'border-primary-300 ring-1 ring-primary-200' : 'border-gray-100'} flex items-center justify-between`}>
              <div className="flex items-center gap-4">
                <span className="text-3xl">📄</span>
                <div>
                  <p className="font-medium text-gray-900">{r.filename}</p>
                  <p className="text-sm text-gray-500">{(r.file_size / 1024).toFixed(1)} KB · {new Date(r.created_at).toLocaleDateString()}</p>
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
          ))}
        </div>
      )}
    </div>
  );
}
