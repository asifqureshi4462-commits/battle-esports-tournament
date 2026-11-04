import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import QRCode from 'qrcode';
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
  DepositPreset,
  AuditLog,
  MatchResult,
  UserAccountStatus,
  BanType,
  UserNotificationSettings,
  PushSubscriptionData,
} from './src/types/index.ts';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const DB_FILE = path.resolve(process.cwd(), 'data', 'db.json');

// Ensure data directory exists
if (!fs.existsSync(path.dirname(DB_FILE))) {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
}

// Memory database structure
interface DatabaseState {
  users: (UserProfile & { passwordHash: string })[];
  sessions: Record<string, string>; // token -> userId
  tournaments: Tournament[];
  transactions: WalletTransaction[];
  deposits: DepositOrder[];
  withdrawals: WithdrawalRequest[];
  tickets: SupportTicket[];
  notifications: NotificationItem[];
  announcements: Announcement[];
  settings: AppSettings;
  auditLogs: AuditLog[];
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + 'battle_salt_2026').digest('hex');
}

function isValidUpiVpa(upiId: string): boolean {
  if (!upiId || typeof upiId !== 'string') return false;
  const trimmed = upiId.trim();
  const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z0-9]{2,64}$/;
  return upiRegex.test(trimmed);
}

function buildServerUpiUri(upiId: string, merchantName?: string, amountPaise?: number, note?: string): string {
  const cleanUpi = upiId.trim();
  const cleanName = (merchantName && merchantName.trim()) || 'BATTLE ESPORTS';
  const params = new URLSearchParams();
  params.set('pa', cleanUpi);
  params.set('pn', cleanName);
  params.set('cu', 'INR');
  if (amountPaise !== undefined && amountPaise > 0) {
    params.set('am', (amountPaise / 100).toFixed(2));
  }
  if (note && note.trim()) {
    params.set('tn', note.trim());
  }
  return `upi://pay?${params.toString()}`;
}

async function generateServerUpiQr(upiUri: string): Promise<string> {
  return QRCode.toDataURL(upiUri, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 360,
    color: { dark: '#000000', light: '#ffffff' },
  });
}

// Initial seed state
function getInitialData(): DatabaseState {
  const adminId = 'usr_admin_001';
  const player1Id = 'usr_player_001';
  const player2Id = 'usr_player_002';
  const player3Id = 'usr_player_003';

  const defaultSettings: AppSettings = {
    minDepositPaise: 1000, // ₹10
    maxDepositPaise: 200000, // ₹2,000
    minWithdrawalPaise: 10000, // ₹100
    maxWithdrawalPaise: 1000000, // ₹10,000
    merchantUpiId: 'battleesports.tournaments@icici',
    merchantName: 'BATTLE ESPORTS TOURNAMENTS LTD',
    merchantQrImageUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi%3A%2F%2Fpay%3Fpa%3Dbattleesports.tournaments%40icici%26pn%3DBATTLE%2520ESPORTS%2520TOURNAMENTS%2520LTD%26cu%3DINR',
    upiConfigured: true,
    depositPresets: [
      { id: 'pre_10', amountRupees: 10, label: '₹10 (Starter)', enabled: true, order: 1 },
      { id: 'pre_20', amountRupees: 20, enabled: true, order: 2 },
      { id: 'pre_50', amountRupees: 50, enabled: true, order: 3 },
      { id: 'pre_100', amountRupees: 100, label: '₹100 (Popular)', enabled: true, order: 4 },
      { id: 'pre_200', amountRupees: 200, enabled: true, order: 5 },
      { id: 'pre_300', amountRupees: 300, enabled: true, order: 6 },
      { id: 'pre_500', amountRupees: 500, label: '₹500 (Best Value)', enabled: true, order: 7 },
      { id: 'pre_1000', amountRupees: 1000, enabled: true, order: 8 },
      { id: 'pre_1500', amountRupees: 1500, enabled: true, order: 9 },
      { id: 'pre_2000', amountRupees: 2000, label: '₹2,000 (Max)', enabled: true, order: 10 },
    ],
    gatewayEnabled: true,
    supportPhone: '+91 98765 43210',
    supportEmail: 'support@battleesports.com',
    announcementNotice: '🚀 BGMI Season 32 Pro League registration is now LIVE! 100% Guaranteed Prize Pool directly credited to wallet.',
  };

  const users: (UserProfile & { passwordHash: string })[] = [
    {
      id: adminId,
      username: 'BattleAdmin',
      email: 'admin@battleesports.com',
      phone: '+91 99999 88888',
      role: 'admin',
      avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80',
      walletBalancePaise: 500000, // ₹5,000
      coins: 2500,
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      passwordHash: hashPassword('admin123'),
    },
    {
      id: player1Id,
      username: 'RahulPro',
      email: 'rahul@gamer.com',
      phone: '+91 98765 11111',
      role: 'user',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      bgmiIgn: 'TX・RAHUL⚡',
      bgmiUid: '5129482103',
      freeFireIgn: 'RAHUL_FF_BOSS',
      freeFireUid: '884920192',
      upiId: 'rahultripathi@oksbi',
      walletBalancePaise: 35000, // ₹350 available
      coins: 850,
      createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
      passwordHash: hashPassword('gamer123'),
    },
    {
      id: player2Id,
      username: 'VickySniper',
      email: 'vicky@gamer.com',
      phone: '+91 98765 22222',
      role: 'user',
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
      bgmiIgn: 'GOD・VICKY父',
      bgmiUid: '5192849201',
      upiId: 'vicky@paytm',
      walletBalancePaise: 12000, // ₹120
      coins: 300,
      createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
      passwordHash: hashPassword('gamer123'),
    },
    {
      id: player3Id,
      username: 'AnanyaSlayer',
      email: 'ananya@gamer.com',
      phone: '+91 98765 33333',
      role: 'user',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      freeFireIgn: 'QUEEN・ANANYA',
      freeFireUid: '902819402',
      walletBalancePaise: 45000, // ₹450
      coins: 1200,
      createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      passwordHash: hashPassword('gamer123'),
    },
  ];

  const now = Date.now();

  const tournaments: Tournament[] = [
    {
      id: 'tour_bgmi_erangel_01',
      title: 'BGMI Erangel Mega Championship #324',
      game: 'BGMI',
      mode: 'Squad',
      map: 'Erangel',
      banner: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80',
      entryFeePaise: 5000, // ₹50
      prizePoolPaise: 500000, // ₹5,000
      prizeBreakdown: {
        rank1: 250000, // ₹2,500
        rank2: 150000, // ₹1,500
        rank3: 100000, // ₹1,000
        perKill: 2500,  // ₹25/kill
      },
      matchTime: new Date(now + 45 * 60000).toISOString(), // in 45 mins
      registrationDeadline: new Date(now + 30 * 60000).toISOString(),
      totalSlots: 100,
      registeredParticipants: [
        {
          userId: player1Id,
          username: 'RahulPro',
          gameIgn: 'TX・RAHUL⚡',
          gameUid: '5129482103',
          slotNo: 14,
          joinedAt: new Date(now - 120 * 60000).toISOString(),
        },
        {
          userId: player2Id,
          username: 'VickySniper',
          gameIgn: 'GOD・VICKY父',
          gameUid: '5192849201',
          slotNo: 15,
          joinedAt: new Date(now - 90 * 60000).toISOString(),
        },
      ],
      status: 'UPCOMING',
      rules: [
        'Emulators and iPad view are strictly banned.',
        'Hacking, scripting, or teaming up results in an immediate permanent ban without refund.',
        'Room ID & Password will be shared 15 minutes before match start.',
        'All players must record their gameplay or take end-match screenshots.',
      ],
      eligibility: 'Level 35+ BGMI Account, Tier Diamond or above.',
      supportContact: 'discord.gg/battleesports or support@battleesports.com',
      roomDetails: {
        released: true,
        roomId: '8392014',
        roomPassword: 'battle_squad_99',
        releasedAt: new Date(now - 5 * 60000).toISOString(),
      },
    },
    {
      id: 'tour_ff_bermuda_02',
      title: 'Free Fire MAX Bermuda Clash Solo',
      game: 'FREE FIRE MAX',
      mode: 'Solo',
      map: 'Bermuda',
      banner: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80',
      entryFeePaise: 2500, // ₹25
      prizePoolPaise: 250000, // ₹2,500
      prizeBreakdown: {
        rank1: 125000,
        rank2: 75000,
        rank3: 50000,
        perKill: 1500,
      },
      matchTime: new Date(now + 120 * 60000).toISOString(), // in 2 hours
      registrationDeadline: new Date(now + 100 * 60000).toISOString(),
      totalSlots: 48,
      registeredParticipants: [
        {
          userId: player3Id,
          username: 'AnanyaSlayer',
          gameIgn: 'QUEEN・ANANYA',
          gameUid: '902819402',
          slotNo: 7,
          joinedAt: new Date(now - 60 * 60000).toISOString(),
        },
      ],
      status: 'UPCOMING',
      rules: [
        'Gun skins attributes are OFF for fair competitive play.',
        'Characters like Chrono/Skyler skills are permitted according to standard tournament guidelines.',
        'Room ID & Password will be published 15 minutes before the match.',
      ],
      eligibility: 'Free Fire MAX Level 25+ accounts only.',
      supportContact: 'support@battleesports.com',
      roomDetails: {
        released: false,
      },
    },
    {
      id: 'tour_bgmi_tdm_03',
      title: 'BGMI 1v1 M416 Warehouse Championship',
      game: 'BGMI TDM',
      mode: '1v1 TDM',
      map: 'Warehouse',
      banner: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80',
      entryFeePaise: 3000, // ₹30
      prizePoolPaise: 100000, // ₹1,000
      prizeBreakdown: {
        rank1: 70000,
        rank2: 30000,
        rank3: 0,
        perKill: 0,
      },
      matchTime: new Date(now + 240 * 60000).toISOString(),
      registrationDeadline: new Date(now + 200 * 60000).toISOString(),
      totalSlots: 16,
      registeredParticipants: [],
      status: 'UPCOMING',
      rules: [
        'M416 Only. No Slide. No Grenades or Stun.',
        'Vest and Helmet Level 2 only.',
        'First to 15 points wins.',
      ],
      eligibility: 'Open to all mobile players.',
      supportContact: 'support@battleesports.com',
      roomDetails: {
        released: false,
      },
    },
    {
      id: 'tour_codm_crash_04',
      title: 'Call of Duty Mobile Search & Destroy Cup',
      game: 'CALL OF DUTY',
      mode: 'Squad',
      map: 'Crash / Standoff',
      banner: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800&auto=format&fit=crop&q=80',
      entryFeePaise: 4000, // ₹40
      prizePoolPaise: 400000, // ₹4,000
      prizeBreakdown: {
        rank1: 220000,
        rank2: 120000,
        rank3: 60000,
        perKill: 1000,
      },
      matchTime: new Date(now + 360 * 60000).toISOString(),
      registrationDeadline: new Date(now + 330 * 60000).toISOString(),
      totalSlots: 20,
      registeredParticipants: [],
      status: 'UPCOMING',
      rules: [
        'Hardpoint & Search and Destroy standard rules.',
        'Banned weapons: NA-45, Akimbo Fennec, Operator Skills restricted.',
      ],
      eligibility: 'Master tier and above.',
      supportContact: 'support@battleesports.com',
      roomDetails: {
        released: false,
      },
    },
    {
      id: 'tour_completed_05',
      title: 'BGMI Erangel Pro Masters (Season Finale)',
      game: 'BGMI',
      mode: 'Squad',
      map: 'Erangel',
      banner: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=800&auto=format&fit=crop&q=80',
      entryFeePaise: 5000,
      prizePoolPaise: 600000,
      prizeBreakdown: {
        rank1: 300000,
        rank2: 180000,
        rank3: 120000,
        perKill: 3000,
      },
      matchTime: new Date(now - 1440 * 60000).toISOString(),
      registrationDeadline: new Date(now - 1500 * 60000).toISOString(),
      totalSlots: 100,
      registeredParticipants: [
        {
          userId: player1Id,
          username: 'RahulPro',
          gameIgn: 'TX・RAHUL⚡',
          gameUid: '5129482103',
          slotNo: 1,
          joinedAt: new Date(now - 1600 * 60000).toISOString(),
        },
      ],
      status: 'COMPLETED',
      rules: ['Standard competitive tournament rules.'],
      eligibility: 'Verified users.',
      supportContact: 'support@battleesports.com',
      roomDetails: {
        released: true,
        roomId: '7192840',
        roomPassword: 'finished_room',
        releasedAt: new Date(now - 1450 * 60000).toISOString(),
      },
      results: [
        { rank: 1, userId: player1Id, username: 'RahulPro', gameIgn: 'TX・RAHUL⚡', kills: 8, prizePaise: 324000 },
        { rank: 2, username: 'HydraViper', gameIgn: 'HYDRA・VIPER', kills: 5, prizePaise: 195000 },
        { rank: 3, username: 'MortalFan99', gameIgn: 'SOUL・MORTAL99', kills: 4, prizePaise: 132000 },
      ],
    },
  ];

  const transactions: WalletTransaction[] = [
    {
      id: 'tx_init_01',
      userId: player1Id,
      type: 'DEPOSIT',
      amountPaise: 50000, // +₹500
      balanceAfterPaise: 50000,
      status: 'COMPLETED',
      description: 'UPI Deposit via PhonePe (UTR: 419208392810)',
      referenceId: 'dep_init_01',
      createdAt: new Date(now - 48 * 3600000).toISOString(),
    },
    {
      id: 'tx_init_02',
      userId: player1Id,
      type: 'ENTRY_FEE',
      amountPaise: -5000, // -₹50
      balanceAfterPaise: 45000,
      status: 'COMPLETED',
      description: 'Joined BGMI Pro Masters (Season Finale)',
      referenceId: 'tour_completed_05',
      createdAt: new Date(now - 24 * 3600000).toISOString(),
    },
    {
      id: 'tx_init_03',
      userId: player1Id,
      type: 'PRIZE',
      amountPaise: 324000, // +₹3,240 prize
      balanceAfterPaise: 369000,
      status: 'COMPLETED',
      description: 'Rank 1 Prize + 8 Kills in BGMI Pro Masters',
      referenceId: 'tour_completed_05',
      createdAt: new Date(now - 22 * 3600000).toISOString(),
    },
    {
      id: 'tx_init_04',
      userId: player1Id,
      type: 'WITHDRAWAL',
      amountPaise: -329000, // -₹3,290 withdrawn
      balanceAfterPaise: 40000,
      status: 'COMPLETED',
      description: 'Payout to UPI: rahultripathi@oksbi',
      referenceId: 'wth_init_01',
      createdAt: new Date(now - 12 * 3600000).toISOString(),
    },
    {
      id: 'tx_init_05',
      userId: player1Id,
      type: 'ENTRY_FEE',
      amountPaise: -5000, // -₹50 for current upcoming match
      balanceAfterPaise: 35000,
      status: 'COMPLETED',
      description: 'Joined BGMI Erangel Mega Championship #324',
      referenceId: 'tour_bgmi_erangel_01',
      createdAt: new Date(now - 2 * 3600000).toISOString(),
    },
  ];

  const deposits: DepositOrder[] = [
    {
      id: 'dep_p01',
      userId: player2Id,
      username: 'VickySniper',
      amountPaise: 10000, // ₹100
      currency: 'INR',
      paymentMethod: 'UPI',
      status: 'PENDING',
      utr: '429104928192',
      providerRef: 'PAY_ORD_98124',
      createdAt: new Date(now - 25 * 60000).toISOString(),
      updatedAt: new Date(now - 25 * 60000).toISOString(),
      verificationNotes: 'Awaiting webhook confirmation / Admin manual check',
    },
    {
      id: 'dep_s01',
      userId: player1Id,
      username: 'RahulPro',
      amountPaise: 50000, // ₹500
      currency: 'INR',
      paymentMethod: 'UPI',
      status: 'SUCCESSFUL',
      utr: '419208392810',
      providerRef: 'PAY_ORD_97812',
      createdAt: new Date(now - 48 * 3600000).toISOString(),
      updatedAt: new Date(now - 48 * 3600000 + 120000).toISOString(),
      verificationNotes: 'Verified via Gateway Webhook Signature',
    },
    {
      id: 'dep_r01',
      userId: player3Id,
      username: 'AnanyaSlayer',
      amountPaise: 20000, // ₹200
      currency: 'INR',
      paymentMethod: 'UPI',
      status: 'REJECTED',
      utr: 'INVALID_UTR_99',
      providerRef: 'PAY_ORD_94102',
      createdAt: new Date(now - 72 * 3600000).toISOString(),
      updatedAt: new Date(now - 71 * 3600000).toISOString(),
      verificationNotes: 'Bank reported no credit for UTR',
    },
  ];

  const withdrawals: WithdrawalRequest[] = [
    {
      id: 'wth_p01',
      userId: player2Id,
      username: 'VickySniper',
      amountPaise: 10000, // ₹100
      payoutUpiId: 'vicky@paytm',
      status: 'PENDING',
      createdAt: new Date(now - 15 * 60000).toISOString(),
    },
    {
      id: 'wth_init_01',
      userId: player1Id,
      username: 'RahulPro',
      amountPaise: 329000, // ₹3,290
      payoutUpiId: 'rahultripathi@oksbi',
      status: 'SUCCESSFUL',
      createdAt: new Date(now - 12 * 3600000).toISOString(),
      processedAt: new Date(now - 11 * 3600000).toISOString(),
      adminNotes: 'IMPS Ref: 419284019283 - Payout Confirmed',
      referenceNo: 'IMPS_419284019283',
    },
  ];

  const tickets: SupportTicket[] = [
    {
      id: 'tkt_001',
      userId: player1Id,
      username: 'RahulPro',
      category: 'ROOM_CREDS',
      subject: 'Clarification regarding room password slot assignment',
      status: 'RESOLVED',
      createdAt: new Date(now - 36 * 3600000).toISOString(),
      updatedAt: new Date(now - 35 * 3600000).toISOString(),
      messages: [
        {
          id: 'msg_1',
          sender: 'user',
          senderName: 'RahulPro',
          text: 'Hi support team, in BGMI squad matches do we have to sit in our assigned slot number only?',
          timestamp: new Date(now - 36 * 3600000).toISOString(),
        },
        {
          id: 'msg_2',
          sender: 'admin',
          senderName: 'BattleAdmin',
          text: 'Hello Rahul! Yes, you must strictly join your designated Slot #14. Sitting in another team slot will lead to a kick from custom room.',
          timestamp: new Date(now - 35 * 3600000).toISOString(),
        },
      ],
    },
  ];

  const notifications: NotificationItem[] = [
    {
      id: 'notif_01',
      userId: player1Id,
      title: '🚨 Room ID & Password Released!',
      message: 'Room details for BGMI Erangel Mega Championship #324 are now available. Room: 8392014, Pass: battle_squad_99',
      type: 'ROOM',
      read: false,
      createdAt: new Date(now - 5 * 60000).toISOString(),
      linkTab: 'matches',
    },
    {
      id: 'notif_02',
      userId: player1Id,
      title: '🏆 Tournament Registration Confirmed',
      message: 'You have joined BGMI Erangel Mega Championship #324 (Slot 14). ₹50 entry fee deducted.',
      type: 'MATCH',
      read: true,
      createdAt: new Date(now - 120 * 60000).toISOString(),
      linkTab: 'matches',
    },
    {
      id: 'notif_03',
      userId: 'ALL',
      title: '⚡ Weekend Mega Championship Announced',
      message: 'Join the weekend BGMI & Free Fire battles with over ₹50,000 guaranteed prize pools!',
      type: 'ANNOUNCEMENT',
      read: false,
      createdAt: new Date(now - 180 * 60000).toISOString(),
      linkTab: 'tournaments',
    },
  ];

  const announcements: Announcement[] = [
    {
      id: 'anc_1',
      title: '🔥 BGMI 3.2 Update & Anti-Cheat Protocol',
      content: 'All players must ensure they are on the official Play Store version. Emulators and iPad graphics modifiers are automatically flagged.',
      tag: 'HOT',
      date: 'Today',
    },
    {
      id: 'anc_2',
      title: '⚡ Instant UPI Withdrawals Live',
      content: 'Withdrawals are now processed within 15-30 minutes directly into your verified UPI ID with zero gateway deduction fee.',
      tag: 'UPDATE',
      date: 'Yesterday',
    },
  ];

  const auditLogs: AuditLog[] = [
    {
      id: 'aud_01',
      adminId: adminId,
      adminName: 'BattleAdmin',
      action: 'RELEASE_ROOM_DETAILS',
      details: 'Released room credentials for tour_bgmi_erangel_01 (Room 8392014)',
      targetId: 'tour_bgmi_erangel_01',
      timestamp: new Date(now - 5 * 60000).toISOString(),
    },
  ];

  return {
    users,
    sessions: {},
    tournaments,
    transactions,
    deposits,
    withdrawals,
    tickets,
    notifications,
    announcements,
    settings: defaultSettings,
    auditLogs,
  };
}

