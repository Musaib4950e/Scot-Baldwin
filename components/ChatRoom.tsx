
import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { Chat, Message, User } from '../types';
import { ChatType } from '../types';
import { ArrowLeftOnRectangleIcon, MagnifyingGlassIcon, PaperAirplaneIcon, UsersIcon, UserCircleIcon, ArrowLeftIcon, InstagramIcon, PlusCircleIcon, XMarkIcon, LockClosedIcon } from './icons';
import ChatMessage from './ChatMessage';

interface ChatRoomProps {
  currentUser: User;
  users: User[];
  chats: Chat[];
  messages: Message[];
  onSendMessage: (chatId: string, text: string) => void;
  onCreateChat: (targetUser: User) => Chat;
  onCreateGroupChat: (params: { memberIds: string[]; groupName: string; }) => Chat;
  onLogout: () => void;
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

// --- Main Component ---
const ChatRoom: React.FC<ChatRoomProps> = ({ currentUser, users, chats, messages, onSendMessage, onCreateChat, onCreateGroupChat, onLogout }) => {
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  // Group Creation Modal State
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [unlockedGroupIds, setUnlockedGroupIds] = useState<Set<string>>(new Set());

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

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageInput.trim() && activeChatId) {
      onSendMessage(activeChatId, messageInput.trim());
      setMessageInput('');
      
      if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
      }
      window.dispatchEvent(new CustomEvent('user-stopped-typing', {
          detail: { userId: currentUser.id, chatId: activeChatId }
      }));
    }
  };
  
  const handleUserSearchClick = (user: User) => {
      if(user.id === currentUser.id) return;
      const newChat = onCreateChat(user);
      setActiveChatId(newChat.id);
      setSearchQuery('');
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

  const handleCreateGroup = () => {
    if (!newGroupName.trim() || selectedUserIds.length === 0) return;
    const newChat = onCreateGroupChat({
        memberIds: selectedUserIds,
        groupName: newGroupName.trim(),
    });
    // Reset state and close modal
    setIsCreatingGroup(false);
    setNewGroupName('');
    setSelectedUserIds([]);
    // Switch to the new chat
    setActiveChatId(newChat.id);
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev =>
        prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const filteredUsers = useMemo(() => {
    if (!searchQuery) return [];
    return users.filter(user => user.username.toLowerCase().includes(searchQuery.toLowerCase()) && user.id !== currentUser.id);
  }, [searchQuery, users, currentUser.id]);

  const sortedChats = useMemo(() => {
    return chats
      .filter(chat => chat.members.includes(currentUser.id))
      .sort((a, b) => {
        const lastMessageA = messages.filter(m => m.chatId === a.id).sort((x, y) => y.timestamp - x.timestamp)[0];
        const lastMessageB = messages.filter(m => m.chatId === b.id).sort((x, y) => y.timestamp - x.timestamp)[0];
        return (lastMessageB?.timestamp || 0) - (lastMessageA?.timestamp || 0);
      });
  }, [chats, messages, currentUser.id]);

  const showChatList = !activeChatId || window.innerWidth >= 768;
  const showChatWindow = activeChatId;

  return (
    <>
      {isCreatingGroup && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-700/50 shadow-2xl flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white">Create New Group</h2>
                    <button onClick={() => setIsCreatingGroup(false)} className="p-1 text-slate-400 hover:text-white"><XMarkIcon /></button>
                </div>

                <input
                    type="text"
                    placeholder="Group Name"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg py-2 px-4 mb-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <h3 className="text-lg font-semibold mt-2 mb-3 text-slate-300">Select Members</h3>
                <div className="flex-grow overflow-y-auto custom-scrollbar max-h-60 pr-2 -mr-2 space-y-2">
                    {users.filter(u => u.id !== currentUser.id && !u.isAdmin).map(user => (
                        <div key={user.id} onClick={() => toggleUserSelection(user.id)} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${selectedUserIds.includes(user.id) ? 'bg-blue-600' : 'hover:bg-slate-700'}`}>
                            <div className="relative flex-shrink-0">
                                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-xl font-bold">{user.avatar}</div>
                                <span className={`absolute bottom-0 right-0 block h-3 w-3 rounded-full ring-2 ring-slate-800 ${user.online ? 'bg-green-400' : 'bg-slate-500'}`}></span>
                            </div>
                            <span className="font-semibold truncate flex-grow">{user.username}</span>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${selectedUserIds.includes(user.id) ? 'bg-blue-500 border-blue-400' : 'border-slate-500'}`}>
                                {selectedUserIds.includes(user.id) && <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                            </div>
                        </div>
                    ))}
                </div>
                
                <div className="mt-8 flex justify-end gap-4">
                    <button onClick={() => setIsCreatingGroup(false)} className="px-5 py-2.5 bg-slate-600 hover:bg-slate-500 rounded-lg transition-colors font-semibold">Cancel</button>
                    <button
                        onClick={handleCreateGroup}
                        disabled={!newGroupName.trim() || selectedUserIds.length === 0}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors font-semibold disabled:bg-slate-600 disabled:cursor-not-allowed"
                    >
                        Create Group
                    </button>
                </div>
            </div>
        </div>
      )}
      <div className="h-screen flex bg-slate-800">
      {/* Sidebar - Chat List */}
      <aside className={`w-full md:w-1/3 lg:w-1/4 xl:w-1/5 flex flex-col bg-slate-800 border-r border-slate-700 transition-transform duration-300 ease-in-out ${showChatList ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:flex`}>
        {/* Sidebar Header */}
        <header className="p-4 border-b border-slate-700 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
             <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-xl font-bold">{currentUser.avatar}</div>
              <span className={`absolute bottom-0 right-0 block h-3 w-3 rounded-full ring-2 ring-slate-800 ${currentUser.online ? 'bg-green-400' : 'bg-slate-500'}`}></span>
            </div>
             <div className="flex-grow overflow-hidden">
                <span className="font-semibold text-lg truncate block">{currentUser.username}</span>
                {currentUser.bio && <span className="text-xs text-slate-400 truncate block">{currentUser.bio}</span>}
             </div>
          </div>
          <div className="flex items-center gap-1">
              <button onClick={() => setIsCreatingGroup(true)} title="Create Group" className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition-colors">
                  <PlusCircleIcon className="w-6 h-6" />
              </button>
              <button onClick={onLogout} title="Logout" className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition-colors">
                <ArrowLeftOnRectangleIcon className="w-6 h-6" />
              </button>
          </div>
        </header>
        
        {/* Search Bar */}
        <div className="p-4 flex-shrink-0 relative">
          <MagnifyingGlassIcon className="w-5 h-5 text-slate-400 absolute left-7 top-1/2 -translate-y-1/2"/>
          <input
            type="text"
            placeholder="Search or start new chat"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-full py-2 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchQuery && (
            <div className="absolute top-full left-0 right-0 mt-2 p-2 bg-slate-700 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto custom-scrollbar">
                {filteredUsers.length > 0 ? (
                    filteredUsers.map(user => (
                        <div key={user.id} onClick={() => handleUserSearchClick(user)} className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-blue-600">
                             <div className="relative flex-shrink-0">
                                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-xl font-bold">{user.avatar}</div>
                                <span className={`absolute bottom-0 right-0 block h-3 w-3 rounded-full ring-2 ring-slate-700 ${user.online ? 'bg-green-400' : 'bg-slate-500'}`}></span>
                            </div>
                             <span className="font-semibold truncate">{user.username}</span>
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
                  className={`flex items-center gap-4 p-4 cursor-pointer border-l-4 ${activeChatId === chat.id ? 'bg-slate-700 border-blue-500' : 'border-transparent hover:bg-slate-700/50'}`}
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-2xl font-bold">
                        {chat.type === ChatType.GROUP ? <UsersIcon className="w-7 h-7" /> : (otherUser ? otherUser.avatar : <UserCircleIcon className="w-7 h-7"/>) }
                    </div>
                    {otherUser && (
                        <span className={`absolute bottom-0 right-0 block h-3.5 w-3.5 rounded-full ring-2 ring-slate-800 ${otherUser.online ? 'bg-green-400' : 'bg-slate-500'}`}></span>
                    )}
                  </div>
                  <div className="flex-grow overflow-hidden">
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">{getChatDisplayName(chat, currentUser, users)}</h3>
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
                <p className="text-sm">Use the search bar to find users and start a conversation.</p>
            </div>
          )}
        </div>
      </aside>

      {/* Chat Window */}
      <main className={`flex-1 flex-col bg-slate-900 absolute top-0 left-0 w-full h-full transition-transform duration-300 ease-in-out md:static md:flex ${showChatWindow ? 'translate-x-0' : 'translate-x-full'} md:translate-x-0`}>
        {activeChat ? (
          <>
            {/* Chat Header */}
            <header className="p-4 border-b border-slate-700/50 flex items-center gap-4 flex-shrink-0 bg-slate-800">
                <button onClick={() => setActiveChatId(null)} className="md:hidden p-2 text-slate-400 hover:text-white">
                    <ArrowLeftIcon className="w-6 h-6" />
                </button>
               <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-xl font-bold">
                        {activeChat.type === ChatType.GROUP ? <UsersIcon className="w-6 h-6" /> : (otherUserInDM ? otherUserInDM.avatar : <UserCircleIcon className="w-6 h-6"/>)}
                    </div>
                    {otherUserInDM && (
                        <span className={`absolute bottom-0 right-0 block h-3 w-3 rounded-full ring-2 ring-slate-800 ${otherUserInDM.online ? 'bg-green-400' : 'bg-slate-500'}`}></span>
                    )}
                </div>
                <div className='flex-grow overflow-hidden'>
                    <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold truncate">{getChatDisplayName(activeChat, currentUser, users)}</h2>
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
                </div>
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
                    <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {otherUserInDM?.avatar}
                    </div>
                    <div className="px-4 py-2.5 bg-slate-600 text-gray-200 rounded-r-xl rounded-tl-xl">
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
            <footer className="p-4 flex-shrink-0 bg-slate-800">
              <form onSubmit={handleSendMessage} className="relative">
                 <input
                  type="text"
                  value={messageInput}
                  onChange={handleMessageInputChange}
                  placeholder="Type a message..."
                  className="w-full bg-slate-700 border border-slate-600 rounded-full py-3 pl-5 pr-16 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button type="submit" disabled={!messageInput.trim()} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-full bg-blue-600 text-white hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors">
                  <PaperAirplaneIcon className="w-5 h-5" />
                </button>
              </form>
            </footer>
          </>
        ) : (
          <div className="hidden flex-grow md:flex items-center justify-center text-slate-500 text-xl flex-col gap-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-24 h-24 text-slate-600" viewBox="0 0 24 24" fill="currentColor"><path d="M2.25 2.25a.75.75 0 00-.75.75v9c0 .414.336.75.75.75h3.75v.25a.75.75 0 00.75.75h12a.75.75 0 00.75-.75v-9a.75.75 0 00-.75-.75h-15zm16.5 1.5h-15v7.5h15v-7.5zm-15-1.5H12a.75.75 0 01.75.75v.25h-4.5a.75.75 0 00-.75.75v9a.75.75 0 00.75.75h.25a.75.75 0 00.75-.75V15a.75.75 0 01.75-.75h12a2.25 2.25 0 012.25 2.25v2.25a.75.75 0 001.5 0V15a3.75 3.75 0 00-3.75-3.75H8.25V4.5a2.25 2.25 0 012.25-2.25H18a.75.75 0 000-1.5H3.75z"></path></svg>
              <h2 className="text-2xl font-bold text-slate-400">Welcome to BAK -Ko</h2>
              <p>Select a chat on the left to start messaging.</p>
          </div>
        )}
      </main>
    </div>
    </>
  );
};

export default ChatRoom;
