import { useEffect, useState } from 'react';
import { CreditCard, User, DollarSign, Calendar, Search, RefreshCw } from 'lucide-react';

interface HostPaymentInfo {
  hostId: string;
  hostFirstName: string;
  hostLastName: string;
  hostEmail: string;
  paidEventsCount: number;
  totalRevenue: number;
  paymentMethods: {
    method: string;
    upiId?: string;
    accountHolderName?: string;
    accountNumber?: string;
    ifscCode?: string;
    eventCount: number;
    lastUsedEvent: string;
  }[];
  latestEventDate: string;
}

export default function HostPaymentDetails() {
  const [hosts, setHosts] = useState<HostPaymentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');

  useEffect(() => {
    loadHostPaymentDetails();
  }, []);

  const loadHostPaymentDetails = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/admin/host-payment-details', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setHosts(data.hosts || []);
      } else {
        console.error('Failed to load host payment details');
      }
    } catch (err) {
      console.error('Error loading host payment details:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredHosts = hosts.filter(host => {
    const matchesSearch = 
      host.hostFirstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      host.hostLastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      host.hostEmail?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (methodFilter === 'ALL') return matchesSearch;
    
    const hasMethod = host.paymentMethods.some(pm => pm.method === methodFilter);
    return matchesSearch && hasMethod;
  });

  const maskAccountNumber = (accountNumber: string) => {
    if (!accountNumber) return 'N/A';
    if (accountNumber.length <= 4) return accountNumber;
    return '****' + accountNumber.slice(-4);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const stats = {
    totalHosts: hosts.length,
    hostsWithUPI: hosts.filter(h => h.paymentMethods.some(pm => pm.method === 'UPI')).length,
    hostsWithBank: hosts.filter(h => h.paymentMethods.some(pm => pm.method === 'BANK')).length,
    totalPaidEvents: hosts.reduce((sum, h) => sum + h.paidEventsCount, 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Host Payment Details</h1>
          <p className="text-gray-500 mt-1">
            View all hosts who have set up payment details for paid events
          </p>
        </div>
        <button
          onClick={loadHostPaymentDetails}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Hosts</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalHosts}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <User className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">UPI Payment Method</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.hostsWithUPI}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <CreditCard className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Bank Transfer Method</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.hostsWithBank}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Paid Events</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalPaidEvents}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <Calendar className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by host name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="ALL">All Payment Methods</option>
            <option value="UPI">UPI Only</option>
            <option value="BANK">Bank Transfer Only</option>
          </select>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="p-8 text-center text-gray-500">Loading host payment details...</div>
      ) : filteredHosts.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          No hosts found with payment details matching your criteria
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Showing {filteredHosts.length} of {hosts.length} hosts
          </p>
          
          <div className="space-y-4">
            {filteredHosts.map((host) => (
              <div key={host.hostId} className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                {/* Host Header */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {host.hostFirstName} {host.hostLastName}
                      </h3>
                      <p className="text-sm text-gray-600">{host.hostEmail}</p>
                      <p className="text-xs text-gray-500 mt-1">Host ID: {host.hostId}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Paid Events</p>
                      <p className="text-2xl font-bold text-gray-900">{host.paidEventsCount}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Latest: {formatDate(host.latestEventDate)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Payment Methods */}
                <div className="p-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-4">Payment Methods</h4>
                  <div className="space-y-4">
                    {host.paymentMethods.map((pm, idx) => (
                      <div
                        key={idx}
                        className={`p-4 rounded-lg border-2 ${
                          pm.method === 'UPI'
                            ? 'bg-green-50 border-green-200'
                            : 'bg-purple-50 border-purple-200'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4" />
                            <span className="font-semibold text-gray-900 uppercase">
                              {pm.method}
                            </span>
                          </div>
                          <div className="text-xs text-gray-600">
                            Used in {pm.eventCount} event{pm.eventCount !== 1 ? 's' : ''}
                          </div>
                        </div>

                        {pm.method === 'UPI' && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-600 mb-1">UPI ID</p>
                            <p className="font-mono text-sm font-medium text-gray-900 bg-white px-3 py-2 rounded border border-green-300">
                              {pm.upiId || 'Not provided'}
                            </p>
                          </div>
                        )}

                        {pm.method === 'BANK' && (
                          <div className="mt-2 space-y-2">
                            <div>
                              <p className="text-xs text-gray-600 mb-1">Account Holder</p>
                              <p className="text-sm font-medium text-gray-900 bg-white px-3 py-2 rounded border border-purple-300">
                                {pm.accountHolderName || 'Not provided'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600 mb-1">Account Number</p>
                              <p className="font-mono text-sm font-medium text-gray-900 bg-white px-3 py-2 rounded border border-purple-300">
                                {maskAccountNumber(pm.accountNumber || '')}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600 mb-1">IFSC Code</p>
                              <p className="font-mono text-sm font-medium text-gray-900 bg-white px-3 py-2 rounded border border-purple-300">
                                {pm.ifscCode || 'Not provided'}
                              </p>
                            </div>
                          </div>
                        )}

                        <p className="text-xs text-gray-500 mt-2">
                          Last used: {pm.lastUsedEvent}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
