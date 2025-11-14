import { User, Chat, Message, ChatType, Connection, ConnectionStatus, Verification, Transaction, TransactionType, Report } from '../types';

// This is an in-memory database implementation that simulates a real backend.
// All data is initialized with mock data and will be reset upon page refresh.
// It replaces the previous IndexedDB-based local storage system.

const ANNOUNCEMENT_CHAT_ID = 'chat-announcements-global';

// NEW: Marketplace items definition
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

interface SessionState {
    currentUserId: string | null;
    loggedInUserIds: string[];
}

// --- MOCK DATA ---
const now = Date.now();
const MOCK_USERS: User[] = [
    { id: 'user-1', username: 'Alice', avatar: 'A', password: '123', online: false, bio: 'Loves hiking and coding.', walletBalance: 150, inventory: { borders: [], nameColors: ['color-fire'] }, customization: { nameColorId: 'color-fire' }, verification: { status: 'none' } },
    { id: 'user-2', username: 'Bob', avatar: 'B', password: '123', online: false, bio: 'Frontend Developer.', walletBalance: 80, inventory: { borders: ['border-neon-purple'], nameColors: [] }, customization: { profileBorderId: 'border-neon-purple' }, verification: { status: 'none' } },
    { id: 'user-3', username: 'Charlie', avatar: 'C', password: '123', online: false, bio: 'Full-stack Engineer.', walletBalance: 25, instagramUsername: 'charlie.dev', verification: { status: 'pending' } },
    { id: 'user-4', username: 'Diana', avatar: 'D', password: '123', online: false, bio: 'UI/UX Designer.', walletBalance: 1200, inventory: { borders: [], nameColors: [] }, customization: {}, verification: { status: 'approved', badgeType: 'gold', expiresAt: undefined } },
    { id: 'user-5', username: 'Eve', avatar: 'E', password: '123', online: false, bio: 'QA Specialist', walletBalance: 50, verification: { status: 'none' } },
];

const MOCK_CHATS: Chat[] = [
    { id: 'chat-dm-1-2', type: ChatType.DM, members: ['user-1', 'user-2'] },
    { id: 'chat-group-1', type: ChatType.GROUP, name: 'Project Team', members: ['user-1', 'user-2', 'user-3'], creatorId: 'user-1' },
];

const MOCK_MESSAGES: Message[] = [
    { id: 'msg-1', chatId: 'chat-dm-1-2', authorId: 'user-1', text: 'Hey Bob, did you see the new designs from Diana?', timestamp: now - 5 * 60000 },
    { id: 'msg-2', chatId: 'chat-dm-1-2', authorId: 'user-2', text: 'Yeah, they look great! I\'m starting to implement them now.', timestamp: now - 4 * 60000 },
    { id: 'msg-3', chatId: 'chat-group-1', authorId: 'user-1', text: 'Welcome to the project team chat!', timestamp: now - 10 * 60000 },
    { id: 'msg-4', chatId: 'chat-group-1', authorId: 'user-3', text: 'Thanks! Glad to be here.', timestamp: now - 9 * 60000 },
];

const MOCK_CONNECTIONS: Connection[] = [
    { id: 'conn-1', fromUserId: 'user-1', toUserId: 'user-2', status: ConnectionStatus.ACCEPTED, requestedAt: now - 86400000, updatedAt: now - 86400000 },
    { id: 'conn-2', fromUserId: 'user-3', toUserId: 'user-4', status: ConnectionStatus.PENDING, requestedAt: now - 3600000, updatedAt: now - 3600000 },
    { id: 'conn-3', fromUserId: 'user-1', toUserId: 'user-5', status: ConnectionStatus.BLOCKED, requestedAt: now - 2*86400000, updatedAt: now - 2*86400000 },
];

const MOCK_TRANSACTIONS: Transaction[] = [
    { id: 'txn-1', type: 'admin_grant', fromUserId: 'admin-grant', toUserId: 'user-4', amount: 1000, timestamp: now - 2*86400000, description: 'Initial grant for being a valued community member.' },
    { id: 'txn-2', type: 'purchase', fromUserId: 'user-2', toUserId: 'marketplace', amount: 150, timestamp: now - 86400000, description: 'Purchased cosmetic: Neon Purple Glow' },
    { id: 'txn-3', type: 'purchase', fromUserId: 'user-1', toUserId: 'marketplace', amount: 250, timestamp: now - 3600000, description: 'Purchased cosmetic: Inferno' },
    { id: 'txn-4', type: 'transfer', fromUserId: 'user-4', toUserId: 'user-3', amount: 25, timestamp: now - 60000, description: 'Transfer to Charlie' },
];

