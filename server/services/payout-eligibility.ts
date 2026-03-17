/**
 * PART 5: Payout Eligibility Rules
 * 
 * Defines when a payment transaction is eligible for payout
 */

export interface PayoutEligibilityConfig {
  refundWindowHours: number; // Default: 48 hours after event
  requireEventPassed: boolean; // Default: true - event must be in past
}

export const DEFAULT_ELIGIBILITY_CONFIG: PayoutEligibilityConfig = {
  refundWindowHours: 48,
  requireEventPassed: true,
};

/**
 * Check if a payment transaction is eligible for payout
 * 
 * Rules:
 * 1. Payment status must be 'captured' (COMPLETED)
 * 2. Must not be refunded
 * 3. Event date must be <= current date (passed)
 * 4. Refund window must have expired (48h after event by default)
 */
export function isTransactionEligibleForPayout(
  transaction: {
    status: string;
    refundedAt: Date | null;
  },
  event: {
    datetime: Date | null;
  },
  config: PayoutEligibilityConfig = DEFAULT_ELIGIBILITY_CONFIG
): { eligible: boolean; reason?: string } {
  // Rule 1: Payment must be COMPLETED
  if (transaction.status !== 'captured') {
    return {
      eligible: false,
      reason: `Payment not completed (status: ${transaction.status})`,
    };
  }

  // Rule 2: Must not be refunded
  if (transaction.refundedAt !== null) {
    return {
      eligible: false,
      reason: 'Payment has been refunded',
    };
  }

  // Rule 3: Event must have passed (if required)
  if (config.requireEventPassed && event.datetime) {
    const now = new Date();
    if (event.datetime > now) {
      return {
        eligible: false,
        reason: 'Event has not occurred yet',
      };
    }
  }

  // Rule 4: Refund window must have expired
  if (event.datetime && config.refundWindowHours > 0) {
    const now = new Date();
    const eventTime = new Date(event.datetime);
    const refundWindowEnd = new Date(
      eventTime.getTime() + config.refundWindowHours * 60 * 60 * 1000
    );

    if (now < refundWindowEnd) {
      return {
        eligible: false,
        reason: `Refund window open until ${refundWindowEnd.toISOString()}`,
      };
    }
  }

  return { eligible: true };
}

/**
 * Filter transactions to only those eligible for payout
 */
export function filterEligibleTransactions<T extends {
  transaction: {
    status: string;
    refundedAt: Date | null;
  };
  event: {
    datetime: Date | null;
  } | null;
}>(
  transactions: T[],
  config: PayoutEligibilityConfig = DEFAULT_ELIGIBILITY_CONFIG
): { eligible: T[]; ineligible: { transaction: T; reason: string }[] } {
  const eligible: T[] = [];
  const ineligible: { transaction: T; reason: string }[] = [];

  for (const txn of transactions) {
    if (!txn.event) {
      ineligible.push({
        transaction: txn,
        reason: 'Event not found',
      });
      continue;
    }

    const check = isTransactionEligibleForPayout(
      txn.transaction,
      txn.event,
      config
    );

    if (check.eligible) {
      eligible.push(txn);
    } else {
      ineligible.push({
        transaction: txn,
        reason: check.reason || 'Not eligible',
      });
    }
  }

  return { eligible, ineligible };
}
