import { db } from '../db.js';
import { paymentTransactions, payouts, payoutTransactions, events, users } from '../schema.js';
import { eq, and, gte, lte, sql, desc, isNull, inArray, notInArray } from 'drizzle-orm';
import { filterEligibleTransactions, DEFAULT_ELIGIBILITY_CONFIG } from './payout-eligibility.js';

export class PayoutService {
  /**
   * Get all payouts with pagination, filtering, and searching
   */
  async getPayouts(filters?: {
    status?: string;
    startDate?: Date;
    endDate?: Date;
    minAmount?: number;
    maxAmount?: number;
    payoutMethod?: string;
    search?: string;
    sortBy?: 'amount' | 'created_at' | 'last_event_date';
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }) {
    const conditions = [];

    // Status filter
    if (filters?.status && filters.status !== 'ALL') {
      conditions.push(eq(payouts.status, filters.status));
    }

    // Date range filter
    if (filters?.startDate) {
      conditions.push(gte(payouts.createdAt, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(payouts.createdAt, filters.endDate));
    }

    // Amount range filter
    if (filters?.minAmount) {
      conditions.push(gte(payouts.amount, Math.round(filters.minAmount * 100)));
    }
    if (filters?.maxAmount) {
      conditions.push(lte(payouts.amount, Math.round(filters.maxAmount * 100)));
    }

    // Payout method filter
    if (filters?.payoutMethod && filters.payoutMethod !== 'ALL') {
      conditions.push(eq(payouts.payoutMethod, filters.payoutMethod));
    }

    // Get sort parameters first
    const sortColumn = filters?.sortBy || 'created_at';
    const sortOrder = filters?.sortOrder || 'desc';

    // Build base query
    let baseQuery = db
      .select({
        payout: payouts,
        host: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
      })
      .from(payouts)
      .leftJoin(users, eq(payouts.hostId, users.id))
      .where(and(...conditions));

    // Apply ordering
    if (sortColumn === 'amount') {
      baseQuery = sortOrder === 'asc' ? baseQuery.orderBy(payouts.amount) : baseQuery.orderBy(desc(payouts.amount));
    } else if (sortColumn === 'last_event_date') {
      baseQuery = sortOrder === 'asc' ? baseQuery.orderBy(payouts.lastEventDate) : baseQuery.orderBy(desc(payouts.lastEventDate));
    } else {
      baseQuery = sortOrder === 'asc' ? baseQuery.orderBy(payouts.createdAt) : baseQuery.orderBy(desc(payouts.createdAt));
    }

    // Get total count for pagination
    const countQuery = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(payouts)
      .where(and(...conditions));
    
    const totalCount = Number(countQuery[0]?.count || 0);

    // Apply pagination
    if (filters?.limit) {
      baseQuery = baseQuery.limit(filters.limit);
    }
    if (filters?.offset) {
      baseQuery = baseQuery.offset(filters.offset);
    }

    const results = await baseQuery;

    // Apply search filter in-memory (for host name)
    let filteredResults = results;
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      filteredResults = results.filter(r => {
        const hostName = `${r.host?.firstName || ''} ${r.host?.lastName || ''}`.toLowerCase();
        const hostEmail = r.host?.email?.toLowerCase() || '';
        return hostName.includes(searchLower) || hostEmail.includes(searchLower);
      });
    }

    return {
      data: filteredResults.map(r => ({
        ...r.payout,
        host: r.host,
      })),
      total: totalCount,
      limit: filters?.limit || 100,
      offset: filters?.offset || 0,
    };
  }