const MOCK_REPORTS: Report[] = [
    { id: 'report-1', reporterId: 'user-3', reportedUserId: 'user-2', reason: 'He keeps using `var` instead of `let` or `const` in the shared codebase. It\'s a monstrosity.', timestamp: now - 120000, status: 'pending' }
];

class Database {
    private users: User[];
    private chats: Chat[];
    private messages: Message[];
    private connections: Connection[];
    private transactions: Transaction[];
    private reports: Report[];
    private sessionState: SessionState = { currentUserId: null, loggedInUserIds: [] };
    
    constructor() {
        // Deep copy mock data to prevent mutations across hot-reloads in development
        this.users = JSON.parse(JSON.stringify(MOCK_USERS));
        this.chats = JSON.parse(JSON.stringify(MOCK_CHATS));
        this.messages = JSON.parse(JSON.stringify(MOCK_MESSAGES));
        this.connections = JSON.parse(JSON.stringify(MOCK_CONNECTIONS));
        this.transactions = JSON.parse(JSON.stringify(MOCK_TRANSACTIONS));
        this.reports = JSON.parse(JSON.stringify(MOCK_REPORTS));
        this.initialize();
    }
    
    private initialize() {
        this.ensureAdminExists();
        this.ensureAnnouncementChatExists();
    }
    
    private ensureAdminExists() {
        if (!this.users.find(u => u.id === 'user-admin-001')) {
            this.users.push({
                id: 'user-admin-001',
                username: 'admin',
                avatar: '👑',
                password: '197700',
                online: false,
                isAdmin: true,
                verification: { status: 'approved', badgeType: 'aurora' },
                bio: 'The administrator of BAK-Ko.',
                walletBalance: 999999999,
            });
        }
    }

    private ensureAnnouncementChatExists() {
        if (!this.chats.find(c => c.id === ANNOUNCEMENT_CHAT_ID)) {
             this.chats.push({
                id: ANNOUNCEMENT_CHAT_ID,
                type: ChatType.GROUP,
                name: '📢 Announcements',
                members: this.users.map(u => u.id),
                creatorId: 'user-admin-001',
            });
            this.messages.push({
                id: `announcement-${now}`,
                chatId: ANNOUNCEMENT_CHAT_ID,
                authorId: 'user-admin-001',
                text: 'Welcome to the new BAK-Ko! The database has been reset with mock data.',
                timestamp: now,
                type: 'announcement',
            })
        }
    }
    
    // --- Public API ---
    
    getUsers = async (): Promise<User[]> => Promise.resolve(this.users);
    getChats = async (): Promise<Chat[]> => Promise.resolve(this.chats);
    getMessages = async (): Promise<Message[]> => Promise.resolve(this.messages);
    getConnections = async (): Promise<Connection[]> => Promise.resolve(this.connections);
    getTransactions = async (): Promise<Transaction[]> => Promise.resolve(this.transactions);
    getReports = async (): Promise<Report[]> => Promise.resolve(this.reports);
    isUserLoggedIn = (): boolean => !!this.sessionState.currentUserId;
    
    getCurrentUser = async (): Promise<User | null> => {
        if (!this.sessionState.currentUserId) return Promise.resolve(null);
        return Promise.resolve(this.users.find(u => u.id === this.sessionState.currentUserId) || null);
    }

    getLoggedInUsers = async (): Promise<User[]> => {
        if (this.sessionState.loggedInUserIds.length === 0) return Promise.resolve([]);
        return Promise.resolve(this.sessionState.loggedInUserIds
            .map(id => this.users.find(u => u.id === id))
            .filter((u): u is User => !!u)
        );
    }

    authenticate = async (username: string, password: string): Promise<User | null> => {
        const user = this.users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
        if (user && user.password === password) {
          return Promise.resolve(user);
        }
        return Promise.resolve(null);
    }

