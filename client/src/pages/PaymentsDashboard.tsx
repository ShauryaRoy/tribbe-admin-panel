import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DollarSign,
  Users,
  Clock,
  RefreshCw,
  Download,
  CheckCircle,
  XCircle,
  Trash2,
  Eye,
  AlertCircle,
} from 'lucide-react';

// Helper to make authenticated requests
const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('admin_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(url, {
    ...options,
    headers,
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
};

interface PaymentStats {
  totalRevenue: number;
  totalTransactions: number;
  totalRefunds: number;
  refundCount: number;
  hostEarnings: number;
  pendingPayouts: number;
  pendingPayoutCount: number;
}

interface Transaction {
  id: number;
  razorpayPaymentId: string;
  amount: number;
  platformFee: number;
  hostShare: number;
  status: string;
  refundedAt: string | null;
  refundAmount: number | null;
  createdAt: string;
  event: { id: number; title: string; hostId: string };
  buyer: { id: string; firstName: string; lastName: string; email: string };
  host: { id: string; firstName: string; lastName: string; email: string };
}

interface HostEarning {
  hostId: string;
  hostName: string;
  hostEmail: string;
  ticketsSold: number;
  totalRevenue: number;
  hostEarnings: number;
  paidOut: number;
  outstanding: number;
}

interface HostEarningsByEvent {
  hostId: string;
  hostName: string;
  hostEmail: string;
  totalEarnings: number;
  totalTicketsSold: number;
  events: {
    eventId: number;
    eventTitle: string;
    ticketPrice: number;
    ticketsSold: number;
    totalRevenue: number;
    platformFee: number;
    hostEarnings: number;
    payments: {
      transactionId: number;
      buyerName: string;
      buyerEmail: string;
      amount: number;
      hostShare: number;
      platformFee: number;
      paidAt: string;
    }[];
  }[];
}

interface Payout {
  id: number;
  hostId: string;
  amount: number;
  status: string;
  upiId: string | null;
  paymentReference: string | null;
  notes: string | null;
  createdAt: string;
  paidAt: string | null;
  host: { firstName: string; lastName: string; email: string };
  transactionCount: number;
}

const API_BASE = '/api/admin';

