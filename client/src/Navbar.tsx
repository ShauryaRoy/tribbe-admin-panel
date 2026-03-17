import { Link, useLocation } from 'wouter';
import { clearToken } from './api';

export default function Navbar({ onLogout }: { onLogout: () => void }) {
  const [location] = useLocation();

  const handleLogout = () => {
    clearToken();
    onLogout();
  };

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/events', label: 'Events', icon: '🎉' },
    { href: '/discover-requests', label: 'Discover Requests', icon: '🔍' },
    { href: '/groups', label: 'Groups', icon: '👥' },
    { href: '/users', label: 'Users', icon: '👤' },
    { href: '/payments', label: 'Payments', icon: '💰' },
    { href: '/payouts', label: 'Payouts', icon: '💸' },
    { href: '/host-payment-details', label: 'Host Payment Info', icon: '🏦' },
    { href: '/analytics', label: 'Analytics', icon: '📈' },
    { href: '/audit-logs', label: 'Audit Logs', icon: '📜' },
  ];

  return (
    <div className="w-64 bg-gray-900 text-white p-6 flex flex-col h-screen sticky top-0 shadow-xl z-10">
      <div className="mb-10 flex items-center gap-3 px-2">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-lg">M</div>
        <h1 className="text-xl font-bold tracking-tight">Movo Admin</h1>
      </div>
      
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <div 
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group cursor-pointer ${
                location === item.href 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' 
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <span className="text-lg group-hover:scale-110 transition-transform">{item.icon}</span>
              <span className="font-medium text-sm">{item.label}</span>
            </div>
          </Link>
        ))}
      </nav>

      <div className="pt-6 border-t border-gray-800 mt-6">
        <button 
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-colors"
          onClick={handleLogout}
        >
          <span className="text-lg">🚪</span>
          <span className="font-medium text-sm">Logout</span>
        </button>
      </div>
    </div>
  );
}
