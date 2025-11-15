
import React, { useState, useReducer, useEffect } from 'react';
import { io, Socket } from "socket.io-client";
import { User, Chat, Message, Connection, ConnectionStatus, Verification, Transaction, VerificationBadgeType, Report, Loan, LoanStatus } from '../types';
import GroupLocker from './GroupLocker';
import ChatRoom from './ChatRoom';
// FIX: Changed to a named import as AdminPanel does not have a default export.
import { AdminPanel } from './AdminPanel';
import { db } from './db';

const SOCKET_SERVER_URL = "http://localhost:3001";

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
  const [socket, setSocket] = useState<Socket | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loggedInUsers, setLoggedInUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- Real-time Setup ---
  useEffect(() => {
    if (!currentUser) return;

    // Establish socket connection
    const newSocket = io(SOCKET_SERVER_URL);
    setSocket(newSocket);
    
    // Listen for incoming messages
    newSocket.on('receiveMessage', (newMessage: Message) => {
        setMessages(prevMessages => [...prevMessages, newMessage]);
    });

    // Announce user is online and join relevant chat rooms
    newSocket.emit('userOnline', currentUser.id);
    chats.forEach(chat => newSocket.emit('joinChat', chat.id));

    // Handle other real-time events like presence, notifications, etc.
    // newSocket.on('userPresenceUpdate', (updatedUser) => { ... });

    return () => {
      newSocket.disconnect();
    };
  }, [currentUser, chats]);


  const fetchData = async () => {
    setIsLoading(true);
    try {
        const data = await db.getInitialData();
        setUsers(data.users);
        setChats(data.chats);
        setMessages(data.messages);
        setConnections(data.connections);
        setTransactions(data.transactions);
        setReports(data.reports);
        setLoans(data.loans);
        // We'll manage loggedInUsers via socket presence later
    } catch (error) {
        console.error("Failed to fetch data:", error);
    } finally {
        setIsLoading(false);
    }
  };


  const handleLogin = async (user: User) => {
    // The db.login function now handles authentication and token storage.
    // This function is now responsible for setting the user state and fetching initial data.
    setCurrentUser(user);
    await fetchData();
  };
  
  const handleLogout = async () => {
    await db.logout();
    socket?.disconnect();
    setCurrentUser(null);
    setUsers([]);
    setChats([]);
    setMessages([]);
    // ... reset all other state
  };

  const handleSwitchUser = async (userId: string) => {
    // This is a mock feature; in a real app, you'd log out and log in as the other user.
  };

  const handleSendMessage = (chatId: string, text: string) => {
    if (!currentUser || !socket) return;
    // Emit message to the server, which will save it and broadcast it back
    socket.emit('sendMessage', {
        chatId,
        authorId: currentUser.id,
        text,
    });
  };
  
  const handleCreateChat = async (targetUser: User): Promise<Chat> => {
    if (!currentUser) throw new Error("No current user");
    const newChat = await db.findOrCreateDM(currentUser, targetUser);
    socket?.emit('joinChat', newChat.id);
    setChats(prev => [...prev, newChat]);
    return newChat;
  };

  const handleCreateGroupChat = async ({memberIds, groupName}: CreateGroupChatParams): Promise<void> => {
      if (!currentUser) throw new Error("No current user");
      const newChat = await db.createGroupChat(currentUser.id, memberIds, groupName);
      socket?.emit('joinChat', newChat.id);
      setChats(prev => [...prev, newChat]);
  };

  // Other handlers would be refactored to call the API via db.ts
  const handleUpdateUserProfile = async (params: UpdateProfileParams) => {
      await db.updateUserProfile(params.userId, params);
      // Data will either be refetched or updated via a socket event
  };

  const handleDeleteUser = async (userId: string) => {
    await db.deleteUser(userId);
    // Refetch or handle via socket event
  }
  
  // Stubs for other functions, to be implemented with API calls
  const handleResetUserPassword = async (userId: string, newPassword: string) => {};
  const handleUpdateGroupDetails = async ({ chatId, name, password }: UpdateGroupDetailsParams) => {};
  const handleUpdateGroupMembers = async (chatId: string, memberIds: string[]) => {};
  const handleDeleteGroup = async (chatId: string) => {};
  const handleDeleteUserChats = async (chatIds: string[]) => {};
  const handleSendRequest = async (toUserId: string) => {};
  const handleUpdateConnection = async (connectionId: string, status: ConnectionStatus) => {};
  const handleDeleteConnection = async (connectionId: string) => {};
  const handleRequestVerification = async (userId: string) => {};
  const handleAdminUpdateUserVerification = async (userId: string, verification: Partial<Verification>) => {};
  const handleBroadcastAnnouncement = async (text: string) => {};
  const handleAdminForceConnectionStatus = async (fromUserId: string, toUserId: string, status: ConnectionStatus) => {};
  const handleTransferFunds = async (toUserId: string, amount: number) => { return { success: false, message: "Not implemented" }};
  const handleAdminGrantFunds = async (toUserId: string, amount: number) => { return { success: false, message: "Not implemented" }};
  const handlePurchaseVerification = async (badgeType: VerificationBadgeType, durationDays: number | 'permanent', cost: number) => { return { success: false, message: "Not implemented" }};
  const handleAdminUpdateUserFreezeStatus = async (userId: string, isFrozen: boolean, frozenUntil?: number) => {};
  const handlePurchaseCosmetic = async (item: { type: 'border' | 'nameColor', id: string, price: number, name: string }) => { return { success: false, message: "Not implemented" }};
  const handleEquipCustomization = async (type: 'border' | 'nameColor', itemId: string | undefined) => {};
  const handleReportUser = async (reportedUserId: string, reason: string, chatId?: string) => {};
  const handleUpdateReportStatus = async (reportId: string, status: Report['status']) => {};
  const handleApplyForLoan = async (amount: number, reason: string) => { return { success: false, message: "Not implemented" }};
  const handleUpdateLoanStatus = async (loanId: string, status: LoanStatus, adminNotes?: string) => {};


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
            loans={loans}
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
            onUpdateLoanStatus={handleUpdateLoanStatus}
          />
        ) : (
          <ChatRoom
            currentUser={currentUser}
            users={users}
            chats={chats}
            messages={messages}
            connections={connections}
            transactions={transactions}
            loans={loans}
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
            onApplyForLoan={handleApplyForLoan}
          />
        )
      ) : (
        <GroupLocker users={users} onLogin={handleLogin} />
      )}
    </div>
  );
};

export default App;
// N