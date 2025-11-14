

import React, aistudio, { useState, useMemo, useEffect } from 'react';
import { User, Chat, ChatType, Message, Connection, ConnectionStatus, Verification, VerificationBadgeType, Transaction } from '../types';
import { db } from './db';
import { ArrowLeftOnRectangleIcon, Cog6ToothIcon, KeyIcon, PencilIcon, ShieldCheckIcon, XMarkIcon, UsersIcon, TrashIcon, EyeIcon, ArrowLeftIcon, BanIcon, EnvelopeIcon, ChartBarIcon, MegaphoneIcon, CheckBadgeIcon, ClockIcon, WalletIcon, CurrencyDollarIcon, ShoppingCartIcon } from './icons';
import ChatMessage from './ChatMessage';


interface AdminPanelProps {
    currentUser: User;
    users: User[];
    chats: Chat[];
    messages: Message[];
    connections: Connection[];
    transactions: Transaction[];
    onLogout: () => Promise<void>;
    onUpdateUserProfile: (params: { userId: string, avatar: string, bio: string, email: string, phone: string, messageLimit?: number }) => Promise<void>;
    onResetUserPassword: (userId: string, newPass: string) => Promise<void>;
    onUpdateGroupDetails: (params: { chatId: string, name: string, password?: string }) => Promise<void>;
    onUpdateGroupMembers: (chatId: string, memberIds: string[]) => Promise<void>;
    onDeleteUser: (userId: string) => Promise<void>;
    onDeleteGroup: (chatId: string) => Promise<void>;
    onUpdateConnection: (connectionId: string, status: ConnectionStatus) => Promise<void>;
    onDeleteConnection: (connectionId: string) => Promise<void>;
    onBroadcastAnnouncement: (text: string) => Promise<void>;
    onAdminForceConnectionStatus: (fromUserId: string, toUserId: string, status: ConnectionStatus) => Promise<void>;
    onAdminUpdateVerification: (userId: string, verification: Partial<Verification>) => Promise<void>;
    onAdminGrantFunds: (toUserId: string, amount: number) => Promise<{success: boolean, message: string}>;
}

const renderUserBadge = (user: User) => {
    if (user?.verification?.status !== 'approved') return null;
    if (user.verification.expiresAt && user.verification.expiresAt < Date.now()) return null;

    const colorClasses = {
        blue: 'text-blue-400',
        red: 'text-red-400',
        gold: 'text-amber-400',
        pink: 'text-pink-400',
        grey: 'text-slate-400',
        pastel_blue: 'text-sky-300',
    };
    const badgeColor = colorClasses[user.verification.badgeType || 'blue'] || 'text-blue-400';
    return <CheckBadgeIcon className={`w-5 h-5 ${badgeColor} flex-shrink-0`} />;
};

