export type GameType = 'BGMI' | 'FREE FIRE MAX' | 'CALL OF DUTY' | 'VALORANT MOBILE' | 'BGMI TDM';
export type MatchMode = 'Solo' | 'Duo' | 'Squad' | '1v1 TDM' | '4v4 TDM';
export type TournamentStatus = 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'CANCELLED';

export interface Participant {
  userId: string;
  username: string;
  gameIgn: string;
  gameUid: string;
  slotNo: number;
  joinedAt: string;
}

export interface PrizeBreakdown {
  rank1: number; // in paise
  rank2: number;
  rank3: number;
  perKill: number;
}

export interface MatchResult {
  rank: number;
  userId?: string;
  username: string;
  gameIgn: string;
  kills: number;
  prizePaise: number;
}

export interface Tournament {
  id: string;
  title: string;
  game: GameType;
  mode: MatchMode;
  map: string;
  banner: string;
  entryFeePaise: number; // in paise (e.g., 5000 = ₹50)
  prizePoolPaise: number; // in paise (e.g., 500000 = ₹5,000)
  prizeBreakdown: PrizeBreakdown;
  matchTime: string; // ISO string
  registrationDeadline: string; // ISO string
  totalSlots: number;
  registeredParticipants: Participant[];
  status: TournamentStatus;
  rules: string[];
  eligibility: string;
  supportContact: string;
  roomDetails: {
    released: boolean;
    roomId?: string;
    roomPassword?: string;
    releasedAt?: string;
    updatedAt?: string;
  };
  results?: MatchResult[];
  cancelledAt?: string;
  cancellationReason?: string;
}

export type TransactionType = 'DEPOSIT' | 'ENTRY_FEE' | 'PRIZE' | 'REFUND' | 'WITHDRAWAL' | 'ADJUSTMENT';
export type TransactionStatus = 'COMPLETED' | 'PENDING' | 'REJECTED';

export interface WalletTransaction {
  id: string;
  userId: string;
  type: TransactionType;
  amountPaise: number; // signed: positive for credit, negative for debit
  balanceAfterPaise: number;
  status: TransactionStatus;
  description: string;
  referenceId?: string;
  idempotencyKey?: string;
  createdAt: string;
}

export type UserAccountStatus = 'ACTIVE' | 'TEMPORARILY_BANNED' | 'PERMANENTLY_BANNED';
export type BanType = 'TEMPORARY' | 'PERMANENT';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  phone: string;
  role: 'user' | 'admin';
  avatar: string;
  bgmiIgn?: string;
  bgmiUid?: string;
  freeFireIgn?: string;
  freeFireUid?: string;
  upiId?: string;
  walletBalancePaise: number;
  coins: number;
  isBanned?: boolean;
  accountStatus?: UserAccountStatus;
  banReason?: string;
  banType?: BanType;
  banExpiresAt?: string | null;
  bannedAt?: string;
  bannedBy?: string;
  bannedByName?: string;
  unbannedAt?: string;
  unbannedBy?: string;
  createdAt: string;
  notificationSettings?: UserNotificationSettings;
  pushSubscriptions?: PushSubscriptionData[];
}

export interface UserNotificationSettings {
  pushEnabled: boolean;              // Master push notification switch
  notifyRoomDetails: boolean;        // Room ID & password published or updated
  notifyWithdrawalUpdates: boolean;  // Withdrawal status changes (processing/approved/declined)
  notifyTournamentStart: boolean;    // Tournament starting soon (15 mins before match)
  soundEnabled: boolean;             // Audio chime when alert arrives
  vibrateEnabled: boolean;           // Haptic vibration on mobile devices
}

export interface PushSubscriptionData {
  endpoint: string;
  keys?: {
    p256dh: string;
    auth: string;
  };
  deviceInfo?: string;
  createdAt: string;
}

export interface InAppPushAlert {
  id: string;
  title: string;
  message: string;
  type: 'ROOM' | 'WALLET' | 'MATCH' | 'ANNOUNCEMENT';
  linkTab?: string;
  timestamp: string;
}

export type DepositStatus = 'PENDING' | 'SUCCESSFUL' | 'REJECTED' | 'EXPIRED';

export interface DepositOrder {
  id: string;
  userId: string;
  username: string;
  amountPaise: number;
  currency: string;
  paymentMethod: 'UPI' | 'QR' | 'GATEWAY';
  status: DepositStatus;
  providerRef?: string;
  utr?: string;
  qrPayload?: string;
  merchantQrImageUrl?: string;
  merchantUpiId?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  verificationNotes?: string;
}

export type WithdrawalStatus = 'PENDING' | 'PROCESSING' | 'SUCCESSFUL' | 'REJECTED';

export interface WithdrawalRequest {
  id: string;
  userId: string;
  username: string;
  amountPaise: number;
  payoutUpiId: string;
  upiId?: string;
  status: WithdrawalStatus;
  createdAt: string;
  processedAt?: string;
  adminNotes?: string;
  referenceNo?: string;
}

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';

export interface TicketMessage {
  id: string;
  sender: 'user' | 'admin';
  senderName: string;
  text: string;
  timestamp: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  username: string;
  category: 'DEPOSIT' | 'WITHDRAWAL' | 'MATCH' | 'ROOM_CREDS' | 'OTHER';
  subject: string;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  messages: TicketMessage[];
}

export interface NotificationItem {
  id: string;
  userId: string; // 'ALL' or specific user id
  title: string;
  message: string;
  type: 'MATCH' | 'WALLET' | 'ROOM' | 'ANNOUNCEMENT';
  read: boolean;
  createdAt: string;
  linkTab?: string;
  referenceId?: string;
  metadata?: Record<string, any>;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  tag: 'HOT' | 'IMPORTANT' | 'UPDATE' | 'OFFER';
  date: string;
}

export interface DepositPreset {
  id: string;
  amountRupees: number;
  label?: string;
  enabled: boolean;
  order: number;
}

export interface AppSettings {
  minDepositPaise: number;
  maxDepositPaise: number;
  minWithdrawalPaise: number;
  maxWithdrawalPaise: number;
  merchantUpiId: string;
  merchantName: string;
  merchantQrImageUrl?: string;
  upiConfigured?: boolean;
  depositPresets?: DepositPreset[];
  gatewayEnabled: boolean;
  supportPhone: string;
  supportEmail: string;
  announcementNotice: string;
}

export interface AuditLog {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  details: string;
  targetId?: string;
  targetUsername?: string;
  reason?: string;
  previousStatus?: string;
  newStatus?: string;
  banType?: string;
  banExpiresAt?: string;
  timestamp: string;
}
