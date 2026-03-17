import { useEffect, useState } from 'react';
import { api } from '../api';

interface Group {
  id: number;
  name: string;
  description?: string;
  category: string;
  memberCount: number;
  createdAt: string;
  isPublic: boolean;
  discoverStatus: string | null;
  creatorEmail?: string;
  creatorFirstName?: string;
  creatorLastName?: string;
  slug?: string;
}

export default function Groups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadGroups();
  }, [filter]);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const data = await api.getGroups(filter);
      const list = (data as any).groups || data;
      setGroups(list);
    } catch (error) {
      console.error('Failed to load groups', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    if (confirm('Approve this group to appear on the Groups page?')) {
      try {
        await api.approveGroup(id);
        loadGroups();
      } catch (err) {
        alert('Failed to approve group');
      }
    }
  };

  const handleReject = async (id: number) => {
    const reason = prompt('Reason for rejection (optional):');
    if (reason !== null) {
      try {
        await api.rejectGroup(id, reason);
        loadGroups();
      } catch (err) {
        alert('Failed to reject group');
      }
    }
  };

  const handleDelete = async (groupId: number, groupName: string) => {
    if (confirm('Delete group: ' + groupName + '? This cannot be undone!')) {
      try {
        await api.deleteGroup(groupId);
        loadGroups();
      } catch (err) {
        alert('Failed to delete group');
      }
    }
  };

  const getStatusBadge = (status: string | null) => {
    if (!status || status === 'none') return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Not Submitted</span>;
    if (status === 'requested') return <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">⏳ Pending</span>;
    if (status === 'approved') return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">✓ Approved</span>;
    if (status === 'rejected') return <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">✗ Rejected</span>;
    return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
  };

  const filteredGroups = groups.filter(group =>
    group.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.creatorEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Group Management</h1>
          <p className="text-gray-500 mt-1">Total: {groups.length} groups | Showing: {filteredGroups.length}</p>
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
          placeholder="Search by group name, creator email, or category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Filter Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {[
            { id: 'all', label: 'All', count: groups.length },
            { id: 'requested', label: '⏳ Pending', count: groups.filter(g => g.discoverStatus === 'requested').length },
            { id: 'approved', label: '✓ Approved', count: groups.filter(g => g.discoverStatus === 'approved').length },
            { id: 'rejected', label: '✗ Rejected', count: groups.filter(g => g.discoverStatus === 'rejected').length },
            { id: 'none', label: 'Not Submitted', count: groups.filter(g => !g.discoverStatus || g.discoverStatus === 'none').length },
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading groups...</div>
        ) : filteredGroups.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No groups found matching your criteria</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-900 font-medium border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4">Group Name</th>
                  <th className="px-6 py-4">Creator</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Members</th>
                  <th className="px-6 py-4">Visibility</th>
                  <th className="px-6 py-4">Discover Status</th>
                  <th className="px-6 py-4">Created</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredGroups.map(group => (
                  <tr key={group.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 text-base">{group.name}</div>
                      {group.description && (
                        <p className="text-xs text-gray-500 mt-1 max-w-xs truncate" title={group.description}>
                          {group.description}
                        </p>
                      )}
                      {group.slug && (
                        <p className="text-xs text-indigo-500 mt-0.5">/{group.slug}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-900">{`${group.creatorFirstName || ''} ${group.creatorLastName || ''}`.trim() || 'Unknown'}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{group.creatorEmail}</div>
                    </td>
                    <td className="px-6 py-4 capitalize">{group.category || 'General'}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {group.memberCount || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        group.isPublic
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {group.isPublic ? 'Public' : 'Private'}
                      </span>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(group.discoverStatus)}</td>
                    <td className="px-6 py-4 text-gray-500 text-xs">
                      {new Date(group.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col space-y-2">
                        {(!group.discoverStatus || group.discoverStatus === 'none' || group.discoverStatus === 'requested' || group.discoverStatus === 'rejected') && (
                          <button
                            className="px-2 py-1 bg-green-50 text-green-700 hover:bg-green-100 rounded text-xs font-medium transition-colors"
                            onClick={() => handleApprove(group.id)}
                          >
                            Approve
                          </button>
                        )}
                        {(!group.discoverStatus || group.discoverStatus === 'none' || group.discoverStatus === 'requested' || group.discoverStatus === 'approved') && (
                          <button
                            className="px-2 py-1 bg-orange-50 text-orange-700 hover:bg-orange-100 rounded text-xs font-medium transition-colors"
                            onClick={() => handleReject(group.id)}
                          >
                            Reject
                          </button>
                        )}
                        <button
                          className="px-2 py-1 bg-red-50 text-red-700 hover:bg-red-100 rounded text-xs font-medium transition-colors"
                          onClick={() => handleDelete(group.id, group.name)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
