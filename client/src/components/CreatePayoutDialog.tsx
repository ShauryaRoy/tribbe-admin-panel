import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, User, CreditCard, FileText } from 'lucide-react';

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

interface CreatePayoutDialogProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreatePayoutDialog({ onClose, onSuccess }: CreatePayoutDialogProps) {
  const queryClient = useQueryClient();
  
  // Fetch hosts with outstanding balances
  const { data: hosts = [], isLoading: hostsLoading } = useQuery({
    queryKey: ['outstanding-hosts'],
    queryFn: () => authenticatedFetch('/api/admin/payouts/hosts/outstanding'),
  });

  // Form state
  const [formData, setFormData] = useState({
    hostId: '',
    payoutMethod: 'UPI',
    upiId: '',
    bankAccountHolder: '',
    bankAccountNumber: '',
    bankIfsc: '',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedHost, setSelectedHost] = useState<any>(null);

  // Fetch host payout destination when host is selected
  const { data: payoutDestination } = useQuery({
    queryKey: ['payout-destination', formData.hostId],
    queryFn: () => authenticatedFetch(`/api/admin/payouts/hosts/${formData.hostId}/destination`),
    enabled: !!formData.hostId,
  });

  // Auto-fill payout details when destination loads
  if (payoutDestination && !formData.upiId && formData.payoutMethod === 'UPI') {
    if (payoutDestination.upiId) {
      setFormData(prev => ({ ...prev, upiId: payoutDestination.upiId }));
    }
  }

  // Mutation
  const createPayoutMutation = useMutation({
    mutationFn: async (data: any) => {
      return authenticatedFetch('/api/admin/payouts', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payouts'] });
      queryClient.invalidateQueries({ queryKey: ['outstanding-hosts'] });
      onSuccess();
    },
    onError: (error: Error) => {
      alert('Error: ' + error.message);
    },
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.hostId) {
      newErrors.hostId = 'Please select a host';
    }

    if (!formData.payoutMethod) {
      newErrors.payoutMethod = 'Please select a payout method';
    }

    if (formData.payoutMethod === 'UPI') {
      if (!formData.upiId || formData.upiId.trim() === '') {
        newErrors.upiId = 'UPI ID is required for UPI payouts';
      }
    }

    if (formData.payoutMethod === 'BANK') {
      if (!formData.bankAccountHolder || formData.bankAccountHolder.trim() === '') {
        newErrors.bankAccountHolder = 'Account holder name is required';
      }
      if (!formData.bankAccountNumber || formData.bankAccountNumber.trim() === '') {
        newErrors.bankAccountNumber = 'Account number is required';
      }
      if (!formData.bankIfsc || formData.bankIfsc.trim() === '') {
        newErrors.bankIfsc = 'IFSC code is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const payload: any = {
      hostId: formData.hostId,
      payoutMethod: formData.payoutMethod,
      notes: formData.notes,
    };

    if (formData.payoutMethod === 'UPI') {
      payload.upiId = formData.upiId;
    } else if (formData.payoutMethod === 'BANK') {
      payload.bankDetails = {
        accountHolder: formData.bankAccountHolder,
        accountNumber: formData.bankAccountNumber,
        ifsc: formData.bankIfsc,
      };
    }

    if (!confirm(`Create payout for ${selectedHost?.hostName}? This will include all unpaid transactions.`)) {
      return;
    }

    createPayoutMutation.mutate(payload);
  };

  const handleHostChange = (hostId: string) => {
    const host = hosts.find((h: any) => h.hostId === hostId);
    setSelectedHost(host);
    setFormData({ ...formData, hostId });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Create Payout</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {hostsLoading ? (
          <div className="text-center text-gray-600 py-8">Loading hosts...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Host Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <User className="w-4 h-4 inline mr-1" />
                Select Host *
              </label>
              <select
                value={formData.hostId}
                onChange={(e) => handleHostChange(e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.hostId ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">-- Select a host --</option>
                {hosts.map((host: any) => (
                  <option key={host.hostId} value={host.hostId}>
                    {host.hostName} ({host.hostEmail}) - Outstanding: ₹{host.outstanding.toFixed(2)}
                  </option>
                ))}
              </select>
              {errors.hostId && (
                <p className="text-xs text-red-600 mt-1">{errors.hostId}</p>
              )}
            </div>

            {/* Host Summary */}
            {selectedHost && (
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Host Summary</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-600">Outstanding Balance:</p>
                    <p className="font-bold text-blue-600 text-lg">
                      ₹{selectedHost.outstanding.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Tickets Sold:</p>
                    <p className="font-semibold text-gray-900">{selectedHost.ticketsSold}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Total Earnings:</p>
                    <p className="font-semibold text-gray-900">₹{selectedHost.totalEarnings.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Already Paid:</p>
                    <p className="font-semibold text-gray-900">₹{selectedHost.paidOut.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Payout Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <CreditCard className="w-4 h-4 inline mr-1" />
                Payout Method *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, payoutMethod: 'UPI' })}
                  className={`px-4 py-3 border-2 rounded-lg text-center transition ${
                    formData.payoutMethod === 'UPI'
                      ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  UPI Transfer
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, payoutMethod: 'BANK' })}
                  className={`px-4 py-3 border-2 rounded-lg text-center transition ${
                    formData.payoutMethod === 'BANK'
                      ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  Bank Transfer
                </button>
              </div>
              {errors.payoutMethod && (
                <p className="text-xs text-red-600 mt-1">{errors.payoutMethod}</p>
              )}
            </div>

            {/* UPI Details */}
            {formData.payoutMethod === 'UPI' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  UPI ID *
                </label>
                <input
                  type="text"
                  value={formData.upiId}
                  onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.upiId ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="e.g., host@paytm"
                />
                {errors.upiId && (
                  <p className="text-xs text-red-600 mt-1">{errors.upiId}</p>
                )}
              </div>
            )}

            {/* Bank Details */}
            {formData.payoutMethod === 'BANK' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Holder Name *
                  </label>
                  <input
                    type="text"
                    value={formData.bankAccountHolder}
                    onChange={(e) => setFormData({ ...formData, bankAccountHolder: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.bankAccountHolder ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="As per bank records"
                  />
                  {errors.bankAccountHolder && (
                    <p className="text-xs text-red-600 mt-1">{errors.bankAccountHolder}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Number *
                  </label>
                  <input
                    type="text"
                    value={formData.bankAccountNumber}
                    onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.bankAccountNumber ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Bank account number"
                  />
                  {errors.bankAccountNumber && (
                    <p className="text-xs text-red-600 mt-1">{errors.bankAccountNumber}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    IFSC Code *
                  </label>
                  <input
                    type="text"
                    value={formData.bankIfsc}
                    onChange={(e) => setFormData({ ...formData, bankIfsc: e.target.value.toUpperCase() })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.bankIfsc ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="e.g., SBIN0001234"
                    maxLength={11}
                  />
                  {errors.bankIfsc && (
                    <p className="text-xs text-red-600 mt-1">{errors.bankIfsc}</p>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <FileText className="w-4 h-4 inline mr-1" />
                Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Add any additional notes or comments..."
              />
            </div>

            {/* Info Box */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
              <p className="font-semibold mb-1">⚠️ Important:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>This will create a payout for ALL unpaid transactions of this host</li>
                <li>Payout destination cannot be changed after creation</li>
                <li>You can delete the payout before marking it as paid</li>
              </ul>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-3 pt-4">
              <button
                type="submit"
                disabled={createPayoutMutation.isPending}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createPayoutMutation.isPending ? 'Creating...' : 'Create Payout'}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={createPayoutMutation.isPending}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
