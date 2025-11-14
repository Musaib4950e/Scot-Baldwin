import { User, Chat, Message, ChatType, Connection, ConnectionStatus, Verification, Transaction, Report } from '../types';
import { db, auth } from './firebase'; // Import Firebase config
import { 
    doc, getDoc, setDoc, collection, addDoc, getDocs, updateDoc, deleteDoc, query, where, onSnapshot, serverTimestamp, arrayUnion, arrayRemove, writeBatch 
} from "firebase/firestore";
import { 
    createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, updateProfile, sendPasswordResetEmail 
} from "firebase/auth";

// --- Firebase Helper Functions ---

const getCollection = <T>(collectionName: string) => collection(db, collectionName);

const getDocument = async <T>(collectionName: string, id: string): Promise<T | null> => {
    const docRef = doc(db, collectionName, id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as T : null;
};

// --- Refactored DB object with Firebase --- 

export const db_firebase = {

  // --- Auth & User Management ---
  
  onAuthStateChanged: (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const user = await getDocument<User>('users', firebaseUser.uid);
        callback(user);
      } else {
        callback(null);
      }
    });
  },

  authenticate: async (email: string, password: string) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return getDocument<User>('users', userCredential.user.uid);
  },

  createUser: async (params: { email: string, username: string, password: string, instagramUsername?: string }) => {
    const userCredential = await createUserWithEmailAndPassword(auth, params.email, params.password);
    const { user } = userCredential;
    await updateProfile(user, { displayName: params.username });

    const newUser: Omit<User, 'id'> = {
        username: params.username,
        email: params.email,
        instagramUsername: params.instagramUsername || '',
        createdAt: serverTimestamp(),
        isFrozen: false,
        wallet: 500, // Starting balance
        customization: {},
        inventory: { borders: [], nameColors: [] },
        verification: { status: 'unverified' },
        lastOnline: serverTimestamp(),
    };

    await setDoc(doc(db, 'users', user.uid), newUser);
    return { id: user.uid, ...newUser } as User;
  },
  
  logout: () => signOut(auth),

  getCurrentUser: async (): Promise<User | null> => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return null;
    return getDocument<User>('users', firebaseUser.uid);
  },

  isUserLoggedIn: (): boolean => {
    return !!auth.currentUser;
  },

  updateUserProfile: (userId: string, updates: Partial<User>) => {
      const userRef = doc(db, "users", userId);
      return updateDoc(userRef, updates);
  },

  resetUserPassword: (email: string) => {
      return sendPasswordResetEmail(auth, email);
  },

  // --- Chat & Message Operations ---

  getChats: (userId: string) => {
      const chatsRef = collection(db, 'chats');
      const q = query(chatsRef, where('memberIds', 'array-contains', userId));
      return getDocs(q).then(snapshot => snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat)));
  },

  getMessages: (chatId: string, onMessagesUpdate: (messages: Message[]) => void) => {
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef);

    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      onMessagesUpdate(messages);
    });
  },
  
  addMessage: (chatId: string, authorId: string, text: string) => {
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    return addDoc(messagesRef, {
        authorId,
        text,
        timestamp: serverTimestamp(),
    });
  },

  findOrCreateDM: async (user1Id: string, user2Id: string) => {
    const chatsRef = collection(db, 'chats');
    const q = query(chatsRef, 
        where('type', '==', ChatType.DM),
        where('memberIds', 'array-contains', user1Id)
    );

    const snapshot = await getDocs(q);
    const existingChat = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Chat))
        .find(chat => chat.memberIds.includes(user2Id));

    if (existingChat) return existingChat;

    const newChatRef = await addDoc(chatsRef, {
        type: ChatType.DM,
        memberIds: [user1Id, user2Id],
        createdAt: serverTimestamp(),
    });

    return getDocument<Chat>('chats', newChatRef.id);
  },

  createGroupChat: (creatorId: string, memberIds: string[], groupName: string, password?: string) => {
      const chatsRef = collection(db, 'chats');
      return addDoc(chatsRef, {
          name: groupName,
          type: password ? ChatType.PRIVATE_GROUP : ChatType.PUBLIC_GROUP,
          creatorId,
          memberIds: [creatorId, ...memberIds],
          ...(password && { password }),
          createdAt: serverTimestamp(),
      });
  },

  deleteGroup: (chatId: string) => deleteDoc(doc(db, 'chats', chatId)),

  updateGroupDetails: (chatId: string, details: { name: string; password?: string }) => {
      return updateDoc(doc(db, 'chats', chatId), details);
  },

  updateGroupMembers: (chatId: string, memberIds: string[]) => {
      return updateDoc(doc(db, 'chats', chatId), { memberIds });
  },

  // --- Connections ---

  addConnection: (fromUserId: string, toUserId: string) => {
      const connectionsRef = collection(db, 'connections');
      return addDoc(connectionsRef, {
          from: fromUserId,
          to: toUserId,
          status: 'pending',
          createdAt: serverTimestamp()
      });
  },

  updateConnection: (connectionId: string, status: ConnectionStatus) => {
      return updateDoc(doc(db, 'connections', connectionId), { status });
  },

  deleteConnection: (connectionId: string) => deleteDoc(doc(db, 'connections', connectionId)),

  // --- Admin & Reports ---

  addReport: (reporterId: string, reportedUserId: string, reason: string, chatIdAtTimeOfReport?: string) => {
      const reportsRef = collection(db, 'reports');
      return addDoc(reportsRef, { reporterId, reportedUserId, reason, chatIdAtTimeOfReport, status: 'pending', createdAt: serverTimestamp() });
  },

  updateReportStatus: (reportId: string, status: Report['status']) => {
      return updateDoc(doc(db, 'reports', reportId), { status });
  },

  adminUpdateUserFreezeStatus: (userId: string, isFrozen: boolean, frozenUntil?: number) => {
      return updateDoc(doc(db, 'users', userId), { isFrozen, frozenUntil: frozenUntil || null });
  },

  // --- Wallet & Marketplace ---

  transferFunds: async (fromUserId: string, toUserId: string, amount: number, description: string) => {
      const fromUserRef = doc(db, "users", fromUserId);
      const toUserRef = doc(db, "users", toUserId);
      const batch = writeBatch(db);
      const fromUser = await getDocument<User>('users', fromUserId);
      
      if (!fromUser || fromUser.wallet < amount) {
        throw new Error("Insufficient funds");
      }

      batch.update(fromUserRef, { wallet: fromUser.wallet - amount });
      batch.update(toUserRef, { wallet: arrayUnion(amount) });
      await batch.commit();
      // Not implemented: adding transaction to a separate collection for history
  },

   purchaseCosmetic: async (userId: string, item: { type: 'border' | 'nameColor', id: string, price: number, name: string }) => {
    const userRef = doc(db, 'users', userId);
    const user = await getDocument<User>('users', userId);

    if (!user || user.wallet < item.price) {
      throw new Error("Insufficient funds");
    }

    await updateDoc(userRef, {
      wallet: user.wallet - item.price,
      [`inventory.${item.type}s`]: arrayUnion(item.id)
    });
  },

  equipCustomization: (userId: string, type: 'border' | 'nameColor', itemId: string | undefined) => {
    return updateDoc(doc(db, 'users', userId), { [`customization.${type}`]: itemId });
  }

};


// --- STATIC DATA ---
// This can remain static or be moved to Firestore and fetched if it needs to be dynamic.
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
