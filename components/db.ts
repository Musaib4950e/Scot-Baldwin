import { User, Chat, Message, ChatType, Connection, ConnectionStatus, Verification, Transaction, Report } from '../types';

// This file has been refactored to make API calls to a backend server.
// Instead of storing data in memory, it now uses `fetch` to interact with
// API endpoints (e.g., /api/users, /api/messages). This is the secure and
// standard way to connect a frontend application to a database like Neon.

// --- API Request Helper ---
const apiRequest = async <T>(method: string, endpoint: string, body?: any): Promise<T> => {
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      // In a real app, you would include an authentication token here
      // 'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  // The 'fetch' call assumes your backend is running on the same domain
  // or you have a proxy set up.
  const response = await fetch(endpoint, options);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: `Request failed with status ${response.status}` }));
    throw new Error(errorData.message || 'An unknown API error occurred');
  }

  // Handle responses with no content (e.g., DELETE, logout)
  if (response.status === 204 || response.headers.get('Content-Length') === '0') {
    return null as T;
  }

  return response.json();
};

export const db = {
  // --- Read Operations (GET) ---
  getUsers: () => apiRequest<User[]>('GET', '/api/users'),
  getChats: () => apiRequest<Chat[]>('GET', '/api/chats'),
  getMessages: () => apiRequest<Message[]>('GET', '/api/messages'),
  getConnections: () => apiRequest<Connection[]>('GET', '/api/connections'),
  getTransactions: () => apiRequest<Transaction[]>('GET', '/api/transactions'),
  getReports: () => apiRequest<Report[]>('GET', '/api/reports'),
  getCurrentUser: () => apiRequest<User | null>('GET', '/api/session/user'),
  getLoggedInUsers: () => apiRequest<User[]>('GET', '/api/session/users'),
  isUserLoggedIn: async (): Promise<boolean> => {
    try {
      const user = await db.getCurrentUser();
      return !!user;
    } catch {
      return false;
    }
  },

  // --- Authentication & User Creation (POST) ---
  authenticate: (username: string, password: string) => apiRequest<User | null>('POST', '/api/auth/login', { username, password }),
  createUser: (params: { username: string, password: string, instagramUsername?: string }) => apiRequest<User | null>('POST', '/api/users', params),
  login: (user: User) => apiRequest<User>('POST', '/api/session/login', { userId: user.id }),
  logout: () => apiRequest<void>('POST', '/api/session/logout'),

  // --- Create Operations (POST) ---
  addMessage: (chatId: string, authorId: string, text: string) => apiRequest<Message>('POST', '/api/messages', { chatId, authorId, text }),
  findOrCreateDM: (user1: User, user2: User) => apiRequest<Chat>('POST', '/api/chats/dm', { user1Id: user1.id, user2Id: user2.id }),
  createGroupChat: (creatorId: string, memberIds: string[], groupName: string) => apiRequest<Chat>('POST', '/api/chats/group', { creatorId, memberIds, groupName }),
  addConnection: (fromUserId: string, toUserId: string) => apiRequest<void>('POST', '/api/connections', { fromUserId, toUserId }),
  addBroadcastAnnouncement: (text: string, adminId: string) => apiRequest<void>('POST', '/api/admin/broadcast', { text, adminId }),
  addReport: (reporterId: string, reportedUserId: string, reason: string, chatIdAtTimeOfReport?: string) => apiRequest<Report>('POST', '/api/reports', { reporterId, reportedUserId, reason, chatIdAtTimeOfReport }),
  
  // --- Update Operations (PUT/PATCH) ---
  switchCurrentUser: (userId: string) => apiRequest<void>('PUT', '/api/session/switch', { userId }),
  updateUserProfile: (userId: string, updates: Partial<User>) => apiRequest<void>('PUT', `/api/users/${userId}/profile`, updates),
  resetUserPassword: (userId: string, newPassword: string) => apiRequest<void>('PUT', `/api/users/${userId}/password`, { newPassword }),
  updateGroupDetails: (chatId: string, details: { name: string; password?: string }) => apiRequest<void>('PUT', `/api/chats/${chatId}/details`, details),
  updateGroupMembers: (chatId: string, memberIds: string[]) => apiRequest<void>('PUT', `/api/chats/${chatId}/members`, { memberIds }),
  updateConnection: (connectionId: string, status: ConnectionStatus) => apiRequest<Connection | null>('PUT', `/api/connections/${connectionId}`, { status }),
  requestUserVerification: (userId: string) => apiRequest<void>('PUT', `/api/users/${userId}/verification/request`, {}),
  adminUpdateUserVerification: (userId: string, verificationDetails: Partial<Verification>) => apiRequest<void>('PUT', `/api/admin/users/${userId}/verification`, verificationDetails),
  adminForceConnectionStatus: (fromUserId: string, toUserId: string, status: ConnectionStatus) => apiRequest<void>('PUT', '/api/admin/connections', { fromUserId, toUserId, status }),
  adminUpdateUserFreezeStatus: (userId: string, isFrozen: boolean, frozenUntil?: number) => apiRequest<void>('PUT', `/api/admin/users/${userId}/freeze`, { isFrozen, frozenUntil }),
  equipCustomization: (userId: string, type: 'border' | 'nameColor', itemId: string | undefined) => apiRequest<void>('PUT', `/api/users/${userId}/customization`, { type, itemId }),
  updateReportStatus: (reportId: string, status: Report['status']) => apiRequest<void>('PUT', `/api/reports/${reportId}`, { status }),

  // --- Financial Operations (POST) ---
  transferFunds: (fromUserId: string, toUserId: string, amount: number, description: string) => apiRequest<{success: boolean, message: string}>('POST', '/api/wallet/transfer', { fromUserId, toUserId, amount, description }),
  adminGrantFunds: (toUserId: string, amount: number, description: string) => apiRequest<{success: boolean, message: string}>('POST', '/api/admin/wallet/grant', { toUserId, amount, description }),
  purchaseVerification: (userId: string, cost: number, description: string, verification: Verification) => apiRequest<{success: boolean, message: string}>('POST', '/api/marketplace/purchase/verification', { userId, cost, description, verification }),
  purchaseCosmetic: (userId: string, item: { type: 'border' | 'nameColor', id: string, price: number, name: string }) => apiRequest<{success: boolean, message: string}>('POST', '/api/marketplace/purchase/cosmetic', { userId, item }),

  // --- Password Recovery (POST) ---
  generatePasswordRecoveryToken: (email: string) => apiRequest<User | null>('POST', '/api/auth/recover', { email }),
  resetPasswordWithToken: (token: string, newPassword: string) => apiRequest<User | null>('POST', '/api/auth/reset', { token, newPassword }),
  
  // --- Delete Operations (DELETE) ---
  deleteUser: (userId: string) => apiRequest<void>('DELETE', `/api/users/${userId}`),
  deleteGroup: (chatId: string) => apiRequest<void>('DELETE', `/api/chats/${chatId}`),
  deleteUserChats: (chatIds: string[]) => apiRequest<void>('DELETE', '/api/chats', { chatIds }),
  deleteConnection: (connectionId: string) => apiRequest<void>('DELETE', `/api/connections/${connectionId}`),
};


