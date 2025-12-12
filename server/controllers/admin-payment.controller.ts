import type { Request, Response } from 'express';
import { AdminPaymentService } from '../services/admin-payment.service';

const paymentService = new AdminPaymentService();

export class AdminPaymentController {
  // GET /api/admin/payments/stats
  async getStats(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      const stats = await paymentService.getPaymentStats(start, end);
      res.json(stats);
    } catch (error: any) {
      console.error('Get stats error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // GET /api/admin/payments/transactions
  async getTransactions(req: Request, res: Response) {
    try {
      const { startDate, endDate, eventId, hostId, status, limit, offset } = req.query;

      const filters = {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        eventId: eventId ? parseInt(eventId as string) : undefined,
        hostId: hostId as string | undefined,
        status: status as string | undefined,
        limit: limit ? parseInt(limit as string) : 100,
        offset: offset ? parseInt(offset as string) : 0,
      };

      const transactions = await paymentService.getAllTransactions(filters);
      res.json(transactions);
    } catch (error: any) {
      console.error('Get transactions error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // GET /api/admin/payments/host-earnings
  async getHostEarnings(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;
      
      const filters = {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      };

      const earnings = await paymentService.getHostEarnings(filters);
      res.json(earnings);
    } catch (error: any) {
      console.error('Get host earnings error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // POST /api/admin/payments/create-payout
  async createPayout(req: Request, res: Response) {
    try {
      const { hostId, amount, upiId, bankDetails, notes } = req.body;
      const createdBy = req.user!.id;

      if (!hostId || !amount) {
        return res.status(400).json({ error: 'hostId and amount are required' });
      }

      const payout = await paymentService.createPayout({
        hostId,
        amount: parseFloat(amount),
        upiId,
        bankDetails,
        notes,
        createdBy,
      });

      res.json(payout);
    } catch (error: any) {
      console.error('Create payout error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // GET /api/admin/payments/pending-payouts
  async getPendingPayouts(req: Request, res: Response) {
    try {
      const payouts = await paymentService.getPendingPayouts();
      res.json(payouts);
    } catch (error: any) {
      console.error('Get pending payouts error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // PUT /api/admin/payments/mark-paid/:id
  async markPayoutAsPaid(req: Request, res: Response) {
    try {
      const payoutId = parseInt(req.params.id);
      const { paymentReference } = req.body;

      if (!paymentReference) {
        return res.status(400).json({ error: 'paymentReference is required' });
      }

      const payout = await paymentService.markPayoutAsPaid(payoutId, paymentReference);
      res.json(payout);
    } catch (error: any) {
      console.error('Mark payout paid error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // DELETE /api/admin/payments/payout/:id
  async deletePayout(req: Request, res: Response) {
    try {
      const payoutId = parseInt(req.params.id);
      await paymentService.deletePayout(payoutId);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Delete payout error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // GET /api/admin/payments/completed-payouts
  async getCompletedPayouts(req: Request, res: Response) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const payouts = await paymentService.getCompletedPayouts(limit);
      res.json(payouts);
    } catch (error: any) {
      console.error('Get completed payouts error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  // POST /api/admin/payments/refund/:id
  async refundTransaction(req: Request, res: Response) {
    try {
      const transactionId = parseInt(req.params.id);
      const { refundId, refundAmount } = req.body;

      if (!refundId || !refundAmount) {
        return res.status(400).json({ error: 'refundId and refundAmount are required' });
      }

      const transaction = await paymentService.refundTransaction(
        transactionId,
        refundId,
        parseFloat(refundAmount)
      );

      res.json(transaction);
    } catch (error: any) {
      console.error('Refund transaction error:', error);
      res.status(500).json({ error: error.message });
    }
  }
}
