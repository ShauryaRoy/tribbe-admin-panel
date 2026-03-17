import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DollarSign,
  TrendingUp,
  Users,
  Clock,
  RefreshCw,
  Eye,
  Trash2,
  Plus,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import PayoutDetailsDialog from '../components/PayoutDetailsDialog';
import MarkAsPaidDialog from '../components/MarkAsPaidDialog';
import CreatePayoutDialog from '../components/CreatePayoutDialog';

// Helper to make authenticated requests
const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('admin_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(url, {
    ...options,
    headers,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  
  return response.json();
};

interface Host {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface Payout {
  id: number;
  hostId: string;
  payoutMethod: string;
  amount: number;
  status: string;
  paymentReference: string | null;
  upiId: string | null;
  bankDetails: any;
  notes: string | null;
  createdAt: string;
  paidAt: string | null;
  createdBy: string;
  paidBy: string | null;
  eventCount: number;
  lastEventDate: string | null;
  host: Host;
}

const API_BASE = '/api/admin';

export default function Payouts() {
  const queryClient = useQueryClient();
  
  // State
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [payoutMethodFilter, setPayoutMethodFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'amount' | 'created_at' | 'last_event_date'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [showCancelled, setShowCancelled] = useState(false); // Hide cancelled by default
  
  // Dialogs
  const [selectedPayoutId, setSelectedPayoutId] = useState<number | null>(null);
  const [markAsPaidPayoutId, setMarkAsPaidPayoutId] = useState<number | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Build query params
  const getQueryParams = () => {
    const params: any = {
      limit: pageSize,
      offset: page * pageSize,
      sortBy,
      sortOrder,
    };
    
    if (statusFilter !== 'ALL') params.status = statusFilter;
    if (payoutMethodFilter !== 'ALL') params.payoutMethod = payoutMethodFilter;
    if (searchQuery) params.search = searchQuery;
    
    return new URLSearchParams(params).toString();
  };

  // Queries
  const { data: payoutsData, isLoading, refetch } = useQuery({
    queryKey: ['payouts', statusFilter, payoutMethodFilter, searchQuery, sortBy, sortOrder, page, pageSize],
    queryFn: async () => {
      return authenticatedFetch(`${API_BASE}/payouts?${getQueryParams()}`);
    },
  });

  const { data: outstandingHosts = [] } = useQuery({
    queryKey: ['outstanding-hosts'],
    queryFn: async () => {
      return authenticatedFetch(`${API_BASE}/payouts/hosts/outstanding`);
    },
  });

  // Mutations
  const deletePayoutMutation = useMutation({
    mutationFn: async (id: number) => {
      return authenticatedFetch(`${API_BASE}/payouts/${id}/cancel`, { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payouts'] });
      queryClient.invalidateQueries({ queryKey: ['outstanding-hosts'] });
      alert('Payout cancelled successfully!');
    },
    onError: (error: Error) => {
      alert('Error: ' + error.message);
    },
  });

  // Format helpers
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount / 100);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      PAID: 'bg-green-100 text-green-800',
      ON_HOLD: 'bg-red-100 text-red-800',
      CANCELLED: 'bg-gray-100 text-gray-600',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  const getHostType = (_host: Host) => {
    // You can enhance this logic based on your data
    return 'Individual';
  };

  const payouts = payoutsData?.data || [];
  const totalPages = Math.ceil((payoutsData?.total || 0) / pageSize);

  // Calculate stats
  const stats = {
    totalPending: outstandingHosts.reduce((sum: number, h: any) => sum + h.outstanding, 0),
    pendingCount: payouts.filter((p: Payout) => p.status === 'PENDING').length,
    paidCount: payouts.filter((p: Payout) => p.status === 'PAID').length,
    hostsCount: outstandingHosts.length,
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Host Payouts</h1>
            <p className="text-gray-600 mt-1">Manage host earnings and payout batches</p>
          </div>
          <button
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5" />
            Create Payout
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Pending</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(stats.totalPending)}
                </p>
                <p className="text-xs text-gray-500 mt-1">{stats.hostsCount} hosts</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Payouts</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.pendingCount}</p>
                <p className="text-xs text-gray-500 mt-1">Awaiting payment</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <AlertCircle className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Paid Payouts</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.paidCount}</p>
                <p className="text-xs text-gray-500 mt-1">Completed</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Hosts with Balance</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.hostsCount}</p>
                <p className="text-xs text-gray-500 mt-1">Outstanding</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by host name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="PAID">Paid</option>
              {showCancelled && <option value="CANCELLED">Cancelled</option>}
              <option value="ON_HOLD">On Hold</option>
            </select>

