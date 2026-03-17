import { useEffect, useState } from 'react';
import { api } from '../api';
import EventPaymentDetailsDialog from '../components/EventPaymentDetailsDialog';

interface Event {
  id: number;
  title: string;
  description: string;
  hostId: string;
  hostEmail: string;
  hostFirstName?: string;
  hostLastName?: string;
  datetime: string;
  location: string;
  mapLink?: string;
  discoverStatus: string | null;
  createdAt: string;
  rsvp_count?: number;
  ticketingEnabled?: boolean;
  ticketPrice?: number;
  currency?: string;
  hostUpiId?: string;
  payoutMethod?: string;
  accountHolderName?: string;
  accountNumber?: string;
  ifscCode?: string;
  maxGuests?: number;
  currentCapacity?: number;
}

export default function Events() {
  const [events, setEvents] = useState<Event[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEventForPayment, setSelectedEventForPayment] = useState<Event | null>(null);

  useEffect(() => {
    loadEvents();
  }, [filter]);

  const loadEvents = () => {
    setLoading(true);
    api.getEvents(filter)
      .then(response => {
        // The backend returns { events, pagination } or just events array
        const data = (response as any).events || response;
        setEvents(data);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  const handleApprove = async (id: number) => {
    if (confirm('Approve this event for discover page?')) {
      try {
        await api.approveEvent(id);
        loadEvents();
      } catch (err) {
        alert('Failed to approve event');
      }
    }
  };

  const handleReject = async (id: number) => {
    const reason = prompt('Reason for rejection:');
    if (reason) {
      try {
        await api.rejectEvent(id, reason);
        loadEvents();
      } catch (err) {
        alert('Failed to reject event');
      }
    }
  };

  const handleDelete = async (id: number, title: string) => {
    if (confirm(`Delete event "${title}"? This cannot be undone!`)) {
      try {
        await api.deleteEvent(id);
        loadEvents();
      } catch (err) {
        alert('Failed to delete event');
      }
    }
  };

  const filteredEvents = events.filter(event =>
    event.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.hostEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string | null) => {
    if (!status || status === 'none') return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Not Requested</span>;
    if (status === 'requested') return <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">⏳ Pending</span>;
    if (status === 'approved') return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">✓ Approved</span>;
    if (status === 'rejected') return <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">✗ Rejected</span>;
    return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Event Management</h1>
          <p className="text-gray-500 mt-1">Total: {events.length} events | Showing: {filteredEvents.length}</p>
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
          placeholder="Search by event title, host name, or location..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Filter Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {[
            { id: 'all', label: 'All', count: events.length },
            { id: 'requested', label: '⏳ Pending', count: events.filter(e => e.discoverStatus === 'requested').length },
            { id: 'approved', label: '✓ Approved', count: events.filter(e => e.discoverStatus === 'approved').length },
            { id: 'rejected', label: '✗ Rejected', count: events.filter(e => e.discoverStatus === 'rejected').length },
            { id: 'none', label: 'Not Requested', count: events.filter(e => !e.discoverStatus || e.discoverStatus === 'none').length },
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
        <div className="p-8 text-center text-gray-500">Loading events...</div>
      ) : filteredEvents.length === 0 ? (
        <div className="p-8 text-center text-gray-500">No events found matching your criteria</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-900 font-medium border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4">Event Details</th>
                  <th className="px-6 py-4">Host</th>
                  <th className="px-6 py-4">Date & Location</th>
                  <th className="px-6 py-4">RSVPs</th>
                  <th className="px-6 py-4">Ticketing</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Created</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredEvents.map(event => (
                  <tr key={event.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 text-base">{event.title}</div>
                      {event.description && (
                        <p className="text-xs text-gray-500 mt-1 max-w-xs truncate" title={event.description}>
                          {event.description}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-900">{`${event.hostFirstName || ''} ${event.hostLastName || ''}`.trim() || 'Unknown'}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{event.hostEmail}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-900">{new Date(event.datetime).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{event.location}</div>
                      {event.mapLink && (
                        <a href={event.mapLink} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mt-0.5 block">
                          View Map
                        </a>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {event.rsvp_count || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {event.ticketingEnabled ? (
                        <div>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            ₹{(event.ticketPrice || 0).toLocaleString('en-IN')}
                          </span>
                          <button
                            onClick={() => setSelectedEventForPayment(event)}
                            className="block mt-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            View Payment Details
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">Free</span>
                      )}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(event.discoverStatus)}</td>
                    <td className="px-6 py-4 text-gray-500 text-xs">
                      {new Date(event.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col space-y-2">
                        {(!event.discoverStatus || event.discoverStatus === 'none' || event.discoverStatus === 'requested') && (
                          <div className="flex space-x-2">
                            <button 
                              className="px-2 py-1 bg-green-50 text-green-700 hover:bg-green-100 rounded text-xs font-medium transition-colors"
                              onClick={() => handleApprove(event.id)}
                            >
                              Approve
                            </button>
                            <button 
                              className="px-2 py-1 bg-red-50 text-red-700 hover:bg-red-100 rounded text-xs font-medium transition-colors"
                              onClick={() => handleReject(event.id)}
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        <button 
                          className="px-2 py-1 bg-red-50 text-red-700 hover:bg-red-100 rounded text-xs font-medium transition-colors w-full text-center"
                          onClick={() => handleDelete(event.id, event.title)}
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
        </div>
      )}
      
      {/* Payment Details Dialog */}
      {selectedEventForPayment && (
        <EventPaymentDetailsDialog
          event={selectedEventForPayment}
          onClose={() => setSelectedEventForPayment(null)}
        />
      )}
    </div>
  );
}
