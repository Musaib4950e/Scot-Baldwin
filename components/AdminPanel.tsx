import React, { useState, useMemo, useEffect, useRef } from 'react';
import { User, Chat, ChatType, Message, Connection, ConnectionStatus, Verification, VerificationBadgeType, Transaction, Report } from '../types';
import { db, MARKETPLACE_ITEMS } from './db';
import { ArrowLeftOnRectangleIcon, Cog6ToothIcon, KeyIcon, PencilIcon, ShieldCheckIcon, XMarkIcon, UsersIcon, TrashIcon, EyeIcon, ArrowLeftIcon, BanIcon, EnvelopeIcon, ChartBarIcon, MegaphoneIcon, CheckBadgeIcon, ClockIcon, WalletIcon, CurrencyDollarIcon, ShoppingCartIcon, LockOpenIcon, CheckCircleIcon, ChevronDownIcon, PaintBrushIcon, ExclamationTriangleIcon } from './icons';
import ChatMessage from './ChatMessage';

// Helper component for the visual badge selector
const BadgeOption: React.FC<{ badge: VerificationBadgeType | 'none' }> = ({ badge }) => {
    const badgeDetails: Record<VerificationBadgeType | 'none', { color: string, name: string, isGradient?: boolean }> = {
        none: { color: 'text-slate-400', name: 'None (Revoke)' },
        blue: { color: 'text-blue-400', name: 'Blue' },
        red: { color: 'text-red-400', name: 'Red' },
        gold: { color: 'text-amber-400', name: 'Gold' },
        pink: { color: 'text-pink-400', name: 'Pink' },
        grey: { color: 'text-slate-400', name: 'Grey' },
        pastel_blue: { color: 'text-sky-300', name: 'Pastel Blue' },
        aurora: { color: 'aurora-badge', name: 'Aurora (Admin)', isGradient: true },
    };

    const { color, name, isGradient } = badgeDetails[badge];

    return (
        <div className="flex items-center gap-3">
            {badge === 'none' ? (
                <BanIcon className={`w-5 h-5 ${color}`} />
            ) : (
                <CheckBadgeIcon className={`w-5 h-5 ${color}`} />
            )}
            <span className={`font-semibold ${isGradient ? color : 'text-white'}`}>{name}</span>
        </div>
    );
};

interface AdminPanelProps {
    currentUser: User;
    users: User[];
    chats: Chat[];
    messages: Message[];
    connections: Connection[];
    transactions: Transaction[];
    reports: Report[];
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
    onAdminUpdateUserFreezeStatus: (userId: string, isFrozen: boolean, frozenUntil?: number) => Promise<void>;
    onUpdateReportStatus: (reportId: string, status: Report['status']) => Promise<void>;
}

const AvatarWithBorder: React.FC<{ user: User, containerClasses: string, textClasses: string }> = ({ user, containerClasses, textClasses }) => {
    const borderId = user.customization?.profileBorderId;
    const borderItem = borderId ? MARKETPLACE_ITEMS.borders.find(b => b.id === borderId) : null;
    const style = borderItem ? borderItem.style : {};

    return (
        <div className={`${containerClasses} rounded-full flex-shrink-0`} style={style}>
            <div className={`w-full h-full rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center font-bold ${textClasses}`}>{user.avatar}</div>
        </div>
    );
};

const UserName: React.FC<{ user: User, className?: string }> = ({ user, className }) => {
    const colorId = user.customization?.nameColorId;
    const colorItem = colorId ? MARKETPLACE_ITEMS.nameColors.find(c => c.id === colorId) : null;
    const style = colorItem ? colorItem.style : {};
    
    return (
        <span className={className} style={style}>{user.username}</span>
    );
};

