
import React, { useState, useReducer, useEffect } from 'react';
import { User, Chat, Message } from './types';
import GroupLocker from './components/GroupLocker';
import ChatRoom from './components/ChatRoom';
import AdminPanel from './components/AdminPanel';
import { db } from './utils/db';

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
  const [users, setUsers] = useState<User[]>([...db.getUsers()]);
  const [chats, setChats] = useState<Chat[]>([...db.getChats()]);
  const [messages, setMessages] = useState<Message[]>([...db.getMessages()]);
  const [currentUser, setCurrentUser] = useState<User | null>(db.getCurrentUser());
  const [, forceUpdate] = useReducer(x => x + 1, 0);

  useEffect(() => {
    const handleBeforeUnload = () => {
        // Log out the user when the tab is closed to set their status to offline
        if (db.getCurrentUser()) {
            db.logout();
        }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Initial sync
    setUsers([...db.getUsers()]);

    return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);


  const handleLogin = (user: User) => {
    const loggedInUser = db.login(user);
    setCurrentUser(loggedInUser);
    setUsers([...db.getUsers()]);
  };
  
  const handleLogout = () => {
    db.logout();
    setCurrentUser(null);
    setUsers([...db.getUsers()]);
  };

  const handleSendMessage = (chatId: string, text: string) => {
    if (!currentUser) return;
    db.addMessage(chatId, currentUser.id, text);
    setMessages([...db.getMessages()]);
  };
  
  const handleCreateChat = (targetUser: User): Chat => {
    if (!currentUser) throw new Error("No current user");
    const newChat = db.findOrCreateDM(currentUser, targetUser);
    setChats([...db.getChats()]);
    return newChat;
  };

  const handleCreateGroupChat = ({memberIds, groupName}: CreateGroupChatParams): Chat => {
      if (!currentUser) throw new Error("No current user");
      const newChat = db.createGroupChat(currentUser.id, memberIds, groupName);
      setChats([...db.getChats()]);
      return newChat;
  };

  const handleUpdateUserProfile = ({ userId, avatar, bio, email, phone, messageLimit }: UpdateProfileParams) => {
      db.updateUserProfile(userId, { avatar, bio, email, phone, messageLimit });
      setUsers([...db.getUsers()]);
      // If the admin is editing their own profile, update currentUser state as well
      if (currentUser && currentUser.id === userId) {
          setCurrentUser(db.getCurrentUser());
      }
  };

  const handleResetUserPassword = (userId: string, newPassword: string) => {
      db.resetUserPassword(userId, newPassword);
      setUsers([...db.getUsers()]);
  };

  const handleUpdateGroupDetails = ({ chatId, name, password }: UpdateGroupDetailsParams) => {
    db.updateGroupDetails(chatId, { name, password });
    setChats([...db.getChats()]);
  };

  const handleUpdateGroupMembers = (chatId: string, memberIds: string[]) => {
    db.updateGroupMembers(chatId, memberIds);
    setChats([...db.getChats()]);
  };

  const handleDeleteUser = (userId: string) => {
    db.deleteUser(userId);
    setUsers([...db.getUsers()]);
    setChats([...db.getChats()]);
    setMessages([...db.getMessages()]);
  };

  const handleDeleteGroup = (chatId: string) => {
    db.deleteGroup(chatId);
    setChats([...db.getChats()]);
    setMessages([...db.getMessages()]);
  };


  return (
    <div className="bg-slate-900 text-white min-h-screen w-full font-sans overflow-hidden">
      {currentUser ? (
        currentUser.isAdmin ? (
          <AdminPanel
            currentUser={currentUser}
            users={users}
            chats={chats}
            messages={messages}
            onLogout={handleLogout}
            onUpdateUserProfile={handleUpdateUserProfile}
            onResetUserPassword={handleResetUserPassword}
            onUpdateGroupDetails={handleUpdateGroupDetails}
            onUpdateGroupMembers={handleUpdateGroupMembers}
            onDeleteUser={handleDeleteUser}
            onDeleteGroup={handleDeleteGroup}
          />
        ) : (
          <ChatRoom
            currentUser={currentUser}
            users={users}
            chats={chats}
            messages={messages}
            onSendMessage={handleSendMessage}
            onCreateChat={handleCreateChat}
            onCreateGroupChat={handleCreateGroupChat}
            onLogout={handleLogout}
          />
        )
      ) : (
        <GroupLocker users={users} onLogin={handleLogin} />
      )}
    </div>
  );
};

export default App;
