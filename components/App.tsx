import React, { useState, useReducer, useEffect } from 'react';
import { User, Chat, Message, Connection, ConnectionStatus, Verification, Transaction, VerificationBadgeType, Report } from '../types';
import GroupLocker from './GroupLocker';
// FIX: Module '"file:///components/ChatRoom"' has no default export. Added default export to ChatRoom.tsx
import ChatRoom from './ChatRoom';
import AdminPanel from './AdminPanel';
import { db } from './db';

interface CreateGroupChatParams {
  memberIds: string[];
  groupName: string;
}

interface UpdateProfileParams {
  userId: string;
  avatar: string;
  bio: string;
  email: string;
  phone: string;
  messageLimit?: number;
}

interface UpdateGroupDetailsParams {
    chatId: string;
    name: string;
    password?: string;
}


const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loggedInUsers, setLoggedInUsers] = useState<User[]>([]);

  const fetchData = async () => {
    const [usersData, chatsData, messagesData, currentUserData, loggedInUsersData, connectionsData, transactionsData, reportsData] = await Promise.all([
        db.getUsers(),
        db.getChats(),
        db.getMessages(),
        db.getCurrentUser(),
        db.getLoggedInUsers(),
        db.getConnections(),
        db.getTransactions(),
        db.getReports(),
    ]);
    setUsers(usersData);
    setChats(chatsData);
    setMessages(messagesData);
    setCurrentUser(currentUserData);
    setLoggedInUsers(loggedInUsersData);
    setConnections(connectionsData);
    setTransactions(transactionsData);
    setReports(reportsData);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
    
    const handleBeforeUnload = () => {
        if (db.isUserLoggedIn()) {
            db.logout();
        }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
        if (event.key === 'bakko-db-update') {
            fetchData();
        }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
        window.removeEventListener('storage', handleStorageChange);
    };
  }, []);


  const handleLogin = async (user: User) => {
    const loggedInUser = await db.login(user);
    setCurrentUser(loggedInUser);
    setUsers(await db.getUsers());
    setLoggedInUsers(await db.getLoggedInUsers());
  };
  
  const handleLogout = async () => {
    await db.logout();
    setCurrentUser(null);
    setLoggedInUsers([]);
    setUsers(await db.getUsers());
  };

  const handleSwitchUser = async (userId: string) => {
    await db.switchCurrentUser(userId);
    setCurrentUser(await db.getCurrentUser());
  };

  const handleSendMessage = async (chatId: string, text: string) => {
    if (!currentUser) return;
    await db.addMessage(chatId, currentUser.id, text);
    setMessages(await db.getMessages());
  };
  
  const handleCreateChat = async (targetUser: User): Promise<Chat> => {
    if (!currentUser) throw new Error("No current user");
    const newChat = await db.findOrCreateDM(currentUser, targetUser);
    setChats(await db.getChats());
    return newChat;
  };

  const handleCreateGroupChat = async ({memberIds, groupName}: CreateGroupChatParams): Promise<Chat> => {
      if (!currentUser) throw new Error("No current user");
      const newChat = await db.createGroupChat(currentUser.id, memberIds, groupName);
      setChats(await db.getChats());
      return newChat;
  };

  const handleUpdateUserProfile = async ({ userId, avatar, bio, email, phone, messageLimit }: UpdateProfileParams) => {
      await db.updateUserProfile(userId, { avatar, bio, email, phone, messageLimit });
      const updatedUsers = await db.getUsers();
      setUsers(updatedUsers);
      if (currentUser && currentUser.id === userId) {
          setCurrentUser(updatedUsers.find(u => u.id === userId) || null);
      }
  };

  const handleResetUserPassword = async (userId: string, newPassword: string) => {
      await db.resetUserPassword(userId, newPassword);
      setUsers(await db.getUsers());
  };

  const handleUpdateGroupDetails = async ({ chatId, name, password }: UpdateGroupDetailsParams) => {
    await db.updateGroupDetails(chatId, { name, password });
    setChats(await db.getChats());
  };

  const handleUpdateGroupMembers = async (chatId: string, memberIds: string[]) => {
    await db.updateGroupMembers(chatId, memberIds);
    setChats(await db.getChats());
  };

  const handleDeleteUser = async (userId: string) => {
    await db.deleteUser(userId);
    await fetchData();
  };

  const handleDeleteGroup = async (chatId: string) => {
    await db.deleteGroup(chatId);
    setChats(await db.getChats());
    setMessages(await db.getMessages());
  };

  const handleSendRequest = async (toUserId: string) => {
      if (!currentUser) return;
      await db.addConnection(currentUser.id, toUserId);
      setConnections(await db.getConnections());
  };

  const handleUpdateConnection = async (connectionId: string, status: ConnectionStatus) => {
      const updatedConnection = await db.updateConnection(connectionId, status);
      if (updatedConnection && status === ConnectionStatus.ACCEPTED) {
          const user1 = users.find(u => u.id === updatedConnection.fromUserId);
          const user2 = users.find(u => u.id === updatedConnection.toUserId);
          if (user1 && user2) {
              await db.findOrCreateDM(user1, user2);
              setChats(await db.getChats());
          }
      }
      setConnections(await db.getConnections());
  };

  const handleDeleteConnection = async (connectionId: string) => {
      await db.deleteConnection(connectionId);
      setConnections(await db.getConnections());
  };
  
  const handleRequestVerification = async (userId: string) => {
    await db.requestUserVerification(userId);
    await fetchData();
  };

  const handleAdminUpdateUserVerification = async (userId: string, verification: Partial<Verification>) => {
    await db.adminUpdateUserVerification(userId, verification);
    await fetchData();
  };

  const handleBroadcastAnnouncement = async (text: string) => {
    if (!currentUser || !currentUser.isAdmin) return;
    await db.addBroadcastAnnouncement(text, currentUser.id);
    setMessages(await db.getMessages());
    setChats(await db.getChats());
  };
  
  const handleAdminForceConnectionStatus = async (fromUserId: string, toUserId: string, status: ConnectionStatus) => {
    await db.adminForceConnectionStatus(fromUserId, toUserId, status);
    setConnections(await db.getConnections());
  };

  // --- Wallet/Transaction Handlers ---
  const handleTransferFunds = async (toUserId: string, amount: number) => {
    if (!currentUser) return { success: false, message: "Not logged in" };
    const toUser = users.find(u => u.id === toUserId);
    if (!toUser) return { success: false, message: "Recipient not found" };
    const result = await db.transferFunds(currentUser.id, toUserId, amount, `Transfer to ${toUser.username}`);
    if (result.success) await fetchData();
    return result;
  };
  
  const handleAdminGrantFunds = async (toUserId: string, amount: number) => {
    const toUser = users.find(u => u.id === toUserId);
    if (!toUser) return { success: false, message: "Recipient not found" };
    const result = await db.adminGrantFunds(toUserId, amount, `Admin grant to ${toUser.username}`);
    if (result.success) await fetchData();
    return result;
  };

  const handlePurchaseVerification = async (badgeType: VerificationBadgeType, durationDays: number | 'permanent', cost: number) => {
    if (!currentUser) return { success: false, message: "Not logged in" };
    
    const currentVerification = currentUser.verification;
    let expiresAt: number | undefined;

    if (durationDays === 'permanent') {
        expiresAt = undefined;
    } else {
        // Stacking logic: if it's the same temporary badge, add time to the existing expiry.
        const isStacking = currentVerification?.status === 'approved' &&
                           currentVerification.badgeType === badgeType &&
                           currentVerification.expiresAt &&
                           currentVerification.expiresAt > Date.now();
        
        const baseTimestamp = isStacking ? currentVerification.expiresAt : Date.now();
        expiresAt = baseTimestamp + durationDays * 24 * 60 * 60 * 1000;
    }

    const verification: Verification = {
        status: 'approved',
        badgeType,
        expiresAt,
    };
    const description = `Purchased ${badgeType} badge (${durationDays === 'permanent' ? 'Permanent' : `${durationDays} Days`})`;
    const result = await db.purchaseVerification(currentUser.id, cost, description, verification);
    if (result.success) await fetchData();
    return result;
  };
  
  const handleAdminUpdateUserFreezeStatus = async (userId: string, isFrozen: boolean, frozenUntil?: number) => {
    await db.adminUpdateUserFreezeStatus(userId, isFrozen, frozenUntil);
    await fetchData();
  };
  
  const handlePurchaseCosmetic = async (item: { type: 'border' | 'nameColor', id: string, price: number, name: string }) => {
    if (!currentUser) return { success: false, message: "Not logged in" };
    const result = await db.purchaseCosmetic(currentUser.id, item);
    if (result.success) await fetchData();
    return result;
  };
  
  const handleEquipCustomization = async (type: 'border' | 'nameColor', itemId: string | undefined) => {
      if (!currentUser) return;
      await db.equipCustomization(currentUser.id, type, itemId);
      await fetchData();
  };

  const handleReportUser = async (reportedUserId: string, reason: string, chatId?: string) => {
    if (!currentUser) return;
    await db.addReport(currentUser.id, reportedUserId, reason, chatId);
    await fetchData();
  };

  const handleUpdateReportStatus = async (reportId: string, status: Report['status']) => {
    await db.updateReportStatus(reportId, status);
    setReports(await db.getReports());
  };


  if (isLoading) {
    return (
        <div className="animated-gradient text-white min-h-screen w-full flex flex-col items-center justify-center">
            <h1 className="text-5xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-300 mb-4 animate-pulse">BAK -Ko</h1>
            <p className="text-lg text-slate-400">Initializing secure session...</p>
        </div>
    )
  }

  return (
    <div className="text-white min-h-screen w-full font-sans overflow-hidden">
      {currentUser ? (
        currentUser.isAdmin ? (
          <AdminPanel
            currentUser={currentUser}
            users={users}
            chats={chats}
            messages={messages}
            connections={connections}
            transactions={transactions}
            reports={reports}
            onLogout={handleLogout}
            onUpdateUserProfile={handleUpdateUserProfile}
            onResetUserPassword={handleResetUserPassword}
            onUpdateGroupDetails={handleUpdateGroupDetails}
            onUpdateGroupMembers={handleUpdateGroupMembers}
            onDeleteUser={handleDeleteUser}
            onDeleteGroup={handleDeleteGroup}
            onUpdateConnection={handleUpdateConnection}
            onDeleteConnection={handleDeleteConnection}
            onBroadcastAnnouncement={handleBroadcastAnnouncement}
            onAdminForceConnectionStatus={handleAdminForceConnectionStatus}
            onAdminUpdateVerification={handleAdminUpdateUserVerification}
            onAdminGrantFunds={handleAdminGrantFunds}
            onAdminUpdateUserFreezeStatus={handleAdminUpdateUserFreezeStatus}
            onUpdateReportStatus={handleUpdateReportStatus}
          />
        ) : (
          <ChatRoom
            currentUser={currentUser}
            users={users}
            chats={chats}
            messages={messages}
            connections={connections}
            transactions={transactions}
            loggedInUsers={loggedInUsers}
            onSendMessage={handleSendMessage}
            onCreateChat={handleCreateChat}
            onCreateGroupChat={handleCreateGroupChat}
            onLogout={handleLogout}
            onSwitchUser={handleSwitchUser}
            onLogin={handleLogin}
            onSendRequest={handleSendRequest}
            onUpdateConnection={handleUpdateConnection}
            onRequestVerification={handleRequestVerification}
            onUpdateUserProfile={(params) => handleUpdateUserProfile({
                ...params,
                userId: currentUser.id,
                email: currentUser.email || '',
                phone: currentUser.phone || ''
            })}
            onTransferFunds={handleTransferFunds}
            onPurchaseVerification={handlePurchaseVerification}
            onPurchaseCosmetic={handlePurchaseCosmetic}
            onEquipCustomization={handleEquipCustomization}
            onReportUser={handleReportUser}
          />
        )
      ) : (
        <GroupLocker users={users} onLogin={handleLogin} />
      )}
    </div>
  );
};

export default App;