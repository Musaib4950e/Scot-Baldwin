export type VerificationBadgeType = 'blue' | 'red' | 'gold' | 'pink' | 'grey' | 'pastel_blue';

export interface Verification {
  status: 'none' | 'pending' | 'approved';
  badgeType?: VerificationBadgeType;
  expiresAt?: number; // timestamp, undefined for permanent
}

export interface User {
  id: string;
  username: string;
  avatar: string; // A single character or emoji for the avatar
  password: string;
  instagramUsername?: string;
  online: boolean;
  bio?: string; // User bio
  isAdmin?: boolean; // Flag for admin users
  phone?: string; // Personal number, admin only
  email?: string; // Email, admin only
  messageLimit?: number; // Daily message limit, admin controlled
  recoveryToken?: string; // For password recovery
  recoveryTokenExpiry?: number; // Expiry timestamp for the token
  verification?: Verification;
  walletBalance: number; // User's currency balance
  isFrozen?: boolean;
  frozenUntil?: number; // timestamp, undefined for permanent
}

export interface Message {
  id: string;
  chatId: string;
  authorId: string;
  text: string;
  timestamp: number;
  type?: 'user' | 'announcement';
}

export enum ChatType {
  DM = 'dm',
  GROUP = 'group',
}

export interface Chat {
  id: string;
  type: ChatType;
  name?: string; // For groups
  members: string[]; // array of user IDs
  // FIX: Removed unused `icon` property that was causing a missing React namespace error.
  creatorId?: string; // User ID of the group creator
  password?: string; // Optional password for the group
}

export enum ConnectionStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  BLOCKED = 'blocked',
}

export interface Connection {
  id:string;
  fromUserId: string;
  toUserId: string;
  status: ConnectionStatus;
  requestedAt: number;
  updatedAt: number;
}

export type TransactionType = 'transfer' | 'purchase' | 'admin_grant';

export interface Transaction {
  id: string;
  type: TransactionType;
  fromUserId: string; // 'admin-grant' for admin, or a user ID
  toUserId: string;   // 'marketplace' for a purchase, or a user ID
  amount: number;
  timestamp: number;
  description: string;
}