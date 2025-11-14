

import React, { useState, useReducer, useEffect } from 'react';
import { User, Chat, Message, Connection, ConnectionStatus, Verification, Transaction, VerificationBadgeType, Report } from '../types';
import GroupLocker from './GroupLocker';
import ChatRoom from './ChatRoom';
import { AdminPanel } from './AdminPanel';
import { db_firebase as db } from './db';

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
  const [users, setUsers] = useState<User[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loggedInUsers, setLoggedInUsers] = useState<User[]>([]);

  useEffect(() => {
    const unsubscribe = db.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        // Fetch initial data that doesn't need to be real-time
        db.getChats(user.id).then(setChats);
        // Other data can be fetched here as needed
      } else {
        // Reset states on logout
        setChats([]);
        setMessages([]);
        setConnections([]);
        setTransactions([]);
        setReports([]);
      }
    });

    return () => unsubscribe();
  }, []);


  const handleLogin = async (user: User) => {
    // The onAuthStateChanged listener will handle setting the current user
  };
  
  const handleLogout = async () => {
    await db.logout();
  };

  const handleSwitchUser = async (userId: string) => {
    // This functionality might need to be re-evaluated with Firebase's auth model
  };

  const handleSendMessage = async (chatId: string, text: string) => {
    if (!currentUser) return;
    await db.addMessage(chatId, currentUser.id, text);
  };
  
  const handleCreateChat = async (targetUser: User): Promise<Chat> => {
    if (!currentUser) throw new Error("No current user");
    const newChat = await db.findOrCreateDM(currentUser.id, targetUser.id);
    if(newChat) {
      setChats(prevChats => [...prevChats, newChat]);
      return newChat
    }
    throw new Error("Could not create chat");
  };

  const handleCreateGroupChat = async ({memberIds, groupName}: CreateGroupChatParams): Promise<void> => {
      if (!currentUser) throw new Error("No current user");
      await db.createGroupChat(currentUser.id, memberIds, groupName);
  };

  const handleUpdateUserProfile = async ({ userId, avatar, bio, email, phone, messageLimit }: UpdateProfileParams) => {
      await db.updateUserProfile(userId, { avatar, bio, email, phone, messageLimit });
  };

  const handleResetUserPassword = async (email: string) => {
      await db.resetUserPassword(email);
  };

  const handleUpdateGroupDetails = async ({ chatId, name, password }: UpdateGroupDetailsParams) => {
    await db.updateGroupDetails(chatId, { name, password });
  };

  const handleUpdateGroupMembers = async (chatId: string, memberIds: string[]) => {
    await db.updateGroupMembers(chatId, memberIds);
  };

  const handleDeleteUser = async (userId: string) => {
    // Deleting users is a sensitive operation, not directly implemented in the new db.ts
  };

  const handleDeleteGroup = async (chatId: string) => {
    await db.deleteGroup(chatId);
  };

  const handleDeleteUserChats = async (chatIds: string[]) => {
    // This is a complex operation and would need a specific cloud function or batch write
  };

  const handleSendRequest = async (toUserId: string) => {
      if (!currentUser) return;
      await db.addConnection(currentUser.id, toUserId);
  };

  const handleUpdateConnection = async (connectionId: string, status: ConnectionStatus) => {
      await db.updateConnection(connectionId, status);
  };

  const handleDeleteConnection = async (connectionId: string) => {
      await db.deleteConnection(connectionId);
  };
  
  const handleRequestVerification = async (userId: string) => {
    // Not implemented in new db.ts
  };

  const handleAdminUpdateUserVerification = async (userId: string, verification: Partial<Verification>) => {
    // Not implemented in new db.ts
  };

  const handleBroadcastAnnouncement = async (text: string) => {
    // Not implemented in new db.ts
  };
  
  const handleAdminForceConnectionStatus = async (fromUserId: string, toUserId: string, status: ConnectionStatus) => {
    // Not implemented in new db.ts
  };

  // --- Wallet/Transaction Handlers ---
  const handleTransferFunds = async (toUserId: string, amount: number) => {
    if (!currentUser) return { success: false, message: "Not logged in" };
    try {
      await db.transferFunds(currentUser.id, toUserId, amount, `Transfer`);
      return { success: true, message: "Transfer successful" };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  };
  
  const handleAdminGrantFunds = async (toUserId: string, amount: number) => {
    // Not implemented in new db.ts
    return { success: false, message: "Not implemented" };
  };

  const handlePurchaseVerification = async (badgeType: VerificationBadgeType, durationDays: number | 'permanent', cost: number) => {
    // Not implemented in new db.ts
    return { success: false, message: "Not implemented" };
  };
  
  const handleAdminUpdateUserFreezeStatus = async (userId: string, isFrozen: boolean, frozenUntil?: number) => {
    await db.adminUpdateUserFreezeStatus(userId, isFrozen, frozenUntil);
  };
  
  const handlePurchaseCosmetic = async (item: { type: 'border' | 'nameColor', id: string, price: number, name: string }) => {
    if (!currentUser) return { success: false, message: "Not logged in" };
    try {
      await db.purchaseCosmetic(currentUser.id, item);
      return { success: true, message: "Purchase successful" };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  };
  
  const handleEquipCustomization = async (type: 'border' | 'nameColor', itemId: string | undefined) => {
      if (!currentUser) return;
      await db.equipCustomization(currentUser.id, type, itemId);
  };

  const handleReportUser = async (reportedUserId: string, reason: string, chatId?: string) => {
    if (!currentUser) return;
    await db.addReport(currentUser.id, reportedUserId, reason, chatId);
  };

  const handleUpdateReportStatus = async (reportId: string, status: Report['status']) => {
    await db.updateReportStatus(reportId, status);
  };


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
            onResetUserPassword={() => currentUser.email && handleResetUserPassword(currentUser.email)}
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
            onDeleteUserChats={handleDeleteUserChats}
          />
        )
      ) : (
        <GroupLocker users={users} onLogin={handleLogin} />
      )}
    </div>
  );
};

export default App;