    createUser = async ({ username, password, instagramUsername }: { username: string, password: string, instagramUsername?: string }): Promise<User | null> => {
        if (this.users.some(u => u.username.toLowerCase() === username.toLowerCase().trim())) {
          return Promise.resolve(null);
        }

        const newUser: User = {
          id: `user-${Date.now()}`,
          username: username.trim(),
          avatar: username.trim().charAt(0).toUpperCase(),
          password,
          instagramUsername: instagramUsername?.trim() || undefined,
          online: false,
          isAdmin: false,
          verification: { status: 'none' },
          walletBalance: 0,
          inventory: { borders: [], nameColors: [] },
          customization: {},
        };
        
        this.users.push(newUser);

        const announcementChat = this.chats.find(c => c.id === ANNOUNCEMENT_CHAT_ID);
        if (announcementChat) {
            announcementChat.members.push(newUser.id);
        }

        return Promise.resolve(newUser);
    }
    
    requestUserVerification = async (userId: string): Promise<void> => {
        const user = this.users.find(u => u.id === userId);
        if (user) {
            if (!user.verification) user.verification = { status: 'none' };
            if (user.verification.status === 'none') user.verification.status = 'pending';
        }
        return Promise.resolve();
    };

    adminUpdateUserVerification = async (userId: string, verificationDetails: Partial<Verification>): Promise<void> => {
        const user = this.users.find(u => u.id === userId);
        if (user) {
            if (!user.verification) user.verification = { status: 'none' };
            Object.assign(user.verification, verificationDetails);
            if (verificationDetails.status !== 'approved') {
                delete user.verification.badgeType;
                delete user.verification.expiresAt;
            }
            if(verificationDetails.badgeType === undefined) delete user.verification.badgeType;
            if(verificationDetails.expiresAt === undefined) delete user.verification.expiresAt;
        }
        return Promise.resolve();
    };

    login = async (user: User): Promise<User> => {
        if (!this.sessionState.loggedInUserIds.includes(user.id)) {
            this.sessionState.loggedInUserIds.push(user.id);
        }
        this.sessionState.currentUserId = user.id;

        const userToUpdate = this.users.find(u => u.id === user.id);
        if (userToUpdate) {
            userToUpdate.online = true;
        }
        return Promise.resolve(userToUpdate!);
    }
    
    logout = async (): Promise<void> => {
        this.sessionState.loggedInUserIds.forEach(userId => {
            const user = this.users.find(u => u.id === userId);
            if (user) user.online = false;
        });
        this.sessionState = { currentUserId: null, loggedInUserIds: [] };
        return Promise.resolve();
    }

    switchCurrentUser = async (userId: string): Promise<void> => {
        if (this.sessionState.loggedInUserIds.includes(userId)) {
            this.sessionState.currentUserId = userId;
        }
        return Promise.resolve();
    }

    addMessage = async (chatId: string, authorId: string, text: string): Promise<Message> => {
        const newMessage: Message = {
            id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            chatId, authorId, text, timestamp: Date.now(),
        };
        this.messages.push(newMessage);
        return Promise.resolve(newMessage);
    }

    findOrCreateDM = async (user1: User, user2: User): Promise<Chat> => {
        const existingChat = this.chats.find(c => 
            c.type === ChatType.DM && c.members.includes(user1.id) && c.members.includes(user2.id)
        );
        if (existingChat) return Promise.resolve(existingChat);

        const newChat: Chat = {
            id: `chat-dm-${Date.now()}`,
            type: ChatType.DM,
            members: [user1.id, user2.id],
        };
        this.chats.push(newChat);
        return Promise.resolve(newChat);
    }

    createGroupChat = async (creatorId: string, memberIds: string[], groupName: string): Promise<Chat> => {
        const newChat: Chat = {
            id: `chat-group-${Date.now()}`,
            type: ChatType.GROUP,
            name: groupName,
            members: [...new Set([creatorId, ...memberIds])],
            creatorId: creatorId,
        };
        this.chats.push(newChat);
        return Promise.resolve(newChat);
    }

    updateUserProfile = async (userId: string, updates: Partial<User>): Promise<void> => {
        const user = this.users.find(u => u.id === userId);
        if (user) {
            Object.assign(user, updates);
            if (updates.messageLimit === undefined) delete user.messageLimit;
        }
        return Promise.resolve();
    }

    resetUserPassword = async (userId: string, newPassword: string): Promise<void> => {
        const user = this.users.find(u => u.id === userId);
        if (user) user.password = newPassword;
        return Promise.resolve();
    }

    updateGroupDetails = async (chatId: string, details: { name: string; password?: string }): Promise<void> => {
        const chat = this.chats.find(c => c.id === chatId);
        if (chat) {
            chat.name = details.name;
            chat.password = details.password;
        }
        return Promise.resolve();
    }

