import { User, Chat, Message, ChatType, Connection, ConnectionStatus, Verification, Transaction, TransactionType, Report } from '../types';

const DB_NAME = 'bakko-db';
const DB_VERSION = 4; // Incremented version for schema change
const DB_UPDATE_KEY = 'bakko-db-update';


// Object store names
const USERS_STORE = 'users';
const CHATS_STORE = 'chats';
const MESSAGES_STORE = 'messages';
const SESSION_STORE = 'session';
const CONNECTIONS_STORE = 'connections';
const TRANSACTIONS_STORE = 'transactions';
const REPORTS_STORE = 'reports';
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

// Helper to promisify IDBRequest
const promisifyRequest = <T>(request: IDBRequest<T>): Promise<T> => {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => {
            console.error('IDBRequest error:', request.error);
            reject(request.error);
        };
    });
};

class Database {
    private dbPromise: Promise<IDBDatabase>;
    private isInitialized: Promise<void>;
    private sessionState: SessionState = { currentUserId: null, loggedInUserIds: [] };

    constructor() {
        this.dbPromise = this.openDb();
        this.isInitialized = this.initialize();
    }
    
    private notifyDataChanged = () => {
        try {
            localStorage.setItem(DB_UPDATE_KEY, Date.now().toString());
        } catch (e) {
            console.error("Could not write to localStorage to notify other tabs.", e);
        }
    }
    
