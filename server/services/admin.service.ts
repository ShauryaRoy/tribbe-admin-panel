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
        u.first_name as host_first_name,
        u.last_name as host_last_name,
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
    
    // Map snake_case to camelCase for frontend
    return result.rows.map(row => ({
      ...row,
      hostFirstName: row.host_first_name,
      hostLastName: row.host_last_name,
      hostEmail: row.host_email,
      hostId: row.host_id,
      createdAt: row.created_at,
      discoverStatus: row.discover_status,
      mapLink: row.map_link,
      // Payment-related fields
      ticketingEnabled: row.ticketing_enabled,
      ticketPrice: row.ticket_price,
      payoutMethod: row.payout_method,
      hostUpiId: row.host_upi_id,
      accountHolderName: row.account_holder_name,
      accountNumber: row.account_number,
      ifscCode: row.ifsc_code,
      maxGuests: row.max_guests,
      currentCapacity: row.current_capacity,
    }));
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

  async getGroups(discoverStatus?: string): Promise<Group[]> {
    let whereClause = '';
    const params: any[] = [];
    if (discoverStatus && discoverStatus !== 'all') {
      whereClause = 'WHERE g.discover_status = $1';
      params.push(discoverStatus);
    }
    const result = await pool.query(`
      SELECT 
        g.id, g.name, g.description, g.slug, g.category,
        g.is_public as "isPublic",
        g.member_count as "memberCount",
        g.image_url as "imageUrl",
        g.discover_status as "discoverStatus",
        g.discover_requested_at as "discoverRequestedAt",
        g.discover_requested_message as "discoverRequestedMessage",
        g.discover_review_note as "discoverReviewNote",
        g.discover_reviewed_at as "discoverReviewedAt",
        g.created_at as "createdAt",
        u.email as "creatorEmail",
        u.first_name as "creatorFirstName",
        u.last_name as "creatorLastName"
      FROM "groups" g
      LEFT JOIN users u ON g.created_by = u.id
      ${whereClause}
      ORDER BY g.created_at DESC
    `, params);

    return result.rows;
  }

  async approveGroupForDiscover(groupId: number, adminId: string): Promise<void> {
    await pool.query(
      `UPDATE "groups"
       SET discover_status = 'approved', discover_reviewed_by = $1, discover_reviewed_at = NOW()
       WHERE id = $2`,
      [adminId, groupId]
    );
    await this.logAction(adminId, 'APPROVE_GROUP_DISCOVER', 'group', groupId);
  }

  async rejectGroupForDiscover(groupId: number, adminId: string, reason: string): Promise<void> {
    await pool.query(
      `UPDATE "groups"
       SET discover_status = 'rejected', discover_reviewed_by = $1, discover_review_note = $2, discover_reviewed_at = NOW()
       WHERE id = $3`,
      [adminId, reason, groupId]
    );
    await this.logAction(adminId, 'REJECT_GROUP_DISCOVER', 'group', groupId, { reason });
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

  async getHostPaymentDetails(): Promise<any[]> {
    const query = `
      WITH host_events AS (
        SELECT 
          e.host_id,
          e.id as event_id,
          e.title as event_title,
          e.payout_method,
          e.host_upi_id,
          e.account_holder_name,
          e.account_number,
          e.ifsc_code,
          e.datetime,
          e.ticket_price,
          COUNT(pt.id) as transaction_count,
          COALESCE(SUM(pt.amount), 0) as total_revenue
        FROM events e
        LEFT JOIN payment_transactions pt ON e.id = pt.event_id AND pt.status = 'captured'
        WHERE e.ticketing_enabled = true AND e.payout_method IS NOT NULL
        GROUP BY e.id, e.host_id, e.title, e.payout_method, e.host_upi_id, 
                 e.account_holder_name, e.account_number, e.ifsc_code, e.datetime, e.ticket_price
      ),
      host_summary AS (
        SELECT 
          he.host_id,
          u.first_name,
          u.last_name,
          u.email,
          COUNT(DISTINCT he.event_id) as paid_events_count,
          SUM(he.total_revenue) as total_revenue,
          MAX(he.datetime) as latest_event_date,
          json_agg(
            json_build_object(
              'method', he.payout_method,
              'upiId', he.host_upi_id,
              'accountHolderName', he.account_holder_name,
              'accountNumber', he.account_number,
              'ifscCode', he.ifsc_code,
              'eventTitle', he.event_title,
              'eventDate', he.datetime
            ) ORDER BY he.datetime DESC
          ) as payment_details
        FROM host_events he
        JOIN users u ON he.host_id = u.id
        GROUP BY he.host_id, u.first_name, u.last_name, u.email
      )
      SELECT * FROM host_summary
      ORDER BY latest_event_date DESC
    `;

    const result = await pool.query(query);
    
    return result.rows.map(row => {
      // Group payment methods to avoid duplicates
      const paymentMethodsMap = new Map();
      
      row.payment_details.forEach((detail: any) => {
        const key = `${detail.method}-${detail.upiId || ''}-${detail.accountNumber || ''}`;
        if (!paymentMethodsMap.has(key)) {
          paymentMethodsMap.set(key, {
            method: detail.method,
            upiId: detail.upiId,
            accountHolderName: detail.accountHolderName,
            accountNumber: detail.accountNumber,
            ifscCode: detail.ifscCode,
            eventCount: 1,
            lastUsedEvent: detail.eventTitle,
          });
        } else {
          const existing = paymentMethodsMap.get(key);
          existing.eventCount += 1;
        }
      });

      return {
        hostId: row.host_id,
        hostFirstName: row.first_name,
        hostLastName: row.last_name,
        hostEmail: row.email,
        paidEventsCount: parseInt(row.paid_events_count),
        totalRevenue: parseInt(row.total_revenue || 0),
        paymentMethods: Array.from(paymentMethodsMap.values()),
        latestEventDate: row.latest_event_date,
      };
    });
  }
}

export const adminService = new AdminService();
