import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="mt-12 border-t border-gray-200 bg-white py-6">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-center md:text-left">
            <div className="flex items-center gap-2 justify-center md:justify-start mb-2">
              <span className="text-lg">🔧</span>
              <span className="font-bold text-gray-700">JobHub</span>
              <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">机械</span>
            </div>
            <p className="text-xs text-gray-400 max-w-md">
              机械行业招聘信息聚合平台 — 自动聚合公开渠道招聘信息，助力机械人求职
            </p>
          </div>

          <div className="flex flex-wrap gap-4 text-xs text-gray-400">
            <Link to="/jobs" className="hover:text-gray-600">岗位搜索</Link>
            <Link to="/campus" className="hover:text-gray-600">校招实习</Link>
            <Link to="/admin" className="hover:text-gray-600">数据管理</Link>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 text-center leading-relaxed">
            ⚖️ 合规声明：本平台仅聚合公开渠道招聘信息，不存储个人隐私数据。所有岗位信息均来自公司官方招聘页面或公开公众号，
            薪资待遇以原始发布为准。如信息有误或需删除，请联系我们。本平台不对自动投递功能的合规性负责，请遵守各招聘网站服务条款。
          </p>
          <p className="text-xs text-gray-300 text-center mt-2">
            © 2026 JobHub — 仅供学习交流使用
          </p>
        </div>
      </div>
    </footer>
  );
}
