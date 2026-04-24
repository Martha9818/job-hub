import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.body?.message || '登录失败，请检查用户名和密码');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await login('demo', 'demo123');
      navigate('/');
    } catch (err) {
      setError('演示登录失败: ' + (err.body?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16 animate-fade-in">
      <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-6">登录</h1>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} required
              className="input" placeholder="请输入用户名" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="input" placeholder="请输入密码" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors">
            {loading ? '登录中...' : '登录'}
          </button>
        </form>

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
          <div className="relative flex justify-center"><span className="bg-white px-3 text-sm text-gray-400">或者</span></div>
        </div>

        <button onClick={handleDemoLogin} disabled={loading}
          className="w-full py-3 border-2 border-dashed border-primary-300 text-primary-600 rounded-lg font-medium hover:bg-primary-50 disabled:opacity-50 transition-colors">
          🎮 演示账号一键登录
        </button>
        <p className="text-center text-xs text-gray-400 mt-2">演示账号: demo / demo123</p>

        <p className="text-center text-sm text-gray-500 mt-4">
          没有账号？<Link to="/register" className="text-primary-600 hover:underline">立即注册</Link>
        </p>
      </div>
    </div>
  );
}