// Load DB from file or initialize
let db: DatabaseState;
try {
  if (fs.existsSync(DB_FILE)) {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    db = JSON.parse(raw);
    if (!db.settings) {
      db.settings = getInitialData().settings;
    }
    if (!db.settings.depositPresets || db.settings.depositPresets.length === 0) {
      db.settings.depositPresets = getInitialData().settings.depositPresets;
    }
    // Strictly enforce ₹10 to ₹2,000 deposit limits
    if (!db.settings.minDepositPaise || db.settings.minDepositPaise !== 1000) {
      db.settings.minDepositPaise = 1000;
    }
    if (!db.settings.maxDepositPaise || db.settings.maxDepositPaise !== 200000) {
      db.settings.maxDepositPaise = 200000;
    }
    if (!db.settings.merchantQrImageUrl) {
      db.settings.merchantQrImageUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi%3A%2F%2Fpay%3Fpa%3Dbattleesports.tournaments%40icici%26pn%3DBATTLE%2520ESPORTS%2520TOURNAMENTS%2520LTD%26cu%3DINR';
    }
    db.settings.upiConfigured = Boolean(db.settings.merchantUpiId && db.settings.merchantUpiId.includes('@'));
    saveDb();
  } else {
    db = getInitialData();
    saveDb();
  }
} catch {
  db = getInitialData();
  saveDb();
}

function saveDb() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist database state:', err);
  }
}

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Check and resolve ban state, automatically lifting expired temporary bans
function checkAndResolveUserBan(user: any): {
  isBanned: boolean;
  accountStatus: UserAccountStatus;
  banReason?: string;
  banExpiresAt?: string | null;
  banType?: BanType;
} {
  if (!user.isBanned) {
    if (user.accountStatus !== 'ACTIVE') {
      user.accountStatus = 'ACTIVE';
    }
    return { isBanned: false, accountStatus: 'ACTIVE' };
  }

  // User is marked as banned. Check if temporary ban has expired.
  if (user.banType === 'TEMPORARY' && user.banExpiresAt) {
    const expiryTime = new Date(user.banExpiresAt).getTime();
    if (!isNaN(expiryTime) && Date.now() >= expiryTime) {
      // Auto-lift expired temporary ban
      const prevStatus = user.accountStatus || 'TEMPORARILY_BANNED';
      user.isBanned = false;
      user.accountStatus = 'ACTIVE';
      user.banExpiresAt = null;

      db.auditLogs.unshift({
        id: 'aud_' + crypto.randomUUID().slice(0, 8),
        adminId: 'system',
        adminName: 'System (Auto-Expiry)',
        action: 'AUTO_UNBAN_EXPIRED',
        details: `Temporary suspension expired. Access automatically restored for user ${user.username} (${user.id})`,
        targetId: user.id,
        targetUsername: user.username,
        previousStatus: prevStatus,
        newStatus: 'ACTIVE',
        timestamp: new Date().toISOString(),
      });

      saveDb();
      return { isBanned: false, accountStatus: 'ACTIVE' };
    }
  }

  const status: UserAccountStatus = user.banType === 'TEMPORARY' ? 'TEMPORARILY_BANNED' : 'PERMANENTLY_BANNED';
  user.accountStatus = status;
  return {
    isBanned: true,
    accountStatus: status,
    banReason: user.banReason || 'Violation of platform fair play rules',
    banExpiresAt: user.banExpiresAt || null,
    banType: user.banType || 'PERMANENT',
  };
}

// Authentication & Ban Context Helper
function getAuthContext(req: Request): {
  user: UserProfile | null;
  isBanned: boolean;
  bannedUser?: any;
  banReason?: string;
  banExpiresAt?: string | null;
  banType?: BanType;
  accountStatus?: UserAccountStatus;
} {
  const authHeader = req.headers.authorization;
  if (!authHeader) return { user: null, isBanned: false };
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const userId = db.sessions[token];
  if (!userId) return { user: null, isBanned: false };

  const found = db.users.find((u) => u.id === userId);
  if (!found) return { user: null, isBanned: false };

  const banState = checkAndResolveUserBan(found);
  if (banState.isBanned) {
    return {
      user: null,
      bannedUser: found,
      isBanned: true,
      banReason: banState.banReason,
      banExpiresAt: banState.banExpiresAt,
      banType: banState.banType,
      accountStatus: banState.accountStatus,
    };
  }

  const { passwordHash: _, ...safeProfile } = found;
  return { user: safeProfile as UserProfile, isBanned: false, accountStatus: 'ACTIVE' };
}

function getAuthenticatedUser(req: Request): UserProfile | null {
  const ctx = getAuthContext(req);
  return ctx.user;
}

// Helper to strictly require an active, non-banned user on protected endpoints
function requireActiveUser(req: Request, res: Response): UserProfile | null {
  const ctx = getAuthContext(req);
  if (ctx.isBanned) {
    res.status(403).json({
      error: `Your account has been suspended. Reason: ${ctx.banReason || 'Violation of platform fair play rules'}. Contact Support if you believe this is a mistake.`,
      code: 'ACCOUNT_BANNED',
      banInfo: {
        status: ctx.accountStatus,
        reason: ctx.banReason,
        banType: ctx.banType,
        expiresAt: ctx.banExpiresAt,
      },
    });
    return null;
  }
  if (!ctx.user) {
    res.status(401).json({ error: 'Unauthorized or session expired' });
    return null;
  }
  return ctx.user;
}

// Mask sensitive room details for non-registered users
function sanitizeTournamentForUser(tournament: Tournament, requestingUser: UserProfile | null): Tournament {
  const isAdmin = requestingUser?.role === 'admin';
  const isRegistered = requestingUser ? tournament.registeredParticipants.some((p) => p.userId === requestingUser.id) : false;

  const clone: Tournament = JSON.parse(JSON.stringify(tournament));

  if (!isAdmin && (!isRegistered || !tournament.roomDetails.released)) {
    clone.roomDetails = {
      released: tournament.roomDetails.released,
      // Room credentials masked!
    };
  }
  return clone;
}

