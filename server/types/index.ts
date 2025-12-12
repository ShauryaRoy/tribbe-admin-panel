export interface User {
  id: number;
  username: string;
  email: string;
  role: 'user' | 'admin' | 'superadmin';
  banned: boolean;
  created_at: Date;
}

export interface Event {
  id: number;
  name: string;
  host_id: number;
  host_name?: string;
  date: Date;
  location: string;
  discover_state: 'not_requested' | 'requested' | 'approved' | 'rejected';
  discover_requested_at?: Date;
  discover_approved_by?: number;
  discover_rejected_by?: number;
  discover_rejection_reason?: string;
  created_at: Date;
}

export interface Group {
  id: number;
  name: string;
  slug: string;
  creator_id: number;
  member_count: number;
  created_at: Date;
}

export interface AuditLog {
  id: number;
  admin_id: number;
  admin_name: string;
  action: string;
  target_type: 'event' | 'user' | 'group';
  target_id: number;
  details?: any;
  created_at: Date;
}

export interface DashboardStats {
  totalEvents: number;
  pendingEvents: number;
  approvedEvents: number;
  rejectedEvents: number;
  totalGroups: number;
  totalUsers: number;
  bannedUsers: number;
  todayEvents: number;
  eventsLast7Days: number;
  eventsLast30Days: number;
  groupsLast7Days: number;
  newUsers7Days: number;
  newUsers30Days: number;
  publicGroups: number;
  privateGroups: number;
  totalMemberships: number;
  avgMembersPerGroup: number;
}

export interface AnalyticsData {
  date: string;
  count: number;
}