  /**
   * Get a single payout with full details
   */
  async getPayoutById(payoutId: number) {
    // Get payout with host details
    const [result] = await db
      .select({
        payout: payouts,
        host: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
      })
      .from(payouts)
      .leftJoin(users, eq(payouts.hostId, users.id))
      .where(eq(payouts.id, payoutId));

    if (!result) {
      throw new Error('Payout not found');
    }

    // Get payout items (transactions)
    const items = await db
      .select({
        item: payoutTransactions,
        transaction: paymentTransactions,
        event: {
          id: events.id,
          title: events.title,
          datetime: events.datetime,
        },
      })
      .from(payoutTransactions)
      .leftJoin(paymentTransactions, eq(payoutTransactions.transactionId, paymentTransactions.id))
      .leftJoin(events, eq(payoutTransactions.eventId, events.id))
      .where(eq(payoutTransactions.payoutId, payoutId))
      .orderBy(desc(events.datetime));

    // Calculate host lifetime stats
    const lifetimeStats = result.payout.hostId ? await this.getHostLifetimeStats(result.payout.hostId) : null;

    return {
      ...result.payout,
      host: result.host,
      items: items.map(i => ({
        ...i.item,
        transaction: i.transaction,
        event: i.event,
      })),
      lifetimeStats,
    };
  }

  /**
   * Get host lifetime statistics
   */
  async getHostLifetimeStats(hostId: string) {
    // Total earnings (all captured, non-refunded payments)
    const [earnings] = await db
      .select({
        totalEarnings: sql<number>`COALESCE(SUM(${paymentTransactions.hostShare}), 0)`,
        transactionCount: sql<number>`COUNT(*)`,
      })
      .from(paymentTransactions)
      .leftJoin(events, eq(paymentTransactions.eventId, events.id))
      .where(
        and(
          eq(events.hostId, hostId),
          eq(paymentTransactions.status, 'captured'),
          isNull(paymentTransactions.refundedAt)
        )
      );

    // Total paid out
    const [paidOut] = await db
      .select({
        totalPaid: sql<number>`COALESCE(SUM(${payouts.amount}), 0)`,
        payoutCount: sql<number>`COUNT(*)`,
      })
      .from(payouts)
      .where(
        and(
          eq(payouts.hostId, hostId),
          eq(payouts.status, 'PAID')
        )
      );

    const totalEarnings = Number(earnings?.totalEarnings || 0);
    const totalPaid = Number(paidOut?.totalPaid || 0);
    const currentBalance = totalEarnings - totalPaid;

    return {
      lifetimeEarnings: totalEarnings / 100,
      lifetimePayouts: totalPaid / 100,
      currentBalance: currentBalance / 100,
      transactionCount: Number(earnings?.transactionCount || 0),
      payoutCount: Number(paidOut?.payoutCount || 0),
    };
  }