// ================= AUTH ROUTES =================
app.post('/api/auth/register', (req: Request, res: Response) => {
  const { username, email, phone, password, bgmiIgn, bgmiUid, freeFireIgn, freeFireUid } = req.body;

  if (!username || !username.trim()) {
    return res.status(400).json({ error: 'Username is required' });
  }
  if (username.trim().length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters long' });
  }

  if (!email || !email.trim()) {
    return res.status(400).json({ error: 'Email address is required' });
  }
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
    return res.status(400).json({ error: 'Please enter a valid email address' });
  }

  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  // Prevent duplicate accounts for existing email
  const existingEmail = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
  if (existingEmail) {
    return res.status(409).json({ error: 'An account with this email already exists. Please log in instead.' });
  }

  // Prevent duplicate accounts for existing username
  const existingUsername = db.users.find((u) => u.username.toLowerCase() === username.trim().toLowerCase());
  if (existingUsername) {
    return res.status(409).json({ error: 'This username is already taken. Please choose another username.' });
  }

  // Assign permanent unique User ID (never client-chosen)
  const newUserId = 'usr_' + crypto.randomUUID().slice(0, 8);
  const cleanUsername = username.trim();

  const newUser = {
    id: newUserId,
    username: cleanUsername,
    email: cleanEmail,
    phone: phone ? String(phone).trim() : '',
    role: 'user' as const, // Strictly user role; admin role cannot be self-assigned
    avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanUsername)}`,
    bgmiIgn: bgmiIgn ? String(bgmiIgn).trim() : '',
    bgmiUid: bgmiUid ? String(bgmiUid).trim() : '',
    freeFireIgn: freeFireIgn ? String(freeFireIgn).trim() : '',
    freeFireUid: freeFireUid ? String(freeFireUid).trim() : '',
    walletBalancePaise: 0,
    coins: 100, // Sign-up welcome bonus coins
    createdAt: new Date().toISOString(),
    passwordHash: hashPassword(password),
  };

  db.users.push(newUser);

  // Welcome notification
  db.notifications.unshift({
    id: 'notif_' + crypto.randomUUID().slice(0, 8),
    userId: newUserId,
    title: '🎉 Welcome to BATTLE ESPORTS!',
    message: `Account created successfully. Your permanent Gamer ID is ${newUserId}. 100 Bonus Battle Coins have been added to your wallet!`,
    type: 'WALLET',
    read: false,
    createdAt: new Date().toISOString(),
    linkTab: 'wallet',
  });

  const token = 'tok_' + crypto.randomBytes(24).toString('hex');
  db.sessions[token] = newUserId;
  saveDb();

  const { passwordHash: _, ...safeProfile } = newUser;
  return res.json({ token, user: safeProfile });
});

// ================= AUTH RATE LIMITING & TEMPORARY LOCKOUT =================
interface LoginAttemptTracker {
  failedAttempts: number;
  lockoutUntil: number;
  lastAttemptAt: number;
}

const loginAttemptMap = new Map<string, LoginAttemptTracker>();

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || '127.0.0.1';
}

function checkRateLimit(identifier: string, ip: string): { isLocked: boolean; remainingMinutes: number; retryAfterSeconds: number } {
  const now = Date.now();
  const idRecord = loginAttemptMap.get(`id:${identifier}`);
  const ipRecord = loginAttemptMap.get(`ip:${ip}`);

  const activeLockout = (idRecord && idRecord.lockoutUntil > now)
    ? idRecord.lockoutUntil
    : (ipRecord && ipRecord.lockoutUntil > now)
      ? ipRecord.lockoutUntil
      : null;

  if (activeLockout) {
    const diffMs = activeLockout - now;
    const remainingMinutes = Math.max(1, Math.ceil(diffMs / (60 * 1000)));
    const retryAfterSeconds = Math.max(1, Math.ceil(diffMs / 1000));
    return { isLocked: true, remainingMinutes, retryAfterSeconds };
  }

  return { isLocked: false, remainingMinutes: 0, retryAfterSeconds: 0 };
}

function recordFailedAttempt(identifier: string, ip: string): { failedCount: number; isNowLocked: boolean } {
  const now = Date.now();
  const idKey = `id:${identifier}`;
  const ipKey = `ip:${ip}`;

  const idRec = loginAttemptMap.get(idKey) || { failedAttempts: 0, lockoutUntil: 0, lastAttemptAt: 0 };
  idRec.failedAttempts += 1;
  idRec.lastAttemptAt = now;
  if (idRec.failedAttempts >= 5) {
    idRec.lockoutUntil = now + 5 * 60 * 1000; // 5 minute lockout
  }
  loginAttemptMap.set(idKey, idRec);

  const ipRec = loginAttemptMap.get(ipKey) || { failedAttempts: 0, lockoutUntil: 0, lastAttemptAt: 0 };
  ipRec.failedAttempts += 1;
  ipRec.lastAttemptAt = now;
  if (ipRec.failedAttempts >= 5) {
    ipRec.lockoutUntil = now + 5 * 60 * 1000; // 5 minute lockout
  }
  loginAttemptMap.set(ipKey, ipRec);

  return {
    failedCount: idRec.failedAttempts,
    isNowLocked: idRec.failedAttempts >= 5 || ipRec.failedAttempts >= 5,
  };
}

function clearLoginAttempts(identifier: string, ip: string) {
  loginAttemptMap.delete(`id:${identifier}`);
  loginAttemptMap.delete(`ip:${ip}`);
}

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, identifier, username, password } = req.body;
  const loginInput = String(email || identifier || username || '').trim().toLowerCase();
  const clientIp = getClientIp(req);

  if (!loginInput || !password) {
    return res.status(400).json({ error: 'Please enter your ID/email and password' });
  }

  // Rate Limiting & Temporary Lockout verification
  const rateLimitStatus = checkRateLimit(loginInput, clientIp);
  if (rateLimitStatus.isLocked) {
    const mins = rateLimitStatus.remainingMinutes;
    return res.status(429).json({
      error: `Too many failed login attempts. Please wait ${mins} minute${mins > 1 ? 's' : ''} before trying again.`,
      code: 'RATE_LIMITED',
      retryAfterSeconds: rateLimitStatus.retryAfterSeconds,
    });
  }

  // Find user by email, username, or permanent user ID (case-insensitive)
  const user = db.users.find(
    (u) =>
      u.email.toLowerCase() === loginInput ||
      u.username.toLowerCase() === loginInput ||
      u.id.toLowerCase() === loginInput
  );

  // Strong authentication: both non-existent users and incorrect passwords return identical error
  if (!user || user.passwordHash !== hashPassword(password)) {
    const { failedCount } = recordFailedAttempt(loginInput, clientIp);

    // Safely record failed attempt in db.auditLogs without storing plain text passwords
    if (db.auditLogs) {
      db.auditLogs.unshift({
        id: 'log_' + crypto.randomUUID().slice(0, 8),
        adminId: 'system',
        adminName: 'Security Gate',
        action: 'FAILED_LOGIN_ATTEMPT',
        targetId: loginInput,
        targetUsername: loginInput,
        details: `Failed authentication attempt (attempt #${failedCount}) from IP ${clientIp}.`,
        timestamp: new Date().toISOString(),
      });
      if (db.auditLogs.length > 500) db.auditLogs.length = 500;
      saveDb();
    }

    return res.status(401).json({ error: 'Invalid email/ID or password' });
  }

  const banInfo = checkAndResolveUserBan(user);
  if (banInfo.isBanned) {
    return res.status(403).json({
      error: `Your account has been suspended. Reason: ${banInfo.banReason || 'Violation of platform fair play rules'}. Contact Support if you believe this is a mistake.`,
      code: 'ACCOUNT_BANNED',
      banInfo: {
        status: banInfo.accountStatus,
        reason: banInfo.banReason,
        banType: banInfo.banType,
        expiresAt: banInfo.banExpiresAt,
      },
    });
  }

  // Reset failed attempt counters on successful authentication
  clearLoginAttempts(loginInput, clientIp);

  // Issue new session token without altering user profile or balance
  const token = 'tok_' + crypto.randomBytes(24).toString('hex');
  db.sessions[token] = user.id;
  saveDb();

  const { passwordHash: _, ...safeProfile } = user;
  return res.json({ token, user: safeProfile });
});

