import { Response } from 'express';
import { adminService } from '../services/admin.service.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';

export class AdminController {
  async login(req: AuthRequest, res: Response) {
    try {
      const { username, password } = req.body;

      // Query user by email and join with admin_users table
      const result = await pool.query(
        `SELECT u.*, au.role as admin_role 
         FROM users u
         LEFT JOIN admin_users au ON u.id = au.id
         WHERE u.email = $1`,
        [username]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = result.rows[0];

      // Check if user is in admin_users table
      if (!user.admin_role) {
        return res.status(403).json({ error: 'Access denied. Not an admin.' });
      }

      const validPassword = await bcrypt.compare(password, user.password_hash);

      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.admin_role },
        process.env.JWT_SECRET || 'fallback-secret-change-this',
        { expiresIn: '24h' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.admin_role,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }

  async getDashboardStats(req: AuthRequest, res: Response) {
    try {
      const stats = await adminService.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
  }

  async getEvents(req: AuthRequest, res: Response) {
    try {
      const discoverStatus = (req.query.discoverStatus as string) || 'all';
      const events = await adminService.getEvents(discoverStatus);
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch events' });
    }
  }

  async approveEventForDiscover(req: AuthRequest, res: Response) {
    try {
      const eventId = parseInt(req.params.id);
      await adminService.approveEventForDiscover(eventId, req.user!.id);
      res.json({ message: 'Event approved for discover' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to approve event' });
    }
  }

  async rejectEventForDiscover(req: AuthRequest, res: Response) {
    try {
      const eventId = parseInt(req.params.id);
      const { reason } = req.body;
      await adminService.rejectEventForDiscover(eventId, req.user!.id, reason);
      res.json({ message: 'Event rejected' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to reject event' });
    }
  }

  async deleteEvent(req: AuthRequest, res: Response) {
    try {
      const eventId = parseInt(req.params.id);
      await adminService.deleteEvent(eventId, req.user!.id);
      res.json({ message: 'Event deleted' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete event' });
    }
  }

  async getGroups(req: AuthRequest, res: Response) {
    try {
      const groups = await adminService.getGroups();
      res.json(groups);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch groups' });
    }
  }

  async deleteGroup(req: AuthRequest, res: Response) {
    try {
      const groupId = parseInt(req.params.id);
      await adminService.deleteGroup(groupId, req.user!.id);
      res.json({ message: 'Group deleted' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete group' });
    }
  }

  async getUsers(req: AuthRequest, res: Response) {
    try {
      const users = await adminService.getUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  }

  async banUser(req: AuthRequest, res: Response) {
    try {
      const userId = req.params.id;
      await adminService.banUser(userId, req.user!.id);
      res.json({ message: 'User banned' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to ban user' });
    }
  }

  async unbanUser(req: AuthRequest, res: Response) {
    try {
      const userId = req.params.id;
      await adminService.unbanUser(userId, req.user!.id);
      res.json({ message: 'User unbanned' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to unban user' });
    }
  }

  async promoteToAdmin(req: AuthRequest, res: Response) {
    try {
      const userId = req.params.id;
      await adminService.promoteToAdmin(userId, req.user!.id);
      res.json({ message: 'User promoted to admin' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to promote user' });
    }
  }

  async demoteFromAdmin(req: AuthRequest, res: Response) {
    try {
      const userId = req.params.id;
      await adminService.demoteFromAdmin(userId, req.user!.id);
      res.json({ message: 'User demoted from admin' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to demote user' });
    }
  }

  async getAuditLogs(req: AuthRequest, res: Response) {
    try {
      const logs = await adminService.getAuditLogs();
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
  }

  async getEventsAnalytics(req: AuthRequest, res: Response) {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const analytics = await adminService.getEventsAnalytics(days);
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch events analytics' });
    }
  }

  async getGroupsAnalytics(req: AuthRequest, res: Response) {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const analytics = await adminService.getGroupsAnalytics(days);
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch groups analytics' });
    }
  }
}

export const adminController = new AdminController();