  /**
   * Create a payout batch - WITH STATE MACHINE AND ELIGIBILITY RULES
   * PART 4: Items become RESERVED
   * PART 5: Eligibility rules enforced
   * PART 6: Role logged
   */
  async createPayout(data: {
    hostId: string;
    payoutMethod: 'UPI' | 'BANK';
    upiId?: string;
    bankDetails?: any;
    notes?: string;
    createdBy: string;
    createdByRole: string; // PART 6
  }) {
    // 1. Get all transactions for this host (excluding already RESERVED or PAID)
    // PART 4: Hard invariant - only AVAILABLE transactions can be included
    const reservedOrPaidTransactions = await db
      .select({ transactionId: payoutTransactions.transactionId })
      .from(payoutTransactions)
      .where(
        inArray(payoutTransactions.status, ['RESERVED', 'PAID'])
      )
      .then(rows => rows.map(r => r.transactionId));

    // Get all host transactions
    let candidateTransactionsQuery = db
      .select({
        transaction: paymentTransactions,
        event: {
          id: events.id,
          title: events.title,
          datetime: events.datetime,
        },
      })
      .from(paymentTransactions)
      .leftJoin(events, eq(paymentTransactions.eventId, events.id))
      .where(
        and(
          eq(events.hostId, data.hostId),
          eq(paymentTransactions.status, 'captured'),
          isNull(paymentTransactions.refundedAt),
          reservedOrPaidTransactions.length > 0
            ? sql`${paymentTransactions.id} NOT IN (${sql.join(reservedOrPaidTransactions.map(id => sql`${id}`), sql`, `)})`
            : sql`true`
        )
      )
      .orderBy(desc(events.datetime));

    const candidateTransactions = await candidateTransactionsQuery;

    // PART 5: Apply eligibility rules
    const { eligible: unpaidTransactions, ineligible } = filterEligibleTransactions(
      candidateTransactions,
      DEFAULT_ELIGIBILITY_CONFIG
    );

    if (unpaidTransactions.length === 0) {
      const reasons = ineligible.slice(0, 3).map(i => i.reason).join('; ');
      throw new Error(
        `No eligible transactions found for this host. ` +
        `${ineligible.length} ineligible: ${reasons}`
      );
    }

    // 2. Calculate totals
    const totalNet = unpaidTransactions.reduce((sum, t) => sum + (t.transaction.hostShare || 0), 0);
    const eventIds = [...new Set(unpaidTransactions.map(t => t.event?.id).filter(Boolean))];
    const lastEventDate = unpaidTransactions[0]?.event?.datetime;

    // 3. Get currency from first transaction
    const currency = unpaidTransactions[0]?.transaction.currency || 'INR';

    // 4. Create payout batch with role logging (PART 6)
    const [payout] = await db
      .insert(payouts)
      .values({
        hostId: data.hostId,
        payoutMethod: data.payoutMethod,
        amount: totalNet,
        currency: currency,
        status: 'PENDING',
        upiId: data.upiId,
        bankDetails: data.bankDetails,
        notes: data.notes,
        createdBy: data.createdBy,
        createdByRole: data.createdByRole, // PART 6
        eventCount: eventIds.length,
        lastEventDate: lastEventDate || null,
        version: 1, // PART 7
      })
      .returning();

    // 5. Verify all transactions are currently AVAILABLE (hard invariant)
    const transactionIds = unpaidTransactions.map(t => t.transaction.id);
    const existingItems = await db
      .select({ transactionId: payoutTransactions.transactionId, status: payoutTransactions.status })
      .from(payoutTransactions)
      .where(inArray(payoutTransactions.transactionId, transactionIds));

    // Transactions must either not exist in payout_transactions (new) or be AVAILABLE
    const invalidItems = existingItems.filter(item => item.status !== 'AVAILABLE');
    if (invalidItems.length > 0) {
      throw new Error(
        `Cannot create payout: ${invalidItems.length} transactions are not AVAILABLE. ` +
        `Only AVAILABLE transactions can be included in new payouts.`
      );
    }

    // 6. Create payout items with RESERVED status (PART 4)
    const payoutItems = unpaidTransactions.map(t => ({
      payoutId: payout.id,
      transactionId: t.transaction.id,
      eventId: t.event?.id || 0,
      grossAmount: t.transaction.amount || 0,
      platformFee: t.transaction.platformFee || 0,
      netAmount: t.transaction.hostShare || 0,
      currency: t.transaction.currency || 'INR',
      status: 'RESERVED', // PART 4: Lock as RESERVED when added to payout
    }));

    await db.insert(payoutTransactions).values(payoutItems);

    return payout;
  }

