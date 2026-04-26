import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="mt-10 border-t border-white/60 bg-white/80 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span>🔧</span>
              <span className="font-semibold text-gray-800">JobHub 机械</span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              机械行业招聘信息聚合平台，帮助你更快筛选岗位并直达企业招聘页面。
            </p>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-500">
            <Link to="/jobs" className="hover:text-primary-600 transition-colors">岗位搜索</Link>
            <Link to="/campus" className="hover:text-primary-600 transition-colors">校招实习</Link>
            <Link to="/applications" className="hover:text-primary-600 transition-colors">投递记录</Link>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400 leading-relaxed">
          本平台仅聚合公开招聘信息，不存储个人隐私数据。岗位详情及投递规则以企业原始招聘页面为准。
        </div>
      </div>
    </footer>
  );
}