            {/* Payout Method Filter */}
            <select
              value={payoutMethodFilter}
              onChange={(e) => setPayoutMethodFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ALL">All Methods</option>
              <option value="UPI">UPI</option>
              <option value="BANK">Bank Transfer</option>
            </select>

            {/* Refresh Button */}
            <button
              onClick={() => refetch()}
              className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          {/* Show Cancelled Toggle */}
          <div className="flex items-center gap-2 mt-4">
            <input
              type="checkbox"
              id="showCancelled"
              checked={showCancelled}
              onChange={(e) => setShowCancelled(e.target.checked)}
              className="rounded border-gray-300"
            />
            <label htmlFor="showCancelled" className="text-sm text-gray-600">
              Show cancelled payouts
            </label>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-4 mt-4">
            <span className="text-sm text-gray-600">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="created_at">Created Date</option>
              <option value="amount">Amount</option>
              <option value="last_event_date">Last Event Date</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50"
            >
              {sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}
            </button>
          </div>
        </div>

        {/* Payouts Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Host
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Host Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payout Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Events
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Event
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                      Loading payouts...
                    </td>
                  </tr>
                ) : payouts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                      No payouts found
                    </td>
                  </tr>
                ) : (
                  payouts.map((payout: Payout) => (
                    <tr key={payout.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">
                            {payout.host?.firstName} {payout.host?.lastName}
                          </div>
                          <div className="text-sm text-gray-500">{payout.host?.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {getHostType(payout.host)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-gray-900">
                          {payout.payoutMethod || 'N/A'}
                        </span>
                        {payout.upiId && (
                          <div className="text-xs text-gray-500">{payout.upiId}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        {formatCurrency(payout.amount)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {payout.eventCount || 0}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(payout.status)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(payout.lastEventDate)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedPayoutId(payout.id)}
                            className="p-1 hover:bg-blue-50 rounded text-blue-600"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {payout.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => setMarkAsPaidPayoutId(payout.id)}
                                className="p-1 hover:bg-green-50 rounded text-green-600"
                                title="Mark as Paid"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm('Are you sure you want to cancel this payout? This action can be audited but the payout will be marked as cancelled.')) {
                                    deletePayoutMutation.mutate(payout.id);
                                  }
                                }}
                                className="p-1 hover:bg-red-50 rounded text-red-600"
                                title="Cancel Payout"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Show:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(parseInt(e.target.value));
                    setPage(0);
                  }}
                  className="px-3 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
                <span className="text-sm text-gray-600">per page</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="mt-4 text-sm text-gray-600 text-center">
          Showing {payouts.length} of {payoutsData?.total || 0} payouts
        </div>
      </div>

      {/* Dialogs */}
      {selectedPayoutId && (
        <PayoutDetailsDialog
          payoutId={selectedPayoutId}
          onClose={() => setSelectedPayoutId(null)}
          onMarkAsPaid={() => {
            setMarkAsPaidPayoutId(selectedPayoutId);
            setSelectedPayoutId(null);
          }}
        />
      )}

      {markAsPaidPayoutId && (
        <MarkAsPaidDialog
          payoutId={markAsPaidPayoutId}
          onClose={() => setMarkAsPaidPayoutId(null)}
          onSuccess={() => {
            setMarkAsPaidPayoutId(null);
            refetch();
          }}
        />
      )}

      {showCreateDialog && (
        <CreatePayoutDialog
          onClose={() => setShowCreateDialog(false)}
          onSuccess={() => {
            setShowCreateDialog(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}
