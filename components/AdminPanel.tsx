import React, { useState, useMemo } from 'react';
import { User, Chat, ChatType, Message } from '../types';
import { db } from '../utils/db';
import { ArrowLeftOnRectangleIcon, Cog6ToothIcon, KeyIcon, PencilIcon, ShieldCheckIcon, XMarkIcon, UsersIcon, TrashIcon, EyeIcon, ArrowLeftIcon } from './icons';
import ChatMessage from './ChatMessage';


interface AdminPanelProps {
    currentUser: User;
    users: User[];
    chats: Chat[];
    messages: Message[];
    onLogout: () => void;
    onUpdateUserProfile: (params: { userId: string, avatar: string, bio: string, email: string, phone: string, messageLimit?: number }) => void;
    onResetUserPassword: (userId: string, newPass: string) => void;
    onUpdateGroupDetails: (params: { chatId: string, name: string, password?: string }) => void;
    onUpdateGroupMembers: (chatId: string, memberIds: string[]) => void;
    onDeleteUser: (userId: string) => void;
    onDeleteGroup: (chatId: string) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = (props) => {
    const { currentUser, users, chats, messages, onLogout, onUpdateUserProfile, onResetUserPassword, onUpdateGroupDetails, onUpdateGroupMembers, onDeleteUser, onDeleteGroup } = props;
    
    const [view, setView] = useState<'users' | 'groups'>('users');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [selectedGroup, setSelectedGroup] = useState<Chat | null>(null);
    const [viewingGroupChat, setViewingGroupChat] = useState<Chat | null>(null);

    // Modal states
    const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isEditGroupModalOpen, setIsEditGroupModalOpen] = useState(false);
    
    // User form state
    const [avatar, setAvatar] = useState('');
    const [bio, setBio] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [messageLimit, setMessageLimit] = useState<number | undefined>(undefined);
    const [newPassword, setNewPassword] = useState('');
    
    // Group form state
    const [groupName, setGroupName] = useState('');
    const [groupPassword, setGroupPassword] = useState('');
    const [groupMembers, setGroupMembers] = useState<string[]>([]);
    
    const viewingGroupMessages = useMemo(() => {
        if (!viewingGroupChat) return [];
        return messages.filter(m => m.chatId === viewingGroupChat.id).sort((a,b) => a.timestamp - b.timestamp);
    }, [viewingGroupChat, messages]);

    // --- User Modal Functions ---
    const openEditUserModal = (user: User) => {
        setSelectedUser(user);
        setAvatar(user.avatar);
        setBio(user.bio || '');
        setEmail(user.email || '');
        setPhone(user.phone || '');
        setMessageLimit(user.messageLimit)
        setIsEditUserModalOpen(true);
    };

    const openPasswordModal = (user: User) => {
        setSelectedUser(user);
        setNewPassword('');
        setIsPasswordModalOpen(true);
    };
    
    const handleProfileUpdate = () => {
        if (!selectedUser) return;
        onUpdateUserProfile({ userId: selectedUser.id, avatar, bio, email, phone, messageLimit });
        closeAllModals();
    };

    const handlePasswordReset = () => {
        if (!selectedUser || !newPassword.trim()) return;
        onResetUserPassword(selectedUser.id, newPassword.trim());
        closeAllModals();
    };

    const handleDeleteUserConfirm = (user: User) => {
        if (window.confirm(`Are you sure you want to permanently delete ${user.username}? This action cannot be undone.`)) {
            onDeleteUser(user.id);
        }
    };

    // --- Group Modal Functions ---
    const openEditGroupModal = (group: Chat) => {
        setSelectedGroup(group);
        setGroupName(group.name || '');
        setGroupPassword(group.password || '');
        setGroupMembers(group.members);
        setIsEditGroupModalOpen(true);
    };

    const handleGroupUpdate = () => {
        if (!selectedGroup) return;
        onUpdateGroupDetails({ chatId: selectedGroup.id, name: groupName, password: groupPassword });
        onUpdateGroupMembers(selectedGroup.id, groupMembers);
        closeAllModals();
    };
    
