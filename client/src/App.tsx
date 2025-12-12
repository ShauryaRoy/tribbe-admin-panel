import { useState, useEffect } from 'react';
import { Route, Switch, Redirect } from 'wouter';
import Login from './Login';
import Navbar from './Navbar';
import Dashboard from './pages/Dashboard';
import Events from './pages/Events';
import DiscoverRequests from './pages/DiscoverRequests';
import Users from './pages/Users';
import Groups from './pages/Groups';
import Analytics from './pages/Analytics';
import AuditLogs from './pages/AuditLogs';
import PaymentsDashboard from './pages/PaymentsDashboard';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    setIsAuthenticated(!!token);
  }, []);

  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className='flex min-h-screen bg-gray-50 font-sans'>
      <Navbar onLogout={() => setIsAuthenticated(false)} />
      <div className='flex-1 p-8 overflow-y-auto h-screen'>
        <Switch>
          <Route path='/dashboard' component={Dashboard} />
          <Route path='/events' component={Events} />
          <Route path='/discover-requests' component={DiscoverRequests} />
          <Route path='/users' component={Users} />
          <Route path='/groups' component={Groups} />
          <Route path='/payments' component={PaymentsDashboard} />
          <Route path='/analytics' component={Analytics} />
          <Route path='/audit-logs' component={AuditLogs} />
          <Route path='/'><Redirect to='/dashboard' /></Route>
        </Switch>
      </div>
    </div>
  );
}
