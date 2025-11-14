import { User, Chat, Message, ChatType, Connection, ConnectionStatus } from '../types';

const DB_NAME = 'bakko-db';
const DB_VERSION = 2; // Incremented version for schema change
const DB_UPDATE_KEY = 'bakko-db-update';


// Object store names
const USERS_STORE = 'users';
const CHATS_STORE = 'chats';
const MESSAGES_STORE = 'messages';
const SESSION_STORE = 'session';
const CONNECTIONS_STORE = 'connections'; // New store
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
        // This will trigger the 'storage' event in other tabs of the same origin.
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
                    connectionsStore.createIndex('by-status', 'status', { unique: false });
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
            password: '197700', // The special password
            online: false,
            isAdmin: true,
            isVerified: true,
            verificationStatus: 'approved',
            bio: 'The administrator of BAK-Ko.'
        };
        const getRequest = store.get(adminUser.id);
        let added = false;
        
        return new Promise<void>((resolve, reject) => {
            getRequest.onsuccess = () => {
                if (!getRequest.result) {
                    store.add(adminUser);
                    added = true;
                }
            };
            tx.oncomplete = () => {
                if (added) this.notifyDataChanged();
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
        const db = await this.dbPromise;
        const users = await this.getUsers();
        if (users.some(u => u.username.toLowerCase() === username.toLowerCase().trim())) {
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
          isVerified: false,
          verificationStatus: 'none',
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
    
    updateUserVerification = async (userId: string, status: 'pending' | 'approved' | 'none'): Promise<void> => {
        const db = await this.dbPromise;
        const tx = db.transaction(USERS_STORE, 'readwrite');
        const store = tx.objectStore(USERS_STORE);
        const user = await promisifyRequest(store.get(userId));

        if (user) {
            user.verificationStatus = status;
            user.isVerified = status === 'approved';
            store.put(user);
        }
        
        await new Promise<void>(r => tx.oncomplete = () => r());
        this.notifyDataChanged();
    };

    login = async (user: User): Promise<User> => {
        await this.isInitialized;
        const db = await this.dbPromise;

        // Add to logged in list if not already there
        if (!this.sessionState.loggedInUserIds.includes(user.id)) {
            this.sessionState.loggedInUserIds.push(user.id);
        }
        // Set as current user
        this.sessionState.currentUserId = user.id;

        // Update user's online status
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
    
    // ... (rest of the db.ts file remains the same)
    
}

export const db = new Database();