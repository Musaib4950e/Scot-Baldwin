

import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { Chat, Message, User, Connection } from '../types';
import { ChatType, ConnectionStatus } from '../types';
import { ArrowLeftOnRectangleIcon, MagnifyingGlassIcon, PaperAirplaneIcon, UsersIcon, UserCircleIcon, ArrowLeftIcon, InstagramIcon, PlusCircleIcon, XMarkIcon, LockClosedIcon, ChevronDownIcon, UserPlusIcon, CheckCircleIcon, BellIcon, BanIcon, CheckBadgeIcon, PencilIcon } from './icons';
import ChatMessage from './ChatMessage';
import { db } from './db';

interface ChatRoomProps {
  currentUser: User;
  users: User[];
  chats: Chat[];
  messages: Message[];
  connections: Connection[];
  loggedInUsers: User[];
  onSendMessage: (chatId: string, text: string) => Promise<void>;
  onCreateChat: (targetUser: User) => Promise<Chat>;
  onCreateGroupChat: (params: { memberIds: string[]; groupName: string; }) => Promise<Chat>;
  onLogout: () => Promise<void>;
  onSwitchUser: (userId: string) => Promise<void>;
  onLogin: (user: User) => Promise<void>;
  onSendRequest: (toUserId: string) => Promise<void>;
  onUpdateConnection: (connectionId: string, status: ConnectionStatus) => Promise<void>;
  onRequestVerification: (userId: string) => Promise<void>;
  onUpdateUserProfile: (params: { avatar: string, bio: string }) => Promise<void>;
}

// --- Helper Functions ---
const getChatDisplayName = (chat: Chat, currentUser: User, users: User[]): string => {
  if (chat.type === ChatType.GROUP) {
    return chat.name || 'Unnamed Group';
  }
  const otherUserId = chat.members.find(id => id !== currentUser.id);
  const otherUser = users.find(u => u.id === otherUserId);
  return otherUser?.username || 'Unknown User';
};

const Modal: React.FC<{ isOpen: boolean; onClose: () => void; children: React.ReactNode; maxWidth?: string; }> = ({ isOpen, onClose, children, maxWidth = 'max-w-sm' }) => {
    const [isVisible, setIsVisible] = useState(isOpen);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
        } else {
            // Delay unmounting for exit animation
            const timer = setTimeout(() => setIsVisible(false), 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isVisible) return null;

    return (
        <div 
            className={`fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
            onClick={onClose}
        >
             <div 
                className={`bg-slate-900/50 backdrop-blur-2xl rounded-3xl p-6 w-full ${maxWidth} border border-white/10 shadow-2xl shadow-black/40 flex flex-col transition-all duration-300 ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
                onClick={e => e.stopPropagation()}
             >
                {children}
            </div>
        </div>
    );
}

// --- Profile Settings Modal ---
const ProfileSettingsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    currentUser: User;
    onUpdateProfile: (params: { avatar: string, bio: string }) => Promise<void>;
    onRequestVerification: (userId: string) => Promise<void>;
}> = ({ isOpen, onClose, currentUser, onUpdateProfile, onRequestVerification }) => {
    const [avatar, setAvatar] = useState(currentUser.avatar);
    const [bio, setBio] = useState(currentUser.bio || '');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
      setAvatar(currentUser.avatar);
      setBio(currentUser.bio || '');
    }, [currentUser]);

    const handleUpdate = async () => {
        setIsSubmitting(true);
        await onUpdateProfile({ avatar, bio });
        setIsSubmitting(false);
        onClose();
    };
    
    const handleRequest = async () => {
        setIsSubmitting(true);
        await onRequestVerification(currentUser.id);
        setIsSubmitting(false);
    };
    
    const renderVerificationStatus = () => {
        switch (currentUser.verificationStatus) {
            case 'approved':
                return <p className="text-sm text-center text-blue-300 flex items-center justify-center gap-2 bg-blue-500/10 p-3 rounded-lg">
                    <CheckBadgeIcon className="w-5 h-5"/> You are verified.
                </p>;
            case 'pending':
                return <p className="text-sm text-center text-amber-300 bg-amber-500/10 p-3 rounded-lg">Your verification request is pending.</p>;
            default:
                return <button onClick={handleRequest} disabled={isSubmitting} className="w-full px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors font-semibold disabled:bg-slate-600 disabled:opacity-70">
                    {isSubmitting ? 'Submitting...' : 'Request Verification'}
                </button>;
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
             <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Profile & Settings</h2>
                <button onClick={onClose} className="p-1 text-slate-400 rounded-full hover:text-white hover:bg-white/10 transition-colors"><XMarkIcon /></button>
            </div>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Avatar (Emoji/Char)</label>
                    <input type="text" value={avatar} onChange={e => setAvatar(e.target.value)} maxLength={2} className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Bio</label>
                    <textarea value={bio} onChange={e => setBio(e.target.value)} rows={2} className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
                </div>
                 <div className="border-t border-white/10 my-4"></div>
                <div>
                    <h3 className="text-lg font-semibold mb-3 text-slate-300">Verification</h3>
                    {renderVerificationStatus()}
                </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
                <button onClick={onClose} className="px-5 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors font-semibold">Cancel</button>
                <button onClick={handleUpdate} disabled={isSubmitting} className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg transition-colors font-semibold disabled:bg-slate-600 disabled:opacity-70">
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </Modal>
    );
};


