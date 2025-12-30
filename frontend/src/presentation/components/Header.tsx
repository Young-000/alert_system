import { Link, useNavigate } from 'react-router-dom';

export function Header() {
  const navigate = useNavigate();
  const userId = localStorage.getItem('userId');

  const handleLogout = () => {
    localStorage.removeItem('userId');
    navigate('/login');
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10 safe-area-top">
      <div className="max-w-md mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <Link to="/" className="flex items-center">
            <h1 className="text-lg font-bold text-primary">Alert</h1>
          </Link>
          
          {userId && (
            <button
              onClick={handleLogout}
              className="text-sm text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              로그아웃
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