    const handleDeleteGroupConfirm = (group: Chat) => {
        if (window.confirm(`Are you sure you want to permanently delete the group "${group.name}"? This will erase all messages. This action cannot be undone.`)) {
            onDeleteGroup(group.id);
        }
    };
    
    const toggleGroupMember = (userId: string) => {
        setGroupMembers(prev => 
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    const closeAllModals = () => {
        setIsEditUserModalOpen(false);
        setIsPasswordModalOpen(false);
        setIsEditGroupModalOpen(false);
        setSelectedUser(null);
        setSelectedGroup(null);
    };

    if (viewingGroupChat) {
         return (
            <div className="flex flex-col h-screen bg-slate-900 text-white">
                <header className="p-4 border-b border-slate-700/50 flex items-center gap-4 flex-shrink-0 bg-slate-800">
                     <button onClick={() => setViewingGroupChat(null)} className="p-2 text-slate-400 hover:text-white">
                        <ArrowLeftIcon className="w-6 h-6" />
                    </button>
                    <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-xl font-bold flex-shrink-0"><UsersIcon className="w-6 h-6"/></div>
                    <div>
                        <h2 className="text-xl font-bold">{viewingGroupChat.name}</h2>
                        <p className="text-xs text-slate-400">Viewing as Admin</p>
                    </div>
                </header>
                 <div className="flex-grow p-6 overflow-y-auto space-y-6 custom-scrollbar">
                    {viewingGroupMessages.map(msg => {
                        const author = users.find(u => u.id === msg.authorId);
                        if (!author) return null; // Should not happen
                        return <ChatMessage key={msg.id} message={msg} author={author} isCurrentUser={false} isGroupChat={true} />;
                    })}
                </div>
            </div>
         )
    }
    
    return (
        <>
            <div className="flex h-screen bg-slate-900 text-white">
                {/* --- Sidebar --- */}
                <aside className="w-64 flex-shrink-0 bg-slate-800 p-4 flex flex-col border-r border-slate-700">
                    <div className="flex items-center gap-3 p-2 mb-6">
                         <div className="relative flex-shrink-0">
                            <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-2xl font-bold">{currentUser.avatar}</div>
                        </div>
                        <div className="overflow-hidden">
                            <h2 className="font-bold text-lg truncate">{currentUser.username}</h2>
                            <p className="text-sm text-indigo-300 flex items-center gap-1.5"><ShieldCheckIcon className="w-4 h-4" /> Administrator</p>
                        </div>
                    </div>
                    <nav className="flex-grow space-y-2">
                        <button onClick={() => setView('users')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${view === 'users' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-300 hover:bg-slate-700'}`}>
                            <Cog6ToothIcon className="w-6 h-6" />
                            <span>User Management</span>
                        </button>
                        <button onClick={() => setView('groups')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${view === 'groups' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-300 hover:bg-slate-700'}`}>
                            <UsersIcon className="w-6 h-6" />
                            <span>Group Management</span>
                        </button>
                    </nav>
                    <div>
                         <button onClick={onLogout} className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg transition-colors">
                            <ArrowLeftOnRectangleIcon className="w-6 h-6" />
                            <span className="font-semibold">Logout</span>
                        </button>
                    </div>
                </aside>
                
                {/* --- Main Content --- */}
                <main className="flex-1 p-6 md:p-8 overflow-y-auto custom-scrollbar">
                    {view === 'users' && (
                        <div>
                            <h1 className="text-4xl font-bold mb-8 text-white">User Management</h1>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {users.filter(u => !u.isAdmin).map(user => {
                                    const stats = db.getMessageStatsForUser(user.id);
                                    return (
                                        <div key={user.id} className="bg-slate-800 border border-slate-700 rounded-2xl p-5 flex flex-col">
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="w-14 h-14 rounded-full bg-blue-500 flex items-center justify-center text-2xl font-bold flex-shrink-0">{user.avatar}</div>
                                                <div className="overflow-hidden">
                                                    <p className="font-bold text-lg truncate">{user.username}</p>
                                                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${user.online ? 'bg-green-500/10 text-green-400' : 'bg-slate-500/10 text-slate-400'}`}>
                                                        <span className={`h-1.5 w-1.5 rounded-full ${user.online ? 'bg-green-500' : 'bg-slate-500'}`}></span>
                                                        {user.online ? 'Online' : 'Offline'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="space-y-3 text-sm text-slate-300 flex-grow mb-4">
                                                <p><strong className="text-slate-400">Bio:</strong> {user.bio || 'N/A'}</p>
                                                <p><strong className="text-slate-400">Email:</strong> {user.email || 'N/A'}</p>
                                                <p><strong className="text-slate-400">Phone:</strong> {user.phone || 'N/A'}</p>
                                                <p><strong className="text-slate-400">Msg Limit:</strong> {user.messageLimit === undefined ? 'Unlimited' : user.messageLimit}</p>
                                            </div>
                                             <div className="border-t border-slate-700 pt-4 flex justify-between items-center text-sm">
                                                <span className="font-mono">Sent: {stats.sent}</span>
                                                <span className="font-mono">Received: {stats.received}</span>
                                            </div>
                                            <div className="mt-4 grid grid-cols-3 gap-2">
                                                <button onClick={() => openEditUserModal(user)} className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-semibold transition-colors"><PencilIcon className="w-4 h-4" /> Edit</button>
                                                <button onClick={() => openPasswordModal(user)} className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-semibold transition-colors"><KeyIcon className="w-4 h-4" /> Pass</button>
                                                <button onClick={() => handleDeleteUserConfirm(user)} className="flex items-center justify-center gap-2 px-3 py-2 bg-red-800/50 hover:bg-red-700/50 text-red-300 rounded-lg text-sm font-semibold transition-colors"><TrashIcon className="w-4 h-4" /> Del</button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    
                    {view === 'groups' && (
                         <div>
                            <h1 className="text-4xl font-bold mb-8 text-white">Group Management</h1>
                             <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {chats.filter(c => c.type === ChatType.GROUP).map(group => {
                                    const creator = users.find(u => u.id === group.creatorId);
                                    return (
                                        <div key={group.id} className="bg-slate-800 border border-slate-700 rounded-2xl p-5 flex flex-col">
                                            <div className="flex items-center gap-4 mb-4">
                                                 <div className="w-14 h-14 rounded-full bg-indigo-500 flex items-center justify-center text-2xl font-bold flex-shrink-0"><UsersIcon className="w-8 h-8"/></div>
                                                 <div className="overflow-hidden">
                                                    <p className="font-bold text-lg truncate">{group.name}</p>
                                                    <p className="text-sm text-slate-400"> {group.members.length} Members</p>
                                                 </div>
                                            </div>
                                            <div className="space-y-3 text-sm text-slate-300 flex-grow mb-4">
                                                <p><strong className="text-slate-400">Created by:</strong> {creator?.username || 'Unknown'}</p>
                                                <p><strong className="text-slate-400">Password:</strong> {group.password ? 'Protected' : 'None'}</p>
                                            </div>
                                            <div className="mt-4 grid grid-cols-3 gap-2">
                                                <button onClick={() => setViewingGroupChat(group)} className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-semibold transition-colors"><EyeIcon className="w-4 h-4" /> View</button>
                                                <button onClick={() => openEditGroupModal(group)} className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-semibold transition-colors"><PencilIcon className="w-4 h-4" /> Edit</button>
                                                <button onClick={() => handleDeleteGroupConfirm(group)} className="flex items-center justify-center gap-2 px-3 py-2 bg-red-800/50 hover:bg-red-700/50 text-red-300 rounded-lg text-sm font-semibold transition-colors"><TrashIcon className="w-4 h-4" /> Del</button>
                                            </div>
                                        </div>
                                    );
                                })}
                             </div>
                        </div>
                    )}

                </main>
            </div>

            {/* --- Modals --- */}
            {(isEditUserModalOpen || isPasswordModalOpen || isEditGroupModalOpen) && (
                 <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-700/50 shadow-2xl flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-white">
                                {isEditUserModalOpen && `Edit ${selectedUser?.username}`}
                                {isPasswordModalOpen && `Reset Password`}
                                {isEditGroupModalOpen && `Edit ${selectedGroup?.name}`}
                            </h2>
                            <button onClick={closeAllModals} className="p-1 text-slate-400 hover:text-white"><XMarkIcon /></button>
                        </div>
                        
                        {isEditUserModalOpen && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Avatar (Emoji/Char)</label>
                                    <input type="text" value={avatar} onChange={e => setAvatar(e.target.value)} maxLength={2} className="w-full bg-slate-700 border border-slate-600 rounded-lg py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Bio</label>
                                    <textarea value={bio} onChange={e => setBio(e.target.value)} rows={2} className="w-full bg-slate-700 border border-slate-600 rounded-lg py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Email Address</label>
                                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-lg py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Phone Number</label>
                                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-lg py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Daily Message Limit</label>
                                    <input type="number" value={messageLimit === undefined ? '' : messageLimit} onChange={e => setMessageLimit(e.target.value === '' ? undefined : Number(e.target.value))} placeholder="Leave blank for unlimited" className="w-full bg-slate-700 border border-slate-600 rounded-lg py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div className="mt-6 flex justify-end gap-3">
                                    <button onClick={closeAllModals} className="px-5 py-2.5 bg-slate-600 hover:bg-slate-500 rounded-lg transition-colors font-semibold">Cancel</button>
                                    <button onClick={handleProfileUpdate} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors font-semibold">Save Changes</button>
                                </div>
                            </div>
                        )}

                        {isPasswordModalOpen && (
                           <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">New Password for {selectedUser?.username}</label>
                                    <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-lg py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div className="mt-6 flex justify-end gap-3">
                                    <button onClick={closeAllModals} className="px-5 py-2.5 bg-slate-600 hover:bg-slate-500 rounded-lg transition-colors font-semibold">Cancel</button>
                                    <button onClick={handlePasswordReset} disabled={!newPassword.trim()} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors font-semibold disabled:bg-slate-600 disabled:cursor-not-allowed">Reset Password</button>
                                </div>
                           </div>
                        )}
                        
                         {isEditGroupModalOpen && (
                           <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Group Name</label>
                                    <input type="text" value={groupName} onChange={e => setGroupName(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-lg py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Group Password (optional)</label>
                                    <input type="text" value={groupPassword} onChange={e => setGroupPassword(e.target.value)} placeholder="Leave blank for no password" className="w-full bg-slate-700 border border-slate-600 rounded-lg py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Manage Members</label>
                                    <div className="max-h-40 overflow-y-auto custom-scrollbar border border-slate-600 rounded-lg p-2 space-y-1">
                                        {users.filter(u => !u.isAdmin).map(user => (
                                            <div key={user.id} onClick={() => toggleGroupMember(user.id)} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${groupMembers.includes(user.id) ? 'bg-blue-600' : 'hover:bg-slate-700'}`}>
                                                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-sm font-bold flex-shrink-0">{user.avatar}</div>
                                                <span className="font-semibold truncate flex-grow">{user.username}</span>
                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 ${groupMembers.includes(user.id) ? 'bg-blue-500 border-blue-400' : 'border-slate-500'}`}>
                                                    {groupMembers.includes(user.id) && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="mt-6 flex justify-end gap-3">
                                    <button onClick={closeAllModals} className="px-5 py-2.5 bg-slate-600 hover:bg-slate-500 rounded-lg transition-colors font-semibold">Cancel</button>
                                    <button onClick={handleGroupUpdate} disabled={!groupName.trim()} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors font-semibold disabled:bg-slate-600 disabled:cursor-not-allowed">Save Changes</button>
                                </div>
                           </div>
                        )}
                    </div>
                </div>
            )}
        </>
    )
}

export default AdminPanel;