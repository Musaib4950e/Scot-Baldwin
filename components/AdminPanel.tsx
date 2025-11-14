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
                             <div className="grid grid-cols-1 md