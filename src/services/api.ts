import {
  Tournament,
  UserProfile,
  WalletTransaction,
  DepositOrder,
  WithdrawalRequest,
  SupportTicket,
  NotificationItem,
  Announcement,
  AppSettings,
  AuditLog,
  UserNotificationSettings,
} from '../types/index.ts';

const TOKEN_KEY = 'battle_esports_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err: any = new Error(data.error || `Request failed with status ${res.status}`);
    err.status = res.status;
    err.code = data.code;
    err.banInfo = data.banInfo;
    throw err;
  }

  return data as T;
}

export const api = {
  // Auth
  async register(body: any): Promise<{ token: string; user: UserProfile }> {
    const res = await request<{ token: string; user: UserProfile }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    setStoredToken(res.token);
    return res;
  },

  async login(body: any): Promise<{ token: string; user: UserProfile }> {
    const res = await request<{ token: string; user: UserProfile }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    setStoredToken(res.token);
    return res;
  },

  async getMe(): Promise<{ user: UserProfile }> {
    return request<{ user: UserProfile }>('/api/auth/me');
  },

  async logout(): Promise<void> {
    try {
      await request('/api/auth/logout', { method: 'POST' });
    } finally {
      setStoredToken(null);
    }
  },

  async updateProfile(body: Partial<UserProfile>): Promise<{ user: UserProfile }> {
    return request<{ user: UserProfile }>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  async changePassword(body: { oldPassword: string; newPassword: string }): Promise<{ success: boolean; message: string }> {
    return request('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    return request('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async googleLogin(body: { email: string; name?: string; avatar?: string }): Promise<{ token: string; user: UserProfile }> {
    const res = await request<{ token: string; user: UserProfile }>('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    setStoredToken(res.token);
    return res;
  },

  // Tournaments
  async getTournaments(params?: { game?: string; status?: string; search?: string }): Promise<{ tournaments: Tournament[] }> {
    const query = new URLSearchParams();
    if (params?.game) query.set('game', params.game);
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    return request<{ tournaments: Tournament[] }>(`/api/tournaments?${query.toString()}`);
  },

  async getTournament(id: string): Promise<{ tournament: Tournament }> {
    return request<{ tournament: Tournament }>(`/api/tournaments/${id}`);
  },

  async joinTournament(id: string, body: { gameIgn: string; gameUid: string }): Promise<{ success: boolean; message: string; slotNo: number; tournament: Tournament; walletBalancePaise: number }> {
    return request(`/api/tournaments/${id}/join`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  // Wallet
  async getWalletSummary(): Promise<{
    walletBalancePaise: number;
    coins: number;
    transactions: WalletTransaction[];
    deposits: DepositOrder[];
    withdrawals: WithdrawalRequest[];
  }> {
    return request('/api/wallet/summary');
  },

  async createDeposit(body: { amountPaise: number; utr?: string; paymentMethod?: string }): Promise<{
    success: boolean;
    deposit: DepositOrder;
    merchantUpiId: string;
    merchantName: string;
    merchantQrImageUrl?: string;
    upiPayload: string;
  }> {
    return request('/api/wallet/deposit/create', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async submitDepositUtr(depositId: string, utr: string): Promise<{
    success: boolean;
    deposit: DepositOrder;
  }> {
    return request(`/api/wallet/deposit/${depositId}/utr`, {
      method: 'POST',
      body: JSON.stringify({ utr }),
    });
  },

  async expireDeposit(depositId: string): Promise<{
    success: boolean;
    deposit: DepositOrder;
  }> {
    return request(`/api/wallet/deposit/${depositId}/expire`, {
      method: 'POST',
    });
  },

  async verifyTestDeposit(depositId: string): Promise<{
    success: boolean;
    message: string;
    deposit: DepositOrder;
    walletBalancePaise: number;
  }> {
    return request('/api/wallet/deposit/verify-test', {
      method: 'POST',
      body: JSON.stringify({ depositId }),
    });
  },

  async requestWithdrawal(body: { amountPaise: number; payoutUpiId: string }): Promise<{
    success: boolean;
    message: string;
    withdrawal: WithdrawalRequest;
    walletBalancePaise: number;
  }> {
    return request('/api/wallet/withdraw/request', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  // Support
  async getTickets(): Promise<{ tickets: SupportTicket[] }> {
    return request('/api/support/tickets');
  },

  async createTicket(body: { category: string; subject: string; message: string }): Promise<{ success: boolean; ticket: SupportTicket }> {
    return request('/api/support/tickets', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async sendTicketMessage(ticketId: string, text: string): Promise<{ success: boolean; ticket: SupportTicket }> {
    return request(`/api/support/tickets/${ticketId}/message`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  },

  // Notifications & Announcements
  async getNotifications(): Promise<{ notifications: NotificationItem[] }> {
    return request('/api/notifications');
  },

  async markNotificationRead(id: string): Promise<void> {
    return request(`/api/notifications/${id}/read`, { method: 'POST' });
  },

  async getNotificationSettings(): Promise<{ settings: UserNotificationSettings }> {
    return request('/api/user/notification-settings');
  },

  async updateNotificationSettings(settings: Partial<UserNotificationSettings>): Promise<{ success: boolean; settings: UserNotificationSettings; message: string }> {
    return request('/api/user/notification-settings', {
      method: 'POST',
      body: JSON.stringify(settings),
    });
  },

  async sendTestPushNotification(): Promise<{ success: boolean; message: string; notification: NotificationItem }> {
    return request('/api/user/test-push', {
      method: 'POST',
    });
  },

  async registerPushSubscription(body: { subscription: any; deviceInfo?: string }): Promise<{ success: boolean }> {
    return request('/api/user/push-subscription', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async getAnnouncements(): Promise<{ announcements: Announcement[]; notice: string }> {
    return request('/api/announcements');
  },

  async getSettings(): Promise<{ settings: AppSettings }> {
    return request('/api/settings');
  },

  async sendTournamentStartAlert(tournamentId: string): Promise<{ success: boolean; notifiedCount: number; message: string }> {
    return request(`/api/admin/tournaments/${tournamentId}/send-start-alert`, {
      method: 'POST',
    });
  },

  // Admin APIs
  async getAdminOverview(): Promise<{
    totalUsers: number;
    activeTournaments: number;
    pendingDepositsCount: number;
    pendingWithdrawalsCount: number;
    openTicketsCount: number;
    totalPrizePaidPaise: number;
    totalDepositsPaise: number;
    totalTournamentsCount: number;
    recentAuditLogs: AuditLog[];
  }> {
    return request('/api/admin/overview');
  },

  async createAdminTournament(body: any): Promise<{ success: boolean; tournament: Tournament }> {
    return request('/api/admin/tournaments', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async releaseRoom(
    tournamentId: string,
    body: { roomId: string; roomPassword: string; publishNow?: boolean }
  ): Promise<{
    success: boolean;
    tournament: Tournament;
    message?: string;
    alreadyPublished?: boolean;
    notifiedCount?: number;
    published?: boolean;
    isUpdate?: boolean;
  }> {
    return request(`/api/admin/tournaments/${tournamentId}/release-room`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async updateRoomDetails(
    tournamentId: string,
    body: { roomId: string; roomPassword: string; publishNow?: boolean }
  ): Promise<{
    success: boolean;
    tournament: Tournament;
    message?: string;
    alreadyPublished?: boolean;
    notifiedCount?: number;
    published?: boolean;
    isUpdate?: boolean;
  }> {
    return request(`/api/admin/tournaments/${tournamentId}/room-details`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async publishTournamentResults(tournamentId: string, results: any[]): Promise<{ success: boolean; tournament: Tournament }> {
    return request(`/api/admin/tournaments/${tournamentId}/results`, {
      method: 'POST',
      body: JSON.stringify({ results }),
    });
  },

  async cancelTournament(tournamentId: string, reason: string): Promise<{ success: boolean; tournament: Tournament }> {
    return request(`/api/admin/tournaments/${tournamentId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  async getAdminDeposits(status?: string): Promise<{ deposits: DepositOrder[] }> {
    return request(`/api/admin/deposits?status=${status || 'ALL'}`);
  },

  async updateDepositStatus(depositId: string, newStatus: string, verificationNotes?: string): Promise<{ success: boolean; deposit: DepositOrder }> {
    return request(`/api/admin/deposits/${depositId}/status`, {
      method: 'POST',
      body: JSON.stringify({ newStatus, verificationNotes }),
    });
  },

  async getAdminWithdrawals(status?: string): Promise<{ withdrawals: WithdrawalRequest[] }> {
    return request(`/api/admin/withdrawals?status=${status || 'ALL'}`);
  },

  async updateWithdrawalStatus(withdrawalId: string, newStatus: string, adminNotes?: string, referenceNo?: string): Promise<{ success: boolean; withdrawal: WithdrawalRequest }> {
    return request(`/api/admin/withdrawals/${withdrawalId}/status`, {
      method: 'POST',
      body: JSON.stringify({ newStatus, adminNotes, referenceNo }),
    });
  },

  async getAdminUsers(search?: string): Promise<{ users: UserProfile[] }> {
    return request(`/api/admin/users?search=${encodeURIComponent(search || '')}`);
  },

  async adjustUserWallet(userId: string, amountPaise: number, reason: string): Promise<{ success: boolean; walletBalancePaise: number }> {
    return request(`/api/admin/users/${userId}/adjust-wallet`, {
      method: 'POST',
      body: JSON.stringify({ amountPaise, reason }),
    });
  },

  async toggleBanUser(userId: string): Promise<{ success: boolean; isBanned: boolean }> {
    return request(`/api/admin/users/${userId}/toggle-ban`, { method: 'POST' });
  },

  async banUser(userId: string, body: { reason: string; banType: 'TEMPORARY' | 'PERMANENT'; durationHours?: number; banExpiresAt?: string }): Promise<{ success: boolean; user: UserProfile }> {
    return request(`/api/admin/users/${userId}/ban`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async unbanUser(userId: string, reason?: string): Promise<{ success: boolean; user: UserProfile }> {
    return request(`/api/admin/users/${userId}/unban`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  async getAdminAuditLogs(params?: { action?: string; targetId?: string }): Promise<{ auditLogs: AuditLog[] }> {
    const query = new URLSearchParams();
    if (params?.action) query.set('action', params.action);
    if (params?.targetId) query.set('targetId', params.targetId);
    return request<{ auditLogs: AuditLog[] }>(`/api/admin/audit-logs?${query.toString()}`);
  },

  async getAdminTickets(): Promise<{ tickets: SupportTicket[] }> {
    return request('/api/admin/support/tickets');
  },

  async updateTicketStatus(ticketId: string, status: string): Promise<{ success: boolean; ticket: SupportTicket }> {
    return request(`/api/admin/support/tickets/${ticketId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
  },

  async broadcastNotification(title: string, message: string): Promise<{ success: boolean }> {
    return request('/api/admin/broadcast', {
      method: 'POST',
      body: JSON.stringify({ title, message }),
    });
  },

  async updateAdminSettings(settings: Partial<AppSettings> & { regenerateQr?: boolean }): Promise<{ success: boolean; settings: AppSettings }> {
    return request('/api/admin/settings', {
      method: 'POST',
      body: JSON.stringify(settings),
    });
  },

  async regenerateAdminQr(): Promise<{ success: boolean; settings: AppSettings; qrCodeUrl: string; upiUri: string }> {
    return request('/api/admin/settings/regenerate-qr', {
      method: 'POST',
    });
  },
};
