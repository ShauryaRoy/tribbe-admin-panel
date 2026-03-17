import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, DollarSign, CreditCard, Calendar, AlertCircle } from 'lucide-react';

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

interface MarkAsPaidDialogProps {
  payoutId: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function MarkAsPaidDialog({ payoutId, onClose, onSuccess }: MarkAsPaidDialogProps) {
  const queryClient = useQueryClient();
  
  // Fetch payout details
  const { data: payout, isLoading } = useQuery({
    queryKey: ['payout-details', payoutId],
    queryFn: () => authenticatedFetch(`/api/admin/payouts/${payoutId}`),
  });

  // Form state
  const [formData, setFormData] = useState({
    amountPaid: '',
    paymentMethod: 'UPI',
    referenceId: '',
    payoutDate: new Date().toISOString().split('T')[0],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Mutation
  const markAsPaidMutation = useMutation({
    mutationFn: async (data: any) => {
      return authenticatedFetch(`/api/admin/payouts/${payoutId}/pay`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payouts'] });
      queryClient.invalidateQueries({ queryKey: ['payout-details', payoutId] });
      queryClient.invalidateQueries({ queryKey: ['outstanding-hosts'] });
      onSuccess();
    },
    onError: (error: Error) => {
      alert('Error: ' + error.message);
    },
  });

  // Set default amount when payout loads
  if (payout && !formData.amountPaid) {
    setFormData(prev => ({
      ...prev,
      amountPaid: (payout.amount / 100).toFixed(2),
    }));
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.amountPaid || parseFloat(formData.amountPaid) <= 0) {
      newErrors.amountPaid = 'Amount must be greater than 0';
    }

    if (!formData.paymentMethod) {
      newErrors.paymentMethod = 'Payment method is required';
    }

    if (!formData.referenceId || formData.referenceId.trim() === '') {
      newErrors.referenceId = 'Transaction reference ID is mandatory';
    }

    if (!formData.payoutDate) {
      newErrors.payoutDate = 'Payout date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (!confirm('Are you sure you want to mark this payout as paid? This action cannot be undone.')) {
      return;
    }

    markAsPaidMutation.mutate(formData);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount / 100);
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="text-center text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  if (!payout) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Mark as Paid</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Payout Summary */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Host:</span>
              <span className="text-sm font-medium text-gray-900">
                {payout.host?.firstName} {payout.host?.lastName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Payout ID:</span>
              <span className="text-sm font-mono text-gray-900">#{payout.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Amount:</span>
              <span className="text-lg font-bold text-blue-600">
                {formatCurrency(payout.amount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Events:</span>
              <span className="text-sm font-medium text-gray-900">{payout.eventCount}</span>
            </div>
          </div>
        </div>

        {/* Warning */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <p className="font-semibold mb-1">Important:</p>
            <p>This action cannot be undone. Ensure the payment has been successfully transferred before confirming.</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount Paid */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <DollarSign className="w-4 h-4 inline mr-1" />
              Amount Paid (₹) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={formData.amountPaid}
              onChange={(e) => setFormData({ ...formData, amountPaid: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.amountPaid ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter amount paid"
            />
            {errors.amountPaid && (
              <p className="text-xs text-red-600 mt-1">{errors.amountPaid}</p>
            )}
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <CreditCard className="w-4 h-4 inline mr-1" />
              Payment Method Used *
            </label>
            <select
              value={formData.paymentMethod}
              onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.paymentMethod ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="UPI">UPI Transfer</option>
              <option value="BANK">Bank Transfer</option>
              <option value="NEFT">NEFT</option>
              <option value="RTGS">RTGS</option>
              <option value="IMPS">IMPS</option>
              <option value="CHEQUE">Cheque</option>
              <option value="OTHER">Other</option>
            </select>
            {errors.paymentMethod && (
              <p className="text-xs text-red-600 mt-1">{errors.paymentMethod}</p>
            )}
          </div>

          {/* Transaction Reference ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Transaction Reference ID *
            </label>
            <input
              type="text"
              value={formData.referenceId}
              onChange={(e) => setFormData({ ...formData, referenceId: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.referenceId ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., UTR number, transaction ID"
            />
            {errors.referenceId && (
              <p className="text-xs text-red-600 mt-1">{errors.referenceId}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Enter the bank/UPI transaction reference number for audit trail
            </p>
          </div>

          {/* Payout Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar className="w-4 h-4 inline mr-1" />
              Payout Date *
            </label>
            <input
              type="date"
              value={formData.payoutDate}
              onChange={(e) => setFormData({ ...formData, payoutDate: e.target.value })}
              max={new Date().toISOString().split('T')[0]}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.payoutDate ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.payoutDate && (
              <p className="text-xs text-red-600 mt-1">{errors.payoutDate}</p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-3 pt-4">
            <button
              type="submit"
              disabled={markAsPaidMutation.isPending}
              className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {markAsPaidMutation.isPending ? 'Processing...' : 'Confirm Payment'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={markAsPaidMutation.isPending}
              className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
