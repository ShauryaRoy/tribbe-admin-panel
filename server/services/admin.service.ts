import { pool } from '../db.js';
import type {
  DashboardStats,
  Event,
  Group,
  User,
  AuditLog,
  AnalyticsData,
} from '../types/index.js';

export class AdminService {
  async logAction(
    adminId: string,
    action: string,
    targetType: 'event' | 'user' | 'group',
    targetId: number | string,
    details?: any
  ): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, details) 
         VALUES ($1, $2, $3, $4, $5)`,
        [adminId, action, targetType, String(targetId), JSON.stringify(details)]
      );
    } catch (err) {
      // Log silently if audit table doesn't exist
      console.log('Audit log skipped:', action);
    }
  }

  async getDashboardStats(): Promise<DashboardStats> {
    // Events stats
    const eventsStats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE discover_status = 'requested') as pending,
        COUNT(*) FILTER (WHERE discover_status = 'approved') as approved,
        COUNT(*) FILTER (WHERE discover_status = 'rejected') as rejected,
        COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) as today,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as last_7_days,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as last_30_days
      FROM events
    `);

    // Groups stats
    const groupsStats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_public = true) as public_groups,
        COUNT(*) FILTER (WHERE is_public = false) as private_groups,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as last_7_days
      FROM "groups"
    `);

    // Users stats
    const usersStats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE banned = true) as banned,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as new_users_7_days,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as new_users_30_days
      FROM users
    `);

    // Group members stats
    const memberStats = await pool.query(`
      SELECT 
        COUNT(*) as total_memberships,
        AVG(member_count)::INTEGER as avg_members_per_group
      FROM (
        SELECT group_id, COUNT(*) as member_count
        FROM group_members
        GROUP BY group_id
      ) as group_member_counts
    `);

    return {
      totalEvents: parseInt(eventsStats.rows[0].total) || 0,
      pendingEvents: parseInt(eventsStats.rows[0].pending) || 0,
      approvedEvents: parseInt(eventsStats.rows[0].approved) || 0,
      rejectedEvents: parseInt(eventsStats.rows[0].rejected) || 0,
      todayEvents: parseInt(eventsStats.rows[0].today) || 0,
      totalGroups: parseInt(groupsStats.rows[0].total) || 0,
      totalUsers: parseInt(usersStats.rows[0].total) || 0,
      bannedUsers: parseInt(usersStats.rows[0].banned) || 0,
      eventsLast7Days: parseInt(eventsStats.rows[0].last_7_days) || 0,
      eventsLast30Days: parseInt(eventsStats.rows[0].last_30_days) || 0,
      groupsLast7Days: parseInt(groupsStats.rows[0].last_7_days) || 0,
      newUsers7Days: parseInt(usersStats.rows[0].new_users_7_days) || 0,
      newUsers30Days: parseInt(usersStats.rows[0].new_users_30_days) || 0,
      publicGroups: parseInt(groupsStats.rows[0].public_groups) || 0,
      privateGroups: parseInt(groupsStats.rows[0].private_groups) || 0,
      totalMemberships: parseInt(memberStats.rows[0]?.total_memberships) || 0,
      avgMembersPerGroup: parseInt(memberStats.rows[0]?.avg_members_per_group) || 0,
    };
  }

  async getEvents(discoverStatus: string = 'all'): Promise<Event[]> {
    let query = `
      SELECT 
        e.*, 
        u.first_name || ' ' || u.last_name as host_name,
        u.email as host_email,
        (SELECT COUNT(*) FROM event_rsvps WHERE event_id = e.id) as rsvp_count
      FROM events e
      LEFT JOIN users u ON e.host_id = u.id
    `;

    if (discoverStatus !== 'all') {
      if (discoverStatus === 'requested') {
        query += ` WHERE e.discover_status = 'requested'`;
      } else if (discoverStatus === 'approved') {
        query += ` WHERE e.discover_status = 'approved'`;
      } else if (discoverStatus === 'rejected') {
        query += ` WHERE e.discover_status = 'rejected'`;
      } else if (discoverStatus === 'none') {
        query += ` WHERE (e.discover_status IS NULL OR e.discover_status = 'none')`;
      }
    }

    query += ` ORDER BY e.created_at DESC`;

    const result = await pool.query(query);
    return result.rows;
  }

  async approveEventForDiscover(
    eventId: number,
    adminId: string
  ): Promise<void> {
    // Try updating legacy columns first, fall back to new columns if present
    try {
      await pool.query(
        `UPDATE events
         SET discover_state = 'approved', discover_approved_by = $1
         WHERE id = $2`,
        [adminId, eventId]
      );
    } catch (err) {
      // ignore if column doesn't exist
    }

    try {
      await pool.query(
        `UPDATE events
         SET discover_status = 'approved', discover_reviewed_by = $1, discover_reviewed_at = NOW()
         WHERE id = $2`,
        [adminId, eventId]
      );
    } catch (err) {
      // ignore if column doesn't exist
    }

    await this.logAction(adminId, 'APPROVE_DISCOVER', 'event', eventId);
  }

  async rejectEventForDiscover(
    eventId: number,
    adminId: string,
    reason: string
  ): Promise<void> {
    try {
      await pool.query(
        `UPDATE events
         SET discover_state = 'rejected', discover_rejected_by = $1, discover_rejection_reason = $2
         WHERE id = $3`,
        [adminId, reason, eventId]
      );
    } catch (err) {
      // ignore
    }

    try {
      await pool.query(
        `UPDATE events
         SET discover_status = 'rejected', discover_reviewed_by = $1, discover_review_note = $2, discover_reviewed_at = NOW()
         WHERE id = $3`,
        [adminId, reason, eventId]
      );
    } catch (err) {
      // ignore
    }

    await this.logAction(adminId, 'REJECT_DISCOVER', 'event', eventId, {
      reason,
    });
  }

  async deleteEvent(eventId: number, adminId: string): Promise<void> {
    await pool.query('DELETE FROM events WHERE id = $1', [eventId]);
    await this.logAction(adminId, 'DELETE_EVENT', 'event', eventId);
  }

  async getGroups(): Promise<Group[]> {
    const result = await pool.query(`
      SELECT 
        g.*,
        COUNT(gm.user_id) as member_count
      FROM "groups" g
      LEFT JOIN group_members gm ON g.id = gm.group_id
      GROUP BY g.id
      ORDER BY g.created_at DESC
    `);

    return result.rows;
  }

  async deleteGroup(groupId: number, adminId: string): Promise<void> {
    await pool.query('DELETE FROM "groups" WHERE id = $1', [groupId]);
    await this.logAction(adminId, 'DELETE_GROUP', 'group', groupId);
  }

  async getUsers(): Promise<User[]> {
    const result = await pool.query(`
      SELECT 
        u.id, 
        u.first_name,
        u.last_name,
        u.first_name || ' ' || u.last_name as username,
        u.email,
        u.banned,
        u.created_at,
        (SELECT COUNT(*) FROM events WHERE host_id = u.id) as events_hosted,
        (SELECT COUNT(*) FROM group_members WHERE user_id = u.id) as groups_joined,
        au.role as admin_role
      FROM users u
      LEFT JOIN admin_users au ON u.id = au.id
      ORDER BY u.created_at DESC
    `);

    return result.rows;
  }

  async banUser(userId: string, adminId: string): Promise<void> {
    await pool.query('UPDATE users SET banned = true WHERE id = $1', [userId]);
    await this.logAction(adminId, 'BAN_USER', 'user', userId);
  }

  async unbanUser(userId: string, adminId: string): Promise<void> {
    await pool.query('UPDATE users SET banned = false WHERE id = $1', [userId]);
    await this.logAction(adminId, 'UNBAN_USER', 'user', userId);
  }

  async promoteToAdmin(userId: string, adminId: string): Promise<void> {
    await pool.query('UPDATE users SET role = $1 WHERE id = $2', [
      'admin',
      userId,
    ]);
    await this.logAction(adminId, 'PROMOTE_TO_ADMIN', 'user', userId);
  }

  async demoteFromAdmin(userId: string, adminId: string): Promise<void> {
    await pool.query('UPDATE users SET role = $1 WHERE id = $2', [
      'user',
      userId,
    ]);
    await this.logAction(adminId, 'DEMOTE_FROM_ADMIN', 'user', userId);
  }

  async getAuditLogs(): Promise<AuditLog[]> {
    const result = await pool.query(`
      SELECT al.*, u.first_name || ' ' || u.last_name as admin_name
      FROM admin_audit_log al
      JOIN users u ON al.admin_id = u.id
      ORDER BY al.created_at DESC
      LIMIT 100
    `);

    return result.rows;
  }

  async getEventsAnalytics(days: number = 30): Promise<AnalyticsData[]> {
    const result = await pool.query(
      `
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM events
      WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY date
    `
    );

    return result.rows.map((row) => ({
      date: row.date.toISOString().split('T')[0],
      count: parseInt(row.count),
    }));
  }

  async getGroupsAnalytics(days: number = 30): Promise<AnalyticsData[]> {
    const result = await pool.query(
      `
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM "groups"
      WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY date
    `
    );

    return result.rows.map((row) => ({
      date: row.date.toISOString().split('T')[0],
      count: parseInt(row.count),
    }));
  }
}

export const adminService = new AdminService();
