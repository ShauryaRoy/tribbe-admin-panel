const API_URL = '/api/admin';

let token = localStorage.getItem('admin_token');

export const setToken = (newToken: string) => {
  token = newToken;
  localStorage.setItem('admin_token', newToken);
};

export const clearToken = () => {
  token = null;
  localStorage.removeItem('admin_token');
};

const request = async (endpoint: string, options: RequestInit = {}) => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearToken();
    window.location.href = '/';
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
};

export const api = {
  login: (username: string, password: string) =>
    request('/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  getDashboardStats: () => request('/dashboard/stats'),

  getEvents: (discoverStatus: string = 'all') => request(`/events?discoverStatus=${discoverStatus}`),

  approveEvent: (id: number) =>
    request(`/events/${id}/approve-discover`, { method: 'POST' }),

  rejectEvent: (id: number, reason: string) =>
    request(`/events/${id}/reject-discover`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  deleteEvent: (id: number) =>
    request(`/events/${id}`, { method: 'DELETE' }),

  getGroups: (discoverStatus: string = 'all') => request(`/groups?discoverStatus=${discoverStatus}`),

  approveGroup: (id: number) =>
    request(`/groups/${id}/approve-discover`, { method: 'POST' }),

  rejectGroup: (id: number, reason: string) =>
    request(`/groups/${id}/reject-discover`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  deleteGroup: (id: number) =>
    request(`/groups/${id}`, { method: 'DELETE' }),

  getUsers: () => request('/users'),

  banUser: (id: number) => request(`/users/${id}/ban`, { method: 'POST' }),

  unbanUser: (id: number) => request(`/users/${id}/unban`, { method: 'POST' }),

  promoteUser: (id: number) =>
    request(`/users/${id}/promote`, { method: 'POST' }),

  demoteUser: (id: number) =>
    request(`/users/${id}/demote`, { method: 'POST' }),

  getAuditLogs: () => request('/audit-logs'),

  getEventsAnalytics: (days: number = 30) =>
    request(`/analytics/events?days=${days}`),

  getGroupsAnalytics: (days: number = 30) =>
    request(`/analytics/groups?days=${days}`),
};
