import { User, Chat, Message, ChatType, Connection, ConnectionStatus, Verification, Transaction, TransactionType } from '../types';

const DB_NAME = 'bakko-db';
const DB_VERSION = 3; // Incremented version for schema change
const DB_UPDATE_KEY = 'bakko-db-update';


// Object store names
const USERS_STORE = 'users';
const CHATS_STORE = 'chats';
const MESSAGES_STORE = 'messages';
const SESSION_STORE = 'session';
const CONNECTIONS_STORE = 'connections';
const TRANSACTIONS_STORE = 'transactions';
const ANNOUNCEMENT_CHAT_ID = 'chat-announcements-global';


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

        const fromUserReq = userStore.get(fromUserId);
        const toUserReq = userStore.get(toUserId);

        return new Promise((resolve) => {
            tx.onerror = () => resolve({ success: false, message: 'Database error.' });
            tx.oncomplete = () => {
                this.notifyDataChanged();
                resolve({ success: true, message: 'Transfer successful!' });
            };

            Promise.all([promisifyRequest(fromUserReq), promisifyRequest(toUserReq)]).then(([fromUser, toUser]) => {
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
    
    purchaseItem = async (userId: string, cost: number, description: string, verification: Verification): Promise<{success: boolean, message: string}> => {
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
}

export const db = new Database();