// Google Sign-In / OAuth linked flow
app.post('/api/auth/google', (req: Request, res: Response) => {
  const { email, name, avatar } = req.body;
  if (!email || !String(email).includes('@')) {
    return res.status(400).json({ error: 'Valid Google email is required' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  let user = db.users.find((u) => u.email.toLowerCase() === cleanEmail);

  if (!user) {
    // Register new Google-authenticated user with permanent User ID
    const newUserId = 'usr_g_' + crypto.randomUUID().slice(0, 8);
    const generatedUsername = name ? String(name).trim().replace(/\s+/g, '_') : cleanEmail.split('@')[0];
    
    // Ensure unique username
    let finalUsername = generatedUsername;
    let counter = 1;
    while (db.users.some((u) => u.username.toLowerCase() === finalUsername.toLowerCase())) {
      finalUsername = `${generatedUsername}_${counter++}`;
    }

    const newUser = {
      id: newUserId,
      username: finalUsername,
      email: cleanEmail,
      phone: '',
      role: 'user' as const,
      avatar: avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(finalUsername)}`,
      walletBalancePaise: 0,
      coins: 100,
      createdAt: new Date().toISOString(),
      passwordHash: hashPassword(crypto.randomBytes(16).toString('hex')), // random secure hash
    };

    db.users.push(newUser);
    user = newUser;
  }

  const banInfo = checkAndResolveUserBan(user);
  if (banInfo.isBanned) {
    return res.status(403).json({
      error: `Your account has been suspended. Reason: ${banInfo.banReason || 'Violation of platform fair play rules'}. Contact Support if you believe this is a mistake.`,
      code: 'ACCOUNT_BANNED',
      banInfo: {
        status: banInfo.accountStatus,
        reason: banInfo.banReason,
        banType: banInfo.banType,
        expiresAt: banInfo.banExpiresAt,
      },
    });
  }

  const token = 'tok_' + crypto.randomBytes(24).toString('hex');
  db.sessions[token] = user.id;
  saveDb();

  const { passwordHash: _, ...safeProfile } = user;
  return res.json({ token, user: safeProfile });
});

app.get('/api/auth/me', (req: Request, res: Response) => {
  const ctx = getAuthContext(req);
  if (ctx.isBanned) {
    return res.status(403).json({
      error: `Your account has been suspended. Reason: ${ctx.banReason || 'Violation of platform fair play rules'}. Contact Support if you believe this is a mistake.`,
      code: 'ACCOUNT_BANNED',
      banInfo: {
        status: ctx.accountStatus,
        reason: ctx.banReason,
        banType: ctx.banType,
        expiresAt: ctx.banExpiresAt,
      },
    });
  }
  if (!ctx.user) {
    return res.status(401).json({ error: 'Unauthorized or session expired' });
  }
  return res.json({ user: ctx.user });
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    delete db.sessions[token];
    saveDb();
  }
  return res.json({ success: true });
});

app.post('/api/auth/change-password', (req: Request, res: Response) => {
  const user = requireActiveUser(req, res);
  if (!user) return;

  const { oldPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  const dbUser = db.users.find((u) => u.id === user.id);
  if (!dbUser || dbUser.passwordHash !== hashPassword(oldPassword)) {
    return res.status(400).json({ error: 'Incorrect existing password' });
  }

  dbUser.passwordHash = hashPassword(newPassword);
  saveDb();
  return res.json({ success: true, message: 'Password updated successfully' });
});

app.post('/api/auth/forgot-password', (req: Request, res: Response) => {
  const { email } = req.body;
  // Generic safe response to prevent user enumeration
  return res.json({
    success: true,
    message: `If an account exists for ${email}, a secure password reset link has been dispatched to their email address.`,
  });
});

app.put('/api/auth/profile', (req: Request, res: Response) => {
  const user = requireActiveUser(req, res);
  if (!user) return;

  const { bgmiIgn, bgmiUid, freeFireIgn, freeFireUid, upiId, phone } = req.body;
  const dbUser = db.users.find((u) => u.id === user.id);
  if (!dbUser) return res.status(404).json({ error: 'User not found' });

  if (bgmiIgn !== undefined) dbUser.bgmiIgn = bgmiIgn;
  if (bgmiUid !== undefined) dbUser.bgmiUid = bgmiUid;
  if (freeFireIgn !== undefined) dbUser.freeFireIgn = freeFireIgn;
  if (freeFireUid !== undefined) dbUser.freeFireUid = freeFireUid;
  if (upiId !== undefined) dbUser.upiId = upiId;
  if (phone !== undefined) dbUser.phone = phone;

  saveDb();
  const { passwordHash: _, ...safeProfile } = dbUser;
  return res.json({ user: safeProfile });
});

// ================= TOURNAMENTS =================
app.get('/api/tournaments', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  const { game, status, search } = req.query;

  let list = db.tournaments;

  if (game && game !== 'ALL') {
    list = list.filter((t) => t.game === game);
  }
  if (status && status !== 'ALL') {
    list = list.filter((t) => t.status === status);
  }
  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    list = list.filter((t) => t.title.toLowerCase().includes(q) || t.map.toLowerCase().includes(q));
  }

  const sanitized = list.map((t) => sanitizeTournamentForUser(t, user));
  return res.json({ tournaments: sanitized });
});

app.get('/api/tournaments/:id', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  const tournament = db.tournaments.find((t) => t.id === req.params.id);
  if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

  return res.json({ tournament: sanitizeTournamentForUser(tournament, user) });
});

// Join Tournament (Atomic Ledger Transaction)
app.post('/api/tournaments/:id/join', (req: Request, res: Response) => {
  const user = requireActiveUser(req, res);
  if (!user) return;

  const { gameIgn, gameUid } = req.body;
  if (!gameIgn || !gameUid) {
    return res.status(400).json({ error: 'In-Game Name (IGN) and Player UID are required' });
  }

  const tournament = db.tournaments.find((t) => t.id === req.params.id);
  if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

  if (tournament.status !== 'UPCOMING') {
    return res.status(400).json({ error: `Cannot join tournament in ${tournament.status} state` });
  }

  if (new Date(tournament.registrationDeadline).getTime() < Date.now()) {
    return res.status(400).json({ error: 'Registration deadline has passed' });
  }

  if (tournament.registeredParticipants.length >= tournament.totalSlots) {
    return res.status(400).json({ error: 'Tournament slots are completely full' });
  }

  const alreadyJoined = tournament.registeredParticipants.some((p) => p.userId === user.id);
  if (alreadyJoined) {
    return res.status(400).json({ error: 'You are already registered for this tournament' });
  }

  const dbUser = db.users.find((u) => u.id === user.id);
  if (!dbUser) return res.status(404).json({ error: 'User record not found' });

  const fee = tournament.entryFeePaise;
  if (dbUser.walletBalancePaise < fee) {
    return res.status(400).json({
      error: `Insufficient balance. Required: ₹${(fee / 100).toFixed(2)}, Available: ₹${(dbUser.walletBalancePaise / 100).toFixed(2)}. Please add cash to your wallet.`,
    });
  }

  // ATOMIC DEDUCTION
  dbUser.walletBalancePaise -= fee;

  const assignedSlot = tournament.registeredParticipants.length + 1;
  const participant = {
    userId: user.id,
    username: user.username,
    gameIgn: gameIgn.trim(),
    gameUid: gameUid.trim(),
    slotNo: assignedSlot,
    joinedAt: new Date().toISOString(),
  };

  tournament.registeredParticipants.push(participant);

  // Create Ledger Transaction
  const tx: WalletTransaction = {
    id: 'tx_join_' + crypto.randomUUID().slice(0, 8),
    userId: user.id,
    type: 'ENTRY_FEE',
    amountPaise: -fee,
    balanceAfterPaise: dbUser.walletBalancePaise,
    status: 'COMPLETED',
    description: `Joined ${tournament.title} (Slot #${assignedSlot})`,
    referenceId: tournament.id,
    idempotencyKey: `join_${tournament.id}_${user.id}`,
    createdAt: new Date().toISOString(),
  };
  db.transactions.unshift(tx);

  // Send Notification
  const notif: NotificationItem = {
    id: 'notif_' + crypto.randomUUID().slice(0, 8),
    userId: user.id,
    title: '🎮 Tournament Registration Successful!',
    message: `You successfully joined ${tournament.title}. Slot #${assignedSlot} assigned.`,
    type: 'MATCH',
    read: false,
    createdAt: new Date().toISOString(),
    linkTab: 'matches',
  };
  db.notifications.unshift(notif);

  saveDb();

  return res.json({
    success: true,
    message: `Registered successfully for Slot #${assignedSlot}`,
    slotNo: assignedSlot,
    tournament: sanitizeTournamentForUser(tournament, user),
    walletBalancePaise: dbUser.walletBalancePaise,
  });
});

// ================= WALLET & TRANSACTIONS =================
app.get('/api/wallet/summary', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const dbUser = db.users.find((u) => u.id === user.id);
  if (!dbUser) return res.status(404).json({ error: 'User not found' });

  const userTransactions = db.transactions.filter((t) => t.userId === user.id);
  const userDeposits = db.deposits.filter((d) => d.userId === user.id);
  const userWithdrawals = db.withdrawals.filter((w) => w.userId === user.id);

  return res.json({
    walletBalancePaise: dbUser.walletBalancePaise,
    coins: dbUser.coins,
    transactions: userTransactions,
    deposits: userDeposits,
    withdrawals: userWithdrawals,
  });
});

// Create Deposit Order
app.post('/api/wallet/deposit/create', async (req: Request, res: Response) => {
  const user = requireActiveUser(req, res);
  if (!user) return;

  const { amountPaise, utr, paymentMethod } = req.body;
  const numAmount = Number(amountPaise);

  if (!db.settings.merchantUpiId || !isValidUpiVpa(db.settings.merchantUpiId)) {
    return res.status(400).json({
      error: 'Merchant UPI ID is not configured yet by tournament administrators. Please contact support.',
    });
  }

  const minPaise = Math.max(1000, db.settings.minDepositPaise || 1000);
  const maxPaise = Math.min(200000, db.settings.maxDepositPaise || 200000);

  if (isNaN(numAmount) || numAmount < minPaise || numAmount > maxPaise) {
    return res.status(400).json({
      error: `Deposit amount must be between ₹${Math.round(minPaise / 100)} and ₹${Math.round(maxPaise / 100).toLocaleString('en-IN')}`,
    });
  }

  const orderId = 'ORD_' + Date.now().toString(36).toUpperCase() + '_' + crypto.randomUUID().slice(0, 4).toUpperCase();
  const upiPayload = buildServerUpiUri(
    db.settings.merchantUpiId,
    db.settings.merchantName,
    numAmount,
    'Deposit_' + orderId
  );

  let dynamicQrDataUrl = '';
  try {
    dynamicQrDataUrl = await generateServerUpiQr(upiPayload);
  } catch (err) {
    console.error('Failed generating dynamic QR:', err);
  }

  const deposit: DepositOrder = {
    id: 'dep_' + crypto.randomUUID().slice(0, 8),
    userId: user.id,
    username: user.username,
    amountPaise: numAmount,
    currency: 'INR',
    paymentMethod: paymentMethod || 'UPI',
    status: 'PENDING',
    providerRef: orderId,
    utr: utr ? String(utr).trim() : undefined,
    qrPayload: upiPayload,
    merchantUpiId: db.settings.merchantUpiId,
    merchantQrImageUrl: dynamicQrDataUrl || db.settings.merchantQrImageUrl,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 120 * 1000).toISOString(),
    verificationNotes: utr ? `Submitted UTR: ${utr}. Awaiting verification.` : 'Payment initiated via official merchant UPI QR (2-Min Session)',
  };

  db.deposits.unshift(deposit);
  saveDb();

  return res.json({
    success: true,
    deposit,
    merchantUpiId: db.settings.merchantUpiId,
    merchantName: db.settings.merchantName,
    merchantQrImageUrl: dynamicQrDataUrl || db.settings.merchantQrImageUrl,
    dynamicQrDataUrl,
    upiPayload,
  });
});

// Submit UTR for an existing pending deposit request
app.post('/api/wallet/deposit/:id/utr', (req: Request, res: Response) => {
  const user = requireActiveUser(req, res);
  if (!user) return;

  const { utr } = req.body;
  const cleanUtr = String(utr || '').trim();
  if (!cleanUtr || cleanUtr.length < 6) {
    return res.status(400).json({ error: 'Valid 12-digit UPI UTR reference number is required' });
  }

  const deposit = db.deposits.find((d) => d.id === req.params.id && d.userId === user.id);
  if (!deposit) return res.status(404).json({ error: 'Deposit request not found' });

  if (deposit.status === 'SUCCESSFUL') {
    return res.status(400).json({ error: 'Deposit has already been verified and credited to wallet' });
  }

  deposit.utr = cleanUtr;
  deposit.status = 'PENDING';
  deposit.updatedAt = new Date().toISOString();
  deposit.verificationNotes = `Submitted UTR: ${cleanUtr}. Awaiting verification.`;
  saveDb();

  return res.json({ success: true, deposit });
});

// Expire an unpaid deposit session when timer ends
app.post('/api/wallet/deposit/:id/expire', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const deposit = db.deposits.find((d) => d.id === req.params.id && d.userId === user.id);
  if (!deposit) return res.status(404).json({ error: 'Deposit request not found' });

  // Only expire if it is still pending and has no submitted UTR
  if (deposit.status === 'PENDING' && !deposit.utr) {
    deposit.status = 'EXPIRED';
    deposit.updatedAt = new Date().toISOString();
    deposit.verificationNotes = 'Payment session expired after 2 minutes countdown timer';
    saveDb();
  }

  return res.json({ success: true, deposit });
});

// Simulated Instant Gateway Webhook / Fast Verification
app.post(['/api/wallet/deposit/verify-test', '/api/wallet/deposit/:id/test-verify'], (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const depositId = req.params.id || req.body.depositId;
  const deposit = db.deposits.find((d) => d.id === depositId && d.userId === user.id);
  if (!deposit) return res.status(404).json({ error: 'Deposit request not found' });

  if (deposit.status !== 'PENDING') {
    return res.status(400).json({ error: `Deposit is already marked as ${deposit.status}` });
  }

  const dbUser = db.users.find((u) => u.id === user.id);
  if (!dbUser) return res.status(404).json({ error: 'User not found' });

  // Update status atomically
  deposit.status = 'SUCCESSFUL';
  deposit.updatedAt = new Date().toISOString();
  deposit.verificationNotes = 'Instantly verified via Mock UPI Payment Gateway Callback';

  dbUser.walletBalancePaise += deposit.amountPaise;

  // Add ledger transaction
  const tx: WalletTransaction = {
    id: 'tx_dep_' + crypto.randomUUID().slice(0, 8),
    userId: user.id,
    type: 'DEPOSIT',
    amountPaise: deposit.amountPaise,
    balanceAfterPaise: dbUser.walletBalancePaise,
    status: 'COMPLETED',
    description: `Deposit via UPI (Ref: ${deposit.providerRef})`,
    referenceId: deposit.id,
    idempotencyKey: `dep_credit_${deposit.id}`,
    createdAt: new Date().toISOString(),
  };
  db.transactions.unshift(tx);

  // Send Notification
  db.notifications.unshift({
    id: 'notif_' + crypto.randomUUID().slice(0, 8),
    userId: user.id,
    title: '💰 Deposit Verified Successfully!',
    message: `₹${(deposit.amountPaise / 100).toFixed(2)} has been added to your wallet balance.`,
    type: 'WALLET',
    read: false,
    createdAt: new Date().toISOString(),
    linkTab: 'wallet',
  });

  saveDb();

  return res.json({
    success: true,
    message: 'Deposit confirmed and wallet balance updated',
    deposit,
    walletBalancePaise: dbUser.walletBalancePaise,
  });
});

// Request Withdrawal
app.post(['/api/wallet/withdraw', '/api/wallet/withdraw/request'], (req: Request, res: Response) => {
  const user = requireActiveUser(req, res);
  if (!user) return;

  const amountPaise = req.body.amountPaise;
  const payoutUpiId = String(req.body.payoutUpiId || req.body.upiId || '').trim();
  const numAmount = Number(amountPaise);

  if (!payoutUpiId || !payoutUpiId.includes('@')) {
    return res.status(400).json({ error: 'Please enter a valid UPI ID (e.g. yourname@okaxis)' });
  }

  if (isNaN(numAmount) || numAmount < db.settings.minWithdrawalPaise || numAmount > db.settings.maxWithdrawalPaise) {
    return res.status(400).json({
      error: `Withdrawal amount must be between ₹${(db.settings.minWithdrawalPaise / 100).toFixed(0)} and ₹${(db.settings.maxWithdrawalPaise / 100).toFixed(0)}`,
    });
  }

  const dbUser = db.users.find((u) => u.id === user.id);
  if (!dbUser) return res.status(404).json({ error: 'User record not found' });

  if (dbUser.walletBalancePaise < numAmount) {
    return res.status(400).json({
      error: `Insufficient balance. Available: ₹${(dbUser.walletBalancePaise / 100).toFixed(2)}, Requested: ₹${(numAmount / 100).toFixed(2)}`,
    });
  }

  // ATOMIC RESERVATION/DEDUCTION
  dbUser.walletBalancePaise -= numAmount;
  dbUser.upiId = payoutUpiId; // update saved UPI ID

  const withdrawalId = 'wth_' + crypto.randomUUID().slice(0, 8);
  const withdrawal: WithdrawalRequest = {
    id: withdrawalId,
    userId: user.id,
    username: user.username,
    amountPaise: numAmount,
    payoutUpiId: payoutUpiId.trim(),
    status: 'PENDING',
    createdAt: new Date().toISOString(),
  };
  db.withdrawals.unshift(withdrawal);

  // Add ledger entry
  const tx: WalletTransaction = {
    id: 'tx_wth_' + crypto.randomUUID().slice(0, 8),
    userId: user.id,
    type: 'WITHDRAWAL',
    amountPaise: -numAmount,
    balanceAfterPaise: dbUser.walletBalancePaise,
    status: 'PENDING',
    description: `Withdrawal request to ${payoutUpiId}`,
    referenceId: withdrawalId,
    createdAt: new Date().toISOString(),
  };
  db.transactions.unshift(tx);

  // Notification
  db.notifications.unshift({
    id: 'notif_' + crypto.randomUUID().slice(0, 8),
    userId: user.id,
    title: '📤 Withdrawal Request Received',
    message: `Your request to withdraw ₹${(numAmount / 100).toFixed(2)} to ${payoutUpiId} is under review.`,
    type: 'WALLET',
    read: false,
    createdAt: new Date().toISOString(),
    linkTab: 'wallet',
  });

  saveDb();

  return res.json({
    success: true,
    message: 'Withdrawal request created. Processing in queue.',
    withdrawal,
    walletBalancePaise: dbUser.walletBalancePaise,
  });
});

// ================= CUSTOMER SUPPORT =================
app.get('/api/support/tickets', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const tickets = db.tickets.filter((t) => t.userId === user.id);
  return res.json({ tickets });
});

