import { Router } from 'express';
import { adminController } from '../controllers/admin.controller.js';
import { AdminPaymentController } from '../controllers/admin-payment.controller.js';
import {
  authenticateAdmin,
  requireSuperAdmin,
} from '../middleware/auth.middleware.js';

export const adminRouter = Router();
const paymentController = new AdminPaymentController();

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