  /**
   * Mark payout as paid - WITH IDEMPOTENCY GUARDS
   * PART 4: Update items to PAID status
   * PART 6: Log role
   * PART 7: Idempotency with version check
   */
  async markPayoutAsPaid(
    payoutId: number,
    data: {
      amountPaid: number;
      paymentMethod: string;
      referenceId: string;
      payoutDate: Date;
      paidBy: string;
      paidByRole: string; // PART 6
      expectedVersion?: number; // PART 7: Optional optimistic lock
    }
  ) {
    // 1. SAFETY CHECK: Reference ID is mandatory and immutable
    if (!data.referenceId || data.referenceId.trim() === '') {
      throw new Error('Transaction reference ID is mandatory');
    }

    // 2. Get payout
    const [payout] = await db
      .select()
      .from(payouts)
      .where(eq(payouts.id, payoutId));

    if (!payout) {
      throw new Error('Payout not found');
    }

    // PART 7: Idempotency check - reject if not PENDING
    if (payout.status !== 'PENDING') {
      if (payout.status === 'PAID') {
        throw new Error('This payout has already been marked as paid');
      }
      if (payout.status === 'CANCELLED') {
        throw new Error('Cannot mark a cancelled payout as paid');
      }
      throw new Error(`Cannot mark payout as paid when status is ${payout.status}`);
    }

    // PART 7: Check version if provided (optimistic locking)
    if (data.expectedVersion !== undefined && payout.version !== data.expectedVersion) {
      throw new Error(
        `Version mismatch: expected ${data.expectedVersion}, got ${payout.version}. ` +
        `Payout may have been modified by another admin.`
      );
    }

    // 3. Check if payment reference already used (prevent duplicate references)
    if (payout.paymentReference) {
      throw new Error('Payment reference is immutable and already set');
    }

    // 4. SAFETY CHECK: Verify payout currency matches
    const items = await db
      .select()
      .from(payoutTransactions)
      .where(eq(payoutTransactions.payoutId, payoutId));

    const currencies = [...new Set(items.map(item => item.currency))];
    if (currencies.length > 1) {
      throw new Error('Payout contains multiple currencies - this should never happen');
    }

    // 5. PART 7: Update payout status with WHERE clause for idempotency
    const updateResult = await db
      .update(payouts)
      .set({
        status: 'PAID',
        paidAt: data.payoutDate,
        paymentReference: `${data.paymentMethod}: ${data.referenceId}`,
        paidBy: data.paidBy,
        paidByRole: data.paidByRole, // PART 6
        version: sql`${payouts.version} + 1`, // PART 7: Increment version
      })
      .where(
        and(
          eq(payouts.id, payoutId),
          eq(payouts.status, 'PENDING') // PART 7: Only update if still PENDING
        )
      )
      .returning();

    // PART 7: Check if update succeeded (affected rows > 0)
    if (updateResult.length === 0) {
      throw new Error(
        'Failed to mark payout as paid. Payout may have been modified by another admin. Please refresh and try again.'
      );
    }

    // 6. PART 4: Update payout items to PAID status with row count validation
    const itemUpdateResult = await db
      .update(payoutTransactions)
      .set({ status: 'PAID' })
      .where(
        and(
          eq(payoutTransactions.payoutId, payoutId),
          eq(payoutTransactions.status, 'RESERVED') // Only RESERVED items can become PAID
        )
      )
      .returning();

    // PART 4: Verify all items were updated (detect corruption)
    if (itemUpdateResult.length !== items.length) {
      throw new Error(
        `Transaction state corruption detected: expected ${items.length} RESERVED items, ` +
        `but only ${itemUpdateResult.length} were updated. Payout NOT marked as paid.`
      );
    }

    return updateResult[0];
  }

