import { useEffect, useState } from 'react';
import { api } from '../api';

interface Event {
  id: number;
  title: string;
  location: string;
  hostFirstName: string;
  hostLastName: string;
  hostEmail: string;
  discoverRequestedAt?: string;
  createdAt?: string;
  discoverRequestedMessage?: string;
  discoverReviewNote?: string;
}

export default function DiscoverRequests() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const response = await api.getEvents('requested');
      // The backend returns { events, pagination } or just events array
      const data = (response as any).events || response;
      setEvents(data);
    } catch (err) {
      console.error('Failed to load discover requests', err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    if (!confirm('Approve this event for discover page?')) return;
    try {
      await api.approveEvent(id);
      loadRequests();
    } catch (err) {
      alert('Failed to approve event');
    }
  };

  const handleReject = async (id: number) => {
    const reason = prompt('Reason for rejection:');
    if (!reason) return;
    try {
      await api.rejectEvent(id, reason);
      loadRequests();
    } catch (err) {
      alert('Failed to reject event');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Discover Requests</h1>
          <p className="text-gray-500 mt-1">Events requested by hosts to be featured on the public discover page</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading requests...</div>
        ) : events.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No pending discover requests</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-900 font-medium border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4">Event</th>
                  <th className="px-6 py-4">Host</th>
                  <th className="px-6 py-4">Requested At</th>
                  <th className="px-6 py-4">Message</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {events.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{e.title}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{e.location}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-900">{`${e.hostFirstName || ''} ${e.hostLastName || ''}`.trim() || 'Unknown'}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{e.hostEmail}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {e.discoverRequestedAt 
                        ? new Date(e.discoverRequestedAt).toLocaleString() 
                        : (e.createdAt ? new Date(e.createdAt).toLocaleString() : '')}
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate" title={e.discoverRequestedMessage || e.discoverReviewNote || ''}>
                      {e.discoverRequestedMessage || e.discoverReviewNote || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        <button 
                          className="px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-md text-xs font-medium transition-colors"
                          onClick={() => handleApprove(e.id)}
                        >
                          Approve
                        </button>
                        <button 
                          className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-md text-xs font-medium transition-colors"
                          onClick={() => handleReject(e.id)}
                        >
                          Reject
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