// --- Add Account Modal ---
const AddAccountModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onLoginSuccess: (user: User) => Promise<void>;
}> = ({ isOpen, onClose, onLoginSuccess }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username || !password) {
            setError("Please enter username and password.");
            return;
        }
        setIsSubmitting(true);
        setError('');
        const authenticatedUser = await db.authenticate(username, password);
        if (authenticatedUser) {
            await onLoginSuccess(authenticatedUser);
            onClose();
        } else {
            setError("Invalid credentials. Please try again.");
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Add Account</h2>
                <button onClick={onClose} className="p-1 text-slate-400 rounded-full hover:text-white hover:bg-white/10 transition-colors"><XMarkIcon /></button>
            </div>
             <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" className="bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-cyan-500 focus:outline-none transition"/>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-cyan-500 focus:outline-none transition"/>
                {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                <div className="mt-4 flex justify-end gap-3">
                     <button type="button" onClick={onClose} className="px-5 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors font-semibold">Cancel</button>
                    <button type="submit" className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg transition-colors font-semibold disabled:from-slate-600 disabled:to-slate-700 disabled:opacity-70 flex items-center justify-center" disabled={!username || !password || isSubmitting}>
                        {isSubmitting ? 'Adding...' : 'Log In & Add'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

// --- Main Component ---
const ChatRoom: React.FC<ChatRoomProps> = (props) => {
  const { currentUser, users, chats, messages, connections, loggedInUsers, onSendMessage, onCreateChat, onCreateGroupChat, onLogout, onSwitchUser, onLogin, onSendRequest, onUpdateConnection, onRequestVerification, onUpdateUserProfile } = props;
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const accountSwitcherRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Group Creation Modal State
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [isSubmittingGroup, setIsSubmittingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [unlockedGroupIds, setUnlockedGroupIds] = useState<Set<string>>(new Set());
  
  // Account & Notification Switcher State
  const [isAccountSwitcherOpen, setIsAccountSwitcherOpen] = useState(false);
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const incomingRequests = useMemo(() => {
      return connections.filter(c => c.toUserId === currentUser.id && c.status === ConnectionStatus.PENDING);
  }, [connections, currentUser.id]);

  const activeChat = useMemo(() => chats.find(c => c.id === activeChatId), [activeChatId, chats]);
  const activeChatMessages = useMemo(() => messages.filter(m => m.chatId === activeChatId).sort((a,b) => a.timestamp - b.timestamp), [activeChatId, messages]);
  const otherUserInDM = useMemo(() => {
    if (activeChat && activeChat.type === ChatType.DM) {
      const otherUserId = activeChat.members.find(id => id !== currentUser.id);
      return users.find(u => u.id === otherUserId);
    }
    return null;
  }, [activeChat, currentUser.id, users]);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChatMessages, isOtherUserTyping]);
  
  // Reset typing indicator when chat changes
  useEffect(() => {
    setIsOtherUserTyping(false);
  }, [activeChatId]);
  
  // Click outside handler for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (accountSwitcherRef.current && !accountSwitcherRef.current.contains(event.target as Node)) {
            setIsAccountSwitcherOpen(false);
        }
        if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
            setIsNotificationsOpen(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
        document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Listen for typing events
  useEffect(() => {
    const handleTyping = (event: Event) => {
        const customEvent = event as CustomEvent;
        const { userId, chatId } = customEvent.detail;
        if (chatId === activeChatId && userId === otherUserInDM?.id) {
            setIsOtherUserTyping(true);
        }
    };

    const handleStoppedTyping = (event: Event) => {
        const customEvent = event as CustomEvent;
        const { userId, chatId } = customEvent.detail;
        if (chatId === activeChatId && userId === otherUserInDM?.id) {
            setIsOtherUserTyping(false);
        }
    };

    window.addEventListener('user-typing', handleTyping);
    window.addEventListener('user-stopped-typing', handleStoppedTyping);

    return () => {
        window.removeEventListener('user-typing', handleTyping);
        window.removeEventListener('user-stopped-typing', handleStoppedTyping);
    };
  }, [activeChatId, otherUserInDM]);


  const handleMessageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);
    
    if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
    }
    
    if (activeChat?.type === ChatType.DM) {
        window.dispatchEvent(new CustomEvent('user-typing', {
            detail: { userId: currentUser.id, chatId: activeChatId }
        }));
    
        typingTimeoutRef.current = window.setTimeout(() => {
            window.dispatchEvent(new CustomEvent('user-stopped-typing', {
                detail: { userId: currentUser.id, chatId: activeChatId }
            }));
        }, 2000); // 2 seconds of inactivity
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (messageInput.trim() && activeChatId) {
      setIsSending(true);
      await onSendMessage(activeChatId, messageInput.trim());
      setMessageInput('');
      setIsSending(false);
      
      if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
      }
      window.dispatchEvent(new CustomEvent('user-stopped-typing', {
          detail: { userId: currentUser.id, chatId: activeChatId }
      }));
    }
  };
  
  const handleUserSearchClick = async (user: User) => {
      const connection = connections.find(c => (c.fromUserId === currentUser.id && c.toUserId === user.id) || (c.fromUserId === user.id && c.toUserId === currentUser.id));
      if (connection && connection.status === ConnectionStatus.ACCEPTED) {
          const chat = await onCreateChat(user);
          setActiveChatId(chat.id);
          setSearchQuery('');
      }
  }

  const handleSelectChat = (chatId: string) => {
    const chat = chats.find(c => c.id === chatId);
    if (chat?.password && !unlockedGroupIds.has(chatId)) {
        const enteredPassword = prompt(`This group is password protected. Please enter the password for "${getChatDisplayName(chat, currentUser, users)}":`);
        if (enteredPassword === null) { // User cancelled prompt
            return;
        }
        if (enteredPassword === chat.password) {
            setUnlockedGroupIds(prev => new Set(prev).add(chatId));
            setActiveChatId(chatId);
        } else {
            alert("Incorrect password.");
        }
    } else {
        setActiveChatId(chatId);
    }
  }

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || selectedUserIds.length === 0) return;
    setIsSubmittingGroup(true);
    const newChat = await onCreateGroupChat({
        memberIds: selectedUserIds,
        groupName: newGroupName.trim(),
    });
    // Reset state and close modal
    setIsCreatingGroup(false);
    setNewGroupName('');
    setSelectedUserIds([]);
    setIsSubmittingGroup(false);
    // Switch to the new chat
    setActiveChatId(newChat.id);
  };
  
  const handleOpenAddAccount = () => {
    setIsAccountSwitcherOpen(false);
    setIsAddAccountModalOpen(true);
  };

  const handleOpenProfileSettings = () => {
    setIsAccountSwitcherOpen(false);
    setIsProfileModalOpen(true);
  };
  
  const handleSwitchAccount = async (userId: string) => {
    if (userId === currentUser.id) return;
    setIsAccountSwitcherOpen(false);
    await onSwitchUser(userId);
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev =>
        prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };
  
  const handleBlockUser = () => {
      if (!otherUserInDM) return;
      if (window.confirm(`Are you sure you want to block ${otherUserInDM.username}? You will not be able to send or receive messages.`)) {
          const connection = connections.find(c => (c.fromUserId === currentUser.id && c.toUserId === otherUserInDM.id) || (c.fromUserId === otherUserInDM.id && c.toUserId === currentUser.id));
          if (connection) {
              onUpdateConnection(connection.id, ConnectionStatus.BLOCKED);
              setActiveChatId(null);
          }
      }
  }

  const filteredUsers = useMemo(() => {
    if (!searchQuery) return [];
    return users.filter(user => user.username.toLowerCase().includes(searchQuery.toLowerCase()) && user.id !== currentUser.id && !user.isAdmin);
  }, [searchQuery, users, currentUser.id]);

  const sortedChats = useMemo(() => {
    const acceptedUserIds = new Set(
      connections
        .filter(c => c.status === ConnectionStatus.ACCEPTED && (c.fromUserId === currentUser.id || c.toUserId === currentUser.id))
        .flatMap(c => [c.fromUserId, c.toUserId])
    );

    const announcementChat = chats.find(c => c.id === 'chat-announcements-global' && c.members.includes(currentUser.id));

    const otherChats = chats
      .filter(chat => {
          if (chat.id === 'chat-announcements-global') return false; // Exclude announcement chat from this filter
          if (chat.type === ChatType.GROUP) return chat.members.includes(currentUser.id);
          const otherUserId = chat.members.find(id => id !== currentUser.id);
          return otherUserId && acceptedUserIds.has(otherUserId);
      })
      .sort((a, b) => {
        const lastMessageA = messages.filter(m => m.chatId === a.id).sort((x, y) => y.timestamp - x.timestamp)[0];
        const lastMessageB = messages.filter(m => m.chatId === b.id).sort((x, y) => y.timestamp - x.timestamp)[0];
        return (lastMessageB?.timestamp || 0) - (lastMessageA?.timestamp || 0);
      });
      
      return announcementChat ? [announcementChat, ...otherChats] : otherChats;
  }, [chats, messages, currentUser.id, connections]);

  const showChatList = !activeChatId || window.innerWidth >= 768;
  const showChatWindow = activeChatId;

  const renderSearchUserActions = (user: User) => {
    const connection = connections.find(c => (c.fromUserId === currentUser.id && c.toUserId === user.id) || (c.fromUserId === user.id && c.toUserId === currentUser.id));
    const baseButtonClasses = "ml-auto text-white text-xs px-3 py-1 rounded-full font-semibold transition-all duration-200 hover:shadow-lg";

    if (!connection) {
        return <button onClick={() => onSendRequest(user.id)} className={`${baseButtonClasses} bg-cyan-500 hover:bg-cyan-400 hover:shadow-cyan-500/30`}>Send Request</button>
    }

    switch(connection.status) {
        case ConnectionStatus.PENDING:
            return <span className="ml-auto text-xs text-slate-400">Request Sent</span>
        case ConnectionStatus.ACCEPTED:
            return <button onClick={() => handleUserSearchClick(user)} className={`${baseButtonClasses} bg-blue-500 hover:bg-blue-400 hover:shadow-blue-500/30`}>Message</button>
        case ConnectionStatus.BLOCKED:
            return <span className="ml-auto text-xs text-red-400">Blocked</span>
        default:
             return <button onClick={() => onSendRequest(user.id)} className={`${baseButtonClasses} bg-cyan-500 hover:bg-cyan-400 hover:shadow-cyan-500/30`}>Send Request</button>
    }
  }


  return (
    <>
        <Modal isOpen={isCreatingGroup} onClose={() => setIsCreatingGroup(false)} maxWidth="max-w-md">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Create New Group</h2>
                <button onClick={() => setIsCreatingGroup(false)} className="p-1 text-slate-400 rounded-full hover:text-white hover:bg-white/10 transition-colors"><XMarkIcon /></button>
            </div>

            <input
                type="text"
                placeholder="Group Name"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 px-4 mb-4 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />

            <h3 className="text-lg font-semibold mt-2 mb-3 text-slate-300">Select Members</h3>
            <div className="flex-grow overflow-y-auto custom-scrollbar max-h-60 pr-2 -mr-2 space-y-2">
                {users.filter(u => u.id !== currentUser.id && !u.isAdmin).map(user => (
                    <div key={user.id} onClick={() => toggleUserSelection(user.id)} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${selectedUserIds.includes(user.id) ? 'bg-cyan-500/30' : 'hover:bg-white/5'}`}>
                        <div className="relative flex-shrink-0">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-xl font-bold">{user.avatar}</div>
                            <span className={`absolute bottom-0 right-0 block h-3 w-3 rounded-full ring-2 ring-slate-900/50 ${user.online ? 'bg-green-400' : 'bg-slate-500'}`}></span>
                        </div>
                        <span className="font-semibold truncate flex-grow">{user.username}</span>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${selectedUserIds.includes(user.id) ? 'bg-cyan-500 border-cyan-400' : 'border-slate-500 bg-white/10'}`}>
                            {selectedUserIds.includes(user.id) && <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="mt-8 flex justify-end gap-4">
                <button onClick={() => setIsCreatingGroup(false)} className="px-5 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors font-semibold">Cancel</button>
                <button
                    onClick={handleCreateGroup}
                    disabled={!newGroupName.trim() || selectedUserIds.length === 0 || isSubmittingGroup}
                    className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg transition-colors font-semibold disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed"
                >
                    {isSubmittingGroup ? 'Creating...' : 'Create Group'}
                </button>
            </div>
        </Modal>

      <AddAccountModal isOpen={isAddAccountModalOpen} onClose={() => setIsAddAccountModalOpen(false)} onLoginSuccess={onLogin} />
      <ProfileSettingsModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} currentUser={currentUser} onUpdateProfile={onUpdateUserProfile} onRequestVerification={onRequestVerification} />
      
      <div className="h-screen flex bg-black/20">
      {/* Sidebar - Chat List */}
      <aside className={`w-full md:w-1/3 lg:w-1/4 xl:w-1/5 flex flex-col bg-black/10 backdrop-blur-2xl border-r border-white/10 transition-transform duration-300 ease-in-out ${showChatList ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:flex`}>
        {/* Sidebar Header */}
        <header className="p-4 border-b border-white/10 flex justify-between items-center flex-shrink-0">
          <div className="relative flex-grow" ref={accountSwitcherRef}>
            <button onClick={() => setIsAccountSwitcherOpen(p => !p)} className="flex items-center gap-3 overflow-hidden w-full text-left p-2 -m-2 rounded-lg hover:bg-white/5 transition-colors">
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-xl font-bold">{currentUser.avatar}</div>
                <span className={`absolute bottom-0 right-0 block h-3 w-3 rounded-full ring-2 ring-black/30 ${currentUser.online ? 'bg-green-400' : 'bg-slate-500'}`}></span>
              </div>
              <div className="flex-grow overflow-hidden">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-lg truncate block">{currentUser.username}</span>
                    {currentUser.isVerified && <CheckBadgeIcon className="w-5 h-5 text-blue-400 flex-shrink-0" />}
                  </div>
                  {currentUser.bio && <span className="text-xs text-slate-400 truncate block">{currentUser.bio}</span>}
              </div>
              <ChevronDownIcon className={`w-5 h-5 text-slate-400 flex-shrink-0 transition-transform ${isAccountSwitcherOpen ? 'rotate-180' : ''}`} />
            </button>
            {isAccountSwitcherOpen && (
                <div className="absolute top-full mt-2 w-full max-w-xs bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-20 p-2 space-y-1">
                    {loggedInUsers.map(user => (
                        <button key={user.id} onClick={() => handleSwitchAccount(user.id)} className="w-full flex items-center gap-3 p-2 rounded-md text-left hover:bg-cyan-500/20 transition-colors">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-base font-bold flex-shrink-0">{user.avatar}</div>
                             <div className="flex-grow flex items-center gap-1.5 overflow-hidden">
                                <span className="font-semibold truncate">{user.username}</span>
                                {user.isVerified && <CheckBadgeIcon className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                            </div>
                            {user.id === currentUser.id && <CheckCircleIcon className="w-6 h-6 text-cyan-400 flex-shrink-0" />}
                        </button>
                    ))}
                    <div className="border-t border-white/10 my-1 !mt-2 !mb-2"></div>
                     <button onClick={handleOpenProfileSettings} className="w-full flex items-center gap-3 p-2 rounded-md text-left text-slate-300 hover:bg-white/10 transition-colors">
                        <PencilIcon className="w-8 h-8 p-1.5 flex-shrink-0" />
                        <span className="font-semibold">Profile & Settings</span>
                    </button>
                    <button onClick={handleOpenAddAccount} className="w-full flex items-center gap-3 p-2 rounded-md text-left text-slate-300 hover:bg-white/10 transition-colors">
                        <UserPlusIcon className="w-8 h-8 p-1 flex-shrink-0" />
                        <span className="font-semibold">Add Account</span>
                    </button>
                </div>
            )}
          </div>
          <div className="flex items-center gap-1 pl-2">
              <div className="relative" ref={notificationsRef}>
                  <button onClick={() => setIsNotificationsOpen(p => !p)} title="Notifications" className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                      <BellIcon className="w-6 h-6" />
                      {incomingRequests.length > 0 && <span className="absolute top-1 right-1 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-black/30"></span>}
                  </button>
                  {isNotificationsOpen && (
                      <div className="absolute top-full right-0 mt-2 w-72 bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-20 p-2">
                          <h3 className="text-sm font-semibold p-2">Connection Requests</h3>
                          {incomingRequests.length > 0 ? (
                            <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1">
                              {incomingRequests.map(req => {
                                  const fromUser = users.find(u => u.id === req.fromUserId);
                                  return (
                                      <div key={req.id} className="p-2 rounded-md hover:bg-white/5">
                                          <div className="flex items-center gap-2 mb-2">
                                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-sm font-bold flex-shrink-0">{fromUser?.avatar}</div>
                                              <p className="text-sm font-semibold truncate">{fromUser?.username}</p>
                                          </div>
                                          <div className="flex justify-end gap-2">
                                              <button onClick={() => onUpdateConnection(req.id, ConnectionStatus.REJECTED)} className="px-3 py-1 text-xs bg-white/10 hover:bg-white/20 rounded-md font-semibold transition-colors">Decline</button>
                                              <button onClick={() => onUpdateConnection(req.id, ConnectionStatus.ACCEPTED)} className="px-3 py-1 text-xs bg-cyan-600 hover:bg-cyan-500 rounded-md font-semibold transition-colors">Accept</button>
                                          </div>
                                      </div>
                                  )
                              })}
                            </div>
                          ) : <p className="p-4 text-center text-sm text-slate-400">No new requests.</p>}
                      </div>
                  )}
              </div>
              <button onClick={() => setIsCreatingGroup(true)} title="Create Group" className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                  <PlusCircleIcon className="w-6 h-6" />
              </button>
              <button onClick={onLogout} title="Logout All Accounts" className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                <ArrowLeftOnRectangleIcon className="w-6 h-6" />
              </button>
          </div>
        </header>
        
        {/* Search Bar */}
        <div className="p-4 flex-shrink-0 relative">
          <MagnifyingGlassIcon className="w-5 h-5 text-slate-400 absolute left-8 top-1/2 -translate-y-1/2"/>
          <input
            type="text"
            placeholder="Search or start new chat"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-black/20 border border-white/10 rounded-full py-2.5 pl-11 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-colors"
          />
          {searchQuery && (
            <div className="absolute top-full left-0 right-0 mt-2 p-2 bg-slate-900/50 backdrop-blur-xl rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto custom-scrollbar">
                {filteredUsers.length > 0 ? (
                    filteredUsers.map(user => (
                        <div key={user.id} className="flex items-center gap-3 p-2 rounded-lg">
                             <div className="relative flex-shrink-0">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-xl font-bold">{user.avatar}</div>
                                <span className={`absolute bottom-0 right-0 block h-3 w-3 rounded-full ring-2 ring-slate-900/50 ${user.online ? 'bg-green-400' : 'bg-slate-500'}`}></span>
                            </div>
                            <div className="flex-grow flex items-center gap-1.5 overflow-hidden">
                                <span className="font-semibold truncate">{user.username}</span>
                                {user.isVerified && <CheckBadgeIcon className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                            </div>
                             {renderSearchUserActions(user)}
                        </div>
                    ))
                ) : <div className="p-2 text-center text-slate-400">No users found.</div>}
            </div>
          )}
        </div>

        {/* Chat List */}
        <div className="flex-grow overflow-y-auto custom-scrollbar">
          {sortedChats.length > 0 ? (
            sortedChats.map(chat => {
              const lastMessage = messages.filter(m => m.chatId === chat.id).sort((a,b) => b.timestamp - a.timestamp)[0];
              const otherUser = chat.type === ChatType.DM ? users.find(u => u.id === chat.members.find(id => id !== currentUser.id)) : null;

              return (
                <div
                  key={chat.id}
                  onClick={() => handleSelectChat(chat.id)}
                  className={`flex items-center gap-4 p-4 mx-2 rounded-xl cursor-pointer transition-colors duration-200 relative ${activeChatId === chat.id ? 'bg-white/10' : 'hover:bg-white/5'}`}
                >
                  {activeChatId === chat.id && <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-cyan-400 rounded-r-full"></div>}
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-2xl font-bold">
                        {chat.id === 'chat-announcements-global' ? '📢' : (chat.type === ChatType.GROUP ? <UsersIcon className="w-7 h-7" /> : (otherUser ? otherUser.avatar : <UserCircleIcon className="w-7 h-7"/>)) }
                    </div>
                    {otherUser && (
                        <span className={`absolute bottom-0 right-0 block h-3.5 w-3.5 rounded-full ring-2 ring-black/30 ${otherUser.online ? 'bg-green-400' : 'bg-slate-500'}`}></span>
                    )}
                  </div>
                  <div className="flex-grow overflow-hidden">
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">{getChatDisplayName(chat, currentUser, users)}</h3>
                        {otherUser?.isVerified && <CheckBadgeIcon className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                        {chat.password && <LockClosedIcon className="w-4 h-4 text-slate-500 flex-shrink-0" />}
                    </div>
                    <p className="text-sm text-slate-400 truncate">{lastMessage?.text || 'No messages yet'}</p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-6 text-center text-slate-400">
                <p>No chats yet.</p>
                <p className="text-sm">Connect with users to start a conversation.</p>
            </div>
          )}
        </div>
      </aside>

      {/* Chat Window */}
      <main className={`flex-1 flex flex-col bg-black/30 absolute top-0 left-0 w-full h-full transition-transform duration-300 ease-in-out md:static md:flex ${showChatWindow ? 'translate-x-0' : 'translate-x-full'} md:translate-x-0`}>
        {activeChat ? (
          <>
            {/* Chat Header */}
            <header className="p-4 border-b border-white/10 flex items-center gap-4 flex-shrink-0 bg-black/10 backdrop-blur-2xl z-10">
                <button onClick={() => setActiveChatId(null)} className="md:hidden p-2 text-slate-400 hover:text-white">
                    <ArrowLeftIcon className="w-6 h-6" />
                </button>
               <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-xl font-bold">
                        {activeChat.id === 'chat-announcements-global' ? '📢' : (activeChat.type === ChatType.GROUP ? <UsersIcon className="w-6 h-6" /> : (otherUserInDM ? otherUserInDM.avatar : <UserCircleIcon className="w-6 h-6"/>))}
                    </div>
                    {otherUserInDM && (
                        <span className={`absolute bottom-0 right-0 block h-3 w-3 rounded-full ring-2 ring-black/30 ${otherUserInDM.online ? 'bg-green-400' : 'bg-slate-500'}`}></span>
                    )}
                </div>
                <div className='flex-grow overflow-hidden'>
                    <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold truncate">{getChatDisplayName(activeChat, currentUser, users)}</h2>
                        {otherUserInDM?.isVerified && <CheckBadgeIcon className="w-5 h-5 text-blue-400 flex-shrink-0" />}
                        {otherUserInDM?.instagramUsername && (
                            <a 
                                href={`https://instagram.com/${otherUserInDM.instagramUsername}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                title={`Visit ${otherUserInDM.username}'s Instagram`}
                                className="text-slate-400 hover:text-white transition-colors flex-shrink-0"
                            >
                                <InstagramIcon className="w-5 h-5"/>
                            </a>
                        )}
                    </div>
                    {otherUserInDM?.bio && <p className="text-xs text-slate-400 truncate">{otherUserInDM.bio}</p>}
                    {activeChat.id === 'chat-announcements-global' && <p className="text-xs text-slate-400">Important messages from the administrator.</p>}
                </div>
                 {otherUserInDM && (
                    <button onClick={handleBlockUser} title={`Block ${otherUserInDM.username}`} className="p-2 text-slate-400 hover:text-red-400 hover:bg-white/10 rounded-full transition-colors ml-auto">
                        <BanIcon className="w-6 h-6" />
                    </button>
                 )}
            </header>
            
            {/* Messages */}
            <div className="flex-grow p-6 overflow-y-auto space-y-6 custom-scrollbar">
              {activeChatMessages.map(msg => {
                const author = users.find(u => u.id === msg.authorId);
                if (!author) return null;
                return <ChatMessage key={msg.id} message={msg} author={author} isCurrentUser={msg.authorId === currentUser.id} isGroupChat={activeChat.type === ChatType.GROUP} />;
              })}
              
              {isOtherUserTyping && (
                 <div className="flex items-end gap-3 justify-start">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {otherUserInDM?.avatar}
                    </div>
                    <div className="px-4 py-2.5 bg-white/10 rounded-r-2xl rounded-tl-2xl">
                        <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce"></span>
                        </div>
                    </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <footer className="p-4 flex-shrink-0 bg-black/10 backdrop-blur-2xl border-t border-white/10">
              <form onSubmit={handleSendMessage} className="relative">
                 <input
                  type="text"
                  value={messageInput}
                  onChange={handleMessageInputChange}
                  placeholder="Type a message..."
                  className="w-full bg-black/20 border border-white/10 rounded-full py-3 pl-5 pr-16 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-shadow"
                  disabled={isSending || activeChat.id === 'chat-announcements-global'}
                />
                <button type="submit" disabled={!messageInput.trim() || isSending || activeChat.id === 'chat-announcements-global'} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:scale-110 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed transition-all active:scale-100">
                  <PaperAirplaneIcon className="w-5 h-5" />
                </button>
              </form>
            </footer>
          </>
        ) : (
          <div className="hidden flex-grow md:flex items-center justify-center text-slate-500 text-xl flex-col gap-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-24 h-24 text-white/10" viewBox="0 0 24 24" fill="currentColor"><path d="M2.25 2.25a.75.75 0 00-.75.75v9c0 .414.336.75.75.75h3.75v.25a.75.75 0 00.75.75h12a.75.75 0 00.75-.75v-9a.75.75 0 00-.75-.75h-15zm16.5 1.5h-15v7.5h15v-7.5zm-15-1.5H12a.75.75 0 01.75.75v.25h-4.5a.75.75 0 00-.75.75v9a.75.75 0 00.75.75h.25a.75.75 0 00.75-.75V15a.75.75 0 01.75-.75h12a2.25 2.25 0 012.25 2.25v2.25a.75.75 0 001.5 0V15a3.75 3.75 0 00-3.75-3.75H8.25V4.5a2.25 2.25 0 012.25-2.25H18a.75.75 0 000-1.5H3.75z"></path></svg>
              <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-300">Welcome to BAK -Ko</h2>
              <p>Select a chat on the left to start messaging.</p>
          </div>
        )}
      </main>
    </div>
    </>
  );
};

export default ChatRoom;