const renderUserBadge = (user: User) => {
    if (user?.verification?.status !== 'approved') return null;
    if (user.verification.expiresAt && user.verification.expiresAt < Date.now()) return null;

    if (user.verification.badgeType === 'aurora') {
        return <CheckBadgeIcon className="w-5 h-5 aurora-badge flex-shrink-0" />;
    }

    const colorClasses: Record<VerificationBadgeType, string> = {
        blue: 'text-blue-400',
        red: 'text-red-400',
        gold: 'text-amber-400',
        pink: 'text-pink-400',
        grey: 'text-slate-400',
        pastel_blue: 'text-sky-300',
        aurora: 'aurora-badge',
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
    const { currentUser, users, chats, messages, connections, transactions, reports, onLogout, onUpdateUserProfile, onResetUserPassword, onUpdateGroupDetails, onUpdateGroupMembers, onDeleteUser, onDeleteGroup, onUpdateConnection, onDeleteConnection, onBroadcastAnnouncement, onAdminForceConnectionStatus, onAdminUpdateVerification, onAdminGrantFunds, onAdminUpdateUserFreezeStatus, onUpdateReportStatus } = props;
    
    const [view, setView] = useState<'dashboard' |'users' | 'groups' | 'requests' | 'verification' | 'transactions' | 'wallets' | 'reports' | 'announcements'>('dashboard');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [selectedGroup, setSelectedGroup] = useState<Chat | null>(null);
    const [viewingGroupChat, setViewingGroupChat] = useState<Chat | null>(null);

    const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isEditGroupModalOpen, setIsEditGroupModalOpen] = useState(false);
    const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
    const [isGrantModalOpen, setIsGrantModalOpen] = useState(false);
    const [isFreezeModalOpen, setIsFreezeModalOpen] = useState(false);
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

    const [verificationTab, setVerificationTab] = useState<'manage' | 'requests'>('manage');
    const [badgeType, setBadgeType] = useState<VerificationBadgeType | 'none'>('none');
    const [expiryType, setExpiryType] = useState<'permanent' | 'hours' | 'days'>('permanent');
    const [expiryValue, setExpiryValue] = useState<string>('');
    const [freezeType, setFreezeType] = useState<'permanent' | 'hours' | 'days'>('permanent');
    const [freezeValue, setFreezeValue] = useState<string>('');
    
    const [broadcastMessage, setBroadcastMessage] = useState('');
    const [isBroadcasting, setIsBroadcasting] = useState(false);
    
    const [isBadgeSelectorOpen, setIsBadgeSelectorOpen] = useState(false);
    const badgeSelectorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (badgeSelectorRef.current && !badgeSelectorRef.current.contains(event.target as Node)) {
                setIsBadgeSelectorOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const pendingRequests = useMemo(() => connections.filter(c => c.status === ConnectionStatus.PENDING), [connections]);
    const verificationRequests = useMemo(() => users.filter(u => u.verification?.status === 'pending'), [users]);
    const pendingReports = useMemo(() => reports.filter(r => r.status === 'pending'), [reports]);
    const announcements = useMemo(() => messages.filter(m => m.type === 'announcement').sort((a, b) => b.timestamp - a.timestamp), [messages]);
    
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
    const openGrantModal = (user: User) => {
        setSelectedUser(user);
        setGrantAmount('');
        setIsGrantModalOpen(true);
    }
    const openFreezeModal = (user: User) => {
        setSelectedUser(user);
        setFreezeType('permanent');
        setFreezeValue('');
        setIsFreezeModalOpen(true);
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
        setIsSubmitting(true);
        await onAdminGrantFunds(selectedUser.id, amount);
        setGrantAmount('');
        setIsSubmitting(false);
        if (isGrantModalOpen) setIsGrantModalOpen(false); // Close the quick grant modal if it's open
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

    const handleFreezeUpdate = async () => {
        if (!selectedUser) return;
        setIsSubmitting(true);
        let frozenUntil: number | undefined = undefined;
        if (freezeType !== 'permanent') {
            const numValue = parseInt(freezeValue, 10);
            if (!isNaN(numValue) && numValue > 0) {
                const multiplier = freezeType === 'hours' ? 3600000 : 86400000;
                frozenUntil = Date.now() + numValue * multiplier;
            } else {
                alert('Please enter a valid duration.');
                setIsSubmitting(false);
                return;
            }
        }
        await onAdminUpdateUserFreezeStatus(selectedUser.id, true, frozenUntil);
        setIsSubmitting(false);
        closeAllModals();
    };
    
    const handleUnfreeze = async (userId: string) => {
        if (window.confirm('Are you sure you want to unfreeze this user\'s account?')) {
            await onAdminUpdateUserFreezeStatus(userId, false);
        }
    };

    const handleVerificationRevoke = async () => { if (!selectedUser) return; if (!window.confirm(`Are you sure you want to revoke the badge from ${selectedUser.username}?`)) return; setIsSubmitting(true); await onAdminUpdateVerification(selectedUser.id, { status: 'none' }); setIsSubmitting(false); closeAllModals(); };

    const getVerificationStatusText = (user: User) => {
        const verification = user.verification;
        if (verification?.status === 'approved') {
            const isExpired = verification.expiresAt && verification.expiresAt < Date.now();
            if (isExpired) {
                return "Expired";
            }
            const badgeName = verification.badgeType ? verification.badgeType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Blue';
            return `Verified (${badgeName})`;
        }
        if (verification?.status === 'pending') {
            return 'Pending Review';
        }
        return 'Not Verified';
    };

    const closeAllModals = () => { setIsEditUserModalOpen(false); setIsPasswordModalOpen(false); setIsEditGroupModalOpen(false); setIsVerificationModalOpen(false); setIsGrantModalOpen(false); setIsFreezeModalOpen(false); setSelectedUser(null); setSelectedGroup(null); };

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
                        <AvatarWithBorder user={currentUser} containerClasses="w-12 h-12" textClasses="text-2xl" />
                        <div className="overflow-hidden">
                            <div className="flex items-center gap-1.5"><UserName user={currentUser} className="font-bold text-lg truncate" />{renderUserBadge(currentUser)}</div>
                            <p className="text-sm text-blue-300 flex items-center gap-1.5"><ShieldCheckIcon className="w-4 h-4" /> Administrator</p>
                        </div>
                    </div>
                    <nav className="flex-grow space-y-2">
                        <button onClick={() => setView('dashboard')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${view === 'dashboard' ? 'bg-gradient-to-r from-blue-500/80 to-purple-500/80 text-white font-semibold shadow-lg shadow-blue-500/20' : 'text-slate-300 hover:bg-white/5'}`}><ChartBarIcon className="w-6 h-6" /><span>Dashboard</span></button>
                        <button onClick={() => setView('users')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${view === 'users' ? 'bg-gradient-to-r from-blue-500/80 to-purple-500/80 text-white font-semibold shadow-lg shadow-blue-500/20' : 'text-slate-300 hover:bg-white/5'}`}><Cog6ToothIcon className="w-6 h-6" /><span>Users</span></button>
                        <button onClick={() => setView('wallets')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${view === 'wallets' ? 'bg-gradient-to-r from-blue-500/80 to-purple-500/80 text-white font-semibold shadow-lg shadow-blue-500/20' : 'text-slate-300 hover:bg-white/5'}`}><WalletIcon className="w-6 h-6" /><span>Wallets</span></button>
                        <button onClick={() => setView('requests')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative ${view === 'requests' ? 'bg-gradient-to-r from-blue-500/80 to-purple-500/80 text-white font-semibold shadow-lg shadow-blue-500/20' : 'text-slate-300 hover:bg-white/5'}`}><EnvelopeIcon className="w-6 h-6" /><span>Connections</span>{pendingRequests.length > 0 && <span className="absolute top-2 right-2 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{pendingRequests.length}</span>}</button>
                        <button onClick={() => setView('verification')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative ${view === 'verification' ? 'bg-gradient-to-r from-blue-500/80 to-purple-500/80 text-white font-semibold shadow-lg shadow-blue-500/20' : 'text-slate-300 hover:bg-white/5'}`}><CheckBadgeIcon className="w-6 h-6" /><span>Verification</span>{verificationRequests.length > 0 && <span className="absolute top-2 right-2 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{verificationRequests.length}</span>}</button>
                        <button onClick={() => setView('reports')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative ${view === 'reports' ? 'bg-gradient-to-r from-blue-500/80 to-purple-500/80 text-white font-semibold shadow-lg shadow-blue-500/20' : 'text-slate-300 hover:bg-white/5'}`}><ExclamationTriangleIcon className="w-6 h-6" /><span>Reports</span>{pendingReports.length > 0 && <span className="absolute top-2 right-2 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{pendingReports.length}</span>}</button>
                        <button onClick={() => setView('groups')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${view === 'groups' ? 'bg-gradient-to-r from-blue-500/80 to-purple-500/80 text-white font-semibold shadow-lg shadow-blue-500/20' : 'text-slate-300 hover:bg-white/5'}`}><UsersIcon className="w-6 h-6" /><span>Groups</span></button>
                        <button onClick={() => setView('transactions')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${view === 'transactions' ? 'bg-gradient-to-r from-blue-500/80 to-purple-500/80 text-white font-semibold shadow-lg shadow-blue-500/20' : 'text-slate-300 hover:bg-white/5'}`}><CurrencyDollarIcon className="w-6 h-6" /><span>Transaction Log</span></button>
                        <button onClick={() => setView('announcements')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${view === 'announcements' ? 'bg-gradient-to-r from-blue-500/80 to-purple-500/80 text-white font-semibold shadow-lg shadow-blue-500/20' : 'text-slate-300 hover:bg-white/5'}`}><MegaphoneIcon className="w-6 h-6" /><span>Announcements</span></button>
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
                                            <AvatarWithBorder user={user} containerClasses="w-14 h-14" textClasses="text-2xl" />
                                            <div className="overflow-hidden flex-grow">
                                                <div className="flex items-center gap-1.5"><UserName user={user} className="font-bold text-lg truncate" />{renderUserBadge(user)}</div>
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
                    {view === 'wallets' && (
                         <div>
                            <h1 className="text-4xl font-bold mb-8 text-white">Wallet Management</h1>
                             <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="border-b border-white/10 text-sm text-slate-400"><tr><th className="p-4">User</th><th className="p-4">Balance</th><th className="p-4">Status</th><th className="p-4 text-right">Actions</th></tr></thead>
                                        <tbody>
                                            {users.filter(u => !u.isAdmin).sort((a,b) => b.walletBalance - a.walletBalance).map(user => {
                                                const isFrozen = user.isFrozen && (!user.frozenUntil || user.frozenUntil > Date.now());
                                                return (
                                                <tr key={user.id} className="border-b border-white/10 hover:bg-white/5 text-sm">
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-3">
                                                            <AvatarWithBorder user={user} containerClasses="w-10 h-10" textClasses="text-xl" />
                                                            <div>
                                                                <div className="flex items-center gap-1.5"><UserName user={user} className="font-semibold" />{renderUserBadge(user)}</div>
                                                                <span className="text-xs text-slate-400">{user.email || 'No email'}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 font-semibold font-mono text-cyan-300 text-base">{formatCurrency(user.walletBalance)}</td>
                                                    <td className="p-4">
                                                        {isFrozen ? (
                                                            <div className="flex items-center gap-2 text-red-400" title={`Frozen until ${user.frozenUntil ? new Date(user.frozenUntil).toLocaleString() : 'Permanent'}`}>
                                                                <BanIcon className="w-5 h-5"/>
                                                                <span className="font-semibold">Frozen</span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-2 text-green-400">
                                                                <CheckCircleIcon className="w-5 h-5"/>
                                                                <span className="font-semibold">Active</span>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-4 text-right space-x-2">
                                                        <button onClick={() => openGrantModal(user)} className="px-3 py-1.5 text-xs bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-lg font-semibold transition-colors">Grant</button>
                                                        {isFrozen ? (
                                                            <button onClick={() => handleUnfreeze(user.id)} className="px-3 py-1.5 text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg font-semibold transition-colors inline-flex items-center gap-1"><LockOpenIcon className="w-3 h-3"/>Unfreeze</button>
                                                        ) : (
                                                            <button onClick={() => openFreezeModal(user)} className="px-3 py-1.5 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg font-semibold transition-colors">Freeze</button>
                                                        )}
                                                    </td>
                                                </tr>
                                            )})}
                                        </tbody>
                                    </table>
                                </div>
                             </div>
                        </div>
                    )}
                    {view === 'requests' && ( <div><h1 className="text-4xl font-bold mb-8 text-white">Connection Requests</h1><div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl"><table className="w-full text-left"><thead className="border-b border-white/10 text-sm text-slate-400"><tr><th className="p-4">From</th><th className="p-4">To</th><th className="p-4">Date</th><th className="p-4 text-right">Actions</th></tr></thead><tbody>{pendingRequests.length > 0 ? pendingRequests.map(req => { const fromUser = users.find(u => u.id === req.fromUserId); const toUser = users.find(u => u.id === req.toUserId); return (<tr key={req.id} className="border-b border-white/10 hover:bg-white/5"><td className="p-4 font-semibold">{fromUser?.username || 'Unknown'}</td><td className="p-4 font-semibold">{toUser?.username || 'Unknown'}</td><td className="p-4 text-slate-400 text-sm">{new Date(req.requestedAt).toLocaleDateString()}</td><td className="p-4 text-right space-x-2"><button onClick={() => onUpdateConnection(req.id, ConnectionStatus.REJECTED)} className="px-3 py-1.5 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded font-semibold">Deny</button><button onClick={() => onUpdateConnection(req.id, ConnectionStatus.ACCEPTED)} className="px-3 py-1.5 text-xs bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded font-semibold">Approve</button></td></tr>)}) : (<tr><td colSpan={4} className="text-center p-8 text-slate-500">No pending requests.</td></tr>)}</tbody></table></div></div> )}
                    {view === 'verification' && (
                        <div>
                            <h1 className="text-4xl font-bold mb-8 text-white">Verification Management</h1>
                             <div className="mb-6 border-b border-white/10">
                                <nav className="flex -mb-px space-x-4">
                                    <button onClick={() => setVerificationTab('manage')} className={`px-3 py-2 text-base font-semibold border-b-2 ${verificationTab === 'manage' ? 'border-cyan-400 text-cyan-300' : 'border-transparent text-slate-400 hover:text-white'}`}>
                                        Manage All
                                    </button>
                                    <button onClick={() => setVerificationTab('requests')} className={`relative px-3 py-2 text-base font-semibold border-b-2 ${verificationTab === 'requests' ? 'border-cyan-400 text-cyan-300' : 'border-transparent text-slate-400 hover:text-white'}`}>
                                        Requests
                                        {verificationRequests.length > 0 && (
                                            <span className="absolute -top-1 -right-2 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{verificationRequests.length}</span>
                                        )}
                                    </button>
                                </nav>
                            </div>
                            {verificationTab === 'manage' && (
                                <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
                                <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="border-b border-white/10 text-sm text-slate-400">
                                        <tr>
                                            <th className="p-4">User</th>
                                            <th className="p-4">Status</th>
                                            <th className="p-4">Expires On</th>
                                            <th className="p-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.filter(u => !u.isAdmin).map(user => {
                                            const verification = user.verification;
                                            const isExpired = verification?.expiresAt && verification.expiresAt < Date.now();
                                            return (
                                                <tr key={user.id} className="border-b border-white/10 hover:bg-white/5 text-sm">
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-3">
                                                            <AvatarWithBorder user={user} containerClasses="w-10 h-10" textClasses="text-xl" />
                                                            <div>
                                                                <div className="flex items-center gap-1.5"><UserName user={user} className="font-semibold" />{renderUserBadge(user)}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className={`font-semibold ${verification?.status === 'approved' && !isExpired ? 'text-green-400' : 'text-slate-400'}`}>
                                                            {getVerificationStatusText(user)}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-slate-400">
                                                        {verification?.expiresAt && !isExpired ? new Date(verification.expiresAt).toLocaleDateString() : 'N/A'}
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <button onClick={() => openVerificationModal(user)} className="px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20 text-white rounded-lg font-semibold transition-colors">Manage</button>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                                </div>
                                </div>
                            )}
                            {verificationTab === 'requests' && (
                                <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl">
                                    <table className="w-full text-left">
                                        <thead className="border-b border-white/10 text-sm text-slate-400">
                                            <tr><th className="p-4">User</th><th className="p-4">Instagram</th><th className="p-4 text-right">Actions</th></tr>
                                        </thead>
                                        <tbody>
                                            {verificationRequests.length > 0 ? verificationRequests.map(user => (
                                                <tr key={user.id} className="border-b border-white/10 hover:bg-white/5 text-sm">
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-3">
                                                            <AvatarWithBorder user={user} containerClasses="w-10 h-10" textClasses="text-xl" />
                                                            <div><UserName user={user} className="font-semibold" /></div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-slate-400">{user.instagramUsername || 'N/A'}</td>
                                                    <td className="p-4 text-right space-x-2">
                                                        <button onClick={() => openVerificationModal(user)} className="px-3 py-1.5 text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg font-semibold">Review</button>
                                                    </td>
                                                </tr>
                                            )) : <tr><td colSpan={3} className="text-center p-8 text-slate-500">No pending verification requests.</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                     {view === 'groups' && (
                        <div>
                            <h1 className="text-4xl font-bold mb-8 text-white">Group Management</h1>
                            <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl">
                                <table className="w-full text-left">
                                    <thead className="border-b border-white/10 text-sm text-slate-400">
                                        <tr>
                                            <th className="p-4">Group Name</th>
                                            <th className="p-4">Members</th>
                                            <th className="p-4">Creator</th>
                                            <th className="p-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {chats.filter(c => c.type === ChatType.GROUP && c.id !== 'chat-announcements-global').map(chat => {
                                            const creator = users.find(u => u.id === chat.creatorId);
                                            return (
                                                <tr key={chat.id} className="border-b border-white/10 hover:bg-white/5">
                                                    <td className="p-4 font-semibold">{chat.name}</td>
                                                    <td className="p-4">{chat.members.length}</td>
                                                    <td className="p-4">{creator?.username || 'N/A'}</td>
                                                    <td className="p-4 text-right space-x-2">
                                                        <button onClick={() => setViewingGroupChat(chat)} className="px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20 rounded-lg font-semibold">View</button>
                                                        <button onClick={() => openEditGroupModal(chat)} className="px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20 rounded-lg font-semibold">Edit</button>
                                                        <button onClick={() => handleDeleteGroupConfirm(chat)} className="px-3 py-1.5 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg font-semibold">Delete</button>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                    {view === 'transactions' && (
                        <div>
                            <h1 className="text-4xl font-bold mb-8 text-white">Transaction Log</h1>
                            <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl">
                                <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="border-b border-white/10 text-sm text-slate-400">
                                        <tr>
                                            <th className="p-4">Date</th>
                                            <th className="p-4">Type</th>
                                            <th className="p-4">From/To</th>
                                            <th className="p-4">Description</th>
                                            <th className="p-4 text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {transactions.sort((a,b) => b.timestamp - a.timestamp).map(t => {
                                            const from = t.fromUserId === 'admin-grant' ? {username: 'Admin'} : users.find(u => u.id === t.fromUserId);
                                            const to = t.toUserId === 'marketplace' ? {username: 'Marketplace'} : users.find(u => u.id === t.toUserId);
                                            return (
                                                <tr key={t.id} className="border-b border-white/10 hover:bg-white/5 text-sm">
                                                    <td className="p-4 text-slate-400">{new Date(t.timestamp).toLocaleString()}</td>
                                                    <td className="p-4 capitalize">{t.type}</td>
                                                    <td className="p-4 font-semibold">{from?.username} → {to?.username}</td>
                                                    <td className="p-4 text-slate-300">{t.description}</td>
                                                    <td className="p-4 text-right font-semibold font-mono">{formatCurrency(t.amount)}</td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                                </div>
                            </div>
                        </div>
                    )}
                    {view === 'reports' && (
                        <div>
                            <h1 className="text-4xl font-bold mb-8 text-white">User Reports</h1>
                            <div className="space-y-4">
                                {reports.sort((a,b) => b.timestamp - a.timestamp).map(report => {
                                    const reporter = users.find(u => u.id === report.reporterId);
                                    const reported = users.find(u => u.id === report.reportedUserId);
                                    if (!reporter || !reported) return null;
                                    return (
                                        <div key={report.id} className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-5">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-bold text-lg"><UserName user={reported} /> reported by <UserName user={reporter} /></p>
                                                    <p className="text-xs text-slate-400">{new Date(report.timestamp).toLocaleString()}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                                        report.status === 'pending' ? 'bg-amber-500/20 text-amber-300' :
                                                        report.status === 'resolved' ? 'bg-green-500/20 text-green-300' :
                                                        'bg-slate-500/20 text-slate-300'
                                                    }`}>{report.status.charAt(0).toUpperCase() + report.status.slice(1)}</span>
                                                </div>
                                            </div>
                                            <p className="my-3 p-3 bg-white/5 rounded-lg whitespace-pre-wrap">{report.reason}</p>
                                            {report.status === 'pending' && (
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => onUpdateReportStatus(report.id, 'dismissed')} className="px-3 py-1.5 text-xs bg-slate-500/20 hover:bg-slate-500/30 text-slate-300 rounded-lg font-semibold">Dismiss</button>
                                                    <button onClick={() => onUpdateReportStatus(report.id, 'resolved')} className="px-3 py-1.5 text-xs bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-lg font-semibold">Mark as Resolved</button>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                                 {reports.length === 0 && <p className="text-center text-slate-500 p-8">No reports found.</p>}
                            </div>
                        </div>
                    )}
                    {view === 'announcements' && (
                        <div>
                            <h1 className="text-4xl font-bold mb-8 text-white">Announcements</h1>
                            <div className="bg-black/20 backdrop-blur-xl p-6 rounded-2xl border border-white/10 mb-8">
                                <h3 className="text-slate-300 font-semibold mb-2">New Broadcast</h3>
                                <textarea value={broadcastMessage} onChange={e => setBroadcastMessage(e.target.value)} placeholder="Send a message to all users..." rows={3} className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"></textarea>
                                <button onClick={handleBroadcast} disabled={!broadcastMessage.trim() || isBroadcasting} className="w-full px-5 py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg transition-colors font-semibold disabled:from-slate-600 disabled:to-slate-700 disabled:opacity-70 flex items-center justify-center gap-2"><MegaphoneIcon className="w-5 h-5" />{isBroadcasting ? 'Sending...' : 'Broadcast'}</button>
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold mb-4 text-slate-300">History</h3>
                                <div className="space-y-4">
                                    {announcements.map(announcement => (
                                        <div key={announcement.id} className="bg-black/20 p-4 rounded-xl border border-white/10">
                                            <p className="text-slate-200 whitespace-pre-wrap">{announcement.text}</p>
                                            <p className="text-xs text-slate-500 mt-2">{new Date(announcement.timestamp).toLocaleString()}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {/* Modals */}
            {isEditUserModalOpen && selectedUser && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={closeAllModals}>
                    <div className="bg-slate-900/50 backdrop-blur-2xl rounded-3xl w-full max-w-2xl border border-white/10 shadow-2xl shadow-black/40 flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-6 flex justify-between items-center border-b border-white/10">
                            <h2 className="text-2xl font-bold text-white">Manage User: <UserName user={selectedUser}/></h2>
                            <button onClick={closeAllModals} className="p-1 text-slate-400 rounded-full hover:text-white hover:bg-white/10 transition-colors"><XMarkIcon /></button>
                        </div>
                        <div className="flex border-b border-white/10">
                            <button onClick={() => setModalView('profile')} className={`flex-1 p-3 text-sm font-semibold ${modalView === 'profile' ? 'bg-white/10 text-white' : 'text-slate-400'}`}>Profile</button>
                            <button onClick={() => setModalView('connections')} className={`flex-1 p-3 text-sm font-semibold ${modalView === 'connections' ? 'bg-white/10 text-white' : 'text-slate-400'}`}>Connections</button>
                            <button onClick={() => setModalView('wallet')} className={`flex-1 p-3 text-sm font-semibold ${modalView === 'wallet' ? 'bg-white/10 text-white' : 'text-slate-400'}`}>Wallet</button>
                        </div>
                        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            {modalView === 'profile' && (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div><label className="block text-sm font-medium text-slate-300 mb-1">Avatar</label><input type="text" value={avatar} onChange={e => setAvatar(e.target.value)} maxLength={2} className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-white" /></div>
                                        <div><label className="block text-sm font-medium text-slate-300 mb-1">Message Limit</label><input type="number" value={messageLimit === undefined ? '' : messageLimit} onChange={e => setMessageLimit(e.target.value === '' ? undefined : parseInt(e.target.value, 10))} placeholder="Unlimited" className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-white" /></div>
                                        <div><label className="block text-sm font-medium text-slate-300 mb-1">Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-white" /></div>
                                        <div><label className="block text-sm font-medium text-slate-300 mb-1">Phone</label><input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-white" /></div>
                                    </div>
                                    <div><label className="block text-sm font-medium text-slate-300 mb-1">Bio</label><textarea value={bio} onChange={e => setBio(e.target.value)} rows={2} className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-white"></textarea></div>
                                </>
                            )}
                            {modalView === 'connections' && (
                                 <div><h3 className="font-semibold text-lg mb-2">Block User</h3><div className="flex gap-2"><input type="text" value={blockUsername} onChange={e => setBlockUsername(e.target.value)} placeholder="Enter username to block" className="flex-grow bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-white" /><button onClick={handleAdminBlockUser} disabled={isSubmitting || !blockUsername.trim()} className="px-4 py-2 bg-red-600/80 hover:bg-red-600 rounded-lg font-semibold disabled:opacity-50">Block</button></div></div>
                            )}
                            {modalView === 'wallet' && (
                                 <div><h3 className="font-semibold text-lg mb-2">Grant Funds</h3><div className="flex gap-2"><input type="number" value={grantAmount} onChange={e => setGrantAmount(e.target.value)} placeholder="Amount (USD)" min="0.01" step="0.01" className="flex-grow bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-white" /><button onClick={handleAdminGrantFunds} disabled={isSubmitting || !grantAmount.trim()} className="px-4 py-2 bg-green-600/80 hover:bg-green-600 rounded-lg font-semibold disabled:opacity-50">Grant</button></div></div>
                            )}
                        </div>
                        <div className="p-6 flex justify-end gap-3 border-t border-white/10">
                            <button onClick={closeAllModals} className="px-5 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg font-semibold">Cancel</button>
                            <button onClick={handleProfileUpdate} disabled={isSubmitting} className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg font-semibold disabled:opacity-50">Save Changes</button>
                        </div>
                    </div>
                </div>
            )}
             {isPasswordModalOpen && selectedUser && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={closeAllModals}>
                    <div className="bg-slate-900/50 backdrop-blur-2xl rounded-3xl w-full max-w-sm border border-white/10 shadow-2xl shadow-black/40 flex flex-col" onClick={e => e.stopPropagation()}>
                         <div className="p-6 border-b border-white/10"><h2 className="text-2xl font-bold text-white">Reset Password for <UserName user={selectedUser}/></h2></div>
                         <div className="p-6 space-y-4"><label className="block text-sm font-medium text-slate-300 mb-1">New Password</label><input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-white" /></div>
                         <div className="p-6 flex justify-end gap-3 border-t border-white/10"><button onClick={closeAllModals} className="px-5 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg font-semibold">Cancel</button><button onClick={handlePasswordReset} disabled={isSubmitting || !newPassword.trim()} className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg font-semibold disabled:opacity-50">Reset</button></div>
                    </div>
                </div>
            )}
            {isEditGroupModalOpen && selectedGroup && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={closeAllModals}>
                    <div className="bg-slate-900/50 backdrop-blur-2xl rounded-3xl w-full max-w-lg border border-white/10 shadow-2xl shadow-black/40 flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-white/10"><h2 className="text-2xl font-bold text-white">Edit Group: {selectedGroup.name}</h2></div>
                        <div className="p-6 space-y-4">
                            <div><label className="block text-sm font-medium text-slate-300 mb-1">Group Name</label><input type="text" value={groupName} onChange={e => setGroupName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-white" /></div>
                            <div><label className="block text-sm font-medium text-slate-300 mb-1">Group Password (optional)</label><input type="text" value={groupPassword} onChange={e => setGroupPassword(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-white" /></div>
                            <div><h3 className="font-semibold text-lg mb-2">Members ({groupMembers.length})</h3><div className="max-h-40 overflow-y-auto custom-scrollbar space-y-2 pr-2 -mr-2">{users.filter(u => !u.isAdmin).map(user => (<div key={user.id} className="flex items-center justify-between p-2 bg-white/5 rounded-lg"><span className="font-semibold">{user.username}</span><input type="checkbox" checked={groupMembers.includes(user.id)} onChange={() => toggleGroupMember(user.id)} className="w-5 h-5 rounded bg-white/20 border-white/30 text-cyan-500 focus:ring-cyan-500" /></div>))}</div></div>
                        </div>
                        <div className="p-6 flex justify-end gap-3 border-t border-white/10"><button onClick={closeAllModals} className="px-5 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg font-semibold">Cancel</button><button onClick={handleGroupUpdate} disabled={isSubmitting} className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg font-semibold disabled:opacity-50">Save Group</button></div>
                    </div>
                </div>
            )}
            {isVerificationModalOpen && selectedUser && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={closeAllModals}>
                    <div className="bg-slate-900/50 backdrop-blur-2xl rounded-3xl w-full max-w-md border border-white/10 shadow-2xl shadow-black/40 flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-white/10"><h2 className="text-2xl font-bold text-white">Manage Verification for <UserName user={selectedUser}/></h2></div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Badge Type</label>
                                <div className="relative" ref={badgeSelectorRef}>
                                    <button type="button" onClick={() => setIsBadgeSelectorOpen(p => !p)} className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 px-4 text-white flex items-center justify-between">
                                        <BadgeOption badge={badgeType} />
                                        <ChevronDownIcon className={`w-5 h-5 text-slate-400 ml-auto flex-shrink-0 transition-transform ${isBadgeSelectorOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    {isBadgeSelectorOpen && (
                                        <div className="absolute top-full mt-2 w-full bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl z-20 p-1 space-y-1">
                                            {(['none', 'blue', 'red', 'gold', 'pink', 'grey', 'pastel_blue', 'aurora'] as (VerificationBadgeType | 'none')[]).map(b => (
                                                <div key={b} onClick={() => { setBadgeType(b); setIsBadgeSelectorOpen(false); }} className="p-2 rounded-md cursor-pointer hover:bg-cyan-500/20"><BadgeOption badge={b} /></div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            {badgeType !== 'none' && (<div><label className="block text-sm font-medium text-slate-300 mb-1">Duration</label><div className="flex rounded-lg border border-white/10"><button onClick={() => setExpiryType('permanent')} className={`flex-1 px-3 py-2 text-sm font-semibold rounded-l-md ${expiryType === 'permanent' ? 'bg-white/10' : 'bg-white/5'}`}>Permanent</button><button onClick={() => setExpiryType('hours')} className={`flex-1 px-3 py-2 text-sm font-semibold border-x border-white/10 ${expiryType === 'hours' ? 'bg-white/10' : 'bg-white/5'}`}>Hours</button><button onClick={() => setExpiryType('days')} className={`flex-1 px-3 py-2 text-sm font-semibold rounded-r-md ${expiryType === 'days' ? 'bg-white/10' : 'bg-white/5'}`}>Days</button></div>{expiryType !== 'permanent' && <input type="number" value={expiryValue} onChange={e => setExpiryValue(e.target.value)} placeholder={`Enter number of ${expiryType}`} className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-white mt-2" />}</div>)}
                        </div>
                        <div className="p-6 flex justify-between items-center gap-3 border-t border-white/10">
                            <button onClick={handleVerificationRevoke} disabled={isSubmitting} className="px-5 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg font-semibold disabled:opacity-50">Revoke</button>
                            <button onClick={handleVerificationUpdate} disabled={isSubmitting} className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg font-semibold disabled:opacity-50">Apply Changes</button>
                        </div>
                    </div>
                </div>
            )}
            {isGrantModalOpen && selectedUser && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={closeAllModals}>
                    <div className="bg-slate-900/50 backdrop-blur-2xl rounded-3xl w-full max-w-sm border border-white/10 shadow-2xl shadow-black/40 flex flex-col" onClick={e => e.stopPropagation()}>
                         <div className="p-6 border-b border-white/10"><h2 className="text-2xl font-bold text-white">Grant Funds to <UserName user={selectedUser}/></h2></div>
                         <div className="p-6 space-y-4"><label className="block text-sm font-medium text-slate-300 mb-1">Amount (USD)</label><input type="number" value={grantAmount} onChange={e => setGrantAmount(e.target.value)} min="0.01" step="0.01" className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-white" /></div>
                         <div className="p-6 flex justify-end gap-3 border-t border-white/10"><button onClick={closeAllModals} className="px-5 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg font-semibold">Cancel</button><button onClick={handleAdminGrantFunds} disabled={isSubmitting || !grantAmount.trim()} className="px-5 py-2.5 bg-green-600 hover:bg-green-500 rounded-lg font-semibold disabled:opacity-50">Grant Funds</button></div>
                    </div>
                </div>
            )}
            {isFreezeModalOpen && selectedUser && (
                 <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={closeAllModals}>
                    <div className="bg-slate-900/50 backdrop-blur-2xl rounded-3xl w-full max-w-md border border-white/10 shadow-2xl shadow-black/40 flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-white/10"><h2 className="text-2xl font-bold text-white">Freeze Account for <UserName user={selectedUser}/></h2></div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Freeze Duration</label>
                                <div className="flex rounded-lg border border-white/10"><button onClick={() => setFreezeType('permanent')} className={`flex-1 px-3 py-2 text-sm font-semibold rounded-l-md ${freezeType === 'permanent' ? 'bg-white/10' : 'bg-white/5'}`}>Permanent</button><button onClick={() => setFreezeType('hours')} className={`flex-1 px-3 py-2 text-sm font-semibold border-x border-white/10 ${freezeType === 'hours' ? 'bg-white/10' : 'bg-white/5'}`}>Hours</button><button onClick={() => setFreezeType('days')} className={`flex-1 px-3 py-2 text-sm font-semibold rounded-r-md ${freezeType === 'days' ? 'bg-white/10' : 'bg-white/5'}`}>Days</button></div>
                                {freezeType !== 'permanent' && <input type="number" value={freezeValue} onChange={e => setFreezeValue(e.target.value)} placeholder={`Enter number of ${freezeType}`} className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-white mt-2" />}
                            </div>
                        </div>
                        <div className="p-6 flex justify-end gap-3 border-t border-white/10"><button onClick={closeAllModals} className="px-5 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg font-semibold">Cancel</button><button onClick={handleFreezeUpdate} disabled={isSubmitting} className="px-5 py-2.5 bg-red-600 hover:bg-red-500 rounded-lg font-semibold disabled:opacity-50">Freeze Account</button></div>
                    </div>
                </div>
            )}
        </>
    );
};

export default AdminPanel;
