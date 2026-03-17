import { db } from '../db.js';
import { paymentTransactions, payouts, payoutTransactions, events, users } from '../schema.js';
import { eq, and, gte, lte, sql, desc, asc, isNull, isNotNull, inArray } from 'drizzle-orm';

export class AdminPaymentService {
  // Get overview stats
  async getPaymentStats(startDate?: Date, endDate?: Date) {
    console.log('[AdminPaymentService] getPaymentStats called', { startDate, endDate });
    
    const dateFilter = [];
    if (startDate) {
      dateFilter.push(gte(paymentTransactions.createdAt, startDate));
    }
    if (endDate) {
      dateFilter.push(lte(paymentTransactions.createdAt, endDate));
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

    // Platform fees temporarily disabled
    const platformFees = [{ total: 0 }];

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

    return result;
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
      conditions.push(gte(paymentTransactions.createdAt, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(paymentTransactions.createdAt, filters.endDate));
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
      dateFilter.push(gte(paymentTransactions.createdAt, filters.startDate));
    }
    if (filters?.endDate) {
      dateFilter.push(lte(paymentTransactions.createdAt, filters.endDate));
    }

    // Get all hosts who have earned money
    const earnings = await db
      .select({
        hostId: events.hostId,
        // Use host share for revenue so fees do not distort host totals
        totalRevenue: sql<number>`COALESCE(SUM(${paymentTransactions.hostShare}), 0)`,
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

  // Get detailed host earnings by event with payers list
  async getHostEarningsByEvent(filters?: { startDate?: Date; endDate?: Date }) {
    const dateFilter = [];
    if (filters?.startDate) {
      dateFilter.push(gte(paymentTransactions.createdAt, filters.startDate));
    }
    if (filters?.endDate) {
      dateFilter.push(lte(paymentTransactions.createdAt, filters.endDate));
    }

    // Get all host events with payments
    const hostEvents = await db
      .select({
        hostId: events.hostId,
        eventId: events.id,
        eventTitle: events.title,
        ticketPrice: events.ticketPrice,
      })
      .from(events)
      .innerJoin(
        paymentTransactions,
        and(
          eq(paymentTransactions.eventId, events.id),
          eq(paymentTransactions.status, 'captured'),
          isNull(paymentTransactions.refundedAt)
        )
      )
      .where(and(...dateFilter))
      .groupBy(events.hostId, events.id, events.title, events.ticketPrice);

    if (hostEvents.length === 0) {
      return [];
    }

    // Get host details
    const hostIds = [...new Set(hostEvents.map(e => e.hostId).filter(Boolean))];
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

    // Get all payments for these events with buyer details
    const eventIds = hostEvents.map(e => e.eventId);
    const payments = await db
      .select({
        transactionId: paymentTransactions.id,
        eventId: paymentTransactions.eventId,
        amount: paymentTransactions.amount,
        platformFee: paymentTransactions.platformFee,
        hostShare: paymentTransactions.hostShare,
        createdAt: paymentTransactions.createdAt,
        buyerId: users.id,
        buyerFirstName: users.firstName,
        buyerLastName: users.lastName,
        buyerEmail: users.email,
      })
      .from(paymentTransactions)
      .leftJoin(users, eq(paymentTransactions.userId, users.id))
      .where(
        and(
          inArray(paymentTransactions.eventId, eventIds),
          eq(paymentTransactions.status, 'captured'),
          isNull(paymentTransactions.refundedAt),
          ...dateFilter
        )
      )
      .orderBy(desc(paymentTransactions.createdAt));

    // Group payments by event
    const paymentsByEvent = new Map<number, typeof payments>();
    payments.forEach(payment => {
      if (!paymentsByEvent.has(payment.eventId!)) {
        paymentsByEvent.set(payment.eventId!, []);
      }
      paymentsByEvent.get(payment.eventId!)!.push(payment);
    });

    // Build result grouped by host
    const hostEarningsMap = new Map<string, any>();

    hostEvents.forEach(event => {
      if (!event.hostId) return;

      const eventPayments = paymentsByEvent.get(event.eventId) || [];
      const totalAmount = eventPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const totalHostShare = eventPayments.reduce((sum, p) => sum + (p.hostShare || 0), 0);
      const totalPlatformFee = eventPayments.reduce((sum, p) => sum + (p.platformFee || 0), 0);

      const eventData = {
        eventId: event.eventId,
        eventTitle: event.eventTitle,
        ticketPrice: event.ticketPrice / 100,
        ticketsSold: eventPayments.length,
        totalRevenue: totalAmount / 100,
        platformFee: totalPlatformFee / 100,
        hostEarnings: totalHostShare / 100,
        payments: eventPayments.map(p => ({
          transactionId: p.transactionId,
          buyerName: `${p.buyerFirstName || ''} ${p.buyerLastName || ''}`.trim() || 'Unknown',
          buyerEmail: p.buyerEmail,
          amount: p.amount! / 100,
          hostShare: p.hostShare! / 100,
          platformFee: p.platformFee! / 100,
          paidAt: p.createdAt,
        })),
      };

      if (!hostEarningsMap.has(event.hostId)) {
        const host = hostMap.get(event.hostId);
        hostEarningsMap.set(event.hostId, {
          hostId: event.hostId,
          hostName: host ? `${host.firstName || ''} ${host.lastName || ''}`.trim() || host.email : 'Unknown',
          hostEmail: host?.email,
          events: [],
          totalEarnings: 0,
          totalTicketsSold: 0,
        });
      }

      const hostData = hostEarningsMap.get(event.hostId)!;
      hostData.events.push(eventData);
      hostData.totalEarnings += totalHostShare / 100;
      hostData.totalTicketsSold += eventPayments.length;
    });

    return Array.from(hostEarningsMap.values()).sort((a, b) => b.totalEarnings - a.totalEarnings);
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
        eventId: paymentTransactions.eventId,
        hostShare: paymentTransactions.hostShare,
        amount: paymentTransactions.amount,
        platformFee: paymentTransactions.platformFee,
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
        eventId: txn.eventId,
        grossAmount: txn.amount,
        platformFee: txn.platformFee || 0,
        netAmount: shareAmount,
        currency: 'INR',
        status: 'RESERVED',
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
        paidAt: new Date(),
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
        refundedAt: new Date(),
        refundId,
        refundAmount: amountInPaise,
        hostShare: 0, // Reset host share to 0 on refund
      })
      .where(eq(paymentTransactions.id, transactionId))
      .returning();

    return updated;
  }
}
