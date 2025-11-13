import { User, Chat, Message, ChatType } from '../types';

// --- LocalStorage Utility ---
const DB_PREFIX = 'bakko-';
const getStorageKey = (key: string) => `${DB_PREFIX}${key}`;

const readFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const storedValue = localStorage.getItem(getStorageKey(key));
    if (storedValue) {
      return JSON.parse(storedValue);
    }
  } catch (error) {
    console.error(`Error reading from localStorage key “${key}”:`, error);
  }
  return defaultValue;
};

const writeToStorage = <T>(key: string, value: T) => {
  try {
    localStorage.setItem(getStorageKey(key), JSON.stringify(value));
  } catch (error)
    {
    console.error(`Error writing to localStorage key “${key}”:`, error);
  }
};

// --- Database API ---
class Database {
  private users: User[];
  private chats: Chat[];
  private messages: Message[];
  private currentUserId: string | null;

  constructor() {
    this.users = readFromStorage('users', []);
    this.chats = readFromStorage('chats', []);
    this.messages = readFromStorage('messages', []);
    this.currentUserId = readFromStorage('current-user-id', null);
    
    // Ensure admin user exists
    this.ensureAdminExists();
  }
  
  private ensureAdminExists() {
    const adminExists = this.users.some(user => user.username === 'admin');
    if (!adminExists) {
      const adminUser: User = {
        id: 'user-admin-001',
        username: 'admin',
        avatar: '👑',
        password: '197700', // The special password
        online: false,
        isAdmin: true,
        bio: 'The administrator of BAK-Ko.'
      };
      this.users.unshift(adminUser); // Add to the beginning of the list
      this.persistUsers();
    }
  }

  private persistUsers() {
    writeToStorage('users', this.users);
  }
  
  private persistChats() {
    writeToStorage('chats', this.chats);
  }
  
  private persistMessages() {
    writeToStorage('messages', this.messages);
  }
  
  private persistCurrentUserId() {
      writeToStorage('current-user-id', this.currentUserId);
  }

  // --- Public API ---
  
  getUsers = (): User[] => this.users;
  getChats = (): Chat[] => this.chats;
  getMessages = (): Message[] => this.messages;
  
  getCurrentUser = (): User | null => {
      if (!this.currentUserId) return null;
      return this.users.find(u => u.id === this.currentUserId) || null;
  }

  authenticate = (username: string, password: string): User | null => {
    const user = this.users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
    if (user && user.password === password) {
      return user;
    }
    return null;
  }

  createUser = ({ username, password, instagramUsername }: { username: string, password: string, instagramUsername?: string }): User | null => {
    if (this.users.find(u => u.username.toLowerCase() === username.toLowerCase().trim())) {
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
    this.users.push(newUser);
    this.persistUsers();
    return newUser;
  }

  setUserOnlineStatus = (userId: string, status: boolean) => {
    const userIndex = this.users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      this.users[userIndex].online = status;
      this.persistUsers();
    }
  };

  login = (user: User): User => {
    this.currentUserId = user.id;
    this.persistCurrentUserId();
    this.setUserOnlineStatus(user.id, true);
    // Return the user from the potentially updated users array
    return this.users.find(u => u.id === user.id)!;
  };
  
  logout = () => {
    if (this.currentUserId) {
      this.setUserOnlineStatus(this.currentUserId, false);
    }
    this.currentUserId = null;
    this.persistCurrentUserId();
  };

