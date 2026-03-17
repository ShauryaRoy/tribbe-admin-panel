import { X, CreditCard, User, Calendar, DollarSign } from 'lucide-react';

interface Event {
  id: number;
  title: string;
  hostFirstName?: string;
  hostLastName?: string;
  hostEmail: string;
  ticketingEnabled: boolean;
  ticketPrice: number;
  currency: string;
  hostUpiId?: string;
  payoutMethod?: string;
  accountHolderName?: string;
  accountNumber?: string;
  ifscCode?: string;
  datetime: string;
  location: string;
  maxGuests?: number;
  currentCapacity: number;
}

interface EventPaymentDetailsDialogProps {
  event: Event;
  onClose: () => void;
}

export default function EventPaymentDetailsDialog({ event, onClose }: EventPaymentDetailsDialogProps) {
  const formatCurrency = (amount: number) => {
    if (!amount) return 'Free';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: event.currency || 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const maskAccountNumber = (accountNumber: string) => {
    if (!accountNumber) return 'N/A';
    if (accountNumber.length <= 4) return accountNumber;
    return '****' + accountNumber.slice(-4);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Host Payment Details</h2>
            <p className="text-sm text-gray-500 mt-1">Event: {event.title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Event Information */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Event Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-600">Event Title</p>
                <p className="font-medium text-gray-900">{event.title}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Date & Time</p>
                <p className="text-sm text-gray-900">{formatDate(event.datetime)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Location</p>
                <p className="text-sm text-gray-900">{event.location}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Capacity</p>
                <p className="text-sm text-gray-900">
                  {event.currentCapacity || 0} / {event.maxGuests || 'Unlimited'}
                </p>
              </div>
            </div>
          </div>

          {/* Host Information */}
          <div className="bg-purple-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <User className="w-4 h-4" />
              Host Information
            </h3>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-gray-600">Name</p>
                <p className="font-medium text-gray-900">
                  {event.hostFirstName} {event.hostLastName}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Email</p>
                <p className="text-sm text-gray-900">{event.hostEmail}</p>
              </div>
            </div>
          </div>

          {/* Ticketing Information */}
          <div className="bg-green-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Ticketing Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-600">Ticketing Enabled</p>
                <p className="text-sm font-medium text-gray-900">
                  {event.ticketingEnabled ? (
                    <span className="text-green-600">✓ Yes</span>
                  ) : (
                    <span className="text-gray-500">✗ No (Free Event)</span>
                  )}
                </p>
              </div>
              {event.ticketingEnabled && (
                <div>
                  <p className="text-xs text-gray-600">Ticket Price</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatCurrency(event.ticketPrice)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Payment Details */}
          {event.ticketingEnabled ? (
            <div className="bg-orange-50 rounded-lg p-4 border-2 border-orange-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Host Payment Details (For Payouts)
              </h3>
              
              {event.payoutMethod ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-gray-600">Payout Method</p>
                    <p className="text-sm font-semibold text-gray-900 uppercase">
                      {event.payoutMethod}
                    </p>
                  </div>

                  {event.payoutMethod?.toUpperCase() === 'UPI' && (
                    <div>
                      <p className="text-xs text-gray-600">UPI ID</p>
                      <p className="text-sm font-mono font-medium text-gray-900 bg-white px-3 py-2 rounded border border-orange-300">
                        {event.hostUpiId || 'Not provided'}
                      </p>
                    </div>
                  )}

                  {event.payoutMethod?.toUpperCase() === 'BANK' && (
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-gray-600">Account Holder Name</p>
                        <p className="text-sm font-medium text-gray-900 bg-white px-3 py-2 rounded border border-orange-300">
                          {event.accountHolderName || 'Not provided'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Account Number</p>
                        <p className="text-sm font-mono font-medium text-gray-900 bg-white px-3 py-2 rounded border border-orange-300">
                          {event.accountNumber || 'Not provided'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">IFSC Code</p>
                        <p className="text-sm font-mono font-medium text-gray-900 bg-white px-3 py-2 rounded border border-orange-300">
                          {event.ifscCode || 'Not provided'}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 p-3 bg-white rounded border border-orange-300">
                    <p className="text-xs text-gray-600 mb-1">⚠️ Important Note:</p>
                    <p className="text-xs text-gray-700">
                      These payment details were provided by the host during event creation. 
                      Verify these details before processing any payouts.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-600">
                    ⚠️ No payment details provided by the host
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    The host may not have set up payout details for this event.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">
                This is a free event. No payment details are required.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
