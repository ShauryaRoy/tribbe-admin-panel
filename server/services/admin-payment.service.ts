import { db } from '../db.js';
import { paymentTransactions, payouts, payoutTransactions, events, users } from '../schema.js';
import { eq, and, gte, lte, sql, desc, asc, isNull, isNotNull, inArray } from 'drizzle-orm';

export class AdminPaymentService {
  // Get overview stats
  async getPaymentStats(startDate?: Date, endDate?: Date) {
    console.log('[AdminPaymentService] getPaymentStats called', { startDate, endDate });
    
    const dateFilter = [];
    if (startDate) {
      dateFilter.push(gte(paymentTransactions.createdAt, startDate.toISOString()));
    }
    if (endDate) {
      dateFilter.push(lte(paymentTransactions.createdAt, endDate.toISOString()));
    }

    // Total revenue (all captured payments)
    console.log('[AdminPaymentService] Querying total revenue...');
    const totalRevenue = await db
      .select({
        total: sql<number>`COALESCE(SUM(${paymentTransactions.amount}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(paymentTransactions)
      .where(
        and(
          eq(paymentTransactions.status, 'captured'),
          isNull(paymentTransactions.refundedAt),
          ...dateFilter
        )
      );

    // Total refunds
    const totalRefunds = await db
      .select({
        total: sql<number>`COALESCE(SUM(${paymentTransactions.refundAmount}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(paymentTransactions)
      .where(
        and(
          isNotNull(paymentTransactions.refundedAt),
          ...dateFilter
        )
      );

    // Total host earnings (sum of all host shares from non-refunded payments)
    const hostEarnings = await db
      .select({
        total: sql<number>`COALESCE(SUM(${paymentTransactions.hostShare}), 0)`,
      })
      .from(paymentTransactions)
      .where(
        and(
          eq(paymentTransactions.status, 'captured'),
          isNull(paymentTransactions.refundedAt),
          ...dateFilter
        )
      );

    // Total platform fees
    const platformFees = await db
      .select({
        total: sql<number>`COALESCE(SUM(${paymentTransactions.platformFee}), 0)`,
      })
      .from(paymentTransactions)
      .where(
        and(
          eq(paymentTransactions.status, 'captured'),
          isNull(paymentTransactions.refundedAt),
          ...dateFilter
        )
      );

    // Pending payouts
    const pendingPayouts = await db
      .select({
        total: sql<number>`COALESCE(SUM(${payouts.amount}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(payouts)
      .where(eq(payouts.status, 'pending'));

    const result = {
      totalRevenue: Number(totalRevenue[0]?.total || 0) / 100,
      totalTransactions: Number(totalRevenue[0]?.count || 0),
      totalRefunds: Number(totalRefunds[0]?.total || 0) / 100,
      refundCount: Number(totalRefunds[0]?.count || 0),
      hostEarnings: Number(hostEarnings[0]?.total || 0) / 100,
      platformFees: Number(platformFees[0]?.total || 0) / 100,
      pendingPayouts: Number(pendingPayouts[0]?.total || 0) / 100,
      pendingPayoutCount: Number(pendingPayouts[0]?.count || 0),
    };
  }

  // Get all transactions with details
  async getAllTransactions(filters?: {
    startDate?: Date;
    endDate?: Date;
    eventId?: number;
    hostId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    const conditions = [];
    
    if (filters?.startDate) {
      conditions.push(gte(paymentTransactions.createdAt, filters.startDate.toISOString()));
    }
    if (filters?.endDate) {
      conditions.push(lte(paymentTransactions.createdAt, filters.endDate.toISOString()));
    }
    if (filters?.status) {
      conditions.push(eq(paymentTransactions.status, filters.status));
    }
    if (filters?.eventId) {
      conditions.push(eq(paymentTransactions.eventId, filters.eventId));
    }

    let query = db
      .select({
        transaction: paymentTransactions,
        event: {
          id: events.id,
          title: events.title,
          hostId: events.hostId,
        },
        buyer: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
      })
      .from(paymentTransactions)
      .leftJoin(events, eq(paymentTransactions.eventId, events.id))
      .leftJoin(users, eq(paymentTransactions.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(paymentTransactions.createdAt));

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    if (filters?.offset) {
      query = query.offset(filters.offset);
    }

    const results = await query;

    // Get host details for each transaction
    const hostIds = [...new Set(results.map(r => r.event?.hostId).filter(Boolean))];
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

    return results.map(r => ({
      ...r.transaction,
      event: r.event,
      buyer: r.buyer,
      host: r.event?.hostId ? hostMap.get(r.event.hostId) : null,
    }));
  }

  // Get host earnings summary
  async getHostEarnings(filters?: { startDate?: Date; endDate?: Date }) {
    const dateFilter = [];
    if (filters?.startDate) {
      dateFilter.push(gte(paymentTransactions.createdAt, filters.startDate.toISOString()));
    }
    if (filters?.endDate) {
      dateFilter.push(lte(paymentTransactions.createdAt, filters.endDate.toISOString()));
    }

    // Get all hosts who have earned money
    const earnings = await db
      .select({
        hostId: events.hostId,
        totalRevenue: sql<number>`COALESCE(SUM(${paymentTransactions.amount}), 0)`,
        hostShare: sql<number>`COALESCE(SUM(${paymentTransactions.hostShare}), 0)`,
        ticketsSold: sql<number>`COUNT(*)`,
      })
      .from(paymentTransactions)
      .leftJoin(events, eq(paymentTransactions.eventId, events.id))
      .where(
        and(
          eq(paymentTransactions.status, 'captured'),
          isNull(paymentTransactions.refundedAt),
          ...dateFilter
        )
      )
      .groupBy(events.hostId);

    // Get host details
    const hostIds = earnings.map(e => e.hostId).filter(Boolean);
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
      .where(eq(payouts.status, 'paid'))
      .groupBy(payouts.hostId);

    const paidOutMap = new Map(paidOutAmounts.map(p => [p.hostId, Number(p.paidOut)]));

    return earnings.map(e => {
      const host = e.hostId ? hostMap.get(e.hostId) : null;
      const paidOut = e.hostId ? (paidOutMap.get(e.hostId) || 0) : 0;
      const hostShare = Number(e.hostShare);
      
      return {
        hostId: e.hostId,
        hostName: host ? `${host.firstName || ''} ${host.lastName || ''}`.trim() || host.email : 'Unknown',
        hostEmail: host?.email,
        ticketsSold: Number(e.ticketsSold),
        totalRevenue: Number(e.totalRevenue) / 100,
        hostEarnings: hostShare / 100,
        paidOut: paidOut / 100,
        outstanding: (hostShare - paidOut) / 100,
      };
    }).filter(e => e.outstanding > 0); // Only show hosts with outstanding balance
  }

  // Create a payout
  async createPayout(data: {
    hostId: string;
    amount: number; // in rupees
    upiId?: string;
    bankDetails?: any;
    notes?: string;
    createdBy: string;
  }) {
    const amountInPaise = Math.round(data.amount * 100);

    // Get all unpaid transactions for this host
    const unpaidTransactions = await db
      .select({
        id: paymentTransactions.id,
        hostShare: paymentTransactions.hostShare,
      })
      .from(paymentTransactions)
      .leftJoin(events, eq(paymentTransactions.eventId, events.id))
      .where(
        and(
          eq(events.hostId, data.hostId),
          eq(paymentTransactions.status, 'captured'),
          isNull(paymentTransactions.refundedAt)
        )
      );

    // Calculate how much is actually owed
    const totalOwed = unpaidTransactions.reduce((sum, t) => sum + (t.hostShare || 0), 0);

    if (amountInPaise > totalOwed) {
      throw new Error(`Amount exceeds what is owed to host (₹${totalOwed / 100})`);
    }

    // Create payout
    const [payout] = await db
      .insert(payouts)
      .values({
        hostId: data.hostId,
        amount: amountInPaise,
        upiId: data.upiId,
        bankDetails: data.bankDetails,
        notes: data.notes,
        status: 'pending',
        createdBy: data.createdBy,
      })
      .returning();

    // Link transactions to this payout (up to the payout amount)
    let remainingAmount = amountInPaise;
    const payoutTxns = [];

    for (const txn of unpaidTransactions) {
      if (remainingAmount <= 0) break;
      
      const shareAmount = Math.min(txn.hostShare || 0, remainingAmount);
      payoutTxns.push({
        payoutId: payout.id,
        transactionId: txn.id,
        hostShareAmount: shareAmount,
      });
      
      remainingAmount -= shareAmount;
    }

    if (payoutTxns.length > 0) {
      await db.insert(payoutTransactions).values(payoutTxns);
    }

    return payout;
  }

  // Get all pending payouts
  async getPendingPayouts() {
    const pending = await db
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
      .where(eq(payouts.status, 'pending'))
      .orderBy(desc(payouts.createdAt));

    // If no pending payouts, return empty array
    if (pending.length === 0) {
      return [];
    }

    // Get transaction count for each payout
    const payoutIds = pending.map(p => p.payout.id);
    const txnCounts = await db
      .select({
        payoutId: payoutTransactions.payoutId,
        count: sql<number>`COUNT(*)`,
      })
      .from(payoutTransactions)
      .where(inArray(payoutTransactions.payoutId, payoutIds))
      .groupBy(payoutTransactions.payoutId);

    const countMap = new Map(txnCounts.map(t => [t.payoutId, Number(t.count)]));

    return pending.map(p => ({
      ...p.payout,
      host: p.host,
      transactionCount: countMap.get(p.payout.id) || 0,
    }));
  }

  // Mark payout as paid
  async markPayoutAsPaid(payoutId: number, paymentReference: string) {
    const [updated] = await db
      .update(payouts)
      .set({
        status: 'paid',
        paidAt: new Date().toISOString(),
        paymentReference,
      })
      .where(eq(payouts.id, payoutId))
      .returning();

    return updated;
  }

  // Delete/cancel payout
  async deletePayout(payoutId: number) {
    // Delete payout transactions first (cascade should handle this, but being explicit)
    await db.delete(payoutTransactions).where(eq(payoutTransactions.payoutId, payoutId));
    
    // Delete payout
    await db.delete(payouts).where(eq(payouts.id, payoutId));
  }

  // Get completed payouts
  async getCompletedPayouts(limit = 50) {
    return db
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
      .where(eq(payouts.status, 'paid'))
      .orderBy(desc(payouts.paidAt))
      .limit(limit);
  }

  // Refund a transaction
  async refundTransaction(transactionId: number, refundId: string, refundAmount: number) {
    const amountInPaise = Math.round(refundAmount * 100);

    const [updated] = await db
      .update(paymentTransactions)
      .set({
        status: 'refunded',
        refundedAt: new Date().toISOString(),
        refundId,
        refundAmount: amountInPaise,
        hostShare: 0, // Reset host share to 0 on refund
      })
      .where(eq(paymentTransactions.id, transactionId))
      .returning();

    return updated;
  }
}
