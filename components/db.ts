import { User, Chat, Message, ChatType, Connection, ConnectionStatus, Verification, Transaction, Report, VerificationBadgeType, ProfileCustomization, Inventory, TransactionType, Loan, LoanStatus } from '../types';

// This file is being migrated from a local storage-based implementation to a real backend API.
// The functions are being replaced with stubs that would call a backend server.
// For now, it will return mock data to keep the frontend functional during transition.

// --- API Helper ---
const API_URL = 'http://localhost:3001/api'; // Your backend server URL

// In a real implementation, the auth token would be stored securely (e.g., localStorage)
// and sent with every authenticated request.
let authToken: string | null = null; 

const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'An API error occurred');
    }
    return response.json();
  } catch (error) {
    console.error(`API call to ${endpoint} failed:`, error);
    // In a real app, you'd have more robust error handling, maybe a global error state.
    throw error;
  }
};


// --- MOCK DATABASE (to keep app working during migration) ---
// This section would be entirely removed once the backend is live.
// It's a simplified version of the original localStorage DB.
const mockDb = (() => {
    let users: User[] = [];
    let chats: Chat[] = [];
    let messages: Message[] = [];
    // ... add other data arrays as needed

    const adminUser: User = { id: 'user-admin-0', username: 'Admin', password: '197700', avatar: '👑', online: false, isAdmin: true, walletBalance: 999999, verification: { status: 'approved', badgeType: 'aurora' }, inventory: { borders: [], nameColors: [] } };
    const usersData: Omit<User, 'id' | 'online' | 'walletBalance' | 'inventory'>[] = [
        { username: 'Alice', password: 'password', avatar: 'A', bio: 'Frontend Developer', email: 'alice@example.com' },
        { username: 'Bob', password: 'password', avatar: 'B', bio: 'Backend Developer', email: 'bob@example.com' },
    ];
    users = [adminUser, ...usersData.map((u, i) => ({ ...u, id: `user-mock-${i}`, online: false, walletBalance: 100, inventory: { borders: [], nameColors: [] } }))];
    const [alice, bob] = users.slice(1);
    const dmAliceBob: Chat = { id: 'chat-mock-0', type: ChatType.DM, members: [alice.id, bob.id] };
    chats = [dmAliceBob];
    messages = [
      { id: 'msg-mock-0', chatId: dmAliceBob.id, authorId: alice.id, text: 'Hey Bob, this is now running on a mock backend!', timestamp: Date.now() - 100000 },
      { id: 'msg-mock-1', chatId: dmAliceBob.id, authorId: bob.id, text: 'Awesome! The migration is in progress.', timestamp: Date.now() - 90000 },
    ];
    
    return { users, chats, messages };
})();


// --- DB API ---

// NOTE: All functions are now async to simulate network requests.
// The implementation should be replaced with `apiFetch` calls.

export const db = {
  // --- Auth ---
  login: async (username: string, password: string): Promise<{ user: User, token: string } | null> => {
    console.log(`[DB] Attempting login for: ${username}`);
    // REAL IMPLEMENTATION:
    // const { user, token } = await apiFetch('/auth/login', {
    //   method: 'POST',
    //   body: JSON.stringify({ username, password }),
    // });
    // authToken = token;
    // return { user, token };

    // MOCK IMPLEMENTATION:
    const user = mockDb.users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
    if (user) {
        user.online = true;
        const mockToken = `mock-token-for-${user.id}`;
        authToken = mockToken;
        return { user, token: mockToken };
    }
    return null;
  },

  logout: async (): Promise<void> => {
    console.log("[DB] Logging out");
    // REAL IMPLEMENTATION:
    // await apiFetch('/auth/logout', { method: 'POST' });
    authToken = null;
    // Also clear token from localStorage
  },

  // --- Data Fetching ---
  getInitialData: async (): Promise<{ users: User[], chats: Chat[], messages: Message[], connections: Connection[], transactions: Transaction[], reports: Report[], loans: Loan[] }> => {
    console.log("[DB] Fetching initial data");
    // REAL IMPLEMENTATION:
    // const data = await apiFetch('/initial-data');
    // return data;
    
    // MOCK IMPLEMENTATION:
    return { 
        users: mockDb.users, 
        chats: mockDb.chats, 
        messages: mockDb.messages,
        connections: [],
        transactions: [],
        reports: [],
        loans: []
    };
  },

  // --- Core Chat ---
  // Note: addMessage is removed because messages are now sent via Socket.io
  // and received in real-time, not added via a direct DB call from the client.

  findOrCreateDM: async (currentUser: User, targetUser: User): Promise<Chat> => {
    console.log(`[DB] Find or create DM between ${currentUser.username} and ${targetUser.username}`);
    // REAL IMPLEMENTATION:
    // return await apiFetch('/chats/dm', {
    //   method: 'POST',
    //   body: JSON.stringify({ targetUserId: targetUser.id })
    // });
    
    // MOCK IMPLEMENTATION:
    const existing = mockDb.chats.find(c => c.type === ChatType.DM && c.members.includes(currentUser.id) && c.members.includes(targetUser.id));
    if (existing) return existing;
    const newChat: Chat = { id: `chat-mock-${Date.now()}`, type: ChatType.DM, members: [currentUser.id, targetUser.id] };
    mockDb.chats.push(newChat);
    return newChat;
  },

  createGroupChat: async (creatorId: string, memberIds: string[], groupName: string): Promise<Chat> => {
    console.log(`[DB] Creating group "${groupName}"`);
    // REAL IMPLEMENTATION:
    // return await apiFetch('/chats/group', {
    //   method: 'POST',
    //   body: JSON.stringify({ memberIds, groupName })
    // });
    
    // MOCK IMPLEMENTATION:
     const allMembers = Array.from(new Set([creatorId, ...memberIds]));
     const newChat: Chat = { id: `chat-mock-${Date.now()}`, type: ChatType.GROUP, name: groupName, members: allMembers, creatorId };
     mockDb.chats.push(newChat);
     return newChat;
  },

  // --- Other Functions (to be migrated) ---
  // The following functions would be converted to API calls as well.
  
  updateUserProfile: async (userId: string, updates: Partial<User>) => {
    console.log(`[DB] Updating profile for ${userId}`);
    // await apiFetch(`/users/${userId}`, { method: 'PATCH', body: JSON.stringify(updates) });
  },

  deleteUser: async (userId: string) => {
    console.log(`[DB] DELETING user ${userId}`);
    // await apiFetch(`/admin/users/${userId}`, { method: 'DELETE' });
  },

  // ... and so on for all other database interactions.
};

// --- STATIC DATA ---
export const MARKETPLACE_ITEMS = {
    borders: [
        { id: 'border-neon-purple', name: 'Neon Purple Glow', price: 150, style: { padding: '2px', boxShadow: '0 0 10px #a855f7, 0 0 15px #a855f7', border: '2px solid #a855f780' } },
        { id: 'border-cyan-pulse', name: 'Cyan Pulse', price: 200, style: { padding: '2px', animation: 'pulse-cyan 2s infinite', boxShadow: '0 0 8px #22d3ee' } },
        { id: 'border-gold-solid', name: 'Solid Gold', price: 500, style: { padding: '2px', border: '3px solid #f59e0b' } },
        { id: 'border-rainbow-animated', name: 'Rainbow Flow', price: 750, style: { padding: '2px', border: '3px solid transparent', background: 'linear-gradient(var(--angle), red, orange, yellow, green, blue, indigo, violet) border-box', animation: 'spin-rainbow 4s linear infinite', '--angle': '0deg' } as any },
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