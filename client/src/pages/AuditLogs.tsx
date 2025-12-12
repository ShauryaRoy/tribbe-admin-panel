import { useEffect, useState } from 'react';
import { api } from '../api';

interface AuditLog {
  id: number;
  admin_id: string;
  admin_name: string;
  action: string;
  target_type: string;
  target_id: string;
  details: any;
  created_at: string;
}

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const data = await api.getAuditLogs();
        setLogs(data);
      } catch (error) {
        console.error('Error fetching audit logs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  const getActionBadge = (action: string) => {
    if (action.includes('APPROVE')) return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">{action}</span>;
    if (action.includes('REJECT')) return <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">{action}</span>;
    if (action.includes('DELETE')) return <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">{action}</span>;
    return <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{action}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-500 mt-1">Track all admin actions and changes</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Recent Activity</h2>
        </div>
        
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading audit logs...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No audit logs found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-900 font-medium border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4">Admin</th>
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">Target</th>
                  <th className="px-6 py-4">Details</th>
                  <th className="px-6 py-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {log.admin_name || `Admin #${log.admin_id}`}
                    </td>
                    <td className="px-6 py-4">{getActionBadge(log.action)}</td>
                    <td className="px-6 py-4">
                      <span className="capitalize">{log.target_type}</span> #{log.target_id}
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate" title={JSON.stringify(log.details)}>
                      {log.details ? JSON.stringify(log.details) : '-'}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(log.created_at).toLocaleString()}
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