    updateGroupMembers = async (chatId: string, memberIds: string[]): Promise<void> => {
        const chat = this.chats.find(c => c.id === chatId);
        if (chat) chat.members = memberIds;
        return Promise.resolve();
    }

    deleteUser = async (userId: string): Promise<void> => {
        this.users = this.users.filter(u => u.id !== userId);
        // Note: In a real DB, we'd also clean up messages, chats, connections etc.
        // For this simulation, this is sufficient.
        return Promise.resolve();
    }

    deleteGroup = async (chatId: string): Promise<void> => {
        this.chats = this.chats.filter(c => c.id !== chatId);
        this.messages = this.messages.filter(m => m.chatId !== chatId);
        return Promise.resolve();
    }

    deleteUserChats = async (chatIds: string[]): Promise<void> => {
        if (chatIds.length === 0) return Promise.resolve();
        this.chats = this.chats.filter(c => !chatIds.includes(c.id));
        this.messages = this.messages.filter(m => !chatIds.includes(m.chatId));
        return Promise.resolve();
    }

    addConnection = async (fromUserId: string, toUserId: string): Promise<void> => {
        const newConnection: Connection = {
            id: `conn-${Date.now()}`, fromUserId, toUserId,
            status: ConnectionStatus.PENDING, requestedAt: Date.now(), updatedAt: Date.now(),
        };
        this.connections.push(newConnection);
        return Promise.resolve();
    }

    updateConnection = async (connectionId: string, status: ConnectionStatus): Promise<Connection | null> => {
        const connection = this.connections.find(c => c.id === connectionId);
        if (connection) {
            connection.status = status;
            connection.updatedAt = Date.now();
            return Promise.resolve(connection);
        }
        return Promise.resolve(null);
    }

    deleteConnection = async (connectionId: string): Promise<void> => {
        this.connections = this.connections.filter(c => c.id !== connectionId);
        return Promise.resolve();
    }

    addBroadcastAnnouncement = async (text: string, adminId: string): Promise<void> => {
        const newMessage: Message = {
            id: `announcement-${Date.now()}`, chatId: ANNOUNCEMENT_CHAT_ID,
            authorId: adminId, text, timestamp: Date.now(), type: 'announcement',
        };
        this.messages.push(newMessage);
        return Promise.resolve();
    }

    adminForceConnectionStatus = async (fromUserId: string, toUserId: string, status: ConnectionStatus): Promise<void> => {
        let connection = this.connections.find(c => 
            (c.fromUserId === fromUserId && c.toUserId === toUserId) ||
            (c.fromUserId === toUserId && c.toUserId === fromUserId)
        );
        if (connection) {
            connection.status = status;
            connection.updatedAt = Date.now();
        } else {
            this.connections.push({
                id: `conn-${Date.now()}`, fromUserId, toUserId, status,
                requestedAt: Date.now(), updatedAt: Date.now(),
            });
        }
        return Promise.resolve();
    }

    generatePasswordRecoveryToken = async (email: string): Promise<User | null> => {
        const user = this.users.find(u => u.email === email);
        if (user) {
            const token = Math.random().toString(36).substr(2, 6).toUpperCase();
            user.recoveryToken = token;
            user.recoveryTokenExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes
            return Promise.resolve(user);
        }
        return Promise.resolve(null);
    }

    resetPasswordWithToken = async (token: string, newPassword: string): Promise<User | null> => {
        const user = this.users.find(u => u.recoveryToken === token);
        if (user && user.recoveryTokenExpiry && user.recoveryTokenExpiry > Date.now()) {
            user.password = newPassword;
            delete user.recoveryToken;
            delete user.recoveryTokenExpiry;
            return Promise.resolve(user);
        }
        return Promise.resolve(null);
    }
    
    transferFunds = async (fromUserId: string, toUserId: string, amount: number, description: string): Promise<{success: boolean, message: string}> => {
        const fromUser = this.users.find(u => u.id === fromUserId);
        const toUser = this.users.find(u => u.id === toUserId);
        if (!fromUser || !toUser) return Promise.resolve({ success: false, message: 'User not found.' });
        
        const isFrozen = fromUser.isFrozen && (!fromUser.frozenUntil || fromUser.frozenUntil > Date.now());
        if (isFrozen) return Promise.resolve({ success: false, message: 'Your account is frozen.' });
        if (fromUser.walletBalance < amount) return Promise.resolve({ success: false, message: 'Insufficient funds.' });

        fromUser.walletBalance -= amount;
        toUser.walletBalance += amount;
        
        this.transactions.push({
            id: `txn-${Date.now()}`, type: 'transfer', fromUserId, toUserId,
            amount, timestamp: Date.now(), description,
        });
        
        return Promise.resolve({ success: true, message: 'Transfer successful!' });
    }