app.post('/api/support/tickets', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { category, subject, message } = req.body;
  if (!subject || !message) {
    return res.status(400).json({ error: 'Subject and message are required' });
  }

  const newTicket: SupportTicket = {
    id: 'tkt_' + crypto.randomUUID().slice(0, 8),
    userId: user.id,
    username: user.username,
    category: category || 'OTHER',
    subject: subject.trim(),
    status: 'OPEN',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [
      {
        id: 'msg_' + crypto.randomUUID().slice(0, 6),
        sender: 'user',
        senderName: user.username,
        text: message.trim(),
        timestamp: new Date().toISOString(),
      },
    ],
  };

  db.tickets.unshift(newTicket);
  saveDb();

  return res.json({ success: true, ticket: newTicket });
});

app.post('/api/support/tickets/:id/message', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { text } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'Message cannot be empty' });

  const ticket = db.tickets.find((t) => t.id === req.params.id && (t.userId === user.id || user.role === 'admin'));
  if (!ticket) return res.status(404).json({ error: 'Ticket not found or permission denied' });

  const senderRole = user.role === 'admin' ? 'admin' : 'user';
  ticket.messages.push({
    id: 'msg_' + crypto.randomUUID().slice(0, 6),
    sender: senderRole,
    senderName: user.username,
    text: text.trim(),
    timestamp: new Date().toISOString(),
  });
  ticket.updatedAt = new Date().toISOString();

  if (senderRole === 'admin') {
    ticket.status = 'IN_PROGRESS';
    // Notify the user
    db.notifications.unshift({
      id: 'notif_' + crypto.randomUUID().slice(0, 8),
      userId: ticket.userId,
      title: '💬 Support Ticket Reply',
      message: `Admin replied to your ticket: "${ticket.subject}"`,
      type: 'ANNOUNCEMENT',
      read: false,
      createdAt: new Date().toISOString(),
      linkTab: 'profile',
    });
  }

  saveDb();
  return res.json({ success: true, ticket });
});

// ================= PUSH NOTIFICATION ENGINE =================
const defaultNotificationSettings: UserNotificationSettings = {
  pushEnabled: true,
  notifyRoomDetails: true,
  notifyWithdrawalUpdates: true,
  notifyTournamentStart: true,
  soundEnabled: true,
  vibrateEnabled: true,
};

function getUserNotificationSettings(user: any): UserNotificationSettings {
  if (!user || !user.notificationSettings) {
    return { ...defaultNotificationSettings };
  }
  return {
    pushEnabled: user.notificationSettings.pushEnabled ?? defaultNotificationSettings.pushEnabled,
    notifyRoomDetails: user.notificationSettings.notifyRoomDetails ?? defaultNotificationSettings.notifyRoomDetails,
    notifyWithdrawalUpdates: user.notificationSettings.notifyWithdrawalUpdates ?? defaultNotificationSettings.notifyWithdrawalUpdates,
    notifyTournamentStart: user.notificationSettings.notifyTournamentStart ?? defaultNotificationSettings.notifyTournamentStart,
    soundEnabled: user.notificationSettings.soundEnabled ?? defaultNotificationSettings.soundEnabled,
    vibrateEnabled: user.notificationSettings.vibrateEnabled ?? defaultNotificationSettings.vibrateEnabled,
  };
}

/**
 * Dispatches a notification securely, checking user notification preferences.
 * If user has opted out of this alert channel or push notifications, push flag is disabled.
 */
function dispatchNotificationToUser(
  userId: string,
  data: {
    title: string;
    message: string;
    type: 'ROOM' | 'WALLET' | 'MATCH' | 'ANNOUNCEMENT';
    linkTab?: string;
    referenceId?: string;
    metadata?: Record<string, any>;
  }
): { success: boolean; pushed: boolean; notification: NotificationItem | null; reason?: string } {
  const targetUser = db.users.find((u) => u.id === userId);
  if (!targetUser) {
    return { success: false, pushed: false, notification: null, reason: 'Target user not found' };
  }

  const settings = getUserNotificationSettings(targetUser);

  // Check channel permissions
  let allowed = true;
  if (!settings.pushEnabled) {
    allowed = false;
  } else if (data.type === 'ROOM' && !settings.notifyRoomDetails) {
    allowed = false;
  } else if (data.type === 'WALLET' && !settings.notifyWithdrawalUpdates) {
    allowed = false;
  } else if (data.type === 'MATCH' && !settings.notifyTournamentStart) {
    allowed = false;
  }

  // Generate in-app notification item with channel metadata
  const notif: NotificationItem = {
    id: 'notif_' + crypto.randomUUID().slice(0, 8),
    userId: targetUser.id,
    title: data.title,
    message: data.message,
    type: data.type,
    read: false,
    createdAt: new Date().toISOString(),
    linkTab: data.linkTab || 'home',
    referenceId: data.referenceId,
    metadata: {
      ...data.metadata,
      pushDispatched: allowed,
      soundEnabled: settings.soundEnabled,
      vibrateEnabled: settings.vibrateEnabled,
    },
  };

  db.notifications.unshift(notif);
  if (db.notifications.length > 500) {
    db.notifications.length = 500;
  }
  saveDb();

  return { success: true, pushed: allowed, notification: notif };
}

/**
 * Automated Background Service: Checks upcoming tournaments and alerts joined users
 * 15 minutes before the match start time. Respects user notification preferences.
 */
function checkUpcomingTournamentStartAlerts() {
  const now = Date.now();
  const fifteenMinutesMs = 15 * 60 * 1000;

  for (const tour of db.tournaments) {
    if (tour.status !== 'UPCOMING') continue;
    const matchTimeMs = new Date(tour.matchTime).getTime();
    const diff = matchTimeMs - now;

    // Trigger alert if match starts in <= 15 minutes and hasn't started yet (or within 2 min grace)
    if (diff > -2 * 60 * 1000 && diff <= fifteenMinutesMs) {
      const minsLeft = Math.max(1, Math.round(diff / 60000));

      for (const part of tour.registeredParticipants) {
        // Prevent duplicate alerts for the same tournament match start
        const alreadyNotified = db.notifications.some(
          (n) => n.userId === part.userId && n.type === 'MATCH' && n.referenceId === tour.id
        );
        if (alreadyNotified) continue;

        dispatchNotificationToUser(part.userId, {
          title: `⏰ Match Starting in ${minsLeft}m: ${tour.title}`,
          message: `Your ${tour.game} match is scheduled to begin in ~${minsLeft} minutes. Open My Matches to check room credentials!`,
          type: 'MATCH',
          linkTab: 'matches',
          referenceId: tour.id,
          metadata: { tournamentId: tour.id, matchTime: tour.matchTime },
        });
      }
    }
  }
}

// Check every 30 seconds
setInterval(checkUpcomingTournamentStartAlerts, 30000);

// ================= NOTIFICATIONS ROUTES =================
app.get('/api/notifications', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const userNotifs = db.notifications.filter((n) => n.userId === 'ALL' || n.userId === user.id);
  return res.json({ notifications: userNotifs });
});

app.post('/api/notifications/:id/read', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const notif = db.notifications.find((n) => n.id === req.params.id);
  if (notif) {
    notif.read = true;
    saveDb();
  }
  return res.json({ success: true });
});

// User Notification Settings (GET & POST)
app.get('/api/user/notification-settings', (req: Request, res: Response) => {
  const user = requireActiveUser(req, res);
  if (!user) return;

  const dbUser = db.users.find((u) => u.id === user.id);
  const settings = getUserNotificationSettings(dbUser || user);
  return res.json({ settings });
});

app.post('/api/user/notification-settings', (req: Request, res: Response) => {
  const user = requireActiveUser(req, res);
  if (!user) return;

  const dbUser = db.users.find((u) => u.id === user.id);
  if (!dbUser) return res.status(404).json({ error: 'User not found' });

  const current = getUserNotificationSettings(dbUser);
  const {
    pushEnabled,
    notifyRoomDetails,
    notifyWithdrawalUpdates,
    notifyTournamentStart,
    soundEnabled,
    vibrateEnabled,
  } = req.body;

  dbUser.notificationSettings = {
    pushEnabled: typeof pushEnabled === 'boolean' ? pushEnabled : current.pushEnabled,
    notifyRoomDetails: typeof notifyRoomDetails === 'boolean' ? notifyRoomDetails : current.notifyRoomDetails,
    notifyWithdrawalUpdates: typeof notifyWithdrawalUpdates === 'boolean' ? notifyWithdrawalUpdates : current.notifyWithdrawalUpdates,
    notifyTournamentStart: typeof notifyTournamentStart === 'boolean' ? notifyTournamentStart : current.notifyTournamentStart,
    soundEnabled: typeof soundEnabled === 'boolean' ? soundEnabled : current.soundEnabled,
    vibrateEnabled: typeof vibrateEnabled === 'boolean' ? vibrateEnabled : current.vibrateEnabled,
  };

  saveDb();
  return res.json({
    success: true,
    message: 'Notification settings updated successfully',
    settings: dbUser.notificationSettings,
  });
});

// Push Subscription Registration
app.post('/api/user/push-subscription', (req: Request, res: Response) => {
  const user = requireActiveUser(req, res);
  if (!user) return;

  const dbUser = db.users.find((u) => u.id === user.id);
  if (!dbUser) return res.status(404).json({ error: 'User not found' });

  const { subscription, deviceInfo } = req.body;
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Valid subscription object is required' });
  }

  if (!dbUser.pushSubscriptions) dbUser.pushSubscriptions = [];
  const existingIdx = dbUser.pushSubscriptions.findIndex((s) => s.endpoint === subscription.endpoint);
  const subData: PushSubscriptionData = {
    endpoint: subscription.endpoint,
    keys: subscription.keys,
    deviceInfo: deviceInfo || (req.headers['user-agent']?.slice(0, 80) ?? 'Mobile Web Device'),
    createdAt: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    dbUser.pushSubscriptions[existingIdx] = subData;
  } else {
    dbUser.pushSubscriptions.push(subData);
  }

  saveDb();
  return res.json({ success: true, message: 'Push subscription registered successfully' });
});

// User Test Push Alert
app.post('/api/user/test-push', (req: Request, res: Response) => {
  const user = requireActiveUser(req, res);
  if (!user) return;

  const result = dispatchNotificationToUser(user.id, {
    title: '🔔 Push Alert Test: BATTLE ESPORTS',
    message: 'Your mobile push alerts are configured and working! Room credentials, tournament countdowns, and payout updates will alert you instantly.',
    type: 'MATCH',
    linkTab: 'matches',
    referenceId: 'test_alert',
  });

  return res.json({
    success: true,
    pushed: result.pushed,
    message: result.pushed
      ? 'Test push notification dispatched to your device!'
      : 'Test notification recorded, but push alerts are currently disabled in your settings.',
    notification: result.notification,
  });
});

// Announcements & Settings (Public)
app.get('/api/announcements', (_req: Request, res: Response) => {
  return res.json({ announcements: db.announcements, notice: db.settings.announcementNotice });
});

app.get('/api/settings', (_req: Request, res: Response) => {
  const {
    merchantUpiId,
    merchantName,
    merchantQrImageUrl,
    minDepositPaise,
    maxDepositPaise,
    minWithdrawalPaise,
    maxWithdrawalPaise,
    supportEmail,
    supportPhone,
    announcementNotice,
    gatewayEnabled,
  } = db.settings;
  const isUpiValid = Boolean(merchantUpiId && merchantUpiId.trim().includes('@'));
  return res.json({
    settings: {
      merchantUpiId: merchantUpiId || '',
      merchantName: merchantName || '',
      merchantQrImageUrl: merchantQrImageUrl || '',
      upiConfigured: isUpiValid,
      minDepositPaise,
      maxDepositPaise,
      depositPresets: db.settings.depositPresets || [],
      minWithdrawalPaise,
      maxWithdrawalPaise,
      supportEmail,
      supportPhone,
      announcementNotice,
      gatewayEnabled,
    },
  });
});

// ================= ADMIN ROUTES =================
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required' });
  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: Admin privileges required' });
  }
  (req as any).adminUser = user;
  next();
}

app.get('/api/admin/overview', requireAdmin, (_req: Request, res: Response) => {
  const totalUsers = db.users.filter((u) => u.role === 'user').length;
  const activeTournaments = db.tournaments.filter((t) => t.status === 'UPCOMING' || t.status === 'LIVE').length;
  const pendingDepositsCount = db.deposits.filter((d) => d.status === 'PENDING').length;
  const pendingWithdrawalsCount = db.withdrawals.filter((w) => w.status === 'PENDING').length;
  const openTicketsCount = db.tickets.filter((t) => t.status === 'OPEN').length;

  const totalPrizePaidPaise = db.transactions
    .filter((t) => t.type === 'PRIZE' && t.status === 'COMPLETED')
    .reduce((sum, t) => sum + t.amountPaise, 0);

  const totalDepositsPaise = db.deposits
    .filter((d) => d.status === 'SUCCESSFUL')
    .reduce((sum, d) => sum + d.amountPaise, 0);

  return res.json({
    totalUsers,
    activeTournaments,
    pendingDepositsCount,
    pendingWithdrawalsCount,
    openTicketsCount,
    totalPrizePaidPaise,
    totalDepositsPaise,
    totalTournamentsCount: db.tournaments.length,
    recentAuditLogs: db.auditLogs.slice(0, 10),
  });
});

