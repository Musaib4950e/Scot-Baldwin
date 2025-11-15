import { User, Chat, Message, ChatType, Connection, ConnectionStatus, Verification, Transaction, Report, VerificationBadgeType, ProfileCustomization, Inventory, TransactionType, Loan, LoanStatus } from '../types';

// This file has been reverted to a local storage-based implementation for a client-side only experience.
// Data is seeded on first load and then persisted in the browser's localStorage.

// --- Helper Functions ---
const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

// FIX: Added missing formatCurrency helper function.
const formatCurrency = (amount: number | null | undefined) => {
    if (typeof amount !== 'number' || isNaN(amount)) {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(0);
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};


// --- In-memory Database with localStorage persistence ---
class AppDatabase {
    private users: User[] = [];
    private chats: Chat[] = [];
    private messages: Message[] = [];
    private connections: Connection[] = [];
    private transactions: Transaction[] = [];
    private reports: Report[] = [];
    private loans: Loan[] = [];
    private currentUserId: string | null = null;
    private loggedInUserIds: string[] = [];
    private dbKey = 'bak-ko-db';

    constructor() {
        this.load();
    }

    private load() {
        try {
            const data = localStorage.getItem(this.dbKey);
            if (data) {
                const parsedData = JSON.parse(data);
                this.users = parsedData.users || [];
                this.chats = parsedData.chats || [];
                this.messages = parsedData.messages || [];
                this.connections = parsedData.connections || [];
                this.transactions = parsedData.transactions || [];
                this.reports = parsedData.reports || [];
                this.loans = parsedData.loans || [];
                this.currentUserId = parsedData.currentUserId || null;
                this.loggedInUserIds = parsedData.loggedInUserIds || [];

                if (this.users.length === 0) {
                  this.seed();
                } else {
                  // On load, ensure all users are marked as offline until they log in.
                  this.users.forEach(u => u.online = false);
                  this.loggedInUserIds = [];
                  this.currentUserId = null;
                  
                  // Force-update the admin password on every load to ensure it's correct.
                  const admin = this.users.find(u => u.isAdmin);
                  if (admin) {
                      admin.password = '197700';
                  }

                  this.save();
                }
                return;
            }
        } catch (error) {
            console.error("Failed to load data from localStorage", error);
        }
        this.seed();
    }
    
    private save() {
        try {
            const data = {
                users: this.users,
                chats: this.chats,
                messages: this.messages,
                connections: this.connections,
                transactions: this.transactions,
                reports: this.reports,
                loans: this.loans,
                currentUserId: this.currentUserId,
                loggedInUserIds: this.loggedInUserIds,
            };
            localStorage.setItem(this.dbKey, JSON.stringify(data));
        } catch (error) {
            console.error("Failed to save data to localStorage", error);
        }
    }

    private seed() {
        const adminUser: User = { id: generateId('user'), username: 'Admin', password: '197700', avatar: '👑', online: false, isAdmin: true, walletBalance: 999999, verification: { status: 'approved', badgeType: 'aurora' }, inventory: { borders: [], nameColors: [] } };
        const usersData: Omit<User, 'id' | 'online' | 'walletBalance' | 'inventory'>[] = [
            { username: 'Alice', password: 'password', avatar: 'A', bio: 'Frontend Developer', email: 'alice@example.com' },
            { username: 'Bob', password: 'password', avatar: 'B', bio: 'Backend Developer', email: 'bob@example.com' },
            { username: 'Charlie', password: 'password', avatar: 'C', bio: 'Designer' },
            { username: 'David', password: 'password', avatar: 'D', bio: 'Project Manager' },
        ];

        this.users = [adminUser, ...usersData.map(u => ({ ...u, id: generateId('user'), online: false, walletBalance: Math.floor(Math.random() * 200) + 50, inventory: { borders: [], nameColors: [] } }))];
        
        const [alice, bob, charlie, david] = this.users.slice(1);

        this.loans = [
            { id: generateId('loan'), userId: david.id, amount: 500, reason: 'Need to buy a new monitor for work.', status: 'pending', requestedAt: Date.now() - 2 * 24 * 60 * 60 * 1000, updatedAt: Date.now() - 2 * 24 * 60 * 60 * 1000 },
            { id: generateId('loan'), userId: charlie.id, amount: 1200, reason: 'Emergency vet bills for my cat.', status: 'approved', adminNotes: 'Approved due to emergency.', requestedAt: Date.now() - 5 * 24 * 60 * 60 * 1000, updatedAt: Date.now() - 4 * 24 * 60 * 60 * 1000 },
        ];

        const dmAliceBob: Chat = { id: generateId('chat'), type: ChatType.DM, members: [alice.id, bob.id] };
        const dmAliceCharlie: Chat = { id: generateId('chat'), type: ChatType.DM, members: [alice.id, charlie.id] };
        const groupChat: Chat = { id: generateId('chat'), type: ChatType.GROUP, name: 'Project Team', members: [alice.id, bob.id, david.id], creatorId: alice.id };
        this.chats = [dmAliceBob, dmAliceCharlie, groupChat];

        this.messages = [
            { id: generateId('msg'), chatId: dmAliceBob.id, authorId: alice.id, text: 'Hey Bob, how are you?', timestamp: Date.now() - 100000 },
            { id: generateId('msg'), chatId: dmAliceBob.id, authorId: bob.id, text: 'Doing well, Alice! Just pushing the latest changes.', timestamp: Date.now() - 90000 },
            { id: generateId('msg'), chatId: groupChat.id, authorId: david.id, text: 'Welcome to the project team chat!', timestamp: Date.now() - 80000 },
            { id: generateId('msg'), chatId: groupChat.id, authorId: alice.id, text: 'Thanks for setting this up, David!', timestamp: Date.now() - 70000 },
        ];

        this.connections = [
            { id: generateId('conn'), fromUserId: alice.id, toUserId: bob.id, status: ConnectionStatus.ACCEPTED, requestedAt: Date.now() - 200000, updatedAt: Date.now() - 190000 },
            { id: generateId('conn'), fromUserId: alice.id, toUserId: charlie.id, status: ConnectionStatus.ACCEPTED, requestedAt: Date.now() - 200000, updatedAt: Date.now() - 190000 },
            { id: generateId('conn'), fromUserId: david.id, toUserId: alice.id, status: ConnectionStatus.PENDING, requestedAt: Date.now() - 50000, updatedAt: Date.now() - 50000 },
            { id: generateId('conn'), fromUserId: bob.id, toUserId: david.id, status: ConnectionStatus.PENDING, requestedAt: Date.now() - 60000, updatedAt: Date.now() - 60000 },
        ];
        
        this.transactions = []; this.reports = []; this.currentUserId = null; this.loggedInUserIds = [];
        this.save();
    }
    
    // --- Public API ---
    getUsers = () => this.users;
    getChats = () => this.chats;
    getMessages = () => this.messages;
    getConnections = () => this.connections;
    getTransactions = () => this.transactions;
    getReports = () => this.reports;
    getLoans = () => this.loans;
    getCurrentUser = () => this.users.find(u => u.id === this.currentUserId) || null;
    getLoggedInUsers = () => this.users.filter(u => this.loggedInUserIds.includes(u.id));

    authenticate = (username: string, password: string): User | null => this.users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password) || null;
    
    createUser = (params: { username: string, password: string, instagramUsername?: string }): User | null => {
        if (this.users.some(u => u.username.toLowerCase() === params.username.toLowerCase())) return null;
        const newUser: User = { id: generateId('user'), username: params.username, password: params.password, instagramUsername: params.instagramUsername, avatar: params.username.charAt(0).toUpperCase(), online: false, walletBalance: 50, inventory: { borders: [], nameColors: [] } };
        this.users.push(newUser); this.save(); return newUser;
    };

    login = (user: User): User => {
        const userInDb = this.users.find(u => u.id === user.id);
        if (userInDb) {
            userInDb.online = true;
            this.currentUserId = user.id;
            if (!this.loggedInUserIds.includes(user.id)) this.loggedInUserIds.push(user.id);
            this.save();
            return userInDb;
        }
        return user;
    };

    logout = () => {
        this.loggedInUserIds.forEach(id => { const user = this.users.find(u => u.id === id); if (user) user.online = false; });
        this.currentUserId = null; this.loggedInUserIds = []; this.save();
    };

    switchCurrentUser = (userId: string) => { this.currentUserId = userId; this.save(); };
    addMessage = (chatId: string, authorId: string, text: string): Message => {
        const newMessage: Message = { id: generateId('msg'), chatId, authorId, text, timestamp: Date.now() };
        this.messages.push(newMessage); this.save(); return newMessage;
    };

    findOrCreateDM = (user1: User, user2: User): Chat => {
        const existing = this.chats.find(c => c.type === ChatType.DM && c.members.includes(user1.id) && c.members.includes(user2.id));
        if (existing) return existing;
        const newChat: Chat = { id: generateId('chat'), type: ChatType.DM, members: [user1.id, user2.id] };
        this.chats.push(newChat); this.save(); return newChat;
    };

    createGroupChat = (creatorId: string, memberIds: string[], groupName: string): Chat => {
        const allMembers = Array.from(new Set([creatorId, ...memberIds]));
        const newChat: Chat = { id: generateId('chat'), type: ChatType.GROUP, name: groupName, members: allMembers, creatorId };
        this.chats.push(newChat); this.save(); return newChat;
    };

    addConnection = (fromUserId: string, toUserId: string) => {
        const existing = this.connections.find(c => (c.fromUserId === fromUserId && c.toUserId === toUserId) || (c.fromUserId === toUserId && c.toUserId === fromUserId));
        if (!existing) {
            const newConnection: Connection = { id: generateId('conn'), fromUserId, toUserId, status: ConnectionStatus.PENDING, requestedAt: Date.now(), updatedAt: Date.now() };
            this.connections.push(newConnection); this.save();
        }
    };
    
    updateConnection = (connectionId: string, status: ConnectionStatus): Connection | null => {
        const connection = this.connections.find(c => c.id === connectionId);
        if (connection) { connection.status = status; connection.updatedAt = Date.now(); this.save(); return connection; }
        return null;
    };

    updateUserProfile = (userId: string, updates: Partial<User>) => { const user = this.users.find(u => u.id === userId); if (user) { Object.assign(user, updates); this.save(); } };
    resetUserPassword = (userId: string, newPassword: string) => { const user = this.users.find(u => u.id === userId); if (user) { user.password = newPassword; this.save(); } };
    updateGroupDetails = (chatId: string, details: { name: string; password?: string }) => { const chat = this.chats.find(c => c.id === chatId); if (chat) { chat.name = details.name; chat.password = details.password; this.save(); } };
    updateGroupMembers = (chatId: string, memberIds: string[]) => { const chat = this.chats.find(c => c.id === chatId); if (chat) { chat.members = memberIds; this.save(); } };
    deleteUser = (userId: string) => {
        this.users = this.users.filter(u => u.id !== userId);
        this.messages = this.messages.filter(m => m.authorId !== userId);
        this.chats.forEach(c => c.members = c.members.filter(mId => mId !== userId));
        this.chats = this.chats.filter(c => c.members.length > (c.type === 'dm' ? 1 : 0));
        this.connections = this.connections.filter(c => c.fromUserId !== userId && c.toUserId !== userId);
        this.reports = this.reports.filter(r => r.reporterId !== userId && r.reportedUserId !== userId);
        this.loggedInUserIds = this.loggedInUserIds.filter(id => id !== userId);
        if (this.currentUserId === userId) this.currentUserId = null;
        this.save();
    };

    deleteGroup = (chatId: string) => { this.chats = this.chats.filter(c => c.id !== chatId); this.messages = this.messages.filter(m => m.chatId !== chatId); this.save(); };
    deleteUserChats = (chatIds: string[]) => { this.chats = this.chats.filter(c => !chatIds.includes(c.id)); this.messages = this.messages.filter(m => !chatIds.includes(m.chatId)); this.save(); };
    deleteConnection = (connectionId: string) => { this.connections = this.connections.filter(c => c.id !== connectionId); this.save(); };
    addBroadcastAnnouncement = (text: string, adminId: string) => { this.chats.forEach(chat => this.messages.push({ id: generateId('msg'), chatId: chat.id, authorId: adminId, text, timestamp: Date.now(), type: 'announcement' })); this.save(); };
    adminForceConnectionStatus = (fromUserId: string, toUserId: string, status: ConnectionStatus) => {
        let conn = this.connections.find(c => (c.fromUserId === fromUserId && c.toUserId === toUserId) || (c.fromUserId === toUserId && c.toUserId === fromUserId));
        if (conn) { conn.status = status; } else { conn = { id: generateId('conn'), fromUserId, toUserId, status, requestedAt: Date.now(), updatedAt: Date.now() }; this.connections.push(conn); }
        this.save();
    };

    requestUserVerification = (userId: string) => { const user = this.users.find(u => u.id === userId); if (user && (!user.verification || user.verification.status === 'none')) { user.verification = { status: 'pending' }; this.save(); } };
    adminUpdateUserVerification = (userId: string, verificationDetails: Partial<Verification>) => { const user = this.users.find(u => u.id === userId); if (user) { user.verification = { ...user.verification, ...verificationDetails }; this.save(); } };
    transferFunds = (fromUserId: string, toUserId: string, amount: number, description: string) => {
        const fromUser = this.users.find(u => u.id === fromUserId); const toUser = this.users.find(u => u.id === toUserId);
        if (!fromUser || !toUser || fromUser.walletBalance < amount) return { success: false, message: "Transaction failed." };
        fromUser.walletBalance -= amount; toUser.walletBalance += amount;
        this.transactions.push({ id: generateId('txn'), type: 'transfer', fromUserId, toUserId, amount, timestamp: Date.now(), description });
        this.save(); return { success: true, message: `Successfully sent ${formatCurrency(amount)}.` };
    };

    adminGrantFunds = (toUserId: string, amount: number, description: string) => {
        const toUser = this.users.find(u => u.id === toUserId); if (!toUser) return { success: false, message: "User not found." };
        toUser.walletBalance += amount;
        this.transactions.push({ id: generateId('txn'), type: 'admin_grant', fromUserId: 'admin-grant', toUserId, amount, timestamp: Date.now(), description });
        this.save(); return { success: true, message: `Granted ${formatCurrency(amount)} to ${toUser.username}.` };
    };

    purchaseVerification = (userId: string, cost: number, description: string, verification: Verification) => {
        const user = this.users.find(u => u.id === userId); if (!user || user.walletBalance < cost) return { success: false, message: "Purchase failed." };
        user.walletBalance -= cost; user.verification = verification;
        this.transactions.push({ id: generateId('txn'), type: 'purchase', fromUserId: userId, toUserId: 'marketplace', amount: cost, timestamp: Date.now(), description });
        this.save(); return { success: true, message: "Purchase successful!" };
    };

    purchaseCosmetic = (userId: string, item: { type: 'border' | 'nameColor', id: string, price: number, name: string }) => {
        const user = this.users.find(u => u.id === userId);
        if (!user || user.walletBalance < item.price) return { success: false, message: "Insufficient funds." };
        user.walletBalance -= item.price;
        if (!user.inventory) user.inventory = { borders: [], nameColors: [] };
        if (item.type === 'border') user.inventory.borders.push(item.id); else user.inventory.nameColors.push(item.id);
        this.transactions.push({ id: generateId('txn'), type: 'purchase', fromUserId: userId, toUserId: 'marketplace', amount: item.price, timestamp: Date.now(), description: `Purchased ${item.name}` });
        this.save(); return { success: true, message: `${item.name} purchased!` };
    };

    equipCustomization = (userId: string, type: 'border' | 'nameColor', itemId: string | undefined) => {
        const user = this.users.find(u => u.id === userId); if (!user) return;
        if (!user.customization) user.customization = {};
        if (type === 'border') user.customization.profileBorderId = itemId; else user.customization.nameColorId = itemId;
        this.save();
    };

    addReport = (reporterId: string, reportedUserId: string, reason: string, chatIdAtTimeOfReport?: string) => {
        const newReport: Report = { id: generateId('report'), reporterId, reportedUserId, reason, timestamp: Date.now(), status: 'pending', chatIdAtTimeOfReport };
        this.reports.push(newReport); this.save(); return newReport;
    };

    updateReportStatus = (reportId: string, status: Report['status']) => { const report = this.reports.find(r => r.id === reportId); if (report) { report.status = status; this.save(); } };
    adminUpdateUserFreezeStatus = (userId: string, isFrozen: boolean, frozenUntil?: number) => { const user = this.users.find(u => u.id === userId); if (user) { user.isFrozen = isFrozen; user.frozenUntil = frozenUntil; this.save(); } };
    generatePasswordRecoveryToken = (email: string): User | null => {
        const user = this.users.find(u => u.email === email);
        if (user) {
            user.recoveryToken = Math.random().toString(36).substring(2, 8).toUpperCase();
            user.recoveryTokenExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes
            this.save();
            return user;
        }
        return null;
    };

    resetPasswordWithToken = (token: string, newPassword: string): User | null => {
        const user = this.users.find(u => u.recoveryToken === token && u.recoveryTokenExpiry && u.recoveryTokenExpiry > Date.now());
        if (user) {
            user.password = newPassword;
            user.recoveryToken = undefined;
            user.recoveryTokenExpiry = undefined;
            this.save();
            return user;
        }
        return null;
    };

    // --- Loan Methods ---
    addLoanApplication = (userId: string, amount: number, reason: string): Loan => {
        const newLoan: Loan = { id: generateId('loan'), userId, amount, reason, status: 'pending', requestedAt: Date.now(), updatedAt: Date.now() };
        this.loans.push(newLoan);
        this.save();
        return newLoan;
    };

    updateLoanStatus = (loanId: string, status: LoanStatus, adminNotes?: string): Loan | null => {
        const loan = this.loans.find(l => l.id === loanId);
        if (!loan) return null;
        
        loan.status = status;
        loan.updatedAt = Date.now();
        if (adminNotes) loan.adminNotes = adminNotes;

        if (status === 'approved') {
            const user = this.users.find(u => u.id === loan.userId);
            if (user) {
                user.walletBalance += loan.amount;
                this.transactions.push({
                    id: generateId('txn'),
                    type: 'loan',
                    fromUserId: 'admin-grant',
                    toUserId: user.id,
                    amount: loan.amount,
                    timestamp: Date.now(),
                    description: `Loan approved: ${loan.reason}`
                });
            }
        }
        this.save();
        return loan;
    };
}