  addMessage = (chatId: string, authorId: string, text: string): Message => {
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      chatId,
      authorId,
      text,
      timestamp: Date.now(),
    };
    this.messages.push(newMessage);
    this.persistMessages();
    return newMessage;
  };
  
  findOrCreateDM = (currentUser: User, targetUser: User): Chat => {
    // Check if DM already exists
    const existingChat = this.chats.find(chat => 
        chat.type === ChatType.DM &&
        chat.members.length === 2 &&
        chat.members.includes(currentUser.id) &&
        chat.members.includes(targetUser.id)
    );

    if (existingChat) {
      return existingChat;
    }

    const newChat: Chat = {
      id: `chat-${Date.now()}`,
      type: ChatType.DM,
      members: [currentUser.id, targetUser.id],
    };
    this.chats.push(newChat);
    this.persistChats();
    return newChat;
  };

  createGroupChat = (creatorId: string, memberIds: string[], groupName: string): Chat => {
    const allMemberIds = [...new Set([creatorId, ...memberIds])]; // Ensure creator is included and no duplicates
    
    const newChat: Chat = {
      id: `chat-${Date.now()}`,
      type: ChatType.GROUP,
      name: groupName.trim(),
      members: allMemberIds,
      creatorId: creatorId, // Store who created the group
    };
    this.chats.push(newChat);
    this.persistChats();
    return newChat;
  };

  generatePasswordRecoveryToken = (email: string): User | null => {
    const userIndex = this.users.findIndex(u => u.email?.toLowerCase() === email.toLowerCase().trim());
    if (userIndex === -1) return null;

    const token = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
    const expiry = Date.now() + 10 * 60 * 1000; // 10 minutes

    this.users[userIndex].recoveryToken = token;
    this.users[userIndex].recoveryTokenExpiry = expiry;
    this.persistUsers();

    return this.users[userIndex];
  }

  resetPasswordWithToken = (token: string, newPassword: string): User | null => {
    const userIndex = this.users.findIndex(u => u.recoveryToken === token);
    if (userIndex === -1) return null;

    const user = this.users[userIndex];
    if (!user.recoveryTokenExpiry || user.recoveryTokenExpiry < Date.now()) {
        // Token expired
        user.recoveryToken = undefined;
        user.recoveryTokenExpiry = undefined;
        this.persistUsers();
        return null;
    }

    user.password = newPassword;
    user.recoveryToken = undefined;
    user.recoveryTokenExpiry = undefined;
    this.persistUsers();

    return user;
  }

  // --- Admin Methods ---
  updateUserProfile = (userId: string, profileData: { avatar?: string, bio?: string, email?: string, phone?: string, messageLimit?: number }): User | null => {
    const userIndex = this.users.findIndex(u => u.id === userId);
    if (userIndex === -1) return null;
    
    const user = this.users[userIndex];

    user.avatar = profileData.avatar ?? user.avatar;
    user.bio = profileData.bio ?? user.bio;
    user.email = profileData.email ?? user.email;
    user.phone = profileData.phone ?? user.phone;
    user.messageLimit = profileData.messageLimit ?? user.messageLimit;

    this.persistUsers();
    return this.users[userIndex];
  };

  resetUserPassword = (userId: string, newPassword: string): User | null => {
      const userIndex = this.users.findIndex(u => u.id === userId);
      if (userIndex === -1) return null;

      this.users[userIndex].password = newPassword;
      this.persistUsers();
      return this.users[userIndex];
  };
  
  updateGroupDetails = (chatId: string, details: { name?: string, password?: string }): Chat | null => {
    const chatIndex = this.chats.findIndex(c => c.id === chatId);
    if (chatIndex === -1) return null;

    const chat = this.chats[chatIndex];
    if(details.name) chat.name = details.name.trim();

    // Check if password key exists to allow setting an empty password
    if(Object.prototype.hasOwnProperty.call(details, 'password')) {
        chat.password = details.password || undefined; // Set to undefined if empty string
    }
    
    this.persistChats();
    return chat;
  };

  updateGroupMembers = (chatId: string, memberIds: string[]): Chat | null => {
    const chatIndex = this.chats.findIndex(c => c.id === chatId);
    if (chatIndex === -1) return null;
    
    this.chats[chatIndex].members = memberIds;
    this.persistChats();
    return this.chats[chatIndex];
  };

  deleteUser = (userId: string): void => {
    // 1. Remove user from all chat member lists
    this.chats.forEach(chat => {
        const memberIndex = chat.members.indexOf(userId);
        if (memberIndex > -1) {
            chat.members.splice(memberIndex, 1);
        }
    });

    // 2. Filter out chats that are now empty or are DMs with < 2 people
    this.chats = this.chats.filter(chat => {
        if (chat.type === ChatType.DM && chat.members.length < 2) return false;
        return chat.members.length > 0;
    });

    // 3. Delete all messages by the user
    this.messages = this.messages.filter(msg => msg.authorId !== userId);
    
    // 4. Remove the user themselves
    this.users = this.users.filter(user => user.id !== userId);

    this.persistUsers();
    this.persistChats();
    this.persistMessages();
  };
  
  deleteGroup = (chatId: string): void => {
    // 1. Delete all messages associated with the group
    this.messages = this.messages.filter(msg => msg.chatId !== chatId);
    
    // 2. Delete the group chat itself
    this.chats = this.chats.filter(chat => chat.id !== chatId);
    
    this.persistChats();
    this.persistMessages();
  };

  getMessageStatsForUser = (userId: string): { sent: number, received: number } => {
    const sent = this.messages.filter(m => m.authorId === userId).length;
    let received = 0;
    
    const userChats = this.chats.filter(c => c.members.includes(userId));
    for (const chat of userChats) {
        received += this.messages.filter(m => m.chatId === chat.id && m.authorId !== userId).length;
    }

    return { sent, received };
  }

}

export const db = new Database();