export interface User {
  id: string;
  uid: string;
  username: string;
  nickname?: string;
  profilePicture?: string;
  avatarUrl: string;
  fullName?: string;
  email?: string;
  phone?: string;
  inGameName?: string;
  gameUid?: string;
  bio?: string;
  region?: string;
  country?: string;
  deviceId?: string;
  ipAddress?: string;
  joinedDate: string;
  lastLogin?: string;
  isOnline?: boolean;
  isVerified?: boolean;
  isBanned?: boolean;
  isSuspended?: boolean;
  isProfileComplete?: boolean;
  walletBalance: number;
  totalEarnings: number;
  totalDeposits?: number;
  totalWithdrawals?: number;
  referralEarnings?: number;
  referralCode?: string;
  referredBy?: string;
  
  // Game Stats
  level?: number;
  rank?: string;
  rankPoints?: number;
  totalMatches: number;
  soloMatches?: number;
  duoMatches?: number;
  squadMatches?: number;
  clashSquadMatches?: number;
  brSurvivalMatches?: number;
  brPerKillMatches?: number;
  loneWolfMatches?: number;
  totalWins: number;
  totalLosses?: number;
  winRate: number;
  totalKills: number;
  totalDeaths?: number;
  highestKills?: number;
  kdRatio: number;
  headshots?: number;
  mvpCount?: number;
  survivalTime?: number;
  
  // Progress
  achievementProgress?: number;
  role?: 'user' | 'admin' | 'moderator' | 'support';
  internalNotes?: string;
  status?: 'active' | 'banned' | 'suspended' | 'online';
  banReason?: string;
  password?: string; // For admin edit purposes
  ign?: string;
  depositBalance?: number;
  
  // App Lock & Security
  appLockPin?: string;
  appLockFingerprintEnabled?: boolean;
  securityColor?: string;
  securitySport?: string;
  pinAttempts?: number;
  pinLockoutUntil?: string;
  pinLastFailedAt?: string;
}

export interface PinResetRequest {
  id: string;
  userId: string;
  username: string;
  email: string;
  phone: string;
  currentPin: string;
  deviceName: string;
  createdAt: string;
  status: 'pending' | 'resolved';
}

export interface TeamMember {
  uid: string;
  username: string;
  inGameName?: string;
  avatarUrl?: string;
  role: 'Captain' | 'Player 2' | 'Player 3' | 'Player 4' | 'Player 5' | 'Player 6' | string;
  joinedAt: number;
}

export interface Team {
  id: string;
  userId?: string;
  teamName?: string;
  name: string;
  captain?: string;
  player2?: string;
  player3?: string;
  player4?: string;
  player5?: string;
  player6?: string;
  code: string; // 6-digit join code
  captainUid: string;
  captainName: string;
  captainAvatar?: string;
  logoUrl?: string;
  createdAt: number | string;
  members: Record<string, TeamMember>;
  updatedAt?: number;
}

export interface AdminRole {
  id: string;
  adminKey: string;
  adminName: string;
  deviceId?: string;
  permissions: {
    dashboard?: boolean;
    support?: boolean;
    users?: boolean;
    schedule_matches?: boolean;
    tournaments?: boolean;
    results?: boolean;
    announcements?: boolean;
    popups?: boolean;
    transactions?: boolean;
    withdrawals?: boolean;
    wallet?: boolean;
    promo_codes?: boolean;
    leaderboard?: boolean;
    referrals?: boolean;
    notifications?: boolean;
    teams?: boolean;
    banners?: boolean;
    payment_settings?: boolean;
    settings?: boolean;
    themes?: boolean;
    pin_resets?: boolean;
    roles?: boolean;
    system?: boolean;
    [key: string]: boolean | undefined;
  };
  createdAt: string;
}

export interface Tournament {
  id: string;
  title: string;
  type: string; 
  mode: 'SOLO' | 'DUO' | 'TRIO' | 'SQUAD' | string;
  time: string;
  date?: string;
  day?: string;
  status: 'LIVE' | 'UPCOMING' | 'COMPLETED' | 'CANCELLED' | 'SCHEDULED' | string;
  prizePool: number;
  entryFee: number;
  spotsTotal: number;
  spotsFilled: number;
  map: string;
  perKill?: number;
  prizeDistribution?: { rank: number; prize: number }[];
  image?: string;
  roomId?: string;
  password?: string;
  rules?: string;
  bannedCharacters?: string[];
  weaponsRules?: string;
  autoStart?: boolean;
  maxPlayers?: number;
  minPlayers?: number;
  isDeleted?: boolean;
  isScheduled?: boolean;
  scheduledPublishTime?: string;
  autoPublishOnTime?: boolean;
  publishedAt?: string;
}

export interface Transaction {
  id: string;
  userId: string;
  username: string;
  amount: number;
  type: 'deposit' | 'withdrawal' | 'match_entry' | 'match_win' | 'referral';
  status: 'pending' | 'completed' | 'rejected';
  date: string;
  method?: string;
  details?: string;
  phoneNumber?: string;
  screenshot?: string;
}

export interface Banner {
  id: string;
  imageUrl: string;
  link?: string;
  type: 'home' | 'event' | 'offer' | 'popup' | 'maintenance';
  isActive: boolean;
}

export interface Announcement {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  createdAt: string;
  timestamp?: number;
  tag?: string;
}

export interface AppPopup {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
  timestamp?: number;
}

export interface AppSettings {
  maintenanceMode: boolean;
  referralReward: number;
  referralEnabled: boolean;
  minWithdrawal: number;
  maxWithdrawal: number;
  bannerSpeed?: number;
  onesignalAppId?: string;
  onesignalRestApiKey?: string;
  isMaintenanceMode: boolean;
  maintenanceMessage: string;
  backgroundParticleColor?: string;
  backgroundParticlesEnabled?: boolean;
  backgroundTheme?: string;
  backgroundParticleOpacity?: number; // 0 to 200
  backgroundParticleType?: 'circle' | 'star' | 'snow' | 'sparkle'; 
  supportNumber?: string;
  imgbbApiKey?: string;
  appLink?: string;
}

export interface SupportMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  text?: string;
  imageUrl?: string;
  timestamp: number;
  isAdmin: boolean;
  isRead?: boolean;
}

export interface SupportChatRoom {
  id: string; // userId
  userId: string;
  username: string;
  userAvatar?: string;
  userEmail?: string;
  userPhone?: string;
  lastMessage?: string;
  lastTimestamp?: number;
  unreadCount: number;
  lastMessageSenderId?: string;
  isBlocked?: boolean;
}

export interface TeamChatMessage {
  id: string;
  teamId: string;
  senderUid: string;
  senderName: string;
  senderAvatar?: string;
  senderRole?: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface TeamInvite {
  id: string;
  type?: 'invite' | 'request'; // 'invite' = Captain invited user, 'request' = User requested to join with team code
  teamId: string;
  teamName: string;
  teamCode: string;
  captainUid: string;
  captainName: string;
  captainAvatar?: string;
  invitedUid: string;
  invitedUsername: string;
  invitedAvatar?: string;
  invitedInGameName?: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: number;
}
