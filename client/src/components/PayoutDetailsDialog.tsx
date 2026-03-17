import { useQuery } from '@tanstack/react-query';
import { X, User, CreditCard, FileText, TrendingUp } from 'lucide-react';

const authenticatedFetch = async (url: string) => {
  const token = localStorage.getItem('admin_token');
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  
  return response.json();
};

interface PayoutDetailsDialogProps {
  payoutId: number;
  onClose: () => void;
  onMarkAsPaid: () => void;
}

export default function PayoutDetailsDialog({ payoutId, onClose, onMarkAsPaid }: PayoutDetailsDialogProps) {
  const { data: payout, isLoading, error } = useQuery({
    queryKey: ['payout-details', payoutId],
    queryFn: () => authenticatedFetch(`/api/admin/payouts/${payoutId}`),
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount / 100);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-4xl w-full mx-4">
          <div className="text-center text-gray-600">Loading payout details...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-4xl w-full mx-4">
          <div className="text-center text-red-600">Error: {(error as Error).message}</div>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 w-full"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (!payout) return null;

  const items = payout.items || [];
  const totalGross = items.reduce((sum: number, item: any) => sum + (item.grossAmount || 0), 0);
  const totalFees = items.reduce((sum: number, item: any) => sum + (item.platformFee || 0), 0);
  const totalNet = items.reduce((sum: number, item: any) => sum + (item.netAmount || 0), 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 max-w-6xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Payout Details</h2>
            <p className="text-sm text-gray-500 mt-1">Payout ID: {payout.id}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Host Summary */}
          <div className="lg:col-span-1 space-y-6">
            {/* Host Info */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <User className="w-4 h-4" />
                Host Information
              </h3>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-gray-600">Name</p>
                  <p className="font-medium text-gray-900">
                    {payout.host?.firstName} {payout.host?.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Email</p>
                  <p className="text-sm text-gray-900">{payout.host?.email}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Host ID</p>
                  <p className="text-sm text-gray-500 font-mono">{payout.hostId}</p>
                </div>
              </div>
            </div>

            {/* Lifetime Stats */}
            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Lifetime Statistics
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-600">Total Earnings</p>
                  <p className="text-lg font-bold text-gray-900">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(payout.lifetimeStats?.lifetimeEarnings || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Total Paid Out</p>
                  <p className="text-lg font-bold text-gray-900">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(payout.lifetimeStats?.lifetimePayouts || 0)}
                  </p>
                </div>
                <div className="pt-2 border-t border-green-200">
                  <p className="text-xs text-gray-600">Current Balance</p>
                  <p className="text-2xl font-bold text-green-600">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(payout.lifetimeStats?.currentBalance || 0)}
                  </p>
                </div>
                <div className="text-xs text-gray-500">
                  {payout.lifetimeStats?.transactionCount || 0} transactions • {payout.lifetimeStats?.payoutCount || 0} payouts
                </div>
              </div>
            </div>

            {/* Payout Destination */}
            <div className="bg-purple-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Payout Destination (READ-ONLY)
              </h3>
              {payout.payoutMethod === 'UPI' ? (
                <div>
                  <p className="text-xs text-gray-600">UPI ID</p>
                  <p className="font-mono text-sm font-medium text-gray-900">{payout.upiId || 'Not provided'}</p>
                </div>
              ) : payout.payoutMethod === 'BANK' ? (
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-gray-600">Account Holder</p>
                    <p className="text-sm font-medium text-gray-900">{payout.bankDetails?.accountHolder || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Account Number</p>
                    <p className="text-sm font-mono text-gray-900">
                      ****{payout.bankDetails?.accountNumber?.slice(-4) || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">IFSC Code</p>
                    <p className="text-sm font-mono text-gray-900">{payout.bankDetails?.ifsc || 'N/A'}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No payout method specified</p>
              )}
              <p className="text-xs text-gray-500 mt-3 italic">
                ⚠️ Payout details cannot be changed after tickets are sold
              </p>
            </div>

            {/* Payout Status */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Payout Status</h3>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-gray-600">Status</p>
                  <p className="text-sm font-bold text-gray-900">{payout.status}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Created</p>
                  <p className="text-sm text-gray-900">{formatDate(payout.createdAt)}</p>
                </div>
                {payout.paidAt && (
                  <div>
                    <p className="text-xs text-gray-600">Paid</p>
                    <p className="text-sm text-gray-900">{formatDate(payout.paidAt)}</p>
                  </div>
                )}
                {payout.paymentReference && (
                  <div>
                    <p className="text-xs text-gray-600">Reference</p>
                    <p className="text-sm font-mono text-gray-900">{payout.paymentReference}</p>
                  </div>
                )}
                {payout.notes && (
                  <div>
                    <p className="text-xs text-gray-600">Notes</p>
                    <p className="text-sm text-gray-700">{payout.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Event & Payment Ledger */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Event & Payment Ledger
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {items.length} payment{items.length !== 1 ? 's' : ''} from {payout.eventCount || 0} event{payout.eventCount !== 1 ? 's' : ''}
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment ID</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Gross</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Fee</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Net</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {items.map((item: any) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900">{item.event?.title || 'Unknown Event'}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {item.event?.datetime ? new Date(item.event.datetime).toLocaleDateString('en-IN') : 'N/A'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono text-blue-600">#{item.transactionId}</span>
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-900">
                          {formatCurrency(item.grossAmount)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-red-600">
                          -{formatCurrency(item.platformFee)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-green-600">
                          {formatCurrency(item.netAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                    <tr className="font-bold">
                      <td colSpan={3} className="px-4 py-3 text-sm text-gray-900">TOTAL</td>
                      <td className="px-4 py-3 text-right text-sm text-gray-900">
                        {formatCurrency(totalGross)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-red-600">
                        -{formatCurrency(totalFees)}
                      </td>
                      <td className="px-4 py-3 text-right text-lg font-bold text-green-600">
                        {formatCurrency(totalNet)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex items-center justify-end gap-3">
              {payout.status === 'PENDING' && (
                <button
                  onClick={onMarkAsPaid}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
                >
                  Mark as Paid
                </button>
              )}
              <button
                onClick={onClose}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
