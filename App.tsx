
import React, { useState, useReducer, useEffect } from 'react';
import { User, Chat, Message, Connection, ConnectionStatus } from './types';
import GroupLocker from './components/GroupLocker';
import ChatRoom from './components/ChatRoom';
import AdminPanel from './components/AdminPanel';
import { db } from './components/db';

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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loggedInUsers, setLoggedInUsers] = useState<User[]>([]);

  const fetchData = async () => {
    const [usersData, chatsData, messagesData, currentUserData, loggedInUsersData, connectionsData] = await Promise.all([
        db.getUsers(),
        db.getChats(),
        db.getMessages(),
        db.getCurrentUser(),
        db.getLoggedInUsers(),
        db.getConnections(),
    ]);
    setUsers(usersData);
    setChats(chatsData);
    setMessages(messagesData);
    setCurrentUser(currentUserData);
    setLoggedInUsers(loggedInUsersData);
    setConnections(connectionsData);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
    
    const handleBeforeUnload = () => {
        // Log out the user when the tab is closed to set their status to offline
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
            // Data has been updated in another tab, refetch to sync UI
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
    await fetchData(); // Refetch all data as this is a major change
  };

  const handleDeleteGroup = async (chatId: string) => {
    await db.deleteGroup(chatId);
    setChats(await db.getChats());
    setMessages(await db.getMessages());
  };

  // --- Connection Handlers ---
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
  
  // --- Verification Handlers ---
  const handleRequestVerification = async (userId: string) => {
    await db.updateUserVerification(userId, 'pending');
    await fetchData();
  };

  const handleAdminUpdateVerification = async (userId: string, status: 'approved' | 'none') => {
    await db.updateUserVerification(userId, status);
    await fetchData();
  };

  // --- Admin Handlers ---
  const handleBroadcastAnnouncement = async (text: string) => {
    if (!currentUser || !currentUser.isAdmin) return;
    await db.addBroadcastAnnouncement(text, currentUser.id);
    setMessages(await db.getMessages());
    // Potentially re-fetch chats if announcement chat wasn't there before
    setChats(await db.getChats());
  };
  
  const handleAdminForceConnectionStatus = async (fromUserId: string, toUserId: string, status: ConnectionStatus) => {
    await db.adminForceConnectionStatus(fromUserId, toUserId, status);
    setConnections(await db.getConnections());
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
            onAdminUpdateVerification={handleAdminUpdateVerification}
          />
        ) : (
          <ChatRoom
            currentUser={currentUser}
            users={users}
            chats={chats}
            messages={messages}
            connections={connections}
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
          />
        )
      ) : (
        <GroupLocker users={users} onLogin={handleLogin} />
      )}
    </div>
  );
};

export default App;