const DB = new AppDatabase();

const asyncify = <T>(fn: (...args: any[]) => T) => (...args: any[]): Promise<T> => Promise.resolve(fn(...args));

export const db = {
  getUsers: asyncify(DB.getUsers),
  getChats: asyncify(DB.getChats),
  getMessages: asyncify(DB.getMessages),
  getConnections: asyncify(DB.getConnections),
  getTransactions: asyncify(DB.getTransactions),
  getReports: asyncify(DB.getReports),
  getLoans: asyncify(DB.getLoans),
  getCurrentUser: asyncify(DB.getCurrentUser),
  getLoggedInUsers: asyncify(DB.getLoggedInUsers),
  isUserLoggedIn: asyncify(() => !!DB.getCurrentUser()),

  authenticate: asyncify(DB.authenticate),
  createUser: asyncify(DB.createUser),
  login: asyncify(DB.login),
  logout: asyncify(DB.logout),
  
  addMessage: asyncify(DB.addMessage),
  findOrCreateDM: asyncify(DB.findOrCreateDM),
  createGroupChat: asyncify(DB.createGroupChat),
  addConnection: asyncify(DB.addConnection),
  addBroadcastAnnouncement: asyncify(DB.addBroadcastAnnouncement),
  addReport: asyncify(DB.addReport),
  addLoanApplication: asyncify(DB.addLoanApplication),
  
  switchCurrentUser: asyncify(DB.switchCurrentUser),
  updateUserProfile: asyncify(DB.updateUserProfile),
  resetUserPassword: asyncify(DB.resetUserPassword),
  updateGroupDetails: asyncify(DB.updateGroupDetails),
  updateGroupMembers: asyncify(DB.updateGroupMembers),
  updateConnection: asyncify(DB.updateConnection),
  requestUserVerification: asyncify(DB.requestUserVerification),
  adminUpdateUserVerification: asyncify(DB.adminUpdateUserVerification),
  adminForceConnectionStatus: asyncify(DB.adminForceConnectionStatus),
  adminUpdateUserFreezeStatus: asyncify(DB.adminUpdateUserFreezeStatus),
  equipCustomization: asyncify(DB.equipCustomization),
  updateReportStatus: asyncify(DB.updateReportStatus),
  updateLoanStatus: asyncify(DB.updateLoanStatus),

  transferFunds: asyncify(DB.transferFunds),
  adminGrantFunds: asyncify(DB.adminGrantFunds),
  purchaseVerification: asyncify(DB.purchaseVerification),
  purchaseCosmetic: asyncify(DB.purchaseCosmetic),

  generatePasswordRecoveryToken: asyncify(DB.generatePasswordRecoveryToken),
  resetPasswordWithToken: asyncify(DB.resetPasswordWithToken),
  
  deleteUser: asyncify(DB.deleteUser),
  deleteGroup: asyncify(DB.deleteGroup),
  deleteUserChats: asyncify(DB.deleteUserChats),
  deleteConnection: asyncify(DB.deleteConnection),
};


// --- STATIC DATA ---
export const MARKETPLACE_ITEMS = {
    borders: [
        { id: 'border-neon-purple', name: 'Neon Purple Glow', price: 150, style: { padding: '2px', boxShadow: '0 0 10px #a855f7, 0 0 15px #a855f7', border: '2px solid #a855f780' } },
        { id: 'border-cyan-pulse', name: 'Cyan Pulse', price: 200, style: { padding: '2px', animation: 'pulse-cyan 2s infinite', boxShadow: '0 0 8px #22d3ee' } },
        { id: 'border-gold-solid', name: 'Solid Gold', price: 500, style: { padding: '2px', border: '3px solid #f59e0b' } },
        // FIX: Changed React.CSSProperties to any to remove React dependency.
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