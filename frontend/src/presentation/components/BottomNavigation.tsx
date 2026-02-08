import { Link, useLocation } from 'react-router-dom';

interface NavItem {
  path: string;
  icon: string;
  label: string;
  matchPaths?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { path: '/', icon: '🏠', label: '홈', matchPaths: ['/'] },
  { path: '/routes', icon: '📍', label: '경로', matchPaths: ['/routes', '/commute'] },
  { path: '/alerts', icon: '🔔', label: '알림', matchPaths: ['/alerts'] },
  { path: '/commute/dashboard', icon: '📊', label: '기록', matchPaths: ['/commute/dashboard'] },
  { path: '/settings', icon: '⚙️', label: '설정', matchPaths: ['/settings', '/notifications'] },
];

export function BottomNavigation() {
  const location = useLocation();

  const isActive = (item: NavItem): boolean => {
    if (item.matchPaths) {
      return item.matchPaths.some(path => {
        if (path === '/') return location.pathname === '/';
        return location.pathname.startsWith(path);
      });
    }
    return location.pathname === item.path;
  };

  // 로그인, 온보딩 등 특정 페이지에서는 숨김
  const hiddenPaths = ['/login', '/onboarding', '/auth/callback'];
  if (hiddenPaths.some(path => location.pathname.startsWith(path))) {
    return null;
  }

  return (
    <nav className="bottom-nav" role="navigation" aria-label="메인 메뉴">
      {NAV_ITEMS.map((item) => {
        const active = isActive(item);
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`bottom-nav-item ${active ? 'active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            <span className="bottom-nav-icon" aria-hidden="true">{item.icon}</span>
            <span className="bottom-nav-label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