const formatCurrency = (amount: number | null | undefined) => {
    if (typeof amount !== 'number' || isNaN(amount)) {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(0);
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

const AdminPanel: React.FC<AdminPanelProps> = (props) => {
    const { currentUser, users, chats, messages, connections, transactions, onLogout, onUpdateUserProfile, onResetUserPassword, onUpdateGroupDetails, onUpdateGroupMembers, onDeleteUser, onDeleteGroup, onUpdateConnection, onDeleteConnection, onBroadcastAnnouncement, onAdminForceConnectionStatus, onAdminUpdateVerification, onAdminGrantFunds } = props;
    
    const [view, setView] = useState<'dashboard' |'users' | 'groups' | 'requests' | 'verification' | 'transactions'>('dashboard');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [selectedGroup, setSelectedGroup] = useState<Chat | null>(null);
    const [viewingGroupChat, setViewingGroupChat] = useState<Chat | null>(null);

    const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isEditGroupModalOpen, setIsEditGroupModalOpen] = useState(false);
    const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [modalView, setModalView] = useState<'profile' | 'connections' | 'wallet'>('profile');
    const [avatar, setAvatar] = useState('');
    const [bio, setBio] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [messageLimit, setMessageLimit] = useState<number | undefined>(undefined);
    const [newPassword, setNewPassword] = useState('');
    const [blockUsername, setBlockUsername] = useState('');
    const [grantAmount, setGrantAmount] = useState('');
    
    const [groupName, setGroupName] = useState('');
    const [groupPassword, setGroupPassword] = useState('');
    const [groupMembers, setGroupMembers] = useState<string[]>([]);

    const [badgeType, setBadgeType] = useState<VerificationBadgeType | 'none'>('none');
    const [expiryType, setExpiryType] = useState<'permanent' | 'hours' | 'days'>('permanent');
    const [expiryValue, setExpiryValue] = useState<string>('');
    
    const [broadcastMessage, setBroadcastMessage] = useState('');
    const [isBroadcasting, setIsBroadcasting] = useState(false);

    const pendingRequests = useMemo(() => connections.filter(c => c.status === ConnectionStatus.PENDING), [connections]);
    const verificationRequests = useMemo(() => users.filter(u => u.verification?.status === 'pending'), [users]);
    
    const viewingGroupMessages = useMemo(() => {
        if (!viewingGroupChat) return [];
        return messages.filter(m => m.chatId === viewingGroupChat.id).sort((a,b) => a.timestamp - b.timestamp);
    }, [viewingGroupChat, messages]);

    const stats = useMemo(() => {
        const nonAdminUsers = users.filter(u => !u.isAdmin);
        const nonAdminMessages = messages.filter(m => users.find(u => u.id === m.authorId && !u.isAdmin));
        
        const registrationsLast7Days = Array(7).fill(0), messagesLast7Days = Array(7).fill(0);
        const dayLabels = Array(7).fill(0).map((_, i) => { const d = new Date(); d.setDate(d.getDate() - i); return d.toLocaleDateString('en-US', { weekday: 'short' }); }).reverse();
        
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        
        for(let i=0; i<7; i++) {
            const dayStart = new Date(today.getTime() - (i+1) * 24 * 60 * 60 * 1000 + 1);
            const dayEnd = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
            nonAdminUsers.forEach(u => { const regDate = parseInt(u.id.split('-')[1]); if (regDate >= dayStart.getTime() && regDate <= dayEnd.getTime()) registrationsLast7Days[6-i]++; });
            nonAdminMessages.forEach(m => { if (m.timestamp >= dayStart.getTime() && m.timestamp <= dayEnd.getTime()) messagesLast7Days[6-i]++; });
        }

        const groupMessageCounts = messages.reduce((acc, msg) => { const chat = chats.find(c => c.id === msg.chatId && c.type === ChatType.GROUP); if(chat) acc[chat.id] = (acc[chat.id] || 0) + 1; return acc; }, {} as Record<string, number>);
        const activeGroups = Object.entries(groupMessageCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([chatId, count]) => ({ name: chats.find(c => c.id === chatId)?.name || 'Unknown Group', count }));
        
        const totalVolume = transactions.filter(t => t.type === 'transfer').reduce((sum, t) => sum + t.amount, 0);

        return { totalUsers: nonAdminUsers.length, onlineUsers: nonAdminUsers.filter(u => u.online).length, registrationsChart: { labels: dayLabels, data: registrationsLast7Days }, messagesChart: { labels: dayLabels, data: messagesLast7Days }, activeGroups, totalVolume, totalTransactions: transactions.length };
    }, [users, messages, chats, transactions]);

    const openEditUserModal = (user: User) => {
        setSelectedUser(user); setModalView('profile'); setAvatar(user.avatar); setBio(user.bio || ''); setEmail(user.email || ''); setPhone(user.phone || ''); setMessageLimit(user.messageLimit); setBlockUsername(''); setGrantAmount(''); setIsEditUserModalOpen(true);
    };

    const openPasswordModal = (user: User) => { setSelectedUser(user); setNewPassword(''); setIsPasswordModalOpen(true); };
    const openVerificationModal = (user: User) => {
        setSelectedUser(user); const verification = user.verification; setBadgeType(verification?.badgeType || 'none');
        if (verification?.expiresAt) {
            const diffHours = (verification.expiresAt - Date.now()) / 3600000;
            if (diffHours > 24) { setExpiryType('days'); setExpiryValue(Math.ceil(diffHours / 24).toString()); }
            else { setExpiryType('hours'); setExpiryValue(Math.ceil(diffHours).toString()); }
        } else { setExpiryType('permanent'); setExpiryValue(''); }
        setIsVerificationModalOpen(true);
    }
    
    const handleProfileUpdate = async () => { if (!selectedUser) return; setIsSubmitting(true); await onUpdateUserProfile({ userId: selectedUser.id, avatar, bio, email, phone, messageLimit }); setIsSubmitting(false); closeAllModals(); };
    const handlePasswordReset = async () => { if (!selectedUser || !newPassword.trim()) return; setIsSubmitting(true); await onResetUserPassword(selectedUser.id, newPassword.trim()); setIsSubmitting(false); closeAllModals(); };
    const handleDeleteUserConfirm = (user: User) => { if (window.confirm(`Are you sure you want to permanently delete ${user.username}? This action cannot be undone.`)) onDeleteUser(user.id); };
    
    const handleAdminBlockUser = async () => {
        if (!selectedUser || !blockUsername.trim()) return;
        const targetUser = users.find(u => u.username.toLowerCase() === blockUsername.trim().toLowerCase());
        if (!targetUser) { alert('User not found.'); return; }
        if(targetUser.id === selectedUser.id) { alert("Cannot block a user themselves."); return; }
        setIsSubmitting(true); await onAdminForceConnectionStatus(selectedUser.id, targetUser.id, ConnectionStatus.BLOCKED); setBlockUsername(''); setIsSubmitting(false);
    }

    const handleAdminGrantFunds = async () => {
        if (!selectedUser || !grantAmount.trim()) return;
        const amount = parseFloat(grantAmount);
        if (isNaN(amount) || amount <= 0) { alert('Please enter a valid amount.'); return; }
        setIsSubmitting(true); await onAdminGrantFunds(selectedUser.id, amount); setGrantAmount(''); setIsSubmitting(false);
    }

    const openEditGroupModal = (group: Chat) => { setSelectedGroup(group); setGroupName(group.name || ''); setGroupPassword(group.password || ''); setGroupMembers(group.members); setIsEditGroupModalOpen(true); };
    const handleGroupUpdate = async () => { if (!selectedGroup) return; setIsSubmitting(true); await Promise.all([ onUpdateGroupDetails({ chatId: selectedGroup.id, name: groupName, password: groupPassword }), onUpdateGroupMembers(selectedGroup.id, groupMembers) ]); setIsSubmitting(false); closeAllModals(); };
    const handleDeleteGroupConfirm = (group: Chat) => { if (window.confirm(`Are you sure you want to permanently delete the group "${group.name}"? This will erase all messages. This action cannot be undone.`)) onDeleteGroup(group.id); };
    
    const handleBroadcast = async () => { if (!broadcastMessage.trim()) return; setIsBroadcasting(true); await onBroadcastAnnouncement(broadcastMessage.trim()); setBroadcastMessage(''); setIsBroadcasting(false); alert('Announcement sent to all users.'); };

    const toggleGroupMember = (userId: string) => setGroupMembers(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
    
    const handleVerificationUpdate = async () => {
        if (!selectedUser) return; setIsSubmitting(true); let expiresAt: number | undefined = undefined; const numValue = parseInt(expiryValue, 10);
        if (expiryType !== 'permanent' && !isNaN(numValue) && numValue > 0) { const multiplier = expiryType === 'hours' ? 3600000 : 86400000; expiresAt = Date.now() + numValue * multiplier; }
        await onAdminUpdateVerification(selectedUser.id, { status: badgeType === 'none' ? 'none' : 'approved', badgeType: badgeType === 'none' ? undefined : badgeType, expiresAt: expiresAt });
        setIsSubmitting(false); closeAllModals();
    };

    const handleVerificationRevoke = async () => { if (!selectedUser) return; if (!window.confirm(`Are you sure you want to revoke the badge from ${selectedUser.username}?`)) return; setIsSubmitting(true); await onAdminUpdateVerification(selectedUser.id, { status: 'none' }); setIsSubmitting(false); closeAllModals(); };

    const closeAllModals = () => { setIsEditUserModalOpen(false); setIsPasswordModalOpen(false); setIsEditGroupModalOpen(false); setIsVerificationModalOpen(false); setSelectedUser(null); setSelectedGroup(null); };

    if (viewingGroupChat) {
         return (
            <div className="flex flex-col h-screen bg-black/30 text-white">
                <header className="p-4 border-b border-white/10 flex items-center gap-4 flex-shrink-0 bg-black/10 backdrop-blur-2xl z-10">
                     <button onClick={() => setViewingGroupChat(null)} className="p-2 text-slate-400 hover:text-white"><ArrowLeftIcon className="w-6 h-6" /></button>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-xl font-bold flex-shrink-0"><UsersIcon className="w-6 h-6"/></div>
                    <div><h2 className="text-xl font-bold">{viewingGroupChat.name}</h2><p className="text-xs text-slate-400">Viewing as Admin</p></div>
                </header>
                 <div className="flex-grow p-6 overflow-y-auto space-y-6 custom-scrollbar">
                    {viewingGroupMessages.length > 0 ? viewingGroupMessages.map(msg => { const author = users.find(u => u.id === msg.authorId); if (!author) return null; return <ChatMessage key={msg.id} message={msg} author={author} isCurrentUser={false} isGroupChat={true} />; }) : (<div className="text-center text-slate-500 mt-8">No messages in this group yet.</div>)}
                </div>
            </div>
         )
    }
    
    return (
        <>
            <div className="flex h-screen bg-black/30 text-white">
                <aside className="w-64 flex-shrink-0 bg-black/20 backdrop-blur-2xl p-4 flex flex-col border-r border-white/10">
                    <div className="flex items-center gap-3 p-2 mb-6">
                         <div className="relative flex-shrink-0"><div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-2xl font-bold">{currentUser.avatar}</div></div>
                        <div className="overflow-hidden"><div className="flex items-center gap-1.5"><h2 className="font-bold text-lg truncate">{currentUser.username}</h2>{renderUserBadge(currentUser)}</div><p className="text-sm text-blue-300 flex items-center gap-1.5"><ShieldCheckIcon className="w-4 h-4" /> Administrator</p></div>
                    </div>
                    <nav className="flex-grow space-y-2">
                         <button onClick={() => setView('dashboard')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${view === 'dashboard' ? 'bg-gradient-to-r from-blue-500/80 to-purple-500/80 text-white font-semibold shadow-lg shadow-blue-500/20' : 'text-slate-300 hover:bg-white/5'}`}><ChartBarIcon className="w-6 h-6" /><span>Dashboard</span></button>
                        <button onClick={() => setView('users')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${view === 'users' ? 'bg-gradient-to-r from-blue-500/80 to-purple-500/80 text-white font-semibold shadow-lg shadow-blue-500/20' : 'text-slate-300 hover:bg-white/5'}`}><Cog6ToothIcon className="w-6 h-6" /><span>User Management</span></button>
                         <button onClick={() => setView('requests')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative ${view === 'requests' ? 'bg-gradient-to-r from-blue-500/80 to-purple-500/80 text-white font-semibold shadow-lg shadow-blue-500/20' : 'text-slate-300 hover:bg-white/5'}`}><EnvelopeIcon className="w-6 h-6" /><span>Connections</span>{pendingRequests.length > 0 && <span className="absolute top-2 right-2 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{pendingRequests.length}</span>}</button>
                        <button onClick={() => setView('verification')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative ${view === 'verification' ? 'bg-gradient-to-r from-blue-500/80 to-purple-500/80 text-white font-semibold shadow-lg shadow-blue-500/20' : 'text-slate-300 hover:bg-white/5'}`}><CheckBadgeIcon className="w-6 h-6" /><span>Verification</span>{verificationRequests.length > 0 && <span className="absolute top-2 right-2 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{verificationRequests.length}</span>}</button>
                        <button onClick={() => setView('groups')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${view === 'groups' ? 'bg-gradient-to-r from-blue-500/80 to-purple-500/80 text-white font-semibold shadow-lg shadow-blue-500/20' : 'text-slate-300 hover:bg-white/5'}`}><UsersIcon className="w-6 h-6" /><span>Group Management</span></button>
                        <button onClick={() => setView('transactions')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${view === 'transactions' ? 'bg-gradient-to-r from-blue-500/80 to-purple-500/80 text-white font-semibold shadow-lg shadow-blue-500/20' : 'text-slate-300 hover:bg-white/5'}`}><WalletIcon className="w-6 h-6" /><span>Transactions</span></button>
                    </nav>
                    <div><button onClick={onLogout} className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-300 hover:bg-white/5 hover:text-white rounded-lg transition-colors"><ArrowLeftOnRectangleIcon className="w-6 h-6" /><span className="font-semibold">Logout</span></button></div>
                </aside>
                
                <main className="flex-1 p-6 md:p-8 overflow-y-auto custom-scrollbar">
                    {view === 'dashboard' && (
                        <div>
                             <h1 className="text-4xl font-bold mb-8 text-white">Dashboard</h1>
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                                <div className="bg-black/20 backdrop-blur-xl p-6 rounded-2xl border border-white/10"><h3 className="text-slate-400 text-sm font-semibold">Total Users</h3><p className="text-4xl font-bold text-white">{stats.totalUsers}</p></div>
                                <div className="bg-black/20 backdrop-blur-xl p-6 rounded-2xl border border-white/10"><h3 className="text-slate-400 text-sm font-semibold">Online Now</h3><p className="text-4xl font-bold text-green-400">{stats.onlineUsers}</p></div>
                                <div className="bg-black/20 backdrop-blur-xl p-6 rounded-2xl border border-white/10"><h3 className="text-slate-400 text-sm font-semibold">Total Transactions</h3><p className="text-4xl font-bold text-white">{stats.totalTransactions}</p></div>
                                <div className="bg-black/20 backdrop-blur-xl p-6 rounded-2xl border border-white/10"><h3 className="text-slate-400 text-sm font-semibold">Total Volume</h3><p className="text-4xl font-bold text-cyan-300">{formatCurrency(stats.totalVolume)}</p></div>
                                <div className="bg-black/20 backdrop-blur-xl p-6 rounded-2xl border border-white/10 col-span-1 lg:col-span-4">
                                    <h3 className="text-slate-300 font-semibold mb-2">Broadcast Announcement</h3>
                                    <textarea value={broadcastMessage} onChange={e => setBroadcastMessage(e.target.value)} placeholder="Send a message to all users..." rows={2} className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"></textarea>
                                    <button onClick={handleBroadcast} disabled={!broadcastMessage.trim() || isBroadcasting} className="w-full px-5 py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg transition-colors font-semibold disabled:from-slate-600 disabled:to-slate-700 disabled:opacity-70 flex items-center justify-center gap-2"><MegaphoneIcon className="w-5 h-5" />{isBroadcasting ? 'Sending...' : 'Broadcast'}</button>
                                </div>
                             </div>
                             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-2 bg-black/20 backdrop-blur-xl p-6 rounded-2xl border border-white/10">
                                    <h3 className="text-slate-300 font-semibold mb-4">Activity (Last 7 Days)</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div><h4 className="text-sm text-slate-400 mb-2">New Users</h4><div className="h-48 flex justify-between items-end gap-2 p-2 border border-white/10 rounded-lg">{stats.registrationsChart.data.map((val, i) => (<div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 group"><span className="text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">{val}</span><div className="w-full bg-blue-500/30 hover:bg-blue-500/50 rounded-t" style={{ height: `${val === 0 ? 2 : (val / Math.max(...stats.registrationsChart.data, 1)) * 100}%`}}></div><span className="text-xs text-slate-500">{stats.registrationsChart.labels[i]}</span></div>))}</div></div>
                                         <div><h4 className="text-sm text-slate-400 mb-2">Messages Sent</h4><div className="h-48 flex justify-between items-end gap-2 p-2 border border-white/10 rounded-lg">{stats.messagesChart.data.map((val, i) => (<div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 group"><span className="text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">{val}</span><div className="w-full bg-purple-500/30 hover:bg-purple-500/50 rounded-t" style={{ height: `${val === 0 ? 2 : (val / Math.max(...stats.messagesChart.data, 1)) * 100}%`}}></div><span className="text-xs text-slate-500">{stats.messagesChart.labels[i]}</span></div>))}</div></div>
                                    </div>
                                </div>
                                <div className="bg-black/20 backdrop-blur-xl p-6 rounded-2xl border border-white/10">
                                     <h3 className="text-slate-300 font-semibold mb-4">Most Active Groups</h3>
                                     <div className="space-y-3">{stats.activeGroups.length > 0 ? stats.activeGroups.map(group => (<div key={group.name}><div className="flex justify-between text-sm mb-1"><span className="font-semibold truncate">{group.name}</span><span className="text-slate-400">{group.count} msgs</span></div><div className="w-full bg-white/10 rounded-full h-1.5"><div className="bg-gradient-to-r from-cyan-400 to-green-400 h-1.5 rounded-full" style={{ width: `${(group.count / Math.max(stats.activeGroups[0].count, 1)) * 100}%`}}></div></div></div>)) : <p className="text-center text-slate-500 pt-8">No group activity yet.</p>}</div>
                                </div>
                             </div>
                        </div>
                    )}
                    {view === 'users' && (
                        <div>
                            <h1 className="text-4xl font-bold mb-8 text-white">User Management</h1>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {users.filter(u => !u.isAdmin).map(user => (
                                    <div key={user.id} className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex flex-col">
                                        <div className="flex items-start gap-4 mb-4">
                                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-2xl font-bold flex-shrink-0">{user.avatar}</div>
                                            <div className="overflow-hidden flex-grow">
                                                <div className="flex items-center gap-1.5"><p className="font-bold text-lg truncate">{user.username}</p>{renderUserBadge(user)}</div>
                                                <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${user.online ? 'bg-green-500/10 text-green-400' : 'bg-slate-500/10 text-slate-400'}`}><span className={`h-1.5 w-1.5 rounded-full ${user.online ? 'bg-green-500' : 'bg-slate-500'}`}></span>{user.online ? 'Online' : 'Offline'}</span>
                                            </div>
                                            <p className="text-lg font-bold text-cyan-300 flex-shrink-0">{formatCurrency(user.walletBalance)}</p>
                                        </div>
                                        <div className="space-y-3 text-sm text-slate-300 flex-grow mb-4"><p><strong className="text-slate-400">Email:</strong> {user.email || 'N/A'}</p><p><strong className="text-slate-400">User ID:</strong> <span className="font-mono text-xs">{user.id}</span></p></div>
                                        <div className="mt-auto grid grid-cols-2 gap-2">
                                            <button onClick={() => openEditUserModal(user)} className="flex items-center justify-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-semibold transition-colors"><PencilIcon className="w-4 h-4" /> Edit</button>
                                            <button onClick={() => openVerificationModal(user)} className="flex items-center justify-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-semibold transition-colors"><CheckBadgeIcon className="w-4 h-4" /> Verify</button>
                                            <button onClick={() => openPasswordModal(user)} className="flex items-center justify-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-semibold transition-colors"><KeyIcon className="w-4 h-4" /> Pass</button>
                                            <button onClick={() => handleDeleteUserConfirm(user)} className="flex items-center justify-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-300 rounded-lg text-sm font-semibold transition-colors"><TrashIcon className="w-4 h-4" /> Del</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {view === 'requests' && ( <div><h1 className="text-4xl font-bold mb-8 text-white">Connection Requests</h1><div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl"><table className="w-full text-left"><thead className="border-b border-white/10 text-sm text-slate-400"><tr><th className="p-4">From</th><th className="p-4">To</th><th className="p-4">Date</th><th className="p-4 text-right">Actions</th></tr></thead><tbody>{pendingRequests.length > 0 ? pendingRequests.map(req => { const fromUser = users.find(u => u.id === req.fromUserId); const toUser = users.find(u => u.id === req.toUserId); return (<tr key={req.id} className="border-b border-white/10 hover:bg-white/5"><td className="p-4 font-semibold">{fromUser?.username || 'Unknown'}</td><td className="p-4 font-semibold">{toUser?.username || 'Unknown'}</td><td className="p-4 text-slate-400 text-sm">{new Date(req.requestedAt).toLocaleDateString()}</td><td className="p-4 text-right space-x-2"><button onClick={() => onUpdateConnection(req.id, ConnectionStatus.REJECTED)} className="px-3 py-1.5 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded font-semibold">Deny</button><button onClick={() => onUpdateConnection(req.id, ConnectionStatus.ACCEPTED)} className="px-3 py-1.5 text-xs bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded font-semibold">Approve</button></td></tr>)}) : (<tr><td colSpan={4} className="text-center p-8 text-slate-500">No pending requests.</td></tr>)}</tbody></table></div></div> )}
                    {view === 'verification' && ( <div><h1 className="text-4xl font-bold mb-8 text-white">Verification Requests</h1><div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl"><table className="w-full text-left"><thead className="border-b border-white/10 text-sm text-slate-400"><tr><th className="p-4">User</th><th className="p-4">Email</th><th className="p-4">Date Registered</th><th className="p-4 text-right">Actions</th></tr></thead><tbody>{verificationRequests.length > 0 ? verificationRequests.map(user => (<tr key={user.id} className="border-b border-white/10 hover:bg-white/5"><td className="p-4 font-semibold">{user.username}</td><td className="p-4 text-slate-400">{user.email || 'N/A'}</td><td className="p-4 text-slate-400 text-sm">{new Date(parseInt(user.id.split('-')[1])).toLocaleDateString()}</td><td className="p-4 text-right space-x-2"><button onClick={() => openVerificationModal(user)} className="px-3 py-1.5 text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded font-semibold">Manage</button></td></tr>)) : (<tr><td colSpan={4} className="text-center p-8 text-slate-500">No pending verification requests.</td></tr>)}</tbody></table></div></div> )}
                    {view === 'groups' && ( <div><h1 className="text-4xl font-bold mb-8 text-white">Group Management</h1><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">{chats.filter(c => c.type === ChatType.GROUP && c.id !== 'chat-announcements-global').map(group => { const creator = users.find(u => u.id === group.creatorId); return (<div key={group.id} className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex flex-col"><div className="flex items-center gap-4 mb-4"><div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-2xl font-bold flex-shrink-0"><UsersIcon className="w-8 h-8"/></div><div className="overflow-hidden"><p className="font-bold text-lg truncate">{group.name}</p><p className="text-sm text-slate-400"> {group.members.length} Members</p></div></div><div className="space-y-3 text-sm text-slate-300 flex-grow mb-4"><p><strong className="text-slate-400">Created by:</strong> {creator?.username || 'Unknown'}</p><p><strong className="text-slate-400">Password:</strong> {group.password ? 'Protected' : 'None'}</p></div><div className="mt-4 grid grid-cols-3 gap-2"><button onClick={() => setViewingGroupChat(group)} className="flex items-center justify-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-semibold transition-colors"><EyeIcon className="w-4 h-4" /> View</button><button onClick={() => openEditGroupModal(group)} className="flex items-center justify-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-semibold transition-colors"><PencilIcon className="w-4 h-4" /> Edit</button><button onClick={() => handleDeleteGroupConfirm(group)} className="flex items-center justify-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-300 rounded-lg text-sm font-semibold transition-colors"><TrashIcon className="w-4 h-4" /> Del</button></div></div>); })}</div></div> )}
                    {view === 'transactions' && (
                         <div>
                            <h1 className="text-4xl font-bold mb-8 text-white">Transaction Log</h1>
                             <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="border-b border-white/10 text-sm text-slate-400"><tr><th className="p-4">Type</th><th className="p-4">From</th><th className="p-4">To</th><th className="p-4">Amount</th><th className="p-4">Date</th><th className="p-4">Details</th></tr></thead>
                                        <tbody>
                                            {transactions.sort((a,b) => b.timestamp - a.timestamp).map(t => {
                                                const fromUser = users.find(u => u.id === t.fromUserId);
                                                const toUser = users.find(u => u.id === t.toUserId);

                                                let typeIcon, typeText, fromText, toText;
                                                
                                                switch(t.type) {
                                                    case 'transfer':
                                                        typeIcon = <CurrencyDollarIcon className="w-5 h-5 text-green-400" />;
                                                        typeText = 'Transfer';
                                                        fromText = fromUser?.username || 'Unknown User';
                                                        toText = toUser?.username || 'Unknown User';
                                                        break;
                                                    case 'purchase':
                                                        typeIcon = <ShoppingCartIcon className="w-5 h-5 text-cyan-400" />;
                                                        typeText = 'Purchase';
                                                        fromText = fromUser?.username || 'Unknown User';
                                                        toText = 'Marketplace';
                                                        break;
                                                    case 'admin_grant':
                                                        typeIcon = <ShieldCheckIcon className="w-5 h-5 text-amber-400" />;
                                                        typeText = 'Admin Grant';
                                                        fromText = 'Admin';
                                                        toText = toUser?.username || 'Unknown User';
                                                        break;
                                                    default:
                                                        typeIcon = null;
                                                        typeText = t.type.replace('_', ' ');
                                                        fromText = fromUser?.username || t.fromUserId;
                                                        toText = toUser?.username || t.toUserId;
                                                }
                                                
                                                return (
                                                <tr key={t.id} className="border-b border-white/10 hover:bg-white/5 text-sm">
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-3">
                                                            {typeIcon}
                                                            <span className="font-semibold capitalize">{typeText}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">{fromText}</td>
                                                    <td className="p-4">{toText}</td>
                                                    <td className="p-4 font-semibold font-mono text-cyan-300">{formatCurrency(t.amount)}</td>
                                                    <td className="p-4 text-slate-400">{new Date(t.timestamp).toLocaleString()}</td>
                                                    <td className="p-4 text-slate-300">{t.description}</td>
                                                </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                             </div>
                        </div>
                    )}
                </main>
            </div>

            <div className={`fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 transition-opacity duration-300 ${isEditUserModalOpen || isPasswordModalOpen || isEditGroupModalOpen || isVerificationModalOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <div className={`bg-slate-900/50 backdrop-blur-2xl rounded-2xl p-6 w-full max-w-lg border border-white/10 shadow-2xl flex flex-col transition-all duration-300 ${isEditUserModalOpen || isPasswordModalOpen || isEditGroupModalOpen || isVerificationModalOpen ? 'scale-100' : 'scale-95'}`}>
                    <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold text-white">{isEditUserModalOpen && `Edit ${selectedUser?.username}`}{isPasswordModalOpen && `Reset Password for ${selectedUser?.username}`}{isEditGroupModalOpen && `Edit ${selectedGroup?.name}`}{isVerificationModalOpen && `Manage Verification for ${selectedUser?.username}`}</h2><button onClick={closeAllModals} className="p-1 text-slate-400 hover:text-white"><XMarkIcon /></button></div>
                    {isEditUserModalOpen && selectedUser && (
                        <div>
                            <div className="border-b border-white/10 mb-4"><nav className="flex -mb-px"><button onClick={() => setModalView('profile')} className={`px-4 py-2 text-sm font-medium border-b-2 ${modalView === 'profile' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-white'}`}>Profile</button><button onClick={() => setModalView('connections')} className={`px-4 py-2 text-sm font-medium border-b-2 ${modalView === 'connections' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-white'}`}>Connections</button><button onClick={() => setModalView('wallet')} className={`px-4 py-2 text-sm font-medium border-b-2 ${modalView === 'wallet' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-white'}`}>Wallet</button></nav></div>
                            {modalView === 'profile' ? (<div className="space-y-4"><div><label className="block text-sm font-medium text-slate-300 mb-1">Avatar (Emoji/Char)</label><input type="text" value={avatar} onChange={e => setAvatar(e.target.value)} maxLength={2} className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" /></div><div><label className="block text-sm font-medium text-slate-300 mb-1">Bio</label><textarea value={bio} onChange={e => setBio(e.target.value)} rows={2} className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea></div><div><label className="block text-sm font-medium text-slate-300 mb-1">Email Address</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" /></div><div><label className="block text-sm font-medium text-slate-300 mb-1">Phone Number</label><input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" /></div><div><label className="block text-sm font-medium text-slate-300 mb-1">Daily Message Limit</label><input type="number" value={messageLimit === undefined ? '' : messageLimit} onChange={e => setMessageLimit(e.target.value === '' ? undefined : Number(e.target.value))} placeholder="Leave blank for unlimited" className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" /></div></div>
                            ) : modalView === 'connections' ? (<div className="space-y-4"><div className="max-h-60 overflow-y-auto custom-scrollbar border border-white/10 rounded-lg p-2 space-y-1">{connections.filter(c => c.fromUserId === selectedUser.id || c.toUserId === selectedUser.id).map(conn => { const otherUser = users.find(u => u.id === (conn.fromUserId === selectedUser.id ? conn.toUserId : conn.fromUserId)); return (<div key={conn.id} className="flex items-center justify-between p-2 rounded hover:bg-white/5"><span className="font-semibold">{otherUser?.username || 'Unknown'}</span><div className="flex items-center gap-2"><span className={`text-xs px-2 py-0.5 rounded-full ${conn.status === 'blocked' ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'}`}>{conn.status}</span>{conn.status === 'blocked' ? <button onClick={() => onUpdateConnection(conn.id, ConnectionStatus.ACCEPTED)} className="px-2 py-1 text-xs bg-green-700 hover:bg-green-600 rounded">Unblock</button> : <button onClick={() => onUpdateConnection(conn.id, ConnectionStatus.BLOCKED)} className="px-2 py-1 text-xs bg-red-700 hover:bg-red-600 rounded">Block</button>}<button onClick={() => onDeleteConnection(conn.id)} className="p-1 text-slate-400 hover:text-white"><TrashIcon className="w-4 h-4"/></button></div></div>)})}</div><div><label className="block text-sm font-medium text-slate-300 mb-1">Force Block User</label><div className="flex gap-2"><input type="text" value={blockUsername} onChange={e => setBlockUsername(e.target.value)} placeholder="Enter username to block" className="flex-grow bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" /><button onClick={handleAdminBlockUser} disabled={isSubmitting} className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg font-semibold disabled:bg-slate-600">Block</button></div></div></div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="bg-black/20 p-4 rounded-xl text-center"><p className="text-sm text-slate-300">Current Balance</p><p className="text-3xl font-bold text-white">{formatCurrency(selectedUser.walletBalance)}</p></div>
                                    <div><label className="block text-sm font-medium text-slate-300 mb-1">Grant Funds</label><div className="flex gap-2"><input type="number" value={grantAmount} onChange={e => setGrantAmount(e.target.value)} placeholder="Amount to grant" className="flex-grow bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" /><button onClick={handleAdminGrantFunds} disabled={isSubmitting} className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg font-semibold disabled:bg-slate-600">Grant</button></div></div>
                                    <div className="max-h-40 overflow-y-auto custom-scrollbar border border-white/10 rounded-lg p-2 space-y-1">{transactions.filter(t => t.fromUserId === selectedUser.id || t.toUserId === selectedUser.id).sort((a,b) => b.timestamp - a.timestamp).map(t => (<div key={t.id} className="text-xs p-2 bg-white/5 rounded-lg flex justify-between items-center"><div><p className="font-semibold">{t.description}</p><p className="text-slate-400">{new Date(t.timestamp).toLocaleDateString()}</p></div><p className={`font-bold ${t.fromUserId === selectedUser.id ? 'text-red-400' : 'text-green-400'}`}>{formatCurrency(t.amount)}</p></div>))}</div>
                                </div>
                            )}
                            <div className="mt-6 flex justify-end gap-3"><button onClick={closeAllModals} className="px-5 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors font-semibold">Cancel</button>{modalView === 'profile' && <button onClick={handleProfileUpdate} disabled={isSubmitting} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors font-semibold disabled:bg-slate-600 disabled:opacity-70">{isSubmitting ? 'Saving...' : 'Save Changes'}</button>}</div>
                        </div>
                    )}
                    {isPasswordModalOpen && (<div className="space-y-4"><div><label className="block text-sm font-medium text-slate-300 mb-1">New Password</label><input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" /></div><div className="mt-6 flex justify-end gap-3"><button onClick={closeAllModals} className="px-5 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors font-semibold">Cancel</button><button onClick={handlePasswordReset} disabled={!newPassword.trim() || isSubmitting} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors font-semibold disabled:bg-slate-600 disabled:cursor-not-allowed">{isSubmitting ? 'Resetting...' : 'Reset Password'}</button></div></div>)}
                    {isEditGroupModalOpen && (<div className="space-y-4"><div><label className="block text-sm font-medium text-slate-300 mb-1">Group Name</label><input type="text" value={groupName} onChange={e => setGroupName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" /></div><div><label className="block text-sm font-medium text-slate-300 mb-1">Group Password (optional)</label><input type="text" value={groupPassword} onChange={e => setGroupPassword(e.target.value)} placeholder="Leave blank for no password" className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" /></div><div><label className="block text-sm font-medium text-slate-300 mb-2">Manage Members</label><div className="max-h-40 overflow-y-auto custom-scrollbar border border-white/10 rounded-lg p-2 space-y-1">{users.filter(u => !u.isAdmin).map(user => (<div key={user.id} onClick={() => toggleGroupMember(user.id)} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${groupMembers.includes(user.id) ? 'bg-blue-600/50' : 'hover:bg-white/5'}`}><div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-sm font-bold flex-shrink-0">{user.avatar}</div><span className="font-semibold truncate flex-grow">{user.username}</span><div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 ${groupMembers.includes(user.id) ? 'bg-blue-500 border-blue-400' : 'border-slate-500'}`}>{groupMembers.includes(user.id) && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>}</div></div>))}</div></div><div className="mt-6 flex justify-end gap-3"><button onClick={closeAllModals} className="px-5 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors font-semibold">Cancel</button><button onClick={handleGroupUpdate} disabled={!groupName.trim() || isSubmitting} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors font-semibold disabled:bg-slate-600 disabled:cursor-not-allowed">{isSubmitting ? 'Saving...' : 'Save Changes'}</button></div></div>)}
                    {isVerificationModalOpen && selectedUser && (<div className="space-y-4"><div><label className="block text-sm font-medium text-slate-300 mb-2">Badge Type</label><div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">{(['none', 'blue', 'red', 'gold', 'pink', 'grey', 'pastel_blue'] as const).map(type => (<button key={type} onClick={() => setBadgeType(type)} className={`p-2 rounded-lg border-2 transition-colors ${badgeType === type ? 'border-cyan-400 bg-cyan-500/20' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>{type === 'none' ? 'None' : <CheckBadgeIcon className={`w-5 h-5 mx-auto ${type === 'blue' ? 'text-blue-400' : type === 'red' ? 'text-red-400' : type === 'gold' ? 'text-amber-400' : type === 'pink' ? 'text-pink-400' : type === 'grey' ? 'text-slate-400' : 'text-sky-300'}`} />}<span className="capitalize mt-1 block">{type.replace('_', ' ')}</span></button>))}</div></div><div><label className="block text-sm font-medium text-slate-300 mb-2">Badge Duration</label><div className="flex rounded-lg border border-white/10 p-1 bg-white/5">{(['permanent', 'hours', 'days'] as const).map(type => (<button key={type} onClick={() => setExpiryType(type)} className={`flex-1 px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${expiryType === type ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:bg-white/10'}`}>{type}</button>))}</div>{expiryType !== 'permanent' && (<div className="relative mt-2"><input type="number" value={expiryValue} onChange={e => setExpiryValue(e.target.value)} placeholder={`Enter duration in ${expiryType}`} className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-4 pr-10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" /><ClockIcon className="w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2"/></div>)}</div><div className="mt-6 flex justify-between items-center gap-3"><button onClick={handleVerificationRevoke} disabled={isSubmitting} className="px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-300 rounded-lg transition-colors font-semibold disabled:opacity-50">Revoke Badge</button><div className="flex gap-3"><button onClick={closeAllModals} className="px-5 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors font-semibold">Cancel</button><button onClick={handleVerificationUpdate} disabled={isSubmitting} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors font-semibold disabled:bg-slate-600 disabled:cursor-not-allowed">{isSubmitting ? 'Saving...' : 'Save Changes'}</button></div></div></div>)}
                </div>
            </div>
        </>
    )
}

export default AdminPanel;