// Admin Tournaments CRUD
app.post('/api/admin/tournaments', requireAdmin, (req: Request, res: Response) => {
  const admin = (req as any).adminUser as UserProfile;
  const { title, game, mode, map, banner, entryFeePaise, prizePoolPaise, prizeBreakdown, matchTime, registrationDeadline, totalSlots, rules, eligibility } = req.body;

  if (!title || !game || !mode || !matchTime || !totalSlots) {
    return res.status(400).json({ error: 'Missing required tournament fields' });
  }

  const newTour: Tournament = {
    id: 'tour_' + crypto.randomUUID().slice(0, 8),
    title: title.trim(),
    game,
    mode,
    map: map || 'Erangel',
    banner: banner || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80',
    entryFeePaise: Number(entryFeePaise) || 0,
    prizePoolPaise: Number(prizePoolPaise) || 0,
    prizeBreakdown: prizeBreakdown || {
      rank1: Math.round((Number(prizePoolPaise) || 0) * 0.5),
      rank2: Math.round((Number(prizePoolPaise) || 0) * 0.3),
      rank3: Math.round((Number(prizePoolPaise) || 0) * 0.2),
      perKill: 1500,
    },
    matchTime: new Date(matchTime).toISOString(),
    registrationDeadline: new Date(registrationDeadline || matchTime).toISOString(),
    totalSlots: Number(totalSlots) || 100,
    registeredParticipants: [],
    status: 'UPCOMING',
    rules: Array.isArray(rules) ? rules : ['Standard competitive esports rules apply.'],
    eligibility: eligibility || 'Open to all registered players',
    supportContact: 'support@battleesports.com',
    roomDetails: { released: false },
  };

  db.tournaments.unshift(newTour);

  db.auditLogs.unshift({
    id: 'aud_' + crypto.randomUUID().slice(0, 8),
    adminId: admin.id,
    adminName: admin.username,
    action: 'CREATE_TOURNAMENT',
    details: `Created tournament: ${newTour.title}`,
    targetId: newTour.id,
    timestamp: new Date().toISOString(),
  });

  saveDb();
  return res.json({ success: true, tournament: newTour });
});

// Admin Add / Edit / Release Room Details
const handleAdminRoomDetails = (req: Request, res: Response) => {
  const admin = (req as any).adminUser as UserProfile;
  const { roomId, roomPassword, publishNow } = req.body;
  if (!roomId || !roomPassword) {
    return res.status(400).json({ error: 'Room ID and Room Password are required' });
  }

  const cleanRoomId = String(roomId).trim();
  const cleanRoomPass = String(roomPassword).trim();

  if (!cleanRoomId || !cleanRoomPass) {
    return res.status(400).json({ error: 'Room ID and Room Password cannot be empty' });
  }

  const tour = db.tournaments.find((t) => t.id === req.params.id);
  if (!tour) return res.status(404).json({ error: 'Tournament not found' });

  // If saving as draft without publishing to players
  if (publishNow === false) {
    tour.roomDetails = {
      released: false,
      roomId: cleanRoomId,
      roomPassword: cleanRoomPass,
      updatedAt: new Date().toISOString(),
    };

    db.auditLogs.unshift({
      id: 'aud_' + crypto.randomUUID().slice(0, 8),
      adminId: admin.id,
      adminName: admin.username,
      action: 'SAVE_DRAFT_ROOM_DETAILS',
      details: `Saved draft room credentials for ${tour.title} (Room ID: ${cleanRoomId}) without publishing`,
      targetId: tour.id,
      timestamp: new Date().toISOString(),
    });

    saveDb();
    return res.json({
      success: true,
      tournament: tour,
      published: false,
      message: 'Room details saved as draft. Participants will not see credentials until you publish them.',
    });
  }

  // Check if identical credentials were ALREADY published (prevent duplicate notification spam)
  const isAlreadyPublishedSame =
    tour.roomDetails.released === true &&
    tour.roomDetails.roomId === cleanRoomId &&
    tour.roomDetails.roomPassword === cleanRoomPass;

  if (isAlreadyPublishedSame) {
    return res.json({
      success: true,
      tournament: tour,
      alreadyPublished: true,
      notifiedCount: 0,
      message: 'Room details are already published with these exact credentials. No duplicate notifications sent.',
    });
  }

  const isUpdate = tour.roomDetails.released === true;

  tour.roomDetails = {
    released: true,
    roomId: cleanRoomId,
    roomPassword: cleanRoomPass,
    releasedAt: tour.roomDetails.releasedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Only notify users who have successfully joined that specific tournament
  const notifTitle = isUpdate
    ? `🔑 Room Details Updated: ${tour.title}`
    : `🔑 Room Details Released: ${tour.title}`;

  const notifMessage = isUpdate
    ? `Room details have been updated for ${tour.title}. Open My Matches to view your Room ID and Password.`
    : `Room details are available for ${tour.title}. Open My Matches to view your Room ID and Password.`;

  let notifiedCount = 0;
  for (const part of tour.registeredParticipants) {
    const resAlert = dispatchNotificationToUser(part.userId, {
      title: notifTitle,
      message: notifMessage,
      type: 'ROOM',
      linkTab: 'matches',
      referenceId: tour.id,
      metadata: { tournamentId: tour.id, isUpdate },
    });
    if (resAlert.success) notifiedCount++;
  }

  db.auditLogs.unshift({
    id: 'aud_' + crypto.randomUUID().slice(0, 8),
    adminId: admin.id,
    adminName: admin.username,
    action: isUpdate ? 'UPDATE_ROOM_DETAILS' : 'RELEASE_ROOM_DETAILS',
    details: `${isUpdate ? 'Updated' : 'Published'} room credentials for ${tour.title} (Room ID: ${cleanRoomId}) to ${notifiedCount} registered players`,
    targetId: tour.id,
    timestamp: new Date().toISOString(),
  });

  saveDb();
  return res.json({
    success: true,
    tournament: tour,
    published: true,
    isUpdate,
    notifiedCount,
    message: `Room details published and ${notifiedCount} registered participant(s) notified successfully.`,
  });
};

app.post('/api/admin/tournaments/:id/release-room', requireAdmin, handleAdminRoomDetails);
app.post('/api/admin/tournaments/:id/room-details', requireAdmin, handleAdminRoomDetails);

// Admin Broadcast / Manual 15-Minute Match Start Alert for Tournament
app.post('/api/admin/tournaments/:id/send-start-alert', requireAdmin, (req: Request, res: Response) => {
  const admin = (req as any).adminUser as UserProfile;
  const tour = db.tournaments.find((t) => t.id === req.params.id);
  if (!tour) return res.status(404).json({ error: 'Tournament not found' });

  if (tour.registeredParticipants.length === 0) {
    return res.json({
      success: true,
      notifiedCount: 0,
      message: 'No participants registered in this tournament yet.',
    });
  }

  let notifiedCount = 0;
  for (const part of tour.registeredParticipants) {
    const resAlert = dispatchNotificationToUser(part.userId, {
      title: `⏰ Match Starting Soon: ${tour.title}`,
      message: `Your ${tour.game} match is starting shortly! Check My Matches to view room credentials.`,
      type: 'MATCH',
      linkTab: 'matches',
      referenceId: tour.id,
      metadata: { tournamentId: tour.id, matchTime: tour.matchTime, manualAdminSend: true },
    });
    if (resAlert.success) notifiedCount++;
  }

  db.auditLogs.unshift({
    id: 'aud_' + crypto.randomUUID().slice(0, 8),
    adminId: admin.id,
    adminName: admin.username,
    action: 'SEND_TOURNAMENT_START_ALERT',
    details: `Sent match starting soon notification for ${tour.title} to ${notifiedCount} registered player(s)`,
    targetId: tour.id,
    timestamp: new Date().toISOString(),
  });

  saveDb();
  return res.json({
    success: true,
    notifiedCount,
    message: `Match start alert sent to ${notifiedCount} registered participant(s).`,
  });
});

// Admin Publish Results & Distribute Prizes (Atomic)
app.post('/api/admin/tournaments/:id/results', requireAdmin, (req: Request, res: Response) => {
  const admin = (req as any).adminUser as UserProfile;
  const { results } = req.body; // Array of { rank, userId, username, gameIgn, kills, prizePaise }

  if (!Array.isArray(results) || results.length === 0) {
    return res.status(400).json({ error: 'Results list is required' });
  }

  const tour = db.tournaments.find((t) => t.id === req.params.id);
  if (!tour) return res.status(404).json({ error: 'Tournament not found' });

  if (tour.status === 'COMPLETED') {
    return res.status(400).json({ error: 'Tournament results have already been published' });
  }

  tour.status = 'COMPLETED';
  tour.results = results as MatchResult[];

  // Automatically credit prizes to user wallets
  for (const resItem of results) {
    if (resItem.userId && resItem.prizePaise > 0) {
      const winner = db.users.find((u) => u.id === resItem.userId);
      if (winner) {
        winner.walletBalancePaise += resItem.prizePaise;

        const tx: WalletTransaction = {
          id: 'tx_prz_' + crypto.randomUUID().slice(0, 8),
          userId: winner.id,
          type: 'PRIZE',
          amountPaise: resItem.prizePaise,
          balanceAfterPaise: winner.walletBalancePaise,
          status: 'COMPLETED',
          description: `Rank #${resItem.rank} Prize in ${tour.title} (${resItem.kills} kills)`,
          referenceId: tour.id,
          idempotencyKey: `prize_${tour.id}_${winner.id}`,
          createdAt: new Date().toISOString(),
        };
        db.transactions.unshift(tx);

        db.notifications.unshift({
          id: 'notif_' + crypto.randomUUID().slice(0, 8),
          userId: winner.id,
          title: '🎉 Victory! Tournament Prize Credited',
          message: `Congratulations! Rank #${resItem.rank} in ${tour.title}. ₹${(resItem.prizePaise / 100).toFixed(2)} has been added to your wallet!`,
          type: 'WALLET',
          read: false,
          createdAt: new Date().toISOString(),
          linkTab: 'wallet',
        });
      }
    }
  }

  db.auditLogs.unshift({
    id: 'aud_' + crypto.randomUUID().slice(0, 8),
    adminId: admin.id,
    adminName: admin.username,
    action: 'PUBLISH_RESULTS',
    details: `Declared winners for ${tour.title} and distributed prizes`,
    targetId: tour.id,
    timestamp: new Date().toISOString(),
  });

  saveDb();
  return res.json({ success: true, tournament: tour });
});

// Admin Cancel Tournament & Auto-Refund All Participants
app.post('/api/admin/tournaments/:id/cancel', requireAdmin, (req: Request, res: Response) => {
  const admin = (req as any).adminUser as UserProfile;
  const { reason } = req.body;

  const tour = db.tournaments.find((t) => t.id === req.params.id);
  if (!tour) return res.status(404).json({ error: 'Tournament not found' });

  if (tour.status === 'CANCELLED' || tour.status === 'COMPLETED') {
    return res.status(400).json({ error: `Cannot cancel tournament in ${tour.status} state` });
  }

  tour.status = 'CANCELLED';
  tour.cancelledAt = new Date().toISOString();
  tour.cancellationReason = reason || 'Cancelled by tournament administration';

  // Refund every registered participant
  const fee = tour.entryFeePaise;
  if (fee > 0) {
    for (const part of tour.registeredParticipants) {
      const pUser = db.users.find((u) => u.id === part.userId);
      if (pUser) {
        pUser.walletBalancePaise += fee;

        const tx: WalletTransaction = {
          id: 'tx_ref_' + crypto.randomUUID().slice(0, 8),
          userId: pUser.id,
          type: 'REFUND',
          amountPaise: fee,
          balanceAfterPaise: pUser.walletBalancePaise,
          status: 'COMPLETED',
          description: `Refund for cancelled tournament: ${tour.title}`,
          referenceId: tour.id,
          idempotencyKey: `cancel_refund_${tour.id}_${pUser.id}`,
          createdAt: new Date().toISOString(),
        };
        db.transactions.unshift(tx);

        db.notifications.unshift({
          id: 'notif_' + crypto.randomUUID().slice(0, 8),
          userId: pUser.id,
          title: '🔄 Tournament Cancelled - Full Refund Issued',
          message: `${tour.title} was cancelled (${tour.cancellationReason}). ₹${(fee / 100).toFixed(2)} refunded to your wallet.`,
          type: 'WALLET',
          read: false,
          createdAt: new Date().toISOString(),
          linkTab: 'wallet',
        });
      }
    }
  }

  db.auditLogs.unshift({
    id: 'aud_' + crypto.randomUUID().slice(0, 8),
    adminId: admin.id,
    adminName: admin.username,
    action: 'CANCEL_TOURNAMENT',
    details: `Cancelled ${tour.title}. Refunded ${tour.registeredParticipants.length} participants.`,
    targetId: tour.id,
    timestamp: new Date().toISOString(),
  });

  saveDb();
  return res.json({ success: true, tournament: tour });
});

// Admin Deposit Management (Pending, Successful, Rejected)
app.get('/api/admin/deposits', requireAdmin, (req: Request, res: Response) => {
  const { status } = req.query;
  let list = db.deposits;
  if (status && status !== 'ALL') {
    list = list.filter((d) => d.status === status);
  }
  return res.json({ deposits: list });
});

app.post('/api/admin/deposits/:id/status', requireAdmin, (req: Request, res: Response) => {
  const admin = (req as any).adminUser as UserProfile;
  const { newStatus, verificationNotes } = req.body;

  if (!['PENDING', 'SUCCESSFUL', 'REJECTED', 'EXPIRED'].includes(newStatus)) {
    return res.status(400).json({ error: 'Invalid deposit status' });
  }

  const deposit = db.deposits.find((d) => d.id === req.params.id);
  if (!deposit) return res.status(404).json({ error: 'Deposit record not found' });

  const prevStatus = deposit.status;
  if (prevStatus === newStatus) {
    return res.json({ success: true, deposit });
  }

  const dbUser = db.users.find((u) => u.id === deposit.userId);
  if (!dbUser) return res.status(404).json({ error: 'Associated user not found' });

  // If transitioning to SUCCESSFUL from another status, credit wallet exactly once!
  if (newStatus === 'SUCCESSFUL' && prevStatus !== 'SUCCESSFUL') {
    dbUser.walletBalancePaise += deposit.amountPaise;

    const tx: WalletTransaction = {
      id: 'tx_dep_' + crypto.randomUUID().slice(0, 8),
      userId: dbUser.id,
      type: 'DEPOSIT',
      amountPaise: deposit.amountPaise,
      balanceAfterPaise: dbUser.walletBalancePaise,
      status: 'COMPLETED',
      description: `Deposit Approved by Admin (${deposit.utr ? 'UTR: ' + deposit.utr : 'Ref: ' + deposit.providerRef})`,
      referenceId: deposit.id,
      idempotencyKey: `admin_dep_credit_${deposit.id}`,
      createdAt: new Date().toISOString(),
    };
    db.transactions.unshift(tx);

    db.notifications.unshift({
      id: 'notif_' + crypto.randomUUID().slice(0, 8),
      userId: dbUser.id,
      title: '✅ Deposit Request Approved!',
      message: `Your deposit of ₹${(deposit.amountPaise / 100).toFixed(2)} has been approved and credited.`,
      type: 'WALLET',
      read: false,
      createdAt: new Date().toISOString(),
      linkTab: 'wallet',
    });
  } else if (newStatus === 'REJECTED' && prevStatus === 'SUCCESSFUL') {
    // If clawing back a previously approved deposit
    dbUser.walletBalancePaise -= deposit.amountPaise;
    db.transactions.unshift({
      id: 'tx_adj_' + crypto.randomUUID().slice(0, 8),
      userId: dbUser.id,
      type: 'ADJUSTMENT',
      amountPaise: -deposit.amountPaise,
      balanceAfterPaise: dbUser.walletBalancePaise,
      status: 'COMPLETED',
      description: `Deposit ${deposit.id} status changed to Rejected by Admin`,
      referenceId: deposit.id,
      createdAt: new Date().toISOString(),
    });
  }

  deposit.status = newStatus;
  deposit.updatedAt = new Date().toISOString();
  if (verificationNotes) deposit.verificationNotes = verificationNotes;

  db.auditLogs.unshift({
    id: 'aud_' + crypto.randomUUID().slice(0, 8),
    adminId: admin.id,
    adminName: admin.username,
    action: 'UPDATE_DEPOSIT_STATUS',
    details: `Deposit ${deposit.id} status changed from ${prevStatus} to ${newStatus}`,
    targetId: deposit.id,
    timestamp: new Date().toISOString(),
  });

  saveDb();
  return res.json({ success: true, deposit });
});

// Admin Withdrawal Management
app.get('/api/admin/withdrawals', requireAdmin, (req: Request, res: Response) => {
  const { status } = req.query;
  let list = db.withdrawals;
  if (status && status !== 'ALL') {
    list = list.filter((w) => w.status === status);
  }
  return res.json({ withdrawals: list });
});

app.post('/api/admin/withdrawals/:id/status', requireAdmin, (req: Request, res: Response) => {
  const admin = (req as any).adminUser as UserProfile;
  const newStatus = String(req.body.newStatus || req.body.status || '').trim().toUpperCase();
  const adminNotes = String(req.body.adminNotes || req.body.notes || '').trim();
  const referenceNo = String(req.body.referenceNo || req.body.reference || '').trim();

  if (!['PENDING', 'PROCESSING', 'SUCCESSFUL', 'REJECTED'].includes(newStatus)) {
    return res.status(400).json({ error: 'Invalid withdrawal status. Must be PENDING, PROCESSING, SUCCESSFUL, or REJECTED' });
  }

  const withdrawal = db.withdrawals.find((w) => w.id === req.params.id);
  if (!withdrawal) return res.status(404).json({ error: 'Withdrawal not found' });

  const prevStatus = withdrawal.status;
  if (prevStatus === newStatus) {
    return res.json({ success: true, withdrawal });
  }

  // Double payout & double refund prevention: Terminal states cannot be changed
  if (prevStatus === 'SUCCESSFUL') {
    return res.status(400).json({
      error: 'This withdrawal has already been marked Successful and paid out. Payout status cannot be altered to prevent accounting discrepancy.',
    });
  }

  if (prevStatus === 'REJECTED') {
    return res.status(400).json({
      error: 'This withdrawal was already rejected and the reserved funds were already refunded to the user wallet. It cannot be altered.',
    });
  }

  const dbUser = db.users.find((u) => u.id === withdrawal.userId);
  if (!dbUser) return res.status(404).json({ error: 'User record not found' });

  if (newStatus === 'PROCESSING') {
    withdrawal.status = 'PROCESSING';
    if (adminNotes) withdrawal.adminNotes = adminNotes;

    dispatchNotificationToUser(dbUser.id, {
      title: '⏳ Withdrawal Status: Processing',
      message: `Your withdrawal of ₹${(withdrawal.amountPaise / 100).toFixed(2)} to ${withdrawal.payoutUpiId} (ID: ${withdrawal.id}) is now being processed by our accounts team.`,
      type: 'WALLET',
      linkTab: 'wallet',
      referenceId: withdrawal.id,
      metadata: { withdrawalId: withdrawal.id, status: 'PROCESSING' },
    });
  } else if (newStatus === 'SUCCESSFUL') {
    if (!referenceNo || !referenceNo.trim()) {
      return res.status(400).json({
        error: 'A valid Payout Reference / IMPS / UTR transaction ID is required to confirm that funds have actually been transferred.',
      });
    }

    withdrawal.status = 'SUCCESSFUL';
    withdrawal.processedAt = new Date().toISOString();
    withdrawal.referenceNo = referenceNo.trim();
    withdrawal.adminNotes = adminNotes || `Payout Confirmed via IMPS/UPI (Ref: ${withdrawal.referenceNo})`;

    // Update pending ledger entry
    const ledgerTx = db.transactions.find((t) => t.referenceId === withdrawal.id && t.type === 'WITHDRAWAL');
    if (ledgerTx) {
      ledgerTx.status = 'COMPLETED';
      ledgerTx.description = `Withdrawal to ${withdrawal.payoutUpiId} (Ref: ${withdrawal.referenceNo})`;
    }

    dispatchNotificationToUser(dbUser.id, {
      title: '💸 Payout Sent Successfully!',
      message: `₹${(withdrawal.amountPaise / 100).toFixed(2)} transferred to UPI: ${withdrawal.payoutUpiId} (Ref: ${withdrawal.referenceNo}).`,
      type: 'WALLET',
      linkTab: 'wallet',
      referenceId: withdrawal.id,
      metadata: { withdrawalId: withdrawal.id, status: 'SUCCESSFUL', referenceNo: withdrawal.referenceNo },
    });
  } else if (newStatus === 'REJECTED') {
    // ATOMIC REFUND: Only refund if not previously refunded!
    dbUser.walletBalancePaise += withdrawal.amountPaise;

    const tx: WalletTransaction = {
      id: 'tx_wth_ref_' + crypto.randomUUID().slice(0, 8),
      userId: dbUser.id,
      type: 'REFUND',
      amountPaise: withdrawal.amountPaise,
      balanceAfterPaise: dbUser.walletBalancePaise,
      status: 'COMPLETED',
      description: `Refund for Rejected Withdrawal: ${adminNotes || 'Declined by Admin'}`,
      referenceId: withdrawal.id,
      idempotencyKey: `wth_refund_${withdrawal.id}`,
      createdAt: new Date().toISOString(),
    };
    db.transactions.unshift(tx);

    // Update original pending withdrawal transaction
    const ledgerTx = db.transactions.find((t) => t.referenceId === withdrawal.id && t.type === 'WITHDRAWAL');
    if (ledgerTx) {
      ledgerTx.status = 'REJECTED';
    }

    withdrawal.status = 'REJECTED';
    withdrawal.processedAt = new Date().toISOString();
    withdrawal.adminNotes = adminNotes || 'Declined by Admin (Amount refunded to wallet)';

    dispatchNotificationToUser(dbUser.id, {
      title: '⚠️ Withdrawal Request Declined',
      message: `Your withdrawal of ₹${(withdrawal.amountPaise / 100).toFixed(2)} was rejected (${withdrawal.adminNotes}). The amount has been refunded back to your wallet.`,
      type: 'WALLET',
      linkTab: 'wallet',
      referenceId: withdrawal.id,
      metadata: { withdrawalId: withdrawal.id, status: 'REJECTED', reason: withdrawal.adminNotes },
    });
  }

  db.auditLogs.unshift({
    id: 'aud_' + crypto.randomUUID().slice(0, 8),
    adminId: admin.id,
    adminName: admin.username,
    action: 'UPDATE_WITHDRAWAL_STATUS',
    details: `Withdrawal ${withdrawal.id} changed from ${prevStatus} to ${newStatus}${referenceNo ? ' Ref: ' + referenceNo : ''}${adminNotes ? ' Notes: ' + adminNotes : ''}`,
    targetId: withdrawal.id,
    timestamp: new Date().toISOString(),
  });

  saveDb();
  return res.json({ success: true, withdrawal });
});

// Admin User Management
app.get('/api/admin/users', requireAdmin, (req: Request, res: Response) => {
  const { search, status } = req.query;

  // Run real-time auto-expiry check on all users
  for (const u of db.users) {
    checkAndResolveUserBan(u);
  }

  let list = db.users.map(({ passwordHash: _, ...rest }) => rest);

  if (search && typeof search === 'string' && search.trim()) {
    const q = search.trim().toLowerCase();
    list = list.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q) ||
        (u.phone && u.phone.includes(q))
    );
  }

  if (status && typeof status === 'string' && status !== 'ALL') {
    list = list.filter((u) => u.accountStatus === status);
  }

  return res.json({ users: list });
});