    private openDb(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(USERS_STORE)) {
                    const usersStore = db.createObjectStore(USERS_STORE, { keyPath: 'id' });
                    usersStore.createIndex('username', 'username', { unique: true });
                }
                if (!db.objectStoreNames.contains(CHATS_STORE)) {
                    db.createObjectStore(CHATS_STORE, { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains(MESSAGES_STORE)) {
                    const messagesStore = db.createObjectStore(MESSAGES_STORE, { keyPath: 'id' });
                    messagesStore.createIndex('chatId', 'chatId', { unique: false });
                }
                if (!db.objectStoreNames.contains(SESSION_STORE)) {
                    db.createObjectStore(SESSION_STORE, { keyPath: 'key' });
                }
                if (!db.objectStoreNames.contains(CONNECTIONS_STORE)) {
                    const connectionsStore = db.createObjectStore(CONNECTIONS_STORE, { keyPath: 'id' });
                    connectionsStore.createIndex('by-from-to', ['fromUserId', 'toUserId'], { unique: true });
                    connectionsStore.createIndex('by-to-user', 'toUserId', { unique: false });
                }
                if (!db.objectStoreNames.contains(TRANSACTIONS_STORE)) {
                    const transactionsStore = db.createObjectStore(TRANSACTIONS_STORE, { keyPath: 'id' });
                    transactionsStore.createIndex('by-user', ['fromUserId', 'toUserId'], { unique: false });
                }
                if (!db.objectStoreNames.contains(REPORTS_STORE)) {
                    const reportsStore = db.createObjectStore(REPORTS_STORE, { keyPath: 'id' });
                    reportsStore.createIndex('by-reporter', 'reporterId', { unique: false });
                    reportsStore.createIndex('by-reported', 'reportedUserId', { unique: false });
                }
            };
        });
    }
    
    private async initialize(): Promise<void> {
        await this.ensureAdminExists();
        await this.ensureAnnouncementChatExists();
        await this.loadSession();
    }

    private async ensureAdminExists() {
        const db = await this.dbPromise;
        const tx = db.transaction(USERS_STORE, 'readwrite');
        const store = tx.objectStore(USERS_STORE);
        const adminUser: User = {
            id: 'user-admin-001',
            username: 'admin',
            avatar: '👑',
            password: '197700',
            online: false,
            isAdmin: true,
            verification: {
                status: 'approved',
                badgeType: 'aurora',
            },
            bio: 'The administrator of BAK-Ko.',
            walletBalance: 999999999,
        };

        const getRequest = store.get(adminUser.id);
        
        return new Promise<void>((resolve, reject) => {
            getRequest.onsuccess = () => {
                const existingAdmin = getRequest.result;
                if (existingAdmin) {
                    adminUser.online = existingAdmin.online;
                    adminUser.walletBalance = existingAdmin.walletBalance || 999999999;
                }
                store.put(adminUser);
            }
            tx.oncomplete = () => {
                this.notifyDataChanged();
                resolve();
            };
            tx.onerror = () => reject(tx.error);
        });
    }

    private async ensureAnnouncementChatExists() {
        const db = await this.dbPromise;
        const readTx = db.transaction(CHATS_STORE, 'readonly');
        const existingChat = await promisifyRequest(readTx.objectStore(CHATS_STORE).get(ANNOUNCEMENT_CHAT_ID));

        if (!existingChat) {
            const users = await this.getUsers();
            const allUserIds = users.map(u => u.id);
            const announcementChat: Chat = {
                id: ANNOUNCEMENT_CHAT_ID,
                type: ChatType.GROUP,
                name: '📢 Announcements',
                members: allUserIds,
                creatorId: 'user-admin-001',
            };
            
            const writeTx = db.transaction(CHATS_STORE, 'readwrite');
            writeTx.objectStore(CHATS_STORE).add(announcementChat);
            await new Promise<void>(r => writeTx.oncomplete = () => r());
            this.notifyDataChanged();
        }
    }

    private async loadSession(): Promise<void> {
        const db = await this.dbPromise;
        const tx = db.transaction(SESSION_STORE, 'readonly');
        const store = tx.objectStore(SESSION_STORE);
        const result = await promisifyRequest(store.get('sessionState')).catch(() => null);
        this.sessionState = result ? result.value : { currentUserId: null, loggedInUserIds: [] };
    }

    // --- Public API ---
    
    getUsers = async (): Promise<User[]> => {
        await this.isInitialized;
        const db = await this.dbPromise;
        return promisifyRequest(db.transaction(USERS_STORE, 'readonly').objectStore(USERS_STORE).getAll());
    };

    getChats = async (): Promise<Chat[]> => {
        await this.isInitialized;
        const db = await this.dbPromise;
        return promisifyRequest(db.transaction(CHATS_STORE, 'readonly').objectStore(CHATS_STORE).getAll());
    };

    getMessages = async (): Promise<Message[]> => {
        await this.isInitialized;
        const db = await this.dbPromise;
        return promisifyRequest(db.transaction(MESSAGES_STORE, 'readonly').objectStore(MESSAGES_STORE).getAll());
    };
    
    getConnections = async (): Promise<Connection[]> => {
        await this.isInitialized;
        const db = await this.dbPromise;
        return promisifyRequest(db.transaction(CONNECTIONS_STORE, 'readonly').objectStore(CONNECTIONS_STORE).getAll());
    };

    getTransactions = async (): Promise<Transaction[]> => {
        await this.isInitialized;
        const db = await this.dbPromise;
        return promisifyRequest(db.transaction(TRANSACTIONS_STORE, 'readonly').objectStore(TRANSACTIONS_STORE).getAll());
    };
    
    getReports = async (): Promise<Report[]> => {
        await this.isInitialized;
        const db = await this.dbPromise;
        return promisifyRequest(db.transaction(REPORTS_STORE, 'readonly').objectStore(REPORTS_STORE).getAll());
    }

    isUserLoggedIn = (): boolean => !!this.sessionState.currentUserId;
    
    getCurrentUser = async (): Promise<User | null> => {
        await this.isInitialized;
        if (!this.sessionState.currentUserId) return null;
        const db = await this.dbPromise;
        const tx = db.transaction(USERS_STORE, 'readonly');
        return await promisifyRequest(tx.objectStore(USERS_STORE).get(this.sessionState.currentUserId)) || null;
    }

    getLoggedInUsers = async (): Promise<User[]> => {
        await this.isInitialized;
        if (this.sessionState.loggedInUserIds.length === 0) return [];
        const allUsers = await this.getUsers();
        return this.sessionState.loggedInUserIds
            .map(id => allUsers.find(u => u.id === id))
            .filter((u): u is User => !!u);
    }

    authenticate = async (username: string, password: string): Promise<User | null> => {
        await this.isInitialized;
        const users = await this.getUsers();
        const user = users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
        if (user && user.password === password) {
          return user;
        }
        return null;
    }

    createUser = async ({ username, password, instagramUsername }: { username: string, password: string, instagramUsername?: string }): Promise<User | null> => {
        await this.isInitialized;
        const db = await this.dbPromise;
        const users = await this.getUsers();
        if (users.some(u => u.username.toLowerCase() === username.toLowerCase().trim())) {
          return null;
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
        
        const userTx = db.transaction(USERS_STORE, 'readwrite');
        userTx.objectStore(USERS_STORE).add(newUser);
        await new Promise<void>(r => userTx.oncomplete = () => r());

        const chatTx = db.transaction(CHATS_STORE, 'readwrite');
        const chatStore = chatTx.objectStore(CHATS_STORE);
        const announcementChatReq = chatStore.get(ANNOUNCEMENT_CHAT_ID);
        announcementChatReq.onsuccess = () => {
            const chat = announcementChatReq.result;
            if (chat) {
                chat.members.push(newUser.id);
                chatStore.put(chat);
            }
        };

        await new Promise<void>(r => chatTx.oncomplete = () => r());

        this.notifyDataChanged();
        return newUser;
    }
    
    requestUserVerification = async (userId: string): Promise<void> => {
        const db = await this.dbPromise;
        const tx = db.transaction(USERS_STORE, 'readwrite');
        const store = tx.objectStore(USERS_STORE);
        const user = await promisifyRequest(store.get(userId));

        if (user) {
            if (!user.verification) {
                user.verification = { status: 'none' };
            }
            if (user.verification.status === 'none') {
                user.verification.status = 'pending';
                store.put(user);
            }
        }
        
        await new Promise<void>(r => tx.oncomplete = () => r());
        this.notifyDataChanged();
    };

    adminUpdateUserVerification = async (userId: string, verificationDetails: Partial<Verification>): Promise<void> => {
        const db = await this.dbPromise;
        const tx = db.transaction(USERS_STORE, 'readwrite');
        const store = tx.objectStore(USERS_STORE);
        const user = await promisifyRequest(store.get(userId));

        if (user) {
            if (!user.verification) {
                user.verification = { status: 'none' };
            }
            Object.assign(user.verification, verificationDetails);

            if (verificationDetails.status !== 'approved') {
                delete user.verification.badgeType;
                delete user.verification.expiresAt;
            }

            if(verificationDetails.badgeType === undefined) {
                delete user.verification.badgeType;
            }
            if(verificationDetails.expiresAt === undefined) {
                delete user.verification.expiresAt;
            }
            
            store.put(user);
        }
        
        await new Promise<void>(r => tx.oncomplete = () => r());
        this.notifyDataChanged();
    };

    login = async (user: User): Promise<User> => {
        await this.isInitialized;
        const db = await this.dbPromise;

        if (!this.sessionState.loggedInUserIds.includes(user.id)) {
            this.sessionState.loggedInUserIds.push(user.id);
        }
        this.sessionState.currentUserId = user.id;

        const tx = db.transaction(USERS_STORE, 'readwrite');
        const store = tx.objectStore(USERS_STORE);
        const userToUpdate = await promisifyRequest(store.get(user.id));
        if (userToUpdate) {
            userToUpdate.online = true;
            store.put(userToUpdate);
        }
        
        await new Promise<void>(r => tx.oncomplete = () => r());

        await this.saveSession();
        this.notifyDataChanged();
        return (await this.getCurrentUser())!;
    }
    
    private async saveSession(): Promise<void> {
        const db = await this.dbPromise;
        const tx = db.transaction(SESSION_STORE, 'readwrite');
        tx.objectStore(SESSION_STORE).put({ key: 'sessionState', value: this.sessionState });
        await new Promise<void>(r => tx.oncomplete = () => r());
    }

    logout = async (): Promise<void> => {
        await this.isInitialized;
        if (!this.sessionState.currentUserId) return;

        const db = await this.dbPromise;
        const loggedInIds = [...this.sessionState.loggedInUserIds];
        
        for (const userId of loggedInIds) {
            const tx = db.transaction(USERS_STORE, 'readwrite');
            const store = tx.objectStore(USERS_STORE);
            const user = await promisifyRequest(store.get(userId));
            if (user) {
                user.online = false;
                store.put(user);
            }
            await new Promise<void>(resolve => { tx.oncomplete = () => resolve() });
        }

        this.sessionState = { currentUserId: null, loggedInUserIds: [] };
        await this.saveSession();
        this.notifyDataChanged();
    }

    switchCurrentUser = async (userId: string): Promise<void> => {
        await this.isInitialized;
        if (this.sessionState.loggedInUserIds.includes(userId)) {
            this.sessionState.currentUserId = userId;
            await this.saveSession();
            this.notifyDataChanged();
        }
    }

    addMessage = async (chatId: string, authorId: string, text: string): Promise<Message> => {
        await this.isInitialized;
        const newMessage: Message = {
            id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            chatId,
            authorId,
            text,
            timestamp: Date.now(),
        };
        const db = await this.dbPromise;
        const tx = db.transaction(MESSAGES_STORE, 'readwrite');
        tx.objectStore(MESSAGES_STORE).add(newMessage);
        await new Promise<void>(r => tx.oncomplete = () => r());
        this.notifyDataChanged();
        return newMessage;
    }

    findOrCreateDM = async (user1: User, user2: User): Promise<Chat> => {
        await this.isInitialized;
        const chats = await this.getChats();
        const existingChat = chats.find(c => 
            c.type === ChatType.DM && 
            c.members.includes(user1.id) && 
            c.members.includes(user2.id)
        );

        if (existingChat) {
            return existingChat;
        }

        const newChat: Chat = {
            id: `chat-dm-${Date.now()}`,
            type: ChatType.DM,
            members: [user1.id, user2.id],
        };
        const db = await this.dbPromise;
        const tx = db.transaction(CHATS_STORE, 'readwrite');
        tx.objectStore(CHATS_STORE).add(newChat);
        await new Promise<void>(r => tx.oncomplete = () => r());
        this.notifyDataChanged();
        return newChat;
    }

    createGroupChat = async (creatorId: string, memberIds: string[], groupName: string): Promise<Chat> => {
        await this.isInitialized;
        const newChat: Chat = {
            id: `chat-group-${Date.now()}`,
            type: ChatType.GROUP,
            name: groupName,
            members: [...new Set([creatorId, ...memberIds])],
            creatorId: creatorId,
        };
        const db = await this.dbPromise;
        const tx = db.transaction(CHATS_STORE, 'readwrite');
        tx.objectStore(CHATS_STORE).add(newChat);
        await new Promise<void>(r => tx.oncomplete = () => r());
        this.notifyDataChanged();
        return newChat;
    }

    updateUserProfile = async (userId: string, updates: Partial<User>): Promise<void> => {
        await this.isInitialized;
        const db = await this.dbPromise;
        const tx = db.transaction(USERS_STORE, 'readwrite');
        const store = tx.objectStore(USERS_STORE);
        const user = await promisifyRequest(store.get(userId));
        if (user) {
            Object.assign(user, updates);
            if (updates.messageLimit === undefined) {
                delete user.messageLimit;
            }
            store.put(user);
        }
        await new Promise<void>(r => tx.oncomplete = () => r());
        this.notifyDataChanged();
    }

    resetUserPassword = async (userId: string, newPassword: string): Promise<void> => {
        await this.isInitialized;
        const db = await this.dbPromise;
        const tx = db.transaction(USERS_STORE, 'readwrite');
        const store = tx.objectStore(USERS_STORE);
        const user = await promisifyRequest(store.get(userId));
        if (user) {
            user.password = newPassword;
            store.put(user);
        }
        await new Promise<void>(r => tx.oncomplete = () => r());
        this.notifyDataChanged();
    }

    updateGroupDetails = async (chatId: string, details: { name: string; password?: string }): Promise<void> => {
        await this.isInitialized;
        const db = await this.dbPromise;
        const tx = db.transaction(CHATS_STORE, 'readwrite');
        const store = tx.objectStore(CHATS_STORE);
        const chat = await promisifyRequest(store.get(chatId));
        if (chat) {
            chat.name = details.name;
            chat.password = details.password;
            store.put(chat);
        }
        await new Promise<void>(r => tx.oncomplete = () => r());
        this.notifyDataChanged();
    }

    updateGroupMembers = async (chatId: string, memberIds: string[]): Promise<void> => {
        await this.isInitialized;
        const db = await this.dbPromise;
        const tx = db.transaction(CHATS_STORE, 'readwrite');
        const store = tx.objectStore(CHATS_STORE);
        const chat = await promisifyRequest(store.get(chatId));
        if (chat) {
            chat.members = memberIds;
            store.put(chat);
        }
        await new Promise<void>(r => tx.oncomplete = () => r());
        this.notifyDataChanged();
    }

    deleteUser = async (userId: string): Promise<void> => {
        await this.isInitialized;
        const db = await this.dbPromise;
        const tx = db.transaction([USERS_STORE, MESSAGES_STORE, CHATS_STORE, CONNECTIONS_STORE], 'readwrite');
        tx.objectStore(USERS_STORE).delete(userId);
        await new Promise<void>(r => tx.oncomplete = () => r());
        this.notifyDataChanged();
    }

    deleteGroup = async (chatId: string): Promise<void> => {
        await this.isInitialized;
        const db = await this.dbPromise;
        const tx = db.transaction([CHATS_STORE, MESSAGES_STORE], 'readwrite');
        tx.objectStore(CHATS_STORE).delete(chatId);
        const msgStore = tx.objectStore(MESSAGES_STORE);
        const msgIndex = msgStore.index('chatId');
        
        const keys = await promisifyRequest(msgIndex.getAllKeys(IDBKeyRange.only(chatId)));
        for (const key of keys) {
            msgStore.delete(key);
        }

        await new Promise<void>(r => tx.oncomplete = () => r());
        this.notifyDataChanged();
    }

    deleteUserChats = async (chatIds: string[]): Promise<void> => {
        await this.isInitialized;
        if (chatIds.length === 0) return;

        const db = await this.dbPromise;
        const tx = db.transaction([CHATS_STORE, MESSAGES_STORE], 'readwrite');
        const chatStore = tx.objectStore(CHATS_STORE);
        const messageStore = tx.objectStore(MESSAGES_STORE);
        const messageIndex = messageStore.index('chatId');

        const deletePromises = chatIds.map(chatId => {
            // Safeguard: never delete the global announcements chat
            if (chatId === ANNOUNCEMENT_CHAT_ID) {
                return Promise.resolve();
            }

            // Delete the chat itself
            chatStore.delete(chatId);

            // Delete all messages associated with the chat
            return new Promise<void>(resolve => {
                const keyRange = IDBKeyRange.only(chatId);
                const cursorReq = messageIndex.openCursor(keyRange);
                cursorReq.onsuccess = () => {
                    const cursor = cursorReq.result;
                    if (cursor) {
                        cursor.delete();
                        cursor.continue();
                    } else {
                        resolve();
                    }
                };
                 cursorReq.onerror = () => {
                    console.error("Cursor error in message deletion");
                    resolve(); // Resolve anyway to not block other deletions
                };
            });
        });

        await Promise.all(deletePromises);
        
        await new Promise<void>(r => tx.oncomplete = () => r());
        this.notifyDataChanged();
    }

    addConnection = async (fromUserId: string, toUserId: string): Promise<void> => {
        await this.isInitialized;
        const newConnection: Connection = {
            id: `conn-${Date.now()}`,
            fromUserId,
            toUserId,
            status: ConnectionStatus.PENDING,
            requestedAt: Date.now(),
            updatedAt: Date.now(),
        };
        const db = await this.dbPromise;
        const tx = db.transaction(CONNECTIONS_STORE, 'readwrite');
        tx.objectStore(CONNECTIONS_STORE).add(newConnection);
        await new Promise<void>(r => tx.oncomplete = () => r());
        this.notifyDataChanged();
    }

    updateConnection = async (connectionId: string, status: ConnectionStatus): Promise<Connection | null> => {
        await this.isInitialized;
        const db = await this.dbPromise;
        const tx = db.transaction(CONNECTIONS_STORE, 'readwrite');
        const store = tx.objectStore(CONNECTIONS_STORE);
        const connection = await promisifyRequest(store.get(connectionId));
        if (connection) {
            connection.status = status;
            connection.updatedAt = Date.now();
            store.put(connection);
        }
        await new Promise<void>(r => tx.oncomplete = () => r());
        this.notifyDataChanged();
        return connection || null;
    }

    deleteConnection = async (connectionId: string): Promise<void> => {
        await this.isInitialized;
        const db = await this.dbPromise;
        const tx = db.transaction(CONNECTIONS_STORE, 'readwrite');
        tx.objectStore(CONNECTIONS_STORE).delete(connectionId);
        await new Promise<void>(r => tx.oncomplete = () => r());
        this.notifyDataChanged();
    }

    addBroadcastAnnouncement = async (text: string, adminId: string): Promise<void> => {
        await this.isInitialized;
        const newMessage: Message = {
            id: `announcement-${Date.now()}`,
            chatId: ANNOUNCEMENT_CHAT_ID,
            authorId: adminId,
            text,
            timestamp: Date.now(),
            type: 'announcement',
        };
        const db = await this.dbPromise;
        const tx = db.transaction(MESSAGES_STORE, 'readwrite');
        tx.objectStore(MESSAGES_STORE).add(newMessage);
        await new Promise<void>(r => tx.oncomplete = () => r());
        this.notifyDataChanged();
    }

    adminForceConnectionStatus = async (fromUserId: string, toUserId: string, status: ConnectionStatus): Promise<void> => {
        await this.isInitialized;
        const connections = await this.getConnections();
        let connection = connections.find(c => 
            (c.fromUserId === fromUserId && c.toUserId === toUserId) ||
            (c.fromUserId === toUserId && c.toUserId === fromUserId)
        );
        if (connection) {
            await this.updateConnection(connection.id, status);
        } else {
            const newConnection: Connection = {
                id: `conn-${Date.now()}`,
                fromUserId,
                toUserId,
                status,
                requestedAt: Date.now(),
                updatedAt: Date.now(),
            };
            const db = await this.dbPromise;
            const tx = db.transaction(CONNECTIONS_STORE, 'readwrite');
            tx.objectStore(CONNECTIONS_STORE).add(newConnection);
            await new Promise<void>(r => tx.oncomplete = () => r());
            this.notifyDataChanged();
        }
    }

    generatePasswordRecoveryToken = async (email: string): Promise<User | null> => {
        await this.isInitialized;
        const users = await this.getUsers();
        const user = users.find(u => u.email === email);
        if (user) {
            const token = Math.random().toString(36).substr(2, 6).toUpperCase();
            user.recoveryToken = token;
            user.recoveryTokenExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes
            await this.updateUserProfile(user.id, { recoveryToken: user.recoveryToken, recoveryTokenExpiry: user.recoveryTokenExpiry });
            return user;
        }
        return null;
    }

    resetPasswordWithToken = async (token: string, newPassword: string): Promise<User | null> => {
        await this.isInitialized;
        const users = await this.getUsers();
        const user = users.find(u => u.recoveryToken === token);
        if (user && user.recoveryTokenExpiry && user.recoveryTokenExpiry > Date.now()) {
            user.password = newPassword;
            delete user.recoveryToken;
            delete user.recoveryTokenExpiry;
            const db = await this.dbPromise;
            const tx = db.transaction(USERS_STORE, 'readwrite');
            tx.objectStore(USERS_STORE).put(user);
            await new Promise<void>(r => tx.oncomplete = () => r());
            this.notifyDataChanged();
            return user;
        }
        return null;
    }
    
    transferFunds = async (fromUserId: string, toUserId: string, amount: number, description: string): Promise<{success: boolean, message: string}> => {
        await this.isInitialized;
        const db = await this.dbPromise;
        const tx = db.transaction([USERS_STORE, TRANSACTIONS_STORE], 'readwrite');
        const userStore = tx.objectStore(USERS_STORE);
        const transactionStore = tx.objectStore(TRANSACTIONS_STORE);

        // FIX: Define fromUserReq and toUserReq before using them.
        const fromUserReq = userStore.get(fromUserId);
        const toUserReq = userStore.get(toUserId);

        return new Promise((resolve) => {
            tx.onerror = () => resolve({ success: false, message: 'Database error.' });
            tx.oncomplete = () => {
                this.notifyDataChanged();
                resolve({ success: true, message: 'Transfer successful!' });
            };

            // FIX: Add types for fromUser and toUser to resolve property access errors.
            Promise.all([promisifyRequest(fromUserReq), promisifyRequest(toUserReq)]).then(([fromUser, toUser]: [User | undefined, User | undefined]) => {
                if (!fromUser || !toUser) {
                    tx.abort();
                    return resolve({ success: false, message: 'User not found.' });
                }
                const isFrozen = fromUser.isFrozen && (!fromUser.frozenUntil || fromUser.frozenUntil > Date.now());
                if (isFrozen) {
                    tx.abort();
                    return resolve({ success: false, message: 'Your account is frozen.' });
                }
                if (fromUser.walletBalance < amount) {
                    tx.abort();
                    return resolve({ success: false, message: 'Insufficient funds.' });
                }

                fromUser.walletBalance -= amount;
                toUser.walletBalance += amount;
                userStore.put(fromUser);
                userStore.put(toUser);

                const newTransaction: Transaction = {
                    id: `txn-${Date.now()}`,
                    type: 'transfer',
                    fromUserId,
                    toUserId,
                    amount,
                    timestamp: Date.now(),
                    description,
                };
                transactionStore.add(newTransaction);
            });
        });
    }

    adminGrantFunds = async (toUserId: string, amount: number, description: string): Promise<{success: boolean, message: string}> => {
        await this.isInitialized;
        const db = await this.dbPromise;
        const tx = db.transaction([USERS_STORE, TRANSACTIONS_STORE], 'readwrite');
        const userStore = tx.objectStore(USERS_STORE);
        const transactionStore = tx.objectStore(TRANSACTIONS_STORE);

        const toUser = await promisifyRequest(userStore.get(toUserId));
        if (!toUser) return { success: false, message: 'User not found.' };

        toUser.walletBalance += amount;
        userStore.put(toUser);

        const newTransaction: Transaction = {
            id: `txn-${Date.now()}`,
            type: 'admin_grant',
            fromUserId: 'admin-grant',
            toUserId,
            amount,
            timestamp: Date.now(),
            description,
        };
        transactionStore.add(newTransaction);
        
        await new Promise<void>(r => tx.oncomplete = () => r());
        this.notifyDataChanged();
        return { success: true, message: 'Funds granted.' };
    }
    
    purchaseVerification = async (userId: string, cost: number, description: string, verification: Verification): Promise<{success: boolean, message: string}> => {
        await this.isInitialized;
        const db = await this.dbPromise;
        const tx = db.transaction([USERS_STORE, TRANSACTIONS_STORE], 'readwrite');
        const userStore = tx.objectStore(USERS_STORE);
        const transactionStore = tx.objectStore(TRANSACTIONS_STORE);

        const user = await promisifyRequest(userStore.get(userId));
        if (!user) return { success: false, message: 'User not found.' };
        if (user.walletBalance < cost) return { success: false, message: 'Insufficient funds.' };

        // Prevent re-buying the same permanent badge
        if (user.verification?.status === 'approved' && !user.verification.expiresAt && user.verification.badgeType === verification.badgeType) {
            return { success: false, message: 'You already own this permanent badge.' };
        }

        user.walletBalance -= cost;
        user.verification = verification;
        userStore.put(user);

        const newTransaction: Transaction = {
            id: `txn-${Date.now()}`,
            type: 'purchase',
            fromUserId: userId,
            toUserId: 'marketplace',
            amount: cost,
            timestamp: Date.now(),
            description,
        };
        transactionStore.add(newTransaction);

        await new Promise<void>(r => tx.oncomplete = () => r());
        this.notifyDataChanged();
        return { success: true, message: 'Purchase successful!' };
    }

    purchaseCosmetic = async (userId: string, item: { type: 'border' | 'nameColor', id: string, price: number, name: string }): Promise<{success: boolean, message: string}> => {
        await this.isInitialized;
        const db = await this.dbPromise;
        const tx = db.transaction([USERS_STORE, TRANSACTIONS_STORE], 'readwrite');
        const userStore = tx.objectStore(USERS_STORE);
        const transactionStore = tx.objectStore(TRANSACTIONS_STORE);

        return new Promise((resolve) => {
            tx.onerror = () => resolve({ success: false, message: 'Database error.' });
            tx.oncomplete = () => {
                this.notifyDataChanged();
                resolve({ success: true, message: `${item.name} purchased!` });
            };
            
            promisifyRequest(userStore.get(userId)).then(user => {
                if (!user) {
                    tx.abort();
                    return resolve({ success: false, message: 'User not found.' });
                }
                if (user.walletBalance < item.price) {
                    tx.abort();
                    return resolve({ success: false, message: 'Insufficient funds.' });
                }

                if (!user.inventory) {
                    user.inventory = { borders: [], nameColors: [] };
                }
                const inventoryList = item.type === 'border' ? user.inventory.borders : user.inventory.nameColors;
                if (inventoryList.includes(item.id)) {
                    tx.abort();
                    return resolve({ success: false, message: 'You already own this item.' });
                }

                user.walletBalance -= item.price;
                inventoryList.push(item.id);
                userStore.put(user);
                
                const newTransaction: Transaction = {
                    id: `txn-${Date.now()}`,
                    type: 'purchase',
                    fromUserId: userId,
                    toUserId: 'marketplace',
                    amount: item.price,
                    timestamp: Date.now(),
                    description: `Purchased cosmetic: ${item.name}`,
                };
                transactionStore.add(newTransaction);
            });
        });
    }
    
    equipCustomization = async (userId: string, type: 'border' | 'nameColor', itemId: string | undefined): Promise<void> => {
        await this.isInitialized;
        const db = await this.dbPromise;
        const tx = db.transaction(USERS_STORE, 'readwrite');
        const store = tx.objectStore(USERS_STORE);
        const user = await promisifyRequest(store.get(userId));
        
        if (user) {
            if (!user.customization) {
                user.customization = {};
            }
            if (type === 'border') {
                user.customization.profileBorderId = itemId;
            } else if (type === 'nameColor') {
                user.customization.nameColorId = itemId;
            }
            store.put(user);
        }
        
        await new Promise<void>(r => tx.oncomplete = () => r());
        this.notifyDataChanged();
    }


    adminUpdateUserFreezeStatus = async (userId: string, isFrozen: boolean, frozenUntil?: number): Promise<void> => {
        await this.isInitialized;
        const db = await this.dbPromise;
        const tx = db.transaction(USERS_STORE, 'readwrite');
        const store = tx.objectStore(USERS_STORE);
        const user = await promisifyRequest(store.get(userId));
        if (user) {
            user.isFrozen = isFrozen;
            if (isFrozen) {
                user.frozenUntil = frozenUntil;
            } else {
                delete user.frozenUntil;
            }
            store.put(user);
        }
        await new Promise<void>(r => tx.oncomplete = () => r());
        this.notifyDataChanged();
    }
    
    addReport = async (reporterId: string, reportedUserId: string, reason: string, chatIdAtTimeOfReport?: string): Promise<Report> => {
        await this.isInitialized;
        const newReport: Report = {
            id: `report-${Date.now()}`,
            reporterId,
            reportedUserId,
            reason,
            timestamp: Date.now(),
            status: 'pending',
            chatIdAtTimeOfReport
        };
        const db = await this.dbPromise;
        const tx = db.transaction(REPORTS_STORE, 'readwrite');
        tx.objectStore(REPORTS_STORE).add(newReport);
        await new Promise<void>(resolve => tx.oncomplete = () => resolve());
        
        // Announce the report
        await this.addBroadcastAnnouncement("A new user report has been filed. Admins, please review in the Reports panel.", "user-admin-001");

        this.notifyDataChanged();
        return newReport;
    };
    
    updateReportStatus = async (reportId: string, status: Report['status']): Promise<void> => {
        await this.isInitialized;
        const db = await this.dbPromise;
        const tx = db.transaction(REPORTS_STORE, 'readwrite');
        const store = tx.objectStore(REPORTS_STORE);
        const report = await promisifyRequest(store.get(reportId));
        if (report) {
            report.status = status;
            store.put(report);
        }
        await new Promise<void>(resolve => tx.oncomplete = () => resolve());
        this.notifyDataChanged();
    };
}

export const db = new Database();
// Health check comment
