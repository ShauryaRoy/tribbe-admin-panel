import { pgTable, serial, text, integer, timestamp, boolean, jsonb, varchar } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: varchar('id').primaryKey(),
  firstName: varchar('first_name'),
  lastName: varchar('last_name'),
  email: varchar('email'),
  profileImageUrl: varchar('profile_image_url'),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at'),
  passwordHash: varchar('password_hash'),
  googleId: varchar('google_id'),
  bio: text('bio'),
  location: varchar('location'),
  website: varchar('website'),
  banned: boolean('banned'),
  role: varchar('role').default('ADMIN'), // ADMIN | FINANCE_ADMIN
});

export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  title: text('title'),
  description: text('description'),
  hostId: varchar('host_id'),
  eventType: varchar('event_type'),
  location: text('location'),
  datetime: timestamp('datetime', { withTimezone: true }),
  imageUrl: text('image_url'),
  maxGuests: integer('max_guests'),
  isPublic: boolean('is_public'),
  settings: jsonb('settings'),
  posterData: jsonb('poster_data'),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at'),
  themeId: varchar('theme_id'),
  mapLink: text('map_link'),
  groupId: integer('group_id'),
  discoverStatus: varchar('discover_status'),
  discoverRequestedAt: timestamp('discover_requested_at'),
  discoverReviewedBy: varchar('discover_reviewed_by'),
  discoverReviewNoteTemp: varchar('discover_review_note_temp'),
  discoverRejectionReason: text('discover_rejection_reason'),
  discoverRequestedMessage: text('discover_requested_message'),
  discoverReviewedAt: timestamp('discover_reviewed_at'),
  discoverReviewNote: text('discover_review_note'),
  slug: varchar('slug'),
  ticketPrice: integer('ticket_price'),
  ticketingEnabled: boolean('ticketing_enabled'),
  currency: varchar('currency'),
  hostUpiId: text('host_upi_id'),
  communityId: integer('community_id'),
  guestListVisibility: varchar('guest_list_visibility'),
  rsvpMode: varchar('rsvp_mode'),
  endDatetime: timestamp('end_datetime', { withTimezone: true }),
});

export const paymentTransactions = pgTable('payment_transactions', {
  id: serial('id').primaryKey(),
  razorpayOrderId: varchar('razorpay_order_id'),
  razorpayPaymentId: varchar('razorpay_payment_id'),
  razorpaySignature: text('razorpay_signature'),
  eventId: integer('event_id'),
  userId: varchar('user_id'),
  amount: integer('amount'),
  currency: varchar('currency'),
  status: varchar('status'),
  paymentMethod: varchar('payment_method'),
  email: varchar('email'),
  contact: varchar('contact'),
  notes: jsonb('notes'),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at'),
  platformFee: integer('platform_fee'),
  hostShare: integer('host_share'),
  refundedAt: timestamp('refunded_at'),
  refundId: varchar('refund_id'),
  refundAmount: integer('refund_amount'),
});

export const payouts = pgTable('payouts', {
  id: serial('id').primaryKey(),
  hostId: varchar('host_id'),
  payoutMethod: varchar('payout_method'), // UPI | BANK
  amount: integer('amount'), // amount_total in paise
  currency: varchar('currency', { length: 3 }).default('INR'), // ISO 4217 currency code
  status: varchar('status'), // PENDING | PAID | ON_HOLD | CANCELLED
  paymentReference: text('payment_reference'), // reference_id - required when PAID (immutable)
  upiId: text('upi_id'),
  bankDetails: jsonb('bank_details'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  paidAt: timestamp('paid_at'),
  cancelledAt: timestamp('cancelled_at'), // when payout was cancelled
  createdBy: varchar('created_by'), // created_by_admin_id
  paidBy: varchar('paid_by'), // paid_by_admin_id
  cancelledBy: varchar('cancelled_by'), // cancelled_by_admin_id
  eventCount: integer('event_count'), // cached count of events
  lastEventDate: timestamp('last_event_date'), // cached last event date
  version: integer('version').default(1), // optimistic locking version (PART 7)
  createdByRole: varchar('created_by_role'), // ADMIN | FINANCE_ADMIN (PART 6)
  paidByRole: varchar('paid_by_role'), // ADMIN | FINANCE_ADMIN (PART 6)
  cancelledByRole: varchar('cancelled_by_role'), // ADMIN | FINANCE_ADMIN (PART 6)
});

export const payoutTransactions = pgTable('payout_transactions', {
  id: serial('id').primaryKey(),
  payoutId: integer('payout_id'),
  transactionId: integer('transaction_id'), // payment_id - foreign key to payment_transactions
  eventId: integer('event_id'),
  grossAmount: integer('gross_amount'), // original transaction amount
  platformFee: integer('platform_fee'),
  netAmount: integer('net_amount'), // host_share_amount (what host gets)
  currency: varchar('currency', { length: 3 }).default('INR'), // ISO 4217 currency code
  createdAt: timestamp('created_at').defaultNow(),
  status: varchar('status').default('AVAILABLE'), // AVAILABLE | RESERVED | PAID
  // State machine: AVAILABLE (not in payout) → RESERVED (in pending payout) → PAID (in paid payout)
  // RESERVED can return to AVAILABLE on payout cancellation
  // PAID is immutable forever
});