app.post('/api/admin/users/:id/adjust-wallet', requireAdmin, (req: Request, res: Response) => {
  const admin = (req as any).adminUser as UserProfile;
  const { amountPaise, reason } = req.body;

  if (!reason || !reason.trim()) {
    return res.status(400).json({ error: 'Mandatory audit reason required for manual wallet adjustment' });
  }

  const numAmount = Number(amountPaise);
  if (isNaN(numAmount) || numAmount === 0) {
    return res.status(400).json({ error: 'Valid adjustment amount in paise required' });
  }

  const targetUser = db.users.find((u) => u.id === req.params.id);
  if (!targetUser) return res.status(404).json({ error: 'User not found' });

  if (targetUser.walletBalancePaise + numAmount < 0) {
    return res.status(400).json({ error: 'Adjustment would result in negative wallet balance' });
  }

  targetUser.walletBalancePaise += numAmount;

  const tx: WalletTransaction = {
    id: 'tx_adj_' + crypto.randomUUID().slice(0, 8),
    userId: targetUser.id,
    type: 'ADJUSTMENT',
    amountPaise: numAmount,
    balanceAfterPaise: targetUser.walletBalancePaise,
    status: 'COMPLETED',
    description: `Admin Adjustment: ${reason.trim()}`,
    createdAt: new Date().toISOString(),
  };
  db.transactions.unshift(tx);

  db.auditLogs.unshift({
    id: 'aud_' + crypto.randomUUID().slice(0, 8),
    adminId: admin.id,
    adminName: admin.username,
    action: 'WALLET_ADJUSTMENT',
    details: `Adjusted user ${targetUser.username} (${targetUser.id}) by ${numAmount > 0 ? '+' : ''}${numAmount} paise. Reason: ${reason}`,
    targetId: targetUser.id,
    targetUsername: targetUser.username,
    reason: reason.trim(),
    timestamp: new Date().toISOString(),
  });

  saveDb();
  return res.json({ success: true, walletBalancePaise: targetUser.walletBalancePaise });
});

// Admin Ban User (Temporary or Permanent with mandatory audit reason)
app.post('/api/admin/users/:id/ban', requireAdmin, (req: Request, res: Response) => {
  const admin = (req as any).adminUser as UserProfile;
  const { reason, banType, durationHours, banExpiresAt } = req.body;

  if (!reason || !String(reason).trim()) {
    return res.status(400).json({ error: 'A valid ban reason is mandatory before banning a user.' });
  }

  const targetUser = db.users.find((u) => u.id === req.params.id);
  if (!targetUser) return res.status(404).json({ error: 'User not found' });

  if (targetUser.role === 'admin') {
    return res.status(400).json({ error: 'Administrator accounts cannot be banned.' });
  }

  if (targetUser.id === admin.id) {
    return res.status(400).json({ error: 'You cannot ban your own administrative account.' });
  }

  const type: BanType = banType === 'TEMPORARY' ? 'TEMPORARY' : 'PERMANENT';
  let finalExpiresAt: string | null = null;

  if (type === 'TEMPORARY') {
    if (banExpiresAt) {
      finalExpiresAt = new Date(banExpiresAt).toISOString();
    } else if (durationHours) {
      finalExpiresAt = new Date(Date.now() + Number(durationHours) * 3600 * 1000).toISOString();
    } else {
      // Default to 24 hours for temporary ban
      finalExpiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    }
  }

  const previousStatus = targetUser.accountStatus || (targetUser.isBanned ? 'PERMANENTLY_BANNED' : 'ACTIVE');
  const newStatus: UserAccountStatus = type === 'TEMPORARY' ? 'TEMPORARILY_BANNED' : 'PERMANENTLY_BANNED';

  targetUser.isBanned = true;
  targetUser.accountStatus = newStatus;
  targetUser.banType = type;
  targetUser.banReason = String(reason).trim();
  targetUser.banExpiresAt = finalExpiresAt;
  targetUser.bannedAt = new Date().toISOString();
  targetUser.bannedBy = admin.id;
  targetUser.bannedByName = admin.username;

  // Audit log with full audit trail
  db.auditLogs.unshift({
    id: 'aud_' + crypto.randomUUID().slice(0, 8),
    adminId: admin.id,
    adminName: admin.username,
    action: 'BAN_USER',
    details: `Banned user ${targetUser.username} (${targetUser.id}). Status: ${newStatus}. Reason: ${targetUser.banReason}${finalExpiresAt ? ' (Expires: ' + finalExpiresAt + ')' : ''}`,
    targetId: targetUser.id,
    targetUsername: targetUser.username,
    reason: targetUser.banReason,
    previousStatus,
    newStatus,
    banType: type,
    banExpiresAt: finalExpiresAt || undefined,
    timestamp: new Date().toISOString(),
  });

  // User notification for record keeping
  db.notifications.unshift({
    id: 'notif_' + crypto.randomUUID().slice(0, 8),
    userId: targetUser.id,
    title: '⚠️ Account Suspended',
    message: `Your account has been suspended (${newStatus === 'TEMPORARILY_BANNED' ? 'Temporary until ' + new Date(finalExpiresAt!).toLocaleString() : 'Permanent'}). Reason: ${targetUser.banReason}`,
    type: 'ANNOUNCEMENT',
    read: false,
    createdAt: new Date().toISOString(),
  });

  saveDb();

  const { passwordHash: _, ...safeUser } = targetUser;
  return res.json({ success: true, user: safeUser });
});

