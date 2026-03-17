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

interface Group {
  id: number;
  name: string;
  description?: string;
  category?: string;
  memberCount?: number;
  creatorFirstName?: string;
  creatorLastName?: string;
  creatorEmail?: string;
  discoverRequestedAt?: string;
  createdAt?: string;
  discoverRequestedMessage?: string;
  discoverReviewNote?: string;
}

type TabType = 'events' | 'groups';

export default function DiscoverRequests() {
  const [activeTab, setActiveTab] = useState<TabType>('events');
  const [events, setEvents] = useState<Event[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [groupsLoading, setGroupsLoading] = useState(true);

  useEffect(() => {
    loadEventRequests();
    loadGroupRequests();
  }, []);

  const loadEventRequests = async () => {
    setEventsLoading(true);
    try {
      const response = await api.getEvents('requested');
      const data = (response as any).events || response;
      setEvents(data);
    } catch (err) {
      console.error('Failed to load event discover requests', err);
      setEvents([]);
    } finally {
      setEventsLoading(false);
    }
  };

  const loadGroupRequests = async () => {
    setGroupsLoading(true);
    try {
      const response = await api.getGroups('requested');
      const data = (response as any).groups || response;
      setGroups(data);
    } catch (err) {
      console.error('Failed to load group discover requests', err);
      setGroups([]);
    } finally {
      setGroupsLoading(false);
    }
  };

  const handleApproveEvent = async (id: number) => {
    if (!confirm('Approve this event for discover page?')) return;
    try {
      await api.approveEvent(id);
      loadEventRequests();
    } catch (err) {
      alert('Failed to approve event');
    }
  };

  const handleRejectEvent = async (id: number) => {
    const reason = prompt('Reason for rejection:');
    if (!reason) return;
    try {
      await api.rejectEvent(id, reason);
      loadEventRequests();
    } catch (err) {
      alert('Failed to reject event');
    }
  };

  const handleApproveGroup = async (id: number) => {
    if (!confirm('Approve this group for discover page?')) return;
    try {
      await api.approveGroup(id);
      loadGroupRequests();
    } catch (err) {
      alert('Failed to approve group');
    }
  };

  const handleRejectGroup = async (id: number) => {
    const reason = prompt('Reason for rejection:');
    if (!reason) return;
    try {
      await api.rejectGroup(id, reason);
      loadGroupRequests();
    } catch (err) {
      alert('Failed to reject group');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Discover Requests</h1>
          <p className="text-gray-500 mt-1">Review requests to feature events and groups on the public discover page</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('events')}
          className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'events'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          🎉 Events
          {!eventsLoading && events.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
              {events.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('groups')}
          className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'groups'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          👥 Groups
          {!groupsLoading && groups.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
              {groups.length}
            </span>
          )}
        </button>
      </div>

      {/* Events Tab */}
      {activeTab === 'events' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {eventsLoading ? (
            <div className="p-8 text-center text-gray-500">Loading event requests...</div>
          ) : events.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No pending event discover requests</div>
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
                            onClick={() => handleApproveEvent(e.id)}
                          >
                            Approve
                          </button>
                          <button
                            className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-md text-xs font-medium transition-colors"
                            onClick={() => handleRejectEvent(e.id)}
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
      )}

      {/* Groups Tab */}
      {activeTab === 'groups' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {groupsLoading ? (
            <div className="p-8 text-center text-gray-500">Loading group requests...</div>
          ) : groups.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No pending group discover requests</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-gray-900 font-medium border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4">Group</th>
                    <th className="px-6 py-4">Owner</th>
                    <th className="px-6 py-4">Requested At</th>
                    <th className="px-6 py-4">Message</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {groups.map((g) => (
                    <tr key={g.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{g.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {g.category && <span className="capitalize">{g.category}</span>}
                          {g.memberCount !== undefined && <span> · {g.memberCount} members</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-900">{`${g.creatorFirstName || ''} ${g.creatorLastName || ''}`.trim() || 'Unknown'}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{g.creatorEmail}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {g.discoverRequestedAt
                          ? new Date(g.discoverRequestedAt).toLocaleString()
                          : (g.createdAt ? new Date(g.createdAt).toLocaleString() : '')}
                      </td>
                      <td className="px-6 py-4 max-w-xs truncate" title={g.discoverRequestedMessage || g.discoverReviewNote || ''}>
                        {g.discoverRequestedMessage || g.discoverReviewNote || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button
                            className="px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-md text-xs font-medium transition-colors"
                            onClick={() => handleApproveGroup(g.id)}
                          >
                            Approve
                          </button>
                          <button
                            className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-md text-xs font-medium transition-colors"
                            onClick={() => handleRejectGroup(g.id)}
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
      )}
    </div>
  );
}
