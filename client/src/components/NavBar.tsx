import { Link, useLocation } from 'wouter';

export default function NavBar() {
  const [location, setLocation] = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('admin_jwt');
    setLocation('/login');
  };

  const isActive = (path: string) => location === path;

  return (
    <nav className="navbar">
      <div className="navbar-brand">Tribbe Admin</div>
      <div className="navbar-links">
        <Link
          href="/dashboard"
          className={`navbar-link ${isActive('/dashboard') ? 'active' : ''}`}
        >
          Dashboard
        </Link>
        <Link
          href="/events"
          className={`navbar-link ${isActive('/events') ? 'active' : ''}`}
        >
          Events
        </Link>
        <Link
          href="/groups"
          className={`navbar-link ${isActive('/groups') ? 'active' : ''}`}
        >
          Groups
        </Link>
        <Link
          href="/audit-logs"
          className={`navbar-link ${isActive('/audit-logs') ? 'active' : ''}`}
        >
          Audit Logs
        </Link>
        <button onClick={handleLogout} className="btn-logout">
          Logout
        </button>
      </div>
    </nav>
  );
}