// Admin Unban User (Restores full access while preserving original data & wallet)
app.post('/api/admin/users/:id/unban', requireAdmin, (req: Request, res: Response) => {
  const admin = (req as any).adminUser as UserProfile;
  const { reason } = req.body;

  const targetUser = db.users.find((u) => u.id === req.params.id);
  if (!targetUser) return res.status(404).json({ error: 'User not found' });

  const previousStatus = targetUser.accountStatus || (targetUser.isBanned ? 'PERMANENTLY_BANNED' : 'ACTIVE');
  const unbanReason = reason && String(reason).trim() ? String(reason).trim() : 'Suspension lifted by Administrator';

  targetUser.isBanned = false;
  targetUser.accountStatus = 'ACTIVE';
  targetUser.banExpiresAt = null;
  targetUser.unbannedAt = new Date().toISOString();
  targetUser.unbannedBy = admin.id;

  db.auditLogs.unshift({
    id: 'aud_' + crypto.randomUUID().slice(0, 8),
    adminId: admin.id,
    adminName: admin.username,
    action: 'UNBAN_USER',
    details: `Unbanned user ${targetUser.username} (${targetUser.id}). Reason: ${unbanReason}`,
    targetId: targetUser.id,
    targetUsername: targetUser.username,
    reason: unbanReason,
    previousStatus,
    newStatus: 'ACTIVE',
    timestamp: new Date().toISOString(),
  });

  db.notifications.unshift({
    id: 'notif_' + crypto.randomUUID().slice(0, 8),
    userId: targetUser.id,
    title: '✅ Account Suspension Lifted',
    message: 'Your account suspension has been lifted by administrator. You have full access to tournaments and wallet.',
    type: 'ANNOUNCEMENT',
    read: false,
    createdAt: new Date().toISOString(),
    linkTab: 'home',
  });

  saveDb();

  const { passwordHash: _, ...safeUser } = targetUser;
  return res.json({ success: true, user: safeUser });
});

// Backward-compatible toggle ban
app.post('/api/admin/users/:id/toggle-ban', requireAdmin, (req: Request, res: Response) => {
  const targetUser = db.users.find((u) => u.id === req.params.id);
  if (!targetUser) return res.status(404).json({ error: 'User not found' });

  if (targetUser.isBanned) {
    (req as any).body = { reason: 'Toggled unban by Admin' };
    return (app as any)._router.handle({ ...req, method: 'POST', url: `/api/admin/users/${targetUser.id}/unban` }, res);
  } else {
    (req as any).body = { reason: 'Violation of platform rules', banType: 'PERMANENT' };
    return (app as any)._router.handle({ ...req, method: 'POST', url: `/api/admin/users/${targetUser.id}/ban` }, res);
  }
});

// Admin Audit Logs Endpoint
app.get('/api/admin/audit-logs', requireAdmin, (req: Request, res: Response) => {
  const { action, targetId } = req.query;
  let list = db.auditLogs;
  if (action && typeof action === 'string' && action !== 'ALL') {
    list = list.filter((a) => a.action === action);
  }
  if (targetId && typeof targetId === 'string') {
    list = list.filter((a) => a.targetId === targetId);
  }
  return res.json({ auditLogs: list });
});

// Admin Support Desk Tickets
app.get('/api/admin/support/tickets', requireAdmin, (_req: Request, res: Response) => {
  return res.json({ tickets: db.tickets });
});

app.post('/api/admin/support/tickets/:id/status', requireAdmin, (req: Request, res: Response) => {
  const { status } = req.body;
  const ticket = db.tickets.find((t) => t.id === req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  ticket.status = status;
  ticket.updatedAt = new Date().toISOString();
  saveDb();
  return res.json({ success: true, ticket });
});

// Admin Broadcast Announcement
app.post('/api/admin/broadcast', requireAdmin, (req: Request, res: Response) => {
  const { title, message } = req.body;
  if (!title || !message) return res.status(400).json({ error: 'Title and message are required' });

  db.notifications.unshift({
    id: 'notif_' + crypto.randomUUID().slice(0, 8),
    userId: 'ALL',
    title: `📢 ${title.trim()}`,
    message: message.trim(),
    type: 'ANNOUNCEMENT',
    read: false,
    createdAt: new Date().toISOString(),
  });

  saveDb();
  return res.json({ success: true, message: 'Broadcast notification dispatched' });
});

// Admin Update App Settings
app.post('/api/admin/settings', requireAdmin, async (req: Request, res: Response) => {
  const admin = (req as any).adminUser as UserProfile;
  const {
    minDepositPaise,
    maxDepositPaise,
    minWithdrawalPaise,
    maxWithdrawalPaise,
    merchantUpiId,
    merchantName,
    merchantQrImageUrl,
    depositPresets,
    announcementNotice,
    gatewayEnabled,
    supportPhone,
    supportEmail,
    regenerateQr,
  } = req.body;

  if (minDepositPaise !== undefined) {
    const minVal = Number(minDepositPaise);
    if (isNaN(minVal) || minVal < 1000 || minVal > 200000) {
      return res.status(400).json({ error: 'Minimum deposit amount must be between ₹10 and ₹2,000' });
    }
    db.settings.minDepositPaise = minVal;
  }
  if (maxDepositPaise !== undefined) {
    const maxVal = Number(maxDepositPaise);
    if (isNaN(maxVal) || maxVal < 1000 || maxVal > 200000) {
      return res.status(400).json({ error: 'Maximum deposit amount must be between ₹10 and ₹2,000' });
    }
    db.settings.maxDepositPaise = maxVal;
  }
  if (db.settings.minDepositPaise > db.settings.maxDepositPaise) {
    return res.status(400).json({ error: 'Minimum deposit amount cannot be greater than maximum deposit amount' });
  }

  // Handle preset buttons management
  if (depositPresets !== undefined) {
    if (!Array.isArray(depositPresets)) {
      return res.status(400).json({ error: 'Preset amounts list must be a valid list' });
    }
    const seenAmounts = new Set<number>();
    const sanitizedPresets: DepositPreset[] = [];

    for (let i = 0; i < depositPresets.length; i++) {
      const p = depositPresets[i];
      const amt = Math.round(Number(p.amountRupees));
      if (isNaN(amt) || amt < 10 || amt > 2000) {
        return res.status(400).json({
          error: `Invalid preset deposit amount ₹${p.amountRupees}. Amount must be between ₹10 and ₹2,000.`,
        });
      }
      if (seenAmounts.has(amt)) {
        return res.status(400).json({
          error: `Duplicate preset amount ₹${amt} is not allowed. Each preset button must have a unique amount.`,
        });
      }
      seenAmounts.add(amt);
      sanitizedPresets.push({
        id: p.id ? String(p.id) : `pre_${amt}_${i + 1}`,
        amountRupees: amt,
        label: p.label ? String(p.label).trim() : undefined,
        enabled: p.enabled !== false,
        order: typeof p.order === 'number' ? p.order : i + 1,
      });
    }

    sanitizedPresets.sort((a, b) => a.order - b.order);
    db.settings.depositPresets = sanitizedPresets;
  }

  if (minWithdrawalPaise !== undefined) db.settings.minWithdrawalPaise = Number(minWithdrawalPaise);
  if (maxWithdrawalPaise !== undefined) db.settings.maxWithdrawalPaise = Number(maxWithdrawalPaise);

  let upiChanged = false;
  if (merchantUpiId !== undefined) {
    const cleanUpi = String(merchantUpiId).trim();
    if (cleanUpi.length > 0) {
      if (!isValidUpiVpa(cleanUpi)) {
        return res.status(400).json({
          error: 'Invalid UPI ID format. UPI ID must be in format username@handle (e.g. merchant@icici or 9876543210@paytm).',
        });
      }
    }
    if (db.settings.merchantUpiId !== cleanUpi) {
      upiChanged = true;
    }
    db.settings.merchantUpiId = cleanUpi;
  }

  if (merchantName !== undefined) {
    const cleanName = String(merchantName).trim();
    if (db.settings.merchantName !== cleanName) {
      upiChanged = true;
    }
    db.settings.merchantName = cleanName;
  }

  if (announcementNotice !== undefined) db.settings.announcementNotice = String(announcementNotice).trim();
  if (gatewayEnabled !== undefined) db.settings.gatewayEnabled = Boolean(gatewayEnabled);
  if (supportPhone !== undefined) db.settings.supportPhone = String(supportPhone).trim();
  if (supportEmail !== undefined) db.settings.supportEmail = String(supportEmail).trim();

  db.settings.upiConfigured = Boolean(db.settings.merchantUpiId && isValidUpiVpa(db.settings.merchantUpiId));

  // Auto-generate standard UPI QR code if UPI ID is valid
  if (db.settings.upiConfigured) {
    const hasCustomUpload = merchantQrImageUrl && merchantQrImageUrl.startsWith('data:image');
    if (regenerateQr || upiChanged || !db.settings.merchantQrImageUrl || db.settings.merchantQrImageUrl.includes('api.qrserver.com') || (!hasCustomUpload && !merchantQrImageUrl)) {
      try {
        const canonicalUri = buildServerUpiUri(db.settings.merchantUpiId, db.settings.merchantName);
        db.settings.merchantQrImageUrl = await generateServerUpiQr(canonicalUri);
      } catch (err) {
        console.error('Failed to auto-generate merchant QR:', err);
      }
    } else if (merchantQrImageUrl !== undefined) {
      db.settings.merchantQrImageUrl = String(merchantQrImageUrl).trim();
    }
  } else {
    // If empty or invalid, clear QR
    if (!db.settings.merchantUpiId) {
      db.settings.merchantQrImageUrl = '';
    }
  }

  db.auditLogs.unshift({
    id: 'aud_' + crypto.randomUUID().slice(0, 8),
    adminId: admin.id,
    adminName: admin.username,
    action: 'UPDATE_SETTINGS',
    details: `Updated settings. Merchant UPI: ${db.settings.merchantUpiId || 'None'} [Auto QR generated: ${db.settings.upiConfigured}]`,
    timestamp: new Date().toISOString(),
  });

  saveDb();
  return res.json({ success: true, settings: db.settings });
});

// Admin Regenerate Official Merchant QR Code
app.post('/api/admin/settings/regenerate-qr', requireAdmin, async (req: Request, res: Response) => {
  const admin = (req as any).adminUser as UserProfile;
  if (!db.settings.merchantUpiId || !isValidUpiVpa(db.settings.merchantUpiId)) {
    return res.status(400).json({ error: 'Cannot generate QR: Merchant UPI ID is not configured or invalid.' });
  }

  try {
    const canonicalUri = buildServerUpiUri(db.settings.merchantUpiId, db.settings.merchantName);
    db.settings.merchantQrImageUrl = await generateServerUpiQr(canonicalUri);
    db.settings.upiConfigured = true;

    db.auditLogs.unshift({
      id: 'aud_' + crypto.randomUUID().slice(0, 8),
      adminId: admin.id,
      adminName: admin.username,
      action: 'REGENERATE_QR',
      details: `Regenerated official merchant UPI QR for ${db.settings.merchantUpiId}`,
      timestamp: new Date().toISOString(),
    });

    saveDb();
    return res.json({ success: true, settings: db.settings, qrCodeUrl: db.settings.merchantQrImageUrl, upiUri: canonicalUri });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to generate QR code: ' + (err.message || 'Unknown error') });
  }
});

// Vite mounting
async function startServer() {
  try {
    const isProd = process.env.NODE_ENV === 'production';
    if (!isProd) {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.resolve(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`[BATTLE ESPORTS SERVER] Running on http://localhost:${PORT}`);
    });

    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`[BATTLE ESPORTS SERVER] Port ${PORT} already in use, retrying or maintaining active instance.`);
      } else {
        console.error('[BATTLE ESPORTS SERVER] Server listen error:', err);
      }
    });
  } catch (err) {
    console.error('[BATTLE ESPORTS SERVER] Fatal start error:', err);
  }
}

process.on('uncaughtException', (err) => {
  console.error('[BATTLE ESPORTS SERVER] Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[BATTLE ESPORTS SERVER] Unhandled rejection:', reason);
});

startServer().catch((err) => {
  console.error('[BATTLE ESPORTS SERVER] startServer caught error:', err);
});
