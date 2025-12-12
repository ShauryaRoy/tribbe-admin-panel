import { useEffect, useState } from 'react';
import { api } from '../api';
import { Link } from 'wouter';

interface DashboardStats {
  totalEvents: number;
  pendingEvents: number;
  approvedEvents: number;
  rejectedEvents: number;
  totalGroups: number;
  totalUsers: number;
  bannedUsers: number;
  todayEvents: number;
  eventsLast7Days: number;
  eventsLast30Days: number;
  groupsLast7Days: number;
  newUsers7Days: number;
  newUsers30Days: number;
  publicGroups: number;
  privateGroups: number;
  totalMemberships: number;
  avgMembersPerGroup: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load dashboard stats', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-gray-500 text-lg animate-pulse">Loading dashboard...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-red-500 text-lg">Failed to load dashboard data</div>
      </div>
    );
  }

  const approvalRate = stats.totalEvents > 0 
    ? ((stats.approvedEvents / stats.totalEvents) * 100).toFixed(1)
    : '0';

  const userGrowth7Days = stats.totalUsers > 0
    ? ((stats.newUsers7Days / stats.totalUsers) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="text-gray-500 mt-2">Real-time statistics and insights</p>
        </div>
        <div className="text-sm text-gray-500">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
          <h3 className="text-blue-100 text-sm font-medium uppercase tracking-wider">Total Users</h3>
          <div className="text-4xl font-bold mt-2">{stats.totalUsers}</div>
          <p className="text-blue-100 text-sm mt-2">+{stats.newUsers7Days} this week ({userGrowth7Days}%)</p>
        </div>
        
        <div className="bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl p-6 text-white shadow-lg">
          <h3 className="text-pink-100 text-sm font-medium uppercase tracking-wider">Total Events</h3>
          <div className="text-4xl font-bold mt-2">{stats.totalEvents}</div>
          <p className="text-pink-100 text-sm mt-2">+{stats.eventsLast7Days} this week</p>
        </div>
        
        <div className="bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl p-6 text-white shadow-lg">
          <h3 className="text-cyan-100 text-sm font-medium uppercase tracking-wider">Total Groups</h3>
          <div className="text-4xl font-bold mt-2">{stats.totalGroups}</div>
          <p className="text-cyan-100 text-sm mt-2">+{stats.groupsLast7Days} this week</p>
        </div>
        
        <div className="bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl p-6 text-white shadow-lg">
          <h3 className="text-emerald-100 text-sm font-medium uppercase tracking-wider">Approval Rate</h3>
          <div className="text-4xl font-bold mt-2">{approvalRate}%</div>
          <p className="text-emerald-100 text-sm mt-2">{stats.approvedEvents}/{stats.totalEvents} approved</p>
        </div>
      </div>

      {/* Detailed Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Events Status */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span>🎉</span> Events Status
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-amber-50 rounded-lg border border-amber-100">
              <div>
                <div className="text-amber-900 font-medium">Pending Approval</div>
                <div className="text-amber-700 text-xs">Awaiting review</div>
              </div>
              <div className="text-2xl font-bold text-amber-600">{stats.pendingEvents}</div>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg border border-emerald-100">
              <div>
                <div className="text-emerald-900 font-medium">Approved</div>
                <div className="text-emerald-700 text-xs">Live on discover</div>
              </div>
              <div className="text-2xl font-bold text-emerald-600">{stats.approvedEvents}</div>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-100">
              <div>
                <div className="text-red-900 font-medium">Rejected</div>
                <div className="text-red-700 text-xs">Did not meet criteria</div>
              </div>
              <div className="text-2xl font-bold text-red-600">{stats.rejectedEvents}</div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
              <span className="text-gray-500 text-sm">Created Today</span>
              <span className="font-semibold text-gray-900">{stats.todayEvents}</span>
            </div>
          </div>
        </div>

        {/* Groups & Community */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span>👥</span> Community Stats
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-gray-800">{stats.publicGroups}</div>
              <div className="text-xs text-gray-500 uppercase mt-1">Public Groups</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-gray-800">{stats.privateGroups}</div>
              <div className="text-xs text-gray-500 uppercase mt-1">Private Groups</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg text-center col-span-2">
              <div className="text-2xl font-bold text-indigo-600">{stats.totalMemberships}</div>
              <div className="text-xs text-gray-500 uppercase mt-1">Total Memberships</div>
              <div className="text-xs text-gray-400 mt-1">Avg {stats.avgMembersPerGroup} per group</div>
            </div>
          </div>
        </div>

        {/* Growth & Health */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span>🚀</span> Growth & Health
          </h3>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">New Users (30d)</span>
                <span className="font-medium text-blue-600">{stats.newUsers30Days}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full" 
                  style={{ width: `${Math.min(100, (stats.newUsers30Days / (stats.totalUsers || 1)) * 100 * 5)}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">New Events (30d)</span>
                <span className="font-medium text-purple-600">{stats.eventsLast30Days}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div 
                  className="bg-purple-500 h-2 rounded-full" 
                  style={{ width: `${Math.min(100, (stats.eventsLast30Days / (stats.totalEvents || 1)) * 100 * 5)}%` }}
                ></div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-sm">Banned Users</span>
                <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                  {stats.bannedUsers} users
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">⚡ Quick Actions</h3>
        <div className="flex flex-wrap gap-4">
          <Link href="/events">
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-2">
              Review Pending Events
              {stats.pendingEvents > 0 && (
                <span className="bg-white text-blue-600 px-1.5 py-0.5 rounded-full text-xs font-bold">
                  {stats.pendingEvents}
                </span>
              )}
            </button>
          </Link>
          <Link href="/users">
            <button className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg text-sm font-medium transition-colors shadow-sm">
              Manage Users
            </button>
          </Link>
          <Link href="/groups">
            <button className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg text-sm font-medium transition-colors shadow-sm">
              View Groups
            </button>
          </Link>
          <Link href="/analytics">
            <button className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-lg text-sm font-medium transition-colors shadow-sm">
              View Detailed Analytics
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
