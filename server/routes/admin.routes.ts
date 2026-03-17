import { Router } from 'express';
import { adminController } from '../controllers/admin.controller.js';
import { AdminPaymentController } from '../controllers/admin-payment.controller.js';
import { PayoutController } from '../controllers/payout.controller.js';
import {
  authenticateAdmin,
  requireSuperAdmin,
} from '../middleware/auth.middleware.js';
import { requireFinanceAdmin } from '../middleware/finance-auth.js'; // PART 6

export const adminRouter = Router();
const paymentController = new AdminPaymentController();
const payoutController = new PayoutController();

// Public routes
adminRouter.post('/login', (req, res) => adminController.login(req, res));

// Protected admin routes
adminRouter.get('/dashboard/stats', authenticateAdmin, (req, res) =>
  adminController.getDashboardStats(req, res)
);

adminRouter.get('/events', authenticateAdmin, (req, res) =>
  adminController.getEvents(req, res)
);

adminRouter.post('/events/:id/approve-discover', authenticateAdmin, (req, res) =>
  adminController.approveEventForDiscover(req, res)
);

adminRouter.post('/events/:id/reject-discover', authenticateAdmin, (req, res) =>
  adminController.rejectEventForDiscover(req, res)
);

adminRouter.delete('/events/:id', authenticateAdmin, (req, res) =>
  adminController.deleteEvent(req, res)
);

adminRouter.get('/groups', authenticateAdmin, (req, res) =>
  adminController.getGroups(req, res)
);

adminRouter.post('/groups/:id/approve-discover', authenticateAdmin, (req, res) =>
  adminController.approveGroupForDiscover(req, res)
);

adminRouter.post('/groups/:id/reject-discover', authenticateAdmin, (req, res) =>
  adminController.rejectGroupForDiscover(req, res)
);

adminRouter.delete('/groups/:id', authenticateAdmin, (req, res) =>
  adminController.deleteGroup(req, res)
);

adminRouter.get('/users', authenticateAdmin, (req, res) =>
  adminController.getUsers(req, res)
);

adminRouter.post('/users/:id/ban', authenticateAdmin, (req, res) =>
  adminController.banUser(req, res)
);

adminRouter.post('/users/:id/unban', authenticateAdmin, (req, res) =>
  adminController.unbanUser(req, res)
);

// Super admin only routes
adminRouter.post(
  '/users/:id/promote',
  authenticateAdmin,
  requireSuperAdmin,
  (req, res) => adminController.promoteToAdmin(req, res)
);

adminRouter.post(
  '/users/:id/demote',
  authenticateAdmin,
  requireSuperAdmin,
  (req, res) => adminController.demoteFromAdmin(req, res)
);

adminRouter.get(
  '/audit-logs',
  authenticateAdmin,
  requireSuperAdmin,
  (req, res) => adminController.getAuditLogs(req, res)
);

adminRouter.get('/analytics/events', authenticateAdmin, (req, res) =>
  adminController.getEventsAnalytics(req, res)
);

adminRouter.get('/analytics/groups', authenticateAdmin, (req, res) =>
  adminController.getGroupsAnalytics(req, res)
);

// Host payment details route
adminRouter.get('/host-payment-details', authenticateAdmin, (req, res) =>
  adminController.getHostPaymentDetails(req, res)
);

// Payment routes
adminRouter.get('/payments/stats', authenticateAdmin, (req, res) =>
  paymentController.getStats(req, res)
);

adminRouter.get('/payments/transactions', authenticateAdmin, (req, res) =>
  paymentController.getTransactions(req, res)
);

adminRouter.get('/payments/host-earnings', authenticateAdmin, (req, res) =>
  paymentController.getHostEarnings(req, res)
);

adminRouter.get('/payments/host-earnings-by-event', authenticateAdmin, (req, res) =>
  paymentController.getHostEarningsByEvent(req, res)
);

adminRouter.post('/payments/create-payout', authenticateAdmin, (req, res) =>
  paymentController.createPayout(req, res)
);

adminRouter.get('/payments/pending-payouts', authenticateAdmin, (req, res) =>
  paymentController.getPendingPayouts(req, res)
);

adminRouter.put('/payments/mark-paid/:id', authenticateAdmin, (req, res) =>
  paymentController.markPayoutAsPaid(req, res)
);

adminRouter.delete('/payments/payout/:id', authenticateAdmin, (req, res) =>
  paymentController.deletePayout(req, res)
);

adminRouter.get('/payments/completed-payouts', authenticateAdmin, (req, res) =>
  paymentController.getCompletedPayouts(req, res)
);

adminRouter.post('/payments/refund/:id', authenticateAdmin, (req, res) =>
  paymentController.refundTransaction(req, res)
);

// Payout routes - NEW SEPARATE PAYOUT SYSTEM
adminRouter.get('/payouts', authenticateAdmin, (req, res) =>
  payoutController.getPayouts(req, res)
);

adminRouter.get('/payouts/hosts/outstanding', authenticateAdmin, (req, res) =>
  payoutController.getHostsWithOutstandingBalances(req, res)
);

adminRouter.get('/payouts/hosts/:hostId/destination', authenticateAdmin, (req, res) =>
  payoutController.getHostPayoutDestination(req, res)
);

adminRouter.get('/payouts/:id', authenticateAdmin, (req, res) =>
  payoutController.getPayoutById(req, res)
);

adminRouter.post('/payouts', authenticateAdmin, (req, res) =>
  payoutController.createPayout(req, res)
);

adminRouter.post('/payouts/:id/pay', authenticateAdmin, (req, res) =>
  payoutController.markPayoutAsPaid(req, res)
);

adminRouter.post('/payouts/:id/cancel', authenticateAdmin, (req, res) =>
  payoutController.cancelPayout(req, res)
);

// DELETE kept for backwards compatibility but deprecated
adminRouter.delete('/payouts/:id', authenticateAdmin, (req, res) =>
  payoutController.deletePayout(req, res)
);
