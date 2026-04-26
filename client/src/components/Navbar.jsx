import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const NAV_ITEMS = [
  { to: '/jobs', label: '岗位搜索' },
  { to: '/campus', label: '校招实习' },
];

const AUTH_NAV_ITEMS = [
  { to: '/resumes', label: '我的简历' },
  { to: '/applications', label: '投递记录' },
  { to: '/admin', label: '数据管理' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(`${path}/`);

  const navClass = (path) => (
    `relative text-sm font-medium px-3 py-2 rounded-lg transition-all ${
      isActive(path)
        ? 'text-primary-700 bg-primary-50'
        : 'text-gray-600 hover:text-primary-700 hover:bg-primary-50/70'
    }`
  );

  return (
    <header className="sticky top-0 z-50 border-b border-white/60 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <span className="text-xl">🔧</span>
          <span className="text-xl font-bold text-primary-700">JobHub</span>
          <span className="text-[11px] font-medium bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">机械</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <Link key={item.to} to={item.to} className={navClass(item.to)}>
              {item.label}
            </Link>
          ))}

          {user ? (
            <>
              {AUTH_NAV_ITEMS.map((item) => (
                <Link key={item.to} to={item.to} className={navClass(item.to)}>
                  {item.label}
                </Link>
              ))}
              <Link to="/apply" className="btn-primary btn-sm ml-2">
                投递中心
              </Link>
              <div className="ml-3 pl-3 border-l border-gray-200 flex items-center gap-3">
                <span className="text-sm text-gray-500">{user.username}</span>
                <button onClick={logout} className="text-sm text-gray-400 hover:text-red-500 transition-colors">
                  退出
                </button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className={navClass('/login')}>
                登录
              </Link>
              <Link to="/register" className="btn-primary btn-sm ml-2">
                注册
              </Link>
            </>
          )}
        </nav>

        <button
          className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-label="切换菜单"
        >
          {mobileOpen ? '✕' : '☰'}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden px-4 pb-4 border-t border-gray-100 bg-white/95">
          <div className="pt-3 space-y-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={`block ${navClass(item.to)}`}
              >
                {item.label}
              </Link>
            ))}
            {user ? (
              <>
                {AUTH_NAV_ITEMS.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={`block ${navClass(item.to)}`}
                  >
                    {item.label}
                  </Link>
                ))}
                <Link to="/apply" onClick={() => setMobileOpen(false)} className="block btn-primary btn-sm mt-2 text-center">
                  投递中心
                </Link>
                <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100">
                  <span className="text-sm text-gray-500">{user.username}</span>
                  <button
                    onClick={() => { logout(); setMobileOpen(false); }}
                    className="text-sm text-red-500"
                  >
                    退出
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobileOpen(false)} className={`block ${navClass('/login')}`}>
                  登录
                </Link>
                <Link to="/register" onClick={() => setMobileOpen(false)} className="block btn-primary btn-sm mt-2 text-center">
                  注册
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
