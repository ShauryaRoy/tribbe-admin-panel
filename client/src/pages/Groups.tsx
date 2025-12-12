import { useEffect, useState } from 'react';
import { api } from '../api';

interface Group {
  id: number;
  name: string;
  category: string;
  member_count: number;
  created_at: string;
  is_public: boolean;
}

export default function Groups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const data = await api.getGroups();
      setGroups(data);
    } catch (error) {
      console.error('Failed to load groups', error);
    } finally {
      setLoading(false);
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Group Management</h1>
          <p className="text-gray-500 mt-1">Total Groups: {groups.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading groups...</div>
        ) : groups.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No groups found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-900 font-medium border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4">Group Name</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Members</th>
                  <th className="px-6 py-4">Created</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {groups.map(group => (
                  <tr key={group.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{group.name}</td>
                    <td className="px-6 py-4">{group.category || 'General'}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {group.member_count || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(group.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        group.is_public 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {group.is_public ? 'Public' : 'Private'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-md text-xs font-medium transition-colors"
                        onClick={() => handleDelete(group.id, group.name)}
                      >
                        Delete
                      </button>
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