import { User, Chat, Message, ChatType, Connection, ConnectionStatus } from '../types';

const DB_NAME = 'bakko-db';
const DB_VERSION = 2; // Incremented version for schema change

// Object store names
const USERS_STORE = 'users';
const CHATS_STORE = 'chats';
const MESSAGES_STORE = 'messages';
const SESSION_STORE = 'session';
const CONNECTIONS_STORE = 'connections'; // New store

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
                    connectionsStore.createIndex('by-status', 'status', { unique: false });
                }
            };
        });
    }
    
    private async initialize(): Promise<void> {
        await this.ensureAdminExists();
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
            password: '197700', // The special password
            online: false,
            isAdmin: true,
            bio: 'The administrator of BAK-Ko.'
        };
        const getRequest = store.get(adminUser.id);
        
        return new Promise<void>((resolve, reject) => {
            getRequest.onsuccess = () => {
                if (!getRequest.result) {
                    store.add(adminUser);
                }
            };
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
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
        // Preserve order
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
        const existingUsers = await this.getUsers();
        if (existingUsers.some(u => u.username.toLowerCase() === username.toLowerCase().trim())) {
          return null; // Username already exists
        }

        const newUser: User = {
          id: `user-${Date.now()}`,
          username: username.trim(),
          avatar: username.trim().charAt(0).toUpperCase(),
          password,
          instagramUsername: instagramUsername?.trim() || undefined,
          online: false,
          isAdmin: false,
        };
        
        const db = await this.dbPromise;
        const tx = db.transaction(USERS_STORE, 'readwrite');
        await promisifyRequest(tx.objectStore(USERS_STORE).add(newUser));
        return newUser;
    }

    login = async (user: User): Promise<User> => {
        await this.isInitialized;
        const db = await this.dbPromise;
        const tx = db.transaction([USERS_STORE, SESSION_STORE], 'readwrite');
        const usersStore = tx.objectStore(USERS_STORE);
        const sessionStore = tx.objectStore(SESSION_STORE);
        
        const userToUpdate = await promisifyRequest(usersStore.get(user.id));
        if (!userToUpdate) throw new Error("User not found for login");
        
        userToUpdate.online = true;
        usersStore.put(userToUpdate);
        
        if (!this.sessionState.loggedInUserIds.includes(user.id)) {
            this.sessionState.loggedInUserIds.push(user.id);
        }
        this.sessionState.currentUserId = user.id;

        sessionStore.put({ key: 'sessionState', value: this.sessionState });

        await new Promise(resolve => tx.oncomplete = resolve);
        return userToUpdate;
    };

    switchCurrentUser = async (userId: string): Promise<void> => {
        await this.isInitialized;
        if (!this.sessionState.loggedInUserIds.includes(userId)) {
            console.error("Attempted to switch to a user who is not logged in.");
            return;
        }
        
        this.sessionState.currentUserId = userId;
        
        const db = await this.dbPromise;
        const tx = db.transaction(SESSION_STORE, 'readwrite');
        tx.objectStore(SESSION_STORE).put({ key: 'sessionState', value: this.sessionState });
        await new Promise(resolve => tx.oncomplete = resolve);
    }
    
    logout = async (): Promise<void> => {
        await this.isInitialized;
        if (this.sessionState.loggedInUserIds.length === 0) return;

        const db = await this.dbPromise;
        const tx = db.transaction([USERS_STORE, SESSION_STORE], 'readwrite');
        const usersStore = tx.objectStore(USERS_STORE);
        const sessionStore = tx.objectStore(SESSION_STORE);
        
        for (const userId of this.sessionState.loggedInUserIds) {
            const userToUpdate = await promisifyRequest(usersStore.get(userId));
            if (userToUpdate) {
                userToUpdate.online = false;
                usersStore.put(userToUpdate);
            }
        }
        
        this.sessionState = { currentUserId: null, loggedInUserIds: [] };
        sessionStore.put({ key: 'sessionState', value: this.sessionState });
        
        await new Promise(resolve => tx.oncomplete = resolve);
    };

    addMessage = async (chatId: string, authorId: string, text: string): Promise<Message> => {
        await this.isInitialized;
        const newMessage: Message = {
            id: `msg-${Date.now()}`,
            chatId,
            authorId,
            text,
            timestamp: Date.now(),
        };
        const db = await this.dbPromise;
        const tx = db.transaction(MESSAGES_STORE, 'readwrite');
        await promisifyRequest(tx.objectStore(MESSAGES_STORE).add(newMessage));
        return newMessage;
    };
    
    findOrCreateDM = async (currentUser: User, targetUser: User): Promise<Chat> => {
        await this.isInitialized;
        const allChats = await this.getChats();
        const existingChat = allChats.find(chat => 
            chat.type === ChatType.DM &&
            chat.members.length === 2 &&
            chat.members.includes(currentUser.id) &&
            chat.members.includes(targetUser.id)
        );
        if (existingChat) return existingChat;

        const newChat: Chat = {
          id: `chat-${Date.now()}`,
          type: ChatType.DM,
          members: [currentUser.id, targetUser.id],
        };
        const db = await this.dbPromise;
        const tx = db.transaction(CHATS_STORE, 'readwrite');
        await promisifyRequest(tx.objectStore(CHATS_STORE).add(newChat));
        return newChat;
    };

    createGroupChat = async (creatorId: string, memberIds: string[], groupName: string): Promise<Chat> => {
        await this.isInitialized;
        const allMemberIds = [...new Set([creatorId, ...memberIds])];
        const newChat: Chat = {
          id: `chat-${Date.now()}`,
          type: ChatType.GROUP,
          name: groupName.trim(),
          members: allMemberIds,
          creatorId: creatorId,
        };
        const db = await this.dbPromise;
        const tx = db.transaction(CHATS_STORE, 'readwrite');
        await promisifyRequest(tx.objectStore(CHATS_STORE).add(newChat));
        return newChat;
    };

    generatePasswordRecoveryToken = async (email: string): Promise<User | null> => {
        await this.isInitialized;
        const users = await this.getUsers();
        const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase().trim());
        if (!user) return null;

        const token = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = Date.now() + 10 * 60 * 1000; // 10 minutes
        user.recoveryToken = token;
        user.recoveryTokenExpiry = expiry;
        
        const db = await this.dbPromise;
        const tx = db.transaction(USERS_STORE, 'readwrite');
        await promisifyRequest(tx.objectStore(USERS_STORE).put(user));
        return user;
    }

    resetPasswordWithToken = async (token: string, newPassword: string): Promise<User | null> => {
        await this.isInitialized;
        const users = await this.getUsers();
        const user = users.find(u => u.recoveryToken === token);
        if (!user) return null;

        const db = await this.dbPromise;
        const tx = db.transaction(USERS_STORE, 'readwrite');
        const store = tx.objectStore(USERS_STORE);

        if (!user.recoveryTokenExpiry || user.recoveryTokenExpiry < Date.now()) {
            user.recoveryToken = undefined;
            user.recoveryTokenExpiry = undefined;
            await promisifyRequest(store.put(user));
            return null;
        }

        user.password = newPassword;
        user.recoveryToken = undefined;
        user.recoveryTokenExpiry = undefined;
        await promisifyRequest(store.put(user));
        return user;
    }

    // --- Connection Methods ---
    addConnection = async (fromUserId: string, toUserId: string): Promise<Connection | null> => {
        await this.isInitialized;
        const db = await this.dbPromise;
        const tx = db.transaction(CONNECTIONS_STORE, 'readwrite');
        const store = tx.objectStore(CONNECTIONS_STORE);
        const index = store.index('by-from-to');

        // Check if a connection already exists in either direction
        const existing1 = await promisifyRequest(index.get([fromUserId, toUserId]));
        const existing2 = await promisifyRequest(index.get([toUserId, fromUserId]));
        if (existing1 || existing2) {
            console.log("Connection already exists or is pending.");
            return null;
        }

        const newConnection: Connection = {
            id: `conn-${Date.now()}`,
            fromUserId,
            toUserId,
            status: ConnectionStatus.PENDING,
            requestedAt: Date.now(),
            updatedAt: Date.now(),
        };

        await promisifyRequest(store.add(newConnection));
        return newConnection;
    };

    updateConnection = async (connectionId: string, status: ConnectionStatus): Promise<Connection | null> => {
        await this.isInitialized;
        const db = await this.dbPromise;
        const tx = db.transaction(CONNECTIONS_STORE, 'readwrite');
        const store = tx.objectStore(CONNECTIONS_STORE);
        const connection = await promisifyRequest(store.get(connectionId));
        if (!connection) return null;

        connection.status = status;
        connection.updatedAt = Date.now();
        await promisifyRequest(store.put(connection));
        return connection;
    }
    
    deleteConnection = async (connectionId: string): Promise<void> => {
        await this.isInitialized;
        const db = await this.dbPromise;
        const tx = db.transaction(CONNECTIONS_STORE, 'readwrite');
        await promisifyRequest(tx.objectStore(CONNECTIONS_STORE).delete(connectionId));
    };

    // --- Admin Methods ---
    updateUserProfile = async (userId: string, profileData: { avatar?: string, bio?: string, email?: string, phone?: string, messageLimit?: number }): Promise<User | null> => {
        await this.isInitialized;
        const db = await this.dbPromise;
        const tx = db.transaction(USERS_STORE, 'readwrite');
        const store = tx.objectStore(USERS_STORE);
        const user = await promisifyRequest(store.get(userId));
        if (!user) return null;
        
        user.avatar = profileData.avatar ?? user.avatar;
        user.bio = profileData.bio ?? user.bio;
        user.email = profileData.email ?? user.email;
        user.phone = profileData.phone ?? user.phone;
        user.messageLimit = profileData.messageLimit ?? user.messageLimit;

        await promisifyRequest(store.put(user));
        return user;
    };

    resetUserPassword = async (userId: string, newPassword: string): Promise<User | null> => {
        await this.isInitialized;
        const db = await this.dbPromise;
        const tx = db.transaction(USERS_STORE, 'readwrite');
        const store = tx.objectStore(USERS_STORE);
        const user = await promisifyRequest(store.get(userId));
        if (!user) return null;
        user.password = newPassword;
        await promisifyRequest(store.put(user));
        return user;
    };
    
    updateGroupDetails = async (chatId: string, details: { name?: string, password?: string }): Promise<Chat | null> => {
        await this.isInitialized;
        const db = await this.dbPromise;
        const tx = db.transaction(CHATS_STORE, 'readwrite');
        const store = tx.objectStore(CHATS_STORE);
        const chat = await promisifyRequest(store.get(chatId));
        if (!chat) return null;

        if(details.name) chat.name = details.name.trim();
        if(Object.prototype.hasOwnProperty.call(details, 'password')) {
            chat.password = details.password || undefined;
        }
        await promisifyRequest(store.put(chat));
        return chat;
    };

    updateGroupMembers = async (chatId: string, memberIds: string[]): Promise<Chat | null> => {
        await this.isInitialized;
        const db = await this.dbPromise;
        const tx = db.transaction(CHATS_STORE, 'readwrite');
        const store = tx.objectStore(CHATS_STORE);
        const chat = await promisifyRequest(store.get(chatId));
        if (!chat) return null;
        chat.members = memberIds;
        await promisifyRequest(store.put(chat));
        return chat;
    };

    deleteUser = async (userId: string): Promise<void> => {
        await this.isInitialized;
        const db = await this.dbPromise;
        const tx = db.transaction([USERS_STORE, CHATS_STORE, MESSAGES_STORE, CONNECTIONS_STORE], 'readwrite');
        const usersStore = tx.objectStore(USERS_STORE);
        const chatsStore = tx.objectStore(CHATS_STORE);
        const messagesStore = tx.objectStore(MESSAGES_STORE);
        const connectionsStore = tx.objectStore(CONNECTIONS_STORE);

        usersStore.delete(userId);
        
        // Clean up connections
        const allConnections = await promisifyRequest(connectionsStore.getAll());
        for (const conn of allConnections) {
            if (conn.fromUserId === userId || conn.toUserId === userId) {
                connectionsStore.delete(conn.id);
            }
        }
        
        const allChats = await promisifyRequest(chatsStore.getAll());
        const allMessages = await promisifyRequest(messagesStore.getAll());

        for (const chat of allChats) {
            if (chat.members.includes(userId)) {
                const updatedMembers = chat.members.filter(id => id !== userId);
                if (updatedMembers.length < (chat.type === ChatType.DM ? 2 : 1)) {
                    chatsStore.delete(chat.id);
                    // Also delete messages from this chat
                    const messagesInChat = allMessages.filter(m => m.chatId === chat.id);
                    for (const msg of messagesInChat) {
                        messagesStore.delete(msg.id);
                    }
                } else {
                    chat.members = updatedMembers;
                    chatsStore.put(chat);
                }
            }
        }
        
        for (const msg of allMessages) {
            if (msg.authorId === userId) {
                messagesStore.delete(msg.id);
            }
        }
        await new Promise(resolve => tx.oncomplete = resolve);
    };
    
    deleteGroup = async (chatId: string): Promise<void> => {
        await this.isInitialized;
        const db = await this.dbPromise;
        const tx = db.transaction([CHATS_STORE, MESSAGES_STORE], 'readwrite');
        const chatsStore = tx.objectStore(CHATS_STORE);
        const messagesStore = tx.objectStore(MESSAGES_STORE);
        
        chatsStore.delete(chatId);
        
        const msgIndex = messagesStore.index('chatId');
        const keyRange = IDBKeyRange.only(chatId);
        const cursorReq = msgIndex.openCursor(keyRange);
        cursorReq.onsuccess = () => {
            const cursor = cursorReq.result;
            if (cursor) {
                messagesStore.delete(cursor.primaryKey);
                cursor.continue();
            }
        };
        await new Promise(resolve => tx.oncomplete = resolve);
    };

    getMessageStatsForUser = async (userId: string): Promise<{ sent: number, received: number }> => {
        await this.isInitialized;
        const allMessages = await this.getMessages();
        const allChats = await this.getChats();

        const sent = allMessages.filter(m => m.authorId === userId).length;
        let received = 0;
        
        const userChatIds = new Set(allChats.filter(c => c.members.includes(userId)).map(c => c.id));
        for (const msg of allMessages) {
            if (userChatIds.has(msg.chatId) && msg.authorId !== userId) {
                received++;
            }
        }
        return { sent, received };
    }
}

export const db = new Database();