    adminGrantFunds = async (toUserId: string, amount: number, description: string): Promise<{success: boolean, message: string}> => {
        const toUser = this.users.find(u => u.id === toUserId);
        if (!toUser) return Promise.resolve({ success: false, message: 'User not found.' });
        
        toUser.walletBalance += amount;
        this.transactions.push({
            id: `txn-${Date.now()}`, type: 'admin_grant', fromUserId: 'admin-grant', toUserId,
            amount, timestamp: Date.now(), description,
        });
        
        return Promise.resolve({ success: true, message: 'Funds granted.' });
    }
    
    purchaseVerification = async (userId: string, cost: number, description: string, verification: Verification): Promise<{success: boolean, message: string}> => {
        const user = this.users.find(u => u.id === userId);
        if (!user) return Promise.resolve({ success: false, message: 'User not found.' });
        if (user.walletBalance < cost) return Promise.resolve({ success: false, message: 'Insufficient funds.' });
        if (user.verification?.status === 'approved' && !user.verification.expiresAt && user.verification.badgeType === verification.badgeType) {
            return Promise.resolve({ success: false, message: 'You already own this permanent badge.' });
        }

        user.walletBalance -= cost;
        user.verification = verification;
        this.transactions.push({
            id: `txn-${Date.now()}`, type: 'purchase', fromUserId: userId, toUserId: 'marketplace',
            amount: cost, timestamp: Date.now(), description,
        });

        return Promise.resolve({ success: true, message: 'Purchase successful!' });
    }

    purchaseCosmetic = async (userId: string, item: { type: 'border' | 'nameColor', id: string, price: number, name: string }): Promise<{success: boolean, message: string}> => {
        const user = this.users.find(u => u.id === userId);
        if (!user) return Promise.resolve({ success: false, message: 'User not found.' });
        if (user.walletBalance < item.price) return Promise.resolve({ success: false, message: 'Insufficient funds.' });

        if (!user.inventory) user.inventory = { borders: [], nameColors: [] };
        const inventoryList = item.type === 'border' ? user.inventory.borders : user.inventory.nameColors;
        if (inventoryList.includes(item.id)) return Promise.resolve({ success: false, message: 'You already own this item.' });

        user.walletBalance -= item.price;
        inventoryList.push(item.id);
        this.transactions.push({
            id: `txn-${Date.now()}`, type: 'purchase', fromUserId: userId, toUserId: 'marketplace',
            amount: item.price, timestamp: Date.now(), description: `Purchased cosmetic: ${item.name}`,
        });
        
        return Promise.resolve({ success: true, message: `${item.name} purchased!` });
    }
    
    equipCustomization = async (userId: string, type: 'border' | 'nameColor', itemId: string | undefined): Promise<void> => {
        const user = this.users.find(u => u.id === userId);
        if (user) {
            if (!user.customization) user.customization = {};
            if (type === 'border') user.customization.profileBorderId = itemId;
            else if (type === 'nameColor') user.customization.nameColorId = itemId;
        }
        return Promise.resolve();
    }

    adminUpdateUserFreezeStatus = async (userId: string, isFrozen: boolean, frozenUntil?: number): Promise<void> => {
        const user = this.users.find(u => u.id === userId);
        if (user) {
            user.isFrozen = isFrozen;
            if (isFrozen) user.frozenUntil = frozenUntil;
            else delete user.frozenUntil;
        }
        return Promise.resolve();
    }
    
    addReport = async (reporterId: string, reportedUserId: string, reason: string, chatIdAtTimeOfReport?: string): Promise<Report> => {
        const newReport: Report = {
            id: `report-${Date.now()}`, reporterId, reportedUserId, reason,
            timestamp: Date.now(), status: 'pending', chatIdAtTimeOfReport
        };
        this.reports.push(newReport);
        await this.addBroadcastAnnouncement("A new user report has been filed. Admins, please review in the Reports panel.", "user-admin-001");
        return Promise.resolve(newReport);
    };
    
    updateReportStatus = async (reportId: string, status: Report['status']): Promise<void> => {
        const report = this.reports.find(r => r.id === reportId);
        if (report) report.status = status;
        return Promise.resolve();
    };
}

export const db = new Database();
// Health check comment
// N