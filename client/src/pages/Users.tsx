import { useEffect, useState } from 'react';
import { api } from '../api';

interface User {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  banned: boolean;
  created_at: string;
  bio?: string;
  location?: string;
  profile_image_url?: string;
  events_hosted?: number;
  groups_joined?: number;
  admin_role?: string;
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await api.getUsers();
      setUsers(data);
    } catch (error) {
      console.error('Failed to load users', error);
      alert('Failed to load users. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const handleBan = async (id: string, name: string) => {
    if (confirm(`Ban user "${name}"? They will be unable to access the platform.`)) {
      try {
        await api.banUser(parseInt(id));
        loadUsers();
      } catch (err) {
        alert('Failed to ban user');
      }
    }
  };

  const handleUnban = async (id: string, name: string) => {
    if (confirm(`Unban user "${name}"? They will regain access to the platform.`)) {
      try {
        await api.unbanUser(parseInt(id));
        loadUsers();
      } catch (err) {
        alert('Failed to unban user');
      }
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.location?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filter === 'active') return !user.banned && matchesSearch;
    if (filter === 'banned') return user.banned && matchesSearch;
    if (filter === 'admins') return user.admin_role && matchesSearch;
    return matchesSearch;
  });

  const activeUsers = users.filter(u => !u.banned).length;
  const bannedUsers = users.filter(u => u.banned).length;
  const adminUsers = users.filter(u => u.admin_role).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500 mt-1">
            Total: {users.length} users | Active: {activeUsers} | Banned: {bannedUsers} | Admins: {adminUsers}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <span className="text-gray-500 sm:text-sm">🔍</span>
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="Search by name, email, or location..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Filter Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {[
            { id: 'all', label: 'All Users', count: users.length },
            { id: 'active', label: '✓ Active', count: activeUsers },
            { id: 'banned', label: '🚫 Banned', count: bannedUsers },
            { id: 'admins', label: '👑 Admins', count: adminUsers },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`${
                filter === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </nav>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-500">Loading users...</div>
      ) : filteredUsers.length === 0 ? (
        <div className="p-8 text-center text-gray-500">No users found matching your criteria</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-900 font-medium border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Location</th>
                  <th className="px-6 py-4">Activity</th>
                  <th className="px-6 py-4">Joined</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map(user => (
                  <tr key={user.id} className={`hover:bg-gray-50 transition-colors ${user.banned ? 'opacity-60 bg-gray-50' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {user.profile_image_url ? (
                          <img 
                            src={user.profile_image_url} 
                            alt={`${user.first_name} ${user.last_name}`}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center text-lg font-bold">
                            {user.first_name?.[0] || '?'}{user.last_name?.[0] || ''}
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-gray-900 flex items-center gap-2">
                            {user.first_name} {user.last_name}
                            {user.admin_role && (
                              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full font-bold">
                                {user.admin_role.toUpperCase()}
                              </span>
                            )}
                          </div>
                          {user.bio && (
                            <p className="text-xs text-gray-500 mt-0.5 max-w-xs truncate" title={user.bio}>
                              {user.bio}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{user.email}</td>
                    <td className="px-6 py-4 text-gray-500">
                      {user.location || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-gray-600 space-y-1">
                        <div>🎉 {user.events_hosted || 0} events hosted</div>
                        <div>👥 {user.groups_joined || 0} groups joined</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs">
                      {new Date(user.created_at).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </td>
                    <td className="px-6 py-4">
                      {user.banned ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          🚫 Banned
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          ✓ Active
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {user.banned ? (
                        <button 
                          className="px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-md text-xs font-medium transition-colors"
                          onClick={() => handleUnban(user.id, `${user.first_name} ${user.last_name}`)}
                        >
                          Unban
                        </button>
                      ) : (
                        <button 
                          className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-md text-xs font-medium transition-colors"
                          onClick={() => handleBan(user.id, `${user.first_name} ${user.last_name}`)}
                        >
                          Ban
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
