import { useEffect, useState } from 'react';
import { api } from '../api';

interface Stats {
  totalEvents: number;
  pendingEvents: number;
  approvedEvents: number;
  rejectedEvents: number;
  totalGroups: number;
  totalUsers: number;
  bannedUsers: number;
  approvedEventsRate?: number;
  rejectedEventsRate?: number;
  avgMembersPerGroup?: number;
  bannedUsersRate?: number;
}

interface AnalyticsData {
  date: string;
  count: number;
}

export default function Analytics() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [eventsData, setEventsData] = useState<AnalyticsData[]>([]);
  const [groupsData, setGroupsData] = useState<AnalyticsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    loadData();
  }, [days]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, eventsRes, groupsRes] = await Promise.all([
        api.getDashboardStats(),
        api.getEventsAnalytics(days),
        api.getGroupsAnalytics(days)
      ]);
      setStats(statsRes);
      setEventsData(eventsRes);
      setGroupsData(groupsRes);
    } catch (error) {
      console.error('Failed to load analytics', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>
  );
  
  if (!stats) return <div className="text-center p-8 text-gray-500">No data available</div>;

  const totalEventsInPeriod = eventsData.reduce((sum, d) => sum + d.count, 0);
  const totalGroupsInPeriod = groupsData.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-500 mt-1">Overview of platform performance</p>
        </div>
        <div className="flex bg-white rounded-lg shadow-sm border border-gray-200 p-1">
          <button 
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${days === 7 ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:text-gray-900'}`}
            onClick={() => setDays(7)}
          >
            7 Days
          </button>
          <button 
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${days === 30 ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:text-gray-900'}`}
            onClick={() => setDays(30)}
          >
            30 Days
          </button>
          <button 
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${days === 90 ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:text-gray-900'}`}
            onClick={() => setDays(90)}
          >
            90 Days
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500">Total Events</h3>
          <div className="mt-2 flex items-baseline">
            <span className="text-3xl font-semibold text-gray-900">{stats.totalEvents}</span>
            <span className="ml-2 text-sm font-medium text-green-600">+{totalEventsInPeriod}</span>
          </div>
          <p className="mt-1 text-xs text-gray-500">in last {days} days</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500">Pending Approval</h3>
          <div className="mt-2 flex items-baseline">
            <span className="text-3xl font-semibold text-gray-900">{stats.pendingEvents}</span>
          </div>
          <p className="mt-1 text-xs text-gray-500">Events waiting for review</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500">Total Groups</h3>
          <div className="mt-2 flex items-baseline">
            <span className="text-3xl font-semibold text-gray-900">{stats.totalGroups}</span>
            <span className="ml-2 text-sm font-medium text-green-600">+{totalGroupsInPeriod}</span>
          </div>
          <p className="mt-1 text-xs text-gray-500">in last {days} days</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500">Total Users</h3>
          <div className="mt-2 flex items-baseline">
            <span className="text-3xl font-semibold text-gray-900">{stats.totalUsers}</span>
          </div>
          <p className="mt-1 text-xs text-red-500">{stats.bannedUsers} banned users</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Events Created</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-900 font-medium border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3 text-right">Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {eventsData.length > 0 ? eventsData.slice(-10).reverse().map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-3">{new Date(item.date).toLocaleDateString()}</td>
                    <td className="px-6 py-3 text-right font-medium">{item.count}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={2} className="px-6 py-8 text-center text-gray-500">No events data available</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Groups Created</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-900 font-medium border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3 text-right">Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {groupsData.length > 0 ? groupsData.slice(-10).reverse().map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-3">{new Date(item.date).toLocaleDateString()}</td>
                    <td className="px-6 py-3 text-right font-medium">{item.count}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={2} className="px-6 py-8 text-center text-gray-500">No groups data available</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500">Approval Rate</h3>
          <div className="mt-2 text-3xl font-semibold text-gray-900">
            {stats.totalEvents > 0 ? Math.round((stats.approvedEvents / stats.totalEvents) * 100) : 0}%
          </div>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className="bg-green-500 h-1.5 rounded-full" 
              style={{ width: `${stats.totalEvents > 0 ? (stats.approvedEvents / stats.totalEvents) * 100 : 0}%` }}
            ></div>
          </div>
          <p className="mt-2 text-xs text-gray-500">{stats.approvedEvents} of {stats.totalEvents} approved</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500">Rejection Rate</h3>
          <div className="mt-2 text-3xl font-semibold text-gray-900">
            {stats.totalEvents > 0 ? Math.round((stats.rejectedEvents / stats.totalEvents) * 100) : 0}%
          </div>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className="bg-red-500 h-1.5 rounded-full" 
              style={{ width: `${stats.totalEvents > 0 ? (stats.rejectedEvents / stats.totalEvents) * 100 : 0}%` }}
            ></div>
          </div>
          <p className="mt-2 text-xs text-gray-500">{stats.rejectedEvents} of {stats.totalEvents} rejected</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500">Avg Members/Group</h3>
          <div className="mt-2 text-3xl font-semibold text-gray-900">
            {stats.totalGroups > 0 ? Math.round(stats.totalUsers / stats.totalGroups) : 0}
          </div>
          <p className="mt-2 text-xs text-gray-500">Across all groups</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-500">User Ban Rate</h3>
          <div className="mt-2 text-3xl font-semibold text-gray-900">
            {stats.totalUsers > 0 ? Math.round((stats.bannedUsers / stats.totalUsers) * 100) : 0}%
          </div>
          <p className="mt-2 text-xs text-gray-500">{stats.bannedUsers} of {stats.totalUsers} banned</p>
        </div>
      </div>
    </div>
  );
}