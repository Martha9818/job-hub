import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  const navLink = (to, label) => (
    <Link to={to}
      className={`font-medium transition-colors ${isActive(to) ? 'text-primary-600' : 'text-gray-600 hover:text-primary-600'}`}>
      {label}
    </Link>
  );

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 text-xl font-bold text-primary-700 shrink-0">
          <span className="text-2xl">🔧</span>
          <span className="hidden sm:inline">JobHub</span>
          <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">机械</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-6">
          {navLink('/jobs', '岗位搜索')}
          {navLink('/campus', '校招实习')}
          {user ? (
            <>
              {navLink('/resumes', '我的简历')}
              {navLink('/applications', '投递记录')}
              {navLink('/admin', '数据管理')}
              <Link to="/apply" className="btn-primary btn-sm">
                一键投递
              </Link>
              <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                <span className="text-sm text-gray-500">{user.username}</span>
                <button onClick={logout} className="text-sm text-gray-400 hover:text-red-500 transition-colors">退出</button>
              </div>
            </>
          ) : (
            <>
              {navLink('/login', '登录')}
              <Link to="/register" className="btn-primary btn-sm">注册</Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button className="md:hidden p-2 text-gray-600" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white px-4 py-3 space-y-2">
          <Link to="/jobs" onClick={() => setMobileOpen(false)} className="block py-2 text-gray-700 font-medium">🔍 岗位搜索</Link>
          <Link to="/campus" onClick={() => setMobileOpen(false)} className="block py-2 text-gray-700 font-medium">🎓 校招实习</Link>
          {user ? (
            <>
              <Link to="/resumes" onClick={() => setMobileOpen(false)} className="block py-2 text-gray-700 font-medium">📄 我的简历</Link>
              <Link to="/applications" onClick={() => setMobileOpen(false)} className="block py-2 text-gray-700 font-medium">📬 投递记录</Link>
              <Link to="/admin" onClick={() => setMobileOpen(false)} className="block py-2 text-gray-700 font-medium">⚙️ 数据管理</Link>
              <Link to="/apply" onClick={() => setMobileOpen(false)} className="block py-2 text-primary-600 font-medium">🚀 一键投递</Link>
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <span className="text-sm text-gray-500">{user.username}</span>
                <button onClick={() => { logout(); setMobileOpen(false); }} className="text-sm text-red-500">退出</button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setMobileOpen(false)} className="block py-2 text-gray-700 font-medium">登录</Link>
              <Link to="/register" onClick={() => setMobileOpen(false)} className="block py-2 text-primary-600 font-medium">注册</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