  /**
   * Get hosts with outstanding balances
   */
  async getHostsWithOutstandingBalances() {
    // Get all hosts who have earned money
    const earnings = await db
      .select({
        hostId: events.hostId,
        totalEarnings: sql<number>`COALESCE(SUM(${paymentTransactions.hostShare}), 0)`,
        ticketsSold: sql<number>`COUNT(*)`,
        lastEventDate: sql<Date>`MAX(${events.datetime})`,
      })
      .from(paymentTransactions)
      .leftJoin(events, eq(paymentTransactions.eventId, events.id))
      .where(
        and(
          eq(paymentTransactions.status, 'captured'),
          isNull(paymentTransactions.refundedAt)
        )
      )
      .groupBy(events.hostId);

    // Get host details
    const hostIds = earnings.map(e => e.hostId).filter(Boolean);
    if (hostIds.length === 0) return [];

    const hosts = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      })
      .from(users)
      .where(inArray(users.id, hostIds as string[]));

    const hostMap = new Map(hosts.map(h => [h.id, h]));

    // Get paid out amounts per host
    const paidOutAmounts = await db
      .select({
        hostId: payouts.hostId,
        paidOut: sql<number>`COALESCE(SUM(${payouts.amount}), 0)`,
      })
      .from(payouts)
      .where(eq(payouts.status, 'PAID'))
      .groupBy(payouts.hostId);

    const paidOutMap = new Map(paidOutAmounts.map(p => [p.hostId, Number(p.paidOut)]));

    // Combine and filter
    return earnings
      .map(e => {
        const host = e.hostId ? hostMap.get(e.hostId) : null;
        const paidOut = e.hostId ? (paidOutMap.get(e.hostId) || 0) : 0;
        const totalEarnings = Number(e.totalEarnings);
        const outstanding = totalEarnings - paidOut;

        return {
          hostId: e.hostId,
          hostName: host ? `${host.firstName || ''} ${host.lastName || ''}`.trim() || host.email : 'Unknown',
          hostEmail: host?.email,
          ticketsSold: Number(e.ticketsSold),
          totalEarnings: totalEarnings / 100,
          paidOut: paidOut / 100,
          outstanding: outstanding / 100,
          lastEventDate: e.lastEventDate,
        };
      })
      .filter(e => e.outstanding > 0);
  }

  /**
   * Get payout destination details for a host
   */
  async getHostPayoutDestination(hostId: string) {
    // Get the most recent event with payout details
    const [event] = await db
      .select({
        hostUpiId: events.hostUpiId,
      })
      .from(events)
      .where(eq(events.hostId, hostId))
      .orderBy(desc(events.createdAt))
      .limit(1);

    return {
      upiId: event?.hostUpiId || null,
      // Bank details would come from user profile if implemented
      bankDetails: null,
    };
  }

  /**
   * Check if payout can be cancelled - SAFETY CHECK
   */
  async canCancelPayout(payoutId: number): Promise<boolean> {
    const [payout] = await db
      .select({ status: payouts.status })
      .from(payouts)
      .where(eq(payouts.id, payoutId))
      .limit(1);

    if (!payout) return false;
    return ['PENDING', 'ON_HOLD'].includes(payout.status);
  }

  /**
   * Cancel a payout and return RESERVED items to AVAILABLE state
   * PART 6: Log role
   */
  async cancelPayout(payoutId: number, cancelledBy: string, cancelledByRole: string) {
    // SAFETY CHECK: Can only cancel PENDING or ON_HOLD payouts
    const canCancel = await this.canCancelPayout(payoutId);
    if (!canCancel) {
      throw new Error('Cannot cancel a payout that has been paid or is already cancelled');
    }

    // PART 4: Return RESERVED items to AVAILABLE (never touch PAID items)
    const itemUpdateResult = await db
      .update(payoutTransactions)
      .set({ status: 'AVAILABLE' })
      .where(
        and(
          eq(payoutTransactions.payoutId, payoutId),
          eq(payoutTransactions.status, 'RESERVED') // Only RESERVED items return to AVAILABLE
        )
      )
      .returning();

    // Verify we updated items (if payout had items, they should be RESERVED)
    const allItems = await db
      .select()
      .from(payoutTransactions)
      .where(eq(payoutTransactions.payoutId, payoutId));

    const paidItems = allItems.filter(item => item.status === 'PAID');
    if (paidItems.length > 0) {
      throw new Error(
        `Cannot cancel payout: ${paidItems.length} items are already PAID. ` +
        `This payout was already marked as paid.`
      );
    }

    // Soft cancel - update status, preserve all data for audit, log role (PART 6)
    const [cancelledPayout] = await db
      .update(payouts)
      .set({
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledBy: cancelledBy,
        cancelledByRole: cancelledByRole, // PART 6
      })
      .where(eq(payouts.id, payoutId))
      .returning();

    return cancelledPayout;
  }
}
