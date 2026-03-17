import type { Request, Response } from 'express';
import { PayoutService } from '../services/payout.service.js';
import { getUserRole } from '../middleware/finance-auth.js';

interface AuthRequest extends Request {
  user?: { id: string; email: string; role: string };
}

const payoutService = new PayoutService();

export class PayoutController {
  /**
   * GET /api/admin/payouts
   * Get all payouts with pagination, filtering, and searching
   */
  async getPayouts(req: Request, res: Response) {
    try {
      const {
        status,
        startDate,
        endDate,
        minAmount,
        maxAmount,
        payoutMethod,
        search,
        sortBy,
        sortOrder,
        limit,
        offset,
      } = req.query;

      const filters = {
        status: status as string | undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        minAmount: minAmount ? parseFloat(minAmount as string) : undefined,
        maxAmount: maxAmount ? parseFloat(maxAmount as string) : undefined,
        payoutMethod: payoutMethod as string | undefined,
        search: search as string | undefined,
        sortBy: sortBy as 'amount' | 'created_at' | 'last_event_date' | undefined,
        sortOrder: sortOrder as 'asc' | 'desc' | undefined,
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0,
      };

      const result = await payoutService.getPayouts(filters);
      res.json(result);
    } catch (error: any) {
      console.error('Get payouts error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/admin/payouts/:id
   * Get a single payout with full details
   */
  async getPayoutById(req: Request, res: Response) {
    try {
      const payoutId = parseInt(req.params.id);
      const payout = await payoutService.getPayoutById(payoutId);
      res.json(payout);
    } catch (error: any) {
      console.error('Get payout by ID error:', error);
      if (error.message === 'Payout not found') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }

  /**
   * POST /api/admin/payouts
   * Create a new payout batch
   */
  async createPayout(req: AuthRequest, res: Response) {
    try {
      const { hostId, payoutMethod, upiId, bankDetails, notes } = req.body;
      const createdBy = req.user!.id;

      if (!hostId || !payoutMethod) {
        return res.status(400).json({ error: 'hostId and payoutMethod are required' });
      }

      if (payoutMethod !== 'UPI' && payoutMethod !== 'BANK') {
        return res.status(400).json({ error: 'payoutMethod must be UPI or BANK' });
      }

      if (payoutMethod === 'UPI' && !upiId) {
        return res.status(400).json({ error: 'upiId is required for UPI payouts' });
      }

      if (payoutMethod === 'BANK' && !bankDetails) {
        return res.status(400).json({ error: 'bankDetails is required for BANK payouts' });
      }

      const payout = await payoutService.createPayout({
        hostId,
        payoutMethod,
        upiId,
        bankDetails,
        notes,
        createdBy,
        createdByRole: getUserRole(req), // PART 6
      });

      res.status(201).json(payout);
    } catch (error: any) {
      console.error('Create payout error:', error);
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * POST /api/admin/payouts/:id/pay
   * Mark a payout as paid
   */
  async markPayoutAsPaid(req: AuthRequest, res: Response) {
    try {
      const payoutId = parseInt(req.params.id);
      const { amountPaid, paymentMethod, referenceId, payoutDate, expectedVersion } = req.body;
      const paidBy = req.user!.id;

      if (!amountPaid || !paymentMethod || !referenceId || !payoutDate) {
        return res.status(400).json({
          error: 'amountPaid, paymentMethod, referenceId, and payoutDate are required',
        });
      }

      const payout = await payoutService.markPayoutAsPaid(payoutId, {
        amountPaid: parseFloat(amountPaid),
        paymentMethod,
        referenceId,
        payoutDate: new Date(payoutDate),
        paidBy,
        paidByRole: getUserRole(req), // PART 6
        expectedVersion, // PART 7: Optional optimistic lock
      });

      res.json(payout);
    } catch (error: any) {
      console.error('Mark payout as paid error:', error);
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * GET /api/admin/payouts/hosts/outstanding
   * Get hosts with outstanding balances
   */
  async getHostsWithOutstandingBalances(_req: Request, res: Response) {
    try {
      const hosts = await payoutService.getHostsWithOutstandingBalances();
      res.json(hosts);
    } catch (error: any) {
      console.error('Get hosts with outstanding balances error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /api/admin/payouts/hosts/:hostId/destination
   * Get payout destination for a host
   */
  async getHostPayoutDestination(req: Request, res: Response) {
    try {
      const hostId = req.params.hostId;
      const destination = await payoutService.getHostPayoutDestination(hostId);
      res.json(destination);
    } catch (error: any) {
      console.error('Get host payout destination error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * POST /api/admin/payouts/:id/cancel
   * Cancel a payout (soft-cancel, preserves data) (PART 6: requires FINANCE_ADMIN)
   */
  async cancelPayout(req: AuthRequest, res: Response) {
    try {
      const payoutId = parseInt(req.params.id);
      const cancelledBy = req.user!.id;
      const cancelledByRole = getUserRole(req); // PART 6

      const payout = await payoutService.cancelPayout(payoutId, cancelledBy, cancelledByRole);
      res.json(payout);
    } catch (error: any) {
      console.error('Cancel payout error:', error);
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * DELETE endpoint removed - use cancel instead
   * Kept for backwards compatibility but redirects to cancel
   */
  async deletePayout(req: AuthRequest, res: Response) {
    // Redirect to cancel for backwards compatibility
    console.warn('DELETE /api/admin/payouts/:id is deprecated, use POST /api/admin/payouts/:id/cancel instead');
    return this.cancelPayout(req, res);
  }
}