// --- STATIC DATA ---
// In a full application, this would also be fetched from the backend via an API endpoint
// (e.g., GET /api/marketplace/items), but for now, we'll keep it static on the client.
export const MARKETPLACE_ITEMS = {
    borders: [
        { id: 'border-neon-purple', name: 'Neon Purple Glow', price: 150, style: { padding: '2px', boxShadow: '0 0 10px #a855f7, 0 0 15px #a855f7', border: '2px solid #a855f780' } },
        { id: 'border-cyan-pulse', name: 'Cyan Pulse', price: 200, style: { padding: '2px', animation: 'pulse-cyan 2s infinite', boxShadow: '0 0 8px #22d3ee' } },
        { id: 'border-gold-solid', name: 'Solid Gold', price: 500, style: { padding: '2px', border: '3px solid #f59e0b' } },
        { id: 'border-rainbow-animated', name: 'Rainbow Flow', price: 750, style: { padding: '2px', border: '3px solid transparent', background: 'linear-gradient(var(--angle), red, orange, yellow, green, blue, indigo, violet) border-box', animation: 'spin-rainbow 4s linear infinite', '--angle': '0deg' } as React.CSSProperties },
    ],
    nameColors: [
        { id: 'color-aurora', name: 'Aurora', price: 300, style: { background: 'linear-gradient(to right, #ec4899, #8b5cf6, #3b82f6)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', filter: 'drop-shadow(0 0 5px rgba(192, 132, 252, 0.5))' } },
        { id: 'color-fire', name: 'Inferno', price: 250, style: { background: 'linear-gradient(to right, #f97316, #ef4444, #f59e0b)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' } },
        { id: 'color-toxic', name: 'Toxic Green', price: 100, style: { color: '#84cc16' } },
        { id: 'color-gold-text', name: 'Gold Standard', price: 400, style: { color: '#f59e0b' } },
    ]
};
// Health check comment
// N