export default function PaymentsDashboard() {
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = useState<'today' | '7days' | '30days' | 'all'>('30days');
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'hosts' | 'hostsByEvent' | 'payouts'>('hostsByEvent');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [payoutForm, setPayoutForm] = useState<{
    hostId: string;
    amount: string;
    upiId: string;
    notes: string;
  } | null>(null);
  const [refundForm, setRefundForm] = useState<{ transactionId: number; amount: string } | null>(null);
  const [expandedHosts, setExpandedHosts] = useState<Set<string>>(new Set());
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

  // Calculate date filters
  const getDateFilter = () => {
    const now = new Date();
    if (dateRange === 'today') {
      return { startDate: new Date(now.setHours(0, 0, 0, 0)).toISOString() };
    } else if (dateRange === '7days') {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      return { startDate: start.toISOString() };
    } else if (dateRange === '30days') {
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      return { startDate: start.toISOString() };
    }
    return {};
  };

  // Queries
  const { data: stats, isLoading: statsLoading } = useQuery<PaymentStats>({
    queryKey: [`${API_BASE}/payments/stats`, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams(getDateFilter() as any);
      return authenticatedFetch(`${API_BASE}/payments/stats?${params}`);
    },
  });

  const { data: transactions = [], isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: [`${API_BASE}/payments/transactions`, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({ ...getDateFilter(), limit: '100' } as any);
      return authenticatedFetch(`${API_BASE}/payments/transactions?${params}`);
    },
  });

  const { data: hostEarnings = [], isLoading: hostEarningsLoading } = useQuery<HostEarning[]>({
    queryKey: [`${API_BASE}/payments/host-earnings`, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams(getDateFilter() as any);
      return authenticatedFetch(`${API_BASE}/payments/host-earnings?${params}`);
    },
  });

  const { data: hostEarningsByEvent = [], isLoading: hostEarningsByEventLoading } = useQuery<HostEarningsByEvent[]>({
    queryKey: [`${API_BASE}/payments/host-earnings-by-event`, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams(getDateFilter() as any);
      return authenticatedFetch(`${API_BASE}/payments/host-earnings-by-event?${params}`);
    },
  });

  const { data: pendingPayouts = [], isLoading: pendingPayoutsLoading } = useQuery<Payout[]>({
    queryKey: [`${API_BASE}/payments/pending-payouts`],
    queryFn: async () => {
      return authenticatedFetch(`${API_BASE}/payments/pending-payouts`);
    },
  });

  const { data: completedPayouts = [], isLoading: completedPayoutsLoading } = useQuery<Payout[]>({
    queryKey: [`${API_BASE}/payments/completed-payouts`],
    queryFn: async () => {
      return authenticatedFetch(`${API_BASE}/payments/completed-payouts`);
    },
  });

  // Mutations
  const createPayoutMutation = useMutation({
    mutationFn: async (data: any) => {
      return authenticatedFetch(`${API_BASE}/payments/create-payout`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`${API_BASE}/payments/pending-payouts`] });
      queryClient.invalidateQueries({ queryKey: [`${API_BASE}/payments/host-earnings`] });
      setPayoutForm(null);
      alert('Payout created successfully!');
    },
    onError: (error: Error) => {
      alert('Error: ' + error.message);
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: async ({ id, paymentReference }: { id: number; paymentReference: string }) => {
      return authenticatedFetch(`${API_BASE}/payments/mark-paid/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ paymentReference }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`${API_BASE}/payments/pending-payouts`] });
      queryClient.invalidateQueries({ queryKey: [`${API_BASE}/payments/completed-payouts`] });
      queryClient.invalidateQueries({ queryKey: [`${API_BASE}/payments/stats`] });
      alert('Payout marked as paid!');
    },
  });

  const deletePayoutMutation = useMutation({
    mutationFn: async (id: number) => {
      return authenticatedFetch(`${API_BASE}/payments/payout/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`${API_BASE}/payments/pending-payouts`] });
      alert('Payout deleted!');
    },
  });

  const refundMutation = useMutation({
    mutationFn: async ({ id, refundId, amount }: { id: number; refundId: string; amount: number }) => {
      return authenticatedFetch(`${API_BASE}/payments/refund/${id}`, {
        method: 'POST',
        body: JSON.stringify({ refundId, refundAmount: amount }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`${API_BASE}/payments/transactions`] });
      queryClient.invalidateQueries({ queryKey: [`${API_BASE}/payments/stats`] });
      queryClient.invalidateQueries({ queryKey: [`${API_BASE}/payments/host-earnings`] });
      setRefundForm(null);
      alert('Refund processed successfully!');
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Payments Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage payments, payouts, and refunds</p>
        </div>

        {/* Date Range Filter */}
        <div className="mb-6 flex gap-2">
          {['today', '7days', '30days', 'all'].map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range as any)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                dateRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border'
              }`}
            >
              {range === 'today' ? 'Today' : range === '7days' ? '7 Days' : range === '30days' ? '30 Days' : 'All Time'}
            </button>
          ))}
        </div>

        {/* Stats Cards */}
        {!statsLoading && stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(stats.totalRevenue)}</p>
                  <p className="text-xs text-gray-500 mt-1">{stats.totalTransactions} transactions</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Host Earnings</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(stats.hostEarnings)}</p>
                  <p className="text-xs text-gray-500 mt-1">Payable</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Payouts</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(stats.pendingPayouts)}</p>
                  <p className="text-xs text-gray-500 mt-1">{stats.pendingPayoutCount} payouts</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-full">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {[
                { id: 'hostsByEvent', label: 'Host Earnings (Detailed)' },
                { id: 'overview', label: 'Overview' },
                { id: 'transactions', label: 'Transactions' },
                { id: 'hosts', label: 'Host Summary' },
                { id: 'payouts', label: 'Payouts' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Host Earnings by Event Tab (DETAILED VIEW) */}
            {activeTab === 'hostsByEvent' && (
              <div>
                <div className="mb-4">
                  <h2 className="text-xl font-bold">Host Earnings by Event (Captured Payments Only)</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Shows all hosts, their events, and who paid for each event
                  </p>
                </div>

                {hostEarningsByEventLoading ? (
                  <div className="text-center py-8 text-gray-500">Loading...</div>
                ) : hostEarningsByEvent.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No earnings data found for the selected period
                  </div>
                ) : (
                  <div className="space-y-6">
                    {hostEarningsByEvent.map((host) => (
                      <div key={host.hostId} className="border rounded-lg overflow-hidden">
                        {/* Host Header */}
                        <div 
                          className="bg-gray-100 p-4 cursor-pointer hover:bg-gray-200 transition"
                          onClick={() => {
                            const newExpanded = new Set(expandedHosts);
                            if (newExpanded.has(host.hostId)) {
                              newExpanded.delete(host.hostId);
                            } else {
                              newExpanded.add(host.hostId);
                            }
                            setExpandedHosts(newExpanded);
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-lg font-bold text-gray-900">{host.hostName}</h3>
                              <p className="text-sm text-gray-600">{host.hostEmail}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-green-600">
                                {formatCurrency(host.totalEarnings)}
                              </p>
                              <p className="text-sm text-gray-600">
                                {host.events.length} events • {host.totalTicketsSold} tickets sold
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Events List */}
                        {expandedHosts.has(host.hostId) && (
                          <div className="p-4 bg-white space-y-4">
                            {host.events.map((event) => (
                              <div key={event.eventId} className="border rounded-lg overflow-hidden">
                                {/* Event Header */}
                                <div 
                                  className="bg-blue-50 p-3 cursor-pointer hover:bg-blue-100 transition"
                                  onClick={() => {
                                    const key = `${host.hostId}-${event.eventId}`;
                                    const newExpanded = new Set(expandedEvents);
                                    if (newExpanded.has(key)) {
                                      newExpanded.delete(key);
                                    } else {
                                      newExpanded.add(key);
                                    }
                                    setExpandedEvents(newExpanded);
                                  }}
                                >
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <h4 className="font-semibold text-gray-900">{event.eventTitle}</h4>
                                      <p className="text-xs text-gray-600">
                                        Ticket Price: {formatCurrency(event.ticketPrice)} • 
                                        Sold: {event.ticketsSold}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className="font-bold text-gray-900">
                                        {formatCurrency(event.hostEarnings)}
                                      </p>
                                      <p className="text-xs text-gray-600">
                                        Revenue: {formatCurrency(event.totalRevenue)}
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                {/* Payments List */}
                                {expandedEvents.has(`${host.hostId}-${event.eventId}`) && (
                                  <div className="p-3 bg-white">
                                    <h5 className="text-sm font-semibold text-gray-700 mb-2">
                                      Payments ({event.payments.length})
                                    </h5>
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-sm">
                                        <thead className="bg-gray-50">
                                          <tr>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Buyer</th>
                                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Amount</th>
                                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Host Gets</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Paid At</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                          {event.payments.map((payment) => (
                                            <tr key={payment.transactionId} className="hover:bg-gray-50">
                                              <td className="px-3 py-2">
                                                <div className="font-medium text-gray-900">{payment.buyerName}</div>
                                                <div className="text-xs text-gray-500">{payment.buyerEmail}</div>
                                              </td>
                                              <td className="px-3 py-2 text-right font-medium text-gray-900">
                                                {formatCurrency(payment.amount)}
                                              </td>
                                              <td className="px-3 py-2 text-right font-semibold text-green-600">
                                                {formatCurrency(payment.hostShare)}
                                              </td>
                                              <td className="px-3 py-2 text-gray-600">
                                                {formatDate(payment.paidAt)}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                        <tfoot className="bg-gray-50 font-semibold">
                                          <tr>
                                            <td className="px-3 py-2 text-right" colSpan={2}>Total:</td>
                                            <td className="px-3 py-2 text-right text-green-600">
                                              {formatCurrency(event.hostEarnings)}
                                            </td>
                                            <td></td>
                                          </tr>
                                        </tfoot>
                                      </table>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Transactions Tab */}
            {activeTab === 'transactions' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">All Transactions</h2>
                  <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Buyer</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Host</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Host Share</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {transactionsLoading ? (
                        <tr>
                          <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                            Loading...
                          </td>
                        </tr>
                      ) : transactions.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                            No transactions found
                          </td>
                        </tr>
                      ) : (
                        transactions.map((txn) => (
                          <tr key={txn.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900">{txn.id}</td>
                            <td className="px-4 py-3 text-sm">
                              <div className="font-medium text-gray-900">
                                {txn.buyer?.firstName} {txn.buyer?.lastName}
                              </div>
                              <div className="text-xs text-gray-500">{txn.buyer?.email}</div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">{txn.event?.title || 'N/A'}</td>
                            <td className="px-4 py-3 text-sm">
                              <div className="font-medium text-gray-900">
                                {txn.host?.firstName} {txn.host?.lastName}
                              </div>
                              <div className="text-xs text-gray-500">{txn.host?.email}</div>
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                              {formatCurrency(txn.amount / 100)}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-medium text-green-600">
                              {formatCurrency(txn.hostShare / 100)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {txn.refundedAt ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  Refunded
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  {txn.status}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{formatDate(txn.createdAt)}</td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => setSelectedTransaction(txn)}
                                  className="text-blue-600 hover:text-blue-800"
                                  title="View Details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                {!txn.refundedAt && (
                                  <button
                                    onClick={() => setRefundForm({ transactionId: txn.id, amount: (txn.amount / 100).toString() })}
                                    className="text-red-600 hover:text-red-800"
                                    title="Refund"
                                  >
                                    <RefreshCw className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Host Earnings Tab */}
            {activeTab === 'hosts' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Host Earnings</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Host Name</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Tickets Sold</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Revenue</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Host Earnings</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Paid Out</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Outstanding</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {hostEarningsLoading ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                            Loading...
                          </td>
                        </tr>
                      ) : hostEarnings.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                            No outstanding payments
                          </td>
                        </tr>
                      ) : (
                        hostEarnings.map((host) => (
                          <tr key={host.hostId} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm">
                              <div className="font-medium text-gray-900">{host.hostName}</div>
                              <div className="text-xs text-gray-500">{host.hostEmail}</div>
                            </td>
                            <td className="px-4 py-3 text-sm text-center text-gray-900">{host.ticketsSold}</td>
                            <td className="px-4 py-3 text-sm text-right text-gray-900">
                              {formatCurrency(host.totalRevenue)}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-medium text-green-600">
                              {formatCurrency(host.hostEarnings)}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-gray-600">
                              {formatCurrency(host.paidOut)}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-bold text-blue-600">
                              {formatCurrency(host.outstanding)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() =>
                                  setPayoutForm({
                                    hostId: host.hostId,
                                    amount: host.outstanding.toString(),
                                    upiId: '',
                                    notes: '',
                                  })
                                }
                                className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                              >
                                Create Payout
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Payouts Tab */}
            {activeTab === 'payouts' && (
              <div className="space-y-6">
                {/* Pending Payouts */}
                <div>
                  <h2 className="text-xl font-bold mb-4">Pending Payouts</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Host</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">UPI / Bank</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Orders</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {pendingPayoutsLoading ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                              Loading...
                            </td>
                          </tr>
                        ) : pendingPayouts.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                              No pending payouts
                            </td>
                          </tr>
                        ) : (
                          pendingPayouts.map((payout) => (
                            <tr key={payout.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm">
                                <div className="font-medium text-gray-900">
                                  {payout.host.firstName} {payout.host.lastName}
                                </div>
                                <div className="text-xs text-gray-500">{payout.host.email}</div>
                              </td>
                              <td className="px-4 py-3 text-sm text-right font-bold text-gray-900">
                                {formatCurrency(payout.amount / 100)}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {payout.upiId || 'Bank transfer'}
                              </td>
                              <td className="px-4 py-3 text-sm text-center text-gray-900">
                                {payout.transactionCount}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {formatDate(payout.createdAt)}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => {
                                      const ref = prompt('Enter payment reference (UTR/UPI Ref):');
                                      if (ref) {
                                        markPaidMutation.mutate({ id: payout.id, paymentReference: ref });
                                      }
                                    }}
                                    className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 flex items-center gap-1"
                                  >
                                    <CheckCircle className="w-3 h-3" />
                                    Mark Paid
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (confirm('Delete this payout?')) {
                                        deletePayoutMutation.mutate(payout.id);
                                      }
                                    }}
                                    className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 flex items-center gap-1"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Completed Payouts */}
                <div>
                  <h2 className="text-xl font-bold mb-4">Completed Payouts</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Host</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid Date</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {completedPayoutsLoading ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                              Loading...
                            </td>
                          </tr>
                        ) : completedPayouts.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                              No completed payouts yet
                            </td>
                          </tr>
                        ) : (
                          completedPayouts.map((payout) => (
                            <tr key={payout.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm">
                                <div className="font-medium text-gray-900">
                                  {payout.host.firstName} {payout.host.lastName}
                                </div>
                                <div className="text-xs text-gray-500">{payout.host.email}</div>
                              </td>
                              <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                                {formatCurrency(payout.amount / 100)}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 font-mono text-xs">
                                {payout.paymentReference}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {payout.paidAt ? formatDate(payout.paidAt) : '-'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-6 h-6 text-blue-600 mt-1" />
                    <div>
                      <h3 className="font-semibold text-blue-900 mb-2">Payments Dashboard Overview</h3>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• View all payment transactions and host earnings</li>
                        <li>• Create and manage payouts to event hosts</li>
                        <li>• Process refunds when needed</li>
                        <li>• Export transaction data for accounting</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white border rounded-lg p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
                    <div className="space-y-2">
                      <button
                        onClick={() => setActiveTab('transactions')}
                        className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition"
                      >
                        View All Transactions →
                      </button>
                      <button
                        onClick={() => setActiveTab('hosts')}
                        className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition"
                      >
                        Check Host Earnings →
                      </button>
                      <button
                        onClick={() => setActiveTab('payouts')}
                        className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition"
                      >
                        Manage Payouts →
                      </button>
                    </div>
                  </div>

                  <div className="bg-white border rounded-lg p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Platform Summary</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Active Transactions:</span>
                        <span className="font-medium">{stats?.totalTransactions || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Refund Rate:</span>
                        <span className="font-medium">
                          {stats?.totalTransactions
                            ? ((stats.refundCount / stats.totalTransactions) * 100).toFixed(1)
                            : 0}
                          %
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Pending Payouts:</span>
                        <span className="font-medium text-yellow-600">
                          {stats?.pendingPayoutCount || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payout Form Modal */}
      {payoutForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Create Payout</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={payoutForm.amount}
                  onChange={(e) => setPayoutForm({ ...payoutForm, amount: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">UPI ID (optional)</label>
                <input
                  type="text"
                  value={payoutForm.upiId}
                  onChange={(e) => setPayoutForm({ ...payoutForm, upiId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="example@upi"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea
                  value={payoutForm.notes}
                  onChange={(e) => setPayoutForm({ ...payoutForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={3}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    createPayoutMutation.mutate({
                      hostId: payoutForm.hostId,
                      amount: parseFloat(payoutForm.amount),
                      upiId: payoutForm.upiId || undefined,
                      notes: payoutForm.notes || undefined,
                    });
                  }}
                  disabled={createPayoutMutation.isPending}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {createPayoutMutation.isPending ? 'Creating...' : 'Create Payout'}
                </button>
                <button
                  onClick={() => setPayoutForm(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Refund Form Modal */}
      {refundForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4 text-red-600">Process Refund</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Refund Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={refundForm.amount}
                  onChange={(e) => setRefundForm({ ...refundForm, amount: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  ⚠️ This will reset the host share to 0 for this transaction. Make sure you've processed the refund in Razorpay first.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    const refundId = prompt('Enter Razorpay refund ID:');
                    if (refundId) {
                      refundMutation.mutate({
                        id: refundForm.transactionId,
                        refundId,
                        amount: parseFloat(refundForm.amount),
                      });
                    }
                  }}
                  disabled={refundMutation.isPending}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {refundMutation.isPending ? 'Processing...' : 'Process Refund'}
                </button>
                <button
                  onClick={() => setRefundForm(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Details Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold">Transaction Details</h3>
              <button
                onClick={() => setSelectedTransaction(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-gray-600">Transaction ID:</span>
                  <div className="font-medium">{selectedTransaction.id}</div>
                </div>
                <div>
                  <span className="text-gray-600">Razorpay Payment ID:</span>
                  <div className="font-mono text-xs">{selectedTransaction.razorpayPaymentId}</div>
                </div>
                <div>
                  <span className="text-gray-600">Amount:</span>
                  <div className="font-bold text-lg">{formatCurrency(selectedTransaction.amount / 100)}</div>
                </div>
                <div>
                  <span className="text-gray-600">Host Share:</span>
                  <div className="font-medium text-green-600">{formatCurrency(selectedTransaction.hostShare / 100)}</div>
                </div>
                <div>
                  <span className="text-gray-600">Status:</span>
                  <div className="font-medium">{selectedTransaction.status}</div>
                </div>
                <div>
                  <span className="text-gray-600">Date:</span>
                  <div>{formatDate(selectedTransaction.createdAt)}</div>
                </div>
                {selectedTransaction.refundedAt && (
                  <div>
                    <span className="text-gray-600">Refunded:</span>
                    <div className="text-red-600">{formatDate(selectedTransaction.refundedAt)}</div>
                  </div>
                )}
              </div>
              <div className="border-t pt-3 mt-3">
                <div className="font-medium mb-2">Buyer Information</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-gray-600">Name:</span>
                    <div>{selectedTransaction.buyer?.firstName} {selectedTransaction.buyer?.lastName}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Email:</span>
                    <div>{selectedTransaction.buyer?.email}</div>
                  </div>
                </div>
              </div>
              <div className="border-t pt-3">
                <div className="font-medium mb-2">Event & Host</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-gray-600">Event:</span>
                    <div>{selectedTransaction.event?.title}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Host:</span>
                    <div>{selectedTransaction.host?.firstName} {selectedTransaction.host?.lastName}</div>
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={() => setSelectedTransaction(null)}
              className="mt-6 w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
