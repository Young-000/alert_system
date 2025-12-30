import { Link, useNavigate } from 'react-router-dom';
import { Button } from './Button';

export function Header() {
  const navigate = useNavigate();
  const userId = localStorage.getItem('userId');

  const handleLogout = () => {
    localStorage.removeItem('userId');
    navigate('/login');
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center">
            <h1 className="text-xl font-bold text-primary">Alert System</h1>
          </Link>
          
          <nav className="flex items-center space-x-4">
            {userId ? (
              <>
                <Link to="/alerts" className="text-gray-700 hover:text-primary transition-colors">
                  알림 설정
                </Link>
                <Button variant="secondary" onClick={handleLogout}>
                  로그아웃
                </Button>
              </>
            ) : (
              <Link to="/login">
                <Button variant="primary">로그인</Button>
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
