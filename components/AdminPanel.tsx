
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { User, Chat, ChatType, Message, Connection, ConnectionStatus, Verification, VerificationBadgeType, Transaction, Report, TransactionType } from '../types';
import { db, MARKETPLACE_ITEMS } from './db';
import { ArrowLeftOnRectangleIcon, Cog6ToothIcon, KeyIcon, PencilIcon, ShieldCheckIcon, XMarkIcon, UsersIcon, TrashIcon, EyeIcon, ArrowLeftIcon, BanIcon, EnvelopeIcon, ChartBarIcon, MegaphoneIcon, CheckBadgeIcon, ClockIcon, WalletIcon, CurrencyDollarIcon, ShoppingCartIcon, LockOpenIcon, CheckCircleIcon, ChevronDownIcon, PaintBrushIcon, ExclamationTriangleIcon } from './icons';
import ChatMessage from './ChatMessage';

// Generic Modal Component
const Modal: React.FC<{ isOpen: boolean; onClose: () => void; children: React.ReactNode; maxWidth?: string; }> = ({ isOpen, onClose, children, maxWidth = 'max-w-lg' }) => {
    const [isVisible, setIsVisible] = useState(isOpen);
    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
        } else {
            const timer = setTimeout(() => setIsVisible(false), 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isVisible) return null;

    return (
        <div 
            className={`fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
            onClick={onClose}
        >
             <div 
                className={`bg-slate-900/60 backdrop-blur-2xl rounded-3xl p-6 w-full ${maxWidth} border border-white/20 shadow-2xl shadow-black/40 flex flex-col transition-all duration-300 ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
                onClick={e => e.stopPropagation()}
             >
                {children}
            </div>
        </div>
    );
};


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

const UserCell: React.FC<{ userId: string; users: User[] }> = ({ userId, users }) => {
    if (userId === 'admin-grant') {
        return <div className="flex items-center gap-2 text-sm"><div className="p-1.5 bg-purple-500/20 rounded-md"><ShieldCheckIcon className="w-4 h-4 text-purple-300"/></div><span className="font-semibold text-purple-300">Admin Grant</span></div>;
    }
    if (userId === 'marketplace') {
        return <div className="flex items-center gap-2 text-sm"><div className="p-1.5 bg-cyan-500/20 rounded-md"><ShoppingCartIcon className="w-4 h-4 text-cyan-300"/></div><span className="font-semibold text-cyan-300">Marketplace</span></div>;
    }
    const user = users.find(u => u.id === userId);
    if (!user) {
        return <div className="flex items-center gap-2 text-sm"><div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold flex-shrink-0">?</div><span className="text-slate-500 italic">Deleted User</span></div>;
    }
    return (
        <div className="flex items-center gap-2 text-sm">
            <AvatarWithBorder user={user} containerClasses="w-8 h-8" textClasses="text-sm" />
            <UserName user={user} className="font-semibold" />
        </div>
    );
};

const TransactionTypeBadge: React.FC<{ type: TransactionType }> = ({ type }) => {
    const typeStyles = {
        transfer: {
            icon: <CurrencyDollarIcon className="w-4 h-4 text-green-300"/>,
            text: 'Transfer',
            bg: 'bg-green-500/10',
            textColor: 'text-green-300',
        },
        purchase: {
            icon: <ShoppingCartIcon className="w-4 h-4 text-cyan-300"/>,
            text: 'Purchase',
            bg: 'bg-cyan-500/10',
            textColor: 'text-cyan-300',
        },
        admin_grant: {
            icon: <ShieldCheckIcon className="w-4 h-4 text-purple-300"/>,
            text: 'Admin Grant',
            bg: 'bg-purple-500/10',
            textColor: 'text-purple-300',
        },
    };

    const style = typeStyles[type];
    if (!style) return null;

    return (
        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold ${style.bg} ${style.textColor}`}>
            {style.icon}
            <span>{style.text}</span>
        </div>
    );
};

type AdminView = 'dashboard' | 'users' | 'groups' | 'connections' | 'verification' | 'transactions' | 'wallets' | 'reports' | 'announcements';

const NavItem: React.FC<{
    viewName: AdminView;
    currentView: AdminView;
    setView: (view: AdminView) => void;
    icon: React.ReactNode;
    label: string;
    notificationCount?: number;
}> = ({ viewName, currentView, setView, icon, label, notificationCount }) => (
    <button 
        onClick={() => setView(viewName)} 
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-left relative ${
            currentView === viewName 
                ? 'sidebar-link-active' 
                : 'text-slate-300 hover:bg-white/5'
        }`}
    >
        {icon}
        <span>{label}</span>
        {notificationCount && notificationCount > 0 && 
            <span className="absolute top-2 right-2 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {notificationCount}
            </span>
        }
    </button>
);

const NavHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h3 className="px-3 pt-4 pb-2 text-xs font-semibold uppercase text-slate-500 tracking-wider">
        {children}
    </h3>
);


export const AdminPanel: React.FC<AdminPanelProps> = (props) => {
    const { currentUser, users, chats, messages, connections, transactions, reports, onLogout, onUpdateUserProfile, onResetUserPassword, onUpdateGroupDetails, onUpdateGroupMembers, onDeleteUser, onDeleteGroup, onUpdateConnection, onDeleteConnection, onBroadcastAnnouncement, onAdminForceConnectionStatus, onAdminUpdateVerification, onAdminGrantFunds, onAdminUpdateUserFreezeStatus, onUpdateReportStatus } = props;
    
    const [view, setView] = useState<AdminView>('dashboard');
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
        
        // FIX: Explicitly typed arrays to prevent potential type inference issues.
        const registrationsLast7Days: number[] = Array(7).fill(0), messagesLast7Days: number[] = Array(7).fill(0);
        const dayLabels = Array(7).fill(0).map((_, i) => { const d = new Date(); d.setDate(d.getDate() - i); return d.toLocaleDateString('en-US', { weekday: 'short' }); }).reverse();
        
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        
        for(let i=0; i<7; i++) {
            const dayStart = new Date(today.getTime() - (i + 1) * 24 * 60 * 60 * 1000 + 1);
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
            <div className="flex h-screen bg-transparent text-slate-100 font-sans">
                <aside className="w-64 flex-shrink-0 bg-black/20 backdrop-blur-xl p-4 flex flex-col border-r border-white/10">
                    <div className="flex items-center gap-3 p-2 mb-4">
                        <AvatarWithBorder user={currentUser} containerClasses="w-12 h-12" textClasses="text-2xl" />
                        <div className="overflow-hidden">
                            <div className="flex items-center gap-1.5"><UserName user={currentUser} className="font-bold text-lg truncate" />{renderUserBadge(currentUser)}</div>
                            <p className="text-sm text-blue-300 flex items-center gap-1.5"><ShieldCheckIcon className="w-4 h-4" /> Administrator</p>
                        </div>
                    </div>
                    <nav className="flex-grow space-y-1">
                        <NavHeader>Main</NavHeader>
                        <NavItem viewName="dashboard" currentView={view} setView={setView} icon={<ChartBarIcon className="w-6 h-6" />} label="Dashboard" />

                        <NavHeader>Management</NavHeader>
                        <NavItem viewName="users" currentView={view} setView={setView} icon={<Cog6ToothIcon className="w-6 h-6" />} label="Users" />
                        <NavItem viewName="groups" currentView={view} setView={setView} icon={<UsersIcon className="w-6 h-6" />} label="Groups" />
                        <NavItem viewName="wallets" currentView={view} setView={setView} icon={<WalletIcon className="w-6 h-6" />} label="Wallets" />
                        <NavItem viewName="transactions" currentView={view} setView={setView} icon={<CurrencyDollarIcon className="w-6 h-6" />} label="Transactions" />

                        <NavHeader>Moderation</NavHeader>
                        <NavItem viewName="reports" currentView={view} setView={setView} icon={<ExclamationTriangleIcon className="w-6 h-6" />} label="Reports" notificationCount={pendingReports.length} />
                        <NavItem viewName="connections" currentView={view} setView={setView} icon={<EnvelopeIcon className="w-6 h-6" />} label="Connections" notificationCount={pendingRequests.length} />
                        <NavItem viewName="verification" currentView={view} setView={setView} icon={<CheckBadgeIcon className="w-6 h-6" />} label="Verification" notificationCount={verificationRequests.length} />

                        <NavHeader>Content</NavHeader>
                        <NavItem viewName="announcements" currentView={view} setView={setView} icon={<MegaphoneIcon className="w-6 h-6" />} label="Announcements" />
                    </nav>
                    <div><button onClick={onLogout} className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-300 hover:bg-white/5 hover:text-white rounded-lg transition-colors"><ArrowLeftOnRectangleIcon className="w-6 h-6" /><span className="font-semibold">Logout</span></button></div>
                </aside>
                
                <main className="flex-1 p-6 md:p-8 overflow-y-auto custom-scrollbar">
                    {view === 'dashboard' && (
                        <div>
                             <h1 className="text-4xl font-bold mb-8 aurora-text">Dashboard</h1>
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                                <div className="glass-card p-6 rounded-2xl">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-blue-500/20 rounded-lg"><UsersIcon className="w-6 h-6 text-blue-300"/></div>
                                        <div>
                                            <p className="text-slate-400 text-sm font-medium">Total Users</p>
                                            <p className="text-3xl font-bold text-white">{stats.totalUsers}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="glass-card p-6 rounded-2xl">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-green-500/20 rounded-lg"><CheckCircleIcon className="w-6 h-6 text-green-300"/></div>
                                        <div>
                                            <p className="text-slate-400 text-sm font-medium">Online Users</p>
                                            <p className="text-3xl font-bold text-white">{stats.onlineUsers}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="glass-card p-6 rounded-2xl">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-purple-500/20 rounded-lg"><CurrencyDollarIcon className="w-6 h-6 text-purple-300"/></div>
                                        <div>
                                            <p className="text-slate-400 text-sm font-medium">Total Volume</p>
                                            <p className="text-3xl font-bold text-white">{formatCurrency(stats.totalVolume)}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="glass-card p-6 rounded-2xl">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-cyan-500/20 rounded-lg"><ShoppingCartIcon className="w-6 h-6 text-cyan-300"/></div>
                                        <div>
                                            <p className="text-slate-400 text-sm font-medium">Transactions</p>
                                            <p className="text-3xl font-bold text-white">{stats.totalTransactions}</p>
                                        </div>
                                    </div>
                                </div>
                             </div>
                             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                                <div className="glass-card p-6 rounded-2xl">
                                    <h2 className="text-xl font-bold mb-4">User Registrations (Last 7 Days)</h2>
                                    <div className="flex justify-between items-end h-48 gap-2">
                                        {stats.registrationsChart.data.map((value, index) => {
                                            const maxVal = Math.max(...stats.registrationsChart.data, 1);
                                            const height = `${(value / maxVal) * 100}%`;
                                            return (
                                                <div key={index} className="flex-1 flex flex-col items-center justify-end gap-2 group">
                                                    <div className="text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity">{value}</div>
                                                    <div className="w-full chart-bar-blue rounded-t-md transition-all duration-300 ease-out" style={{ height }}></div>
                                                    <div className="text-xs text-slate-400">{stats.registrationsChart.labels[index]}</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="glass-card p-6 rounded-2xl">
                                    <h2 className="text-xl font-bold mb-4">Messages Sent (Last 7 Days)</h2>
                                    <div className="flex justify-between items-end h-48 gap-2">
                                        {stats.messagesChart.data.map((value, index) => {
                                            const maxVal = Math.max(...stats.messagesChart.data, 1);
                                            const height = `${(value / maxVal) * 100}%`;
                                            return (
                                                <div key={index} className="flex-1 flex flex-col items-center justify-end gap-2 group">
                                                    <div className="text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity">{value}</div>
                                                    <div className="w-full chart-bar-purple rounded-t-md transition-all duration-300 ease-out" style={{ height }}></div>
                                                    <div className="text-xs text-slate-400">{stats.messagesChart.labels[index]}</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                            <div className="glass-card p-6 rounded-2xl">
                                <h2 className="text-xl font-bold mb-4">Most Active Groups</h2>
                                <div className="space-y-3">
                                    {stats.activeGroups.map((group, index) => (
                                        <div key={index} className="flex justify-between items-center text-sm p-2 rounded-md hover:bg-white/5">
                                            <p className="font-semibold">{group.name}</p>
                                            <p className="text-slate-400">{group.count} messages</p>
                                        </div>
                                    ))}
                                    {stats.activeGroups.length === 0 && <p className="text-slate-500 text-center py-4">No group activity yet.</p>}
                                </div>
                            </div>
                        </div>
                    )}
                    {(view === 'users' || view === 'wallets' || view === 'groups' || view === 'connections' || view === 'verification' || view === 'reports' || view === 'transactions' || view === 'announcements') && (
                        <div className="space-y-8">
                             <h1 className="text-4xl font-bold aurora-text">{view.charAt(0).toUpperCase() + view.slice(1)} Management</h1>
                             <div className="glass-card rounded-2xl overflow-hidden">
                                {view === 'users' && (
                                    <table className="w-full text-left">
                                        <thead className="bg-white/5"><tr className="border-b border-white/10"><th className="p-4 font-semibold">User</th><th className="p-4 font-semibold">Status</th><th className="p-4 font-semibold">Actions</th></tr></thead>
                                        <tbody>{users.filter(u => !u.isAdmin).map(user => (<tr key={user.id} className="border-b border-white/10 last:border-b-0 hover:bg-white/5 transition-colors"><td className="p-4"><div className="flex items-center gap-3"><AvatarWithBorder user={user} containerClasses="w-10 h-10" textClasses="text-lg" /><div><div className="flex items-center gap-1.5"><UserName user={user} className="font-semibold" />{renderUserBadge(user)}</div><p className="text-xs text-slate-400 font-mono">{user.id}</p></div></div></td><td className="p-4 text-sm">{user.isFrozen ? <span className="flex items-center gap-1.5 text-red-400"><BanIcon className="w-4 h-4" />Frozen</span> : (user.online ? <span className="flex items-center gap-1.5 text-green-400"><div className="w-2 h-2 bg-green-400 rounded-full"></div>Online</span> : <span className="flex items-center gap-1.5 text-slate-400"><div className="w-2 h-2 bg-slate-500 rounded-full"></div>Offline</span>)}</td><td className="p-4"><div className="flex items-center gap-2"><button onClick={() => openEditUserModal(user)} className="p-2 bg-white/10 rounded-md text-white hover:bg-white/20" title="Edit Profile"><PencilIcon className="w-4 h-4"/></button><button onClick={() => openPasswordModal(user)} className="p-2 bg-white/10 rounded-md text-white hover:bg-white/20" title="Reset Password"><KeyIcon className="w-4 h-4"/></button><button onClick={() => openVerificationModal(user)} className="p-2 bg-white/10 rounded-md text-white hover:bg-white/20" title="Manage Verification"><CheckBadgeIcon className="w-4 h-4"/></button><button onClick={() => user.isFrozen ? handleUnfreeze(user.id) : openFreezeModal(user)} className={`p-2 rounded-md ${user.isFrozen ? 'bg-green-500/20 text-green-300' : 'bg-white/10 text-white'}`} title={user.isFrozen ? 'Unfreeze Account' : 'Freeze Account'}><BanIcon className="w-4 h-4"/></button><button onClick={() => handleDeleteUserConfirm(user)} className="p-2 bg-red-500/20 rounded-md text-red-300 hover:bg-red-500/30" title="Delete User"><TrashIcon className="w-4 h-4"/></button></div></td></tr>))}</tbody>
                                    </table>
                                )}
                                {view === 'wallets' && (
                                    <table className="w-full text-left">
                                        <thead className="bg-white/5"><tr className="border-b border-white/10"><th className="p-4 font-semibold">User</th><th className="p-4 font-semibold">Balance</th><th className="p-4 font-semibold">Actions</th></tr></thead>
                                        <tbody>{users.filter(u => !u.isAdmin).map(user => (<tr key={user.id} className="border-b border-white/10 last:border-b-0 hover:bg-white/5 transition-colors"><td className="p-4"><div className="flex items-center gap-3"><AvatarWithBorder user={user} containerClasses="w-10 h-10" textClasses="text-lg" /><div><div className="flex items-center gap-1.5"><UserName user={user} className="font-semibold" />{renderUserBadge(user)}</div></div></div></td><td className="p-4 font-semibold text-lg font-mono">{formatCurrency(user.walletBalance)}</td><td className="p-4"><button onClick={() => openGrantModal(user)} className="px-3 py-1.5 bg-green-500/20 text-green-300 text-sm font-semibold rounded-md hover:bg-green-500/30">Grant Funds</button></td></tr>))}</tbody>
                                    </table>
                                )}
                                {view === 'groups' && (
                                     <table className="w-full text-left">
                                        <thead className="bg-white/5"><tr className="border-b border-white/10"><th className="p-4 font-semibold">Group Name</th><th className="p-4 font-semibold">Members</th><th className="p-4 font-semibold">Privacy</th><th className="p-4 font-semibold">Actions</th></tr></thead>
                                        <tbody>{chats.filter(c => c.type === ChatType.GROUP).map(group => (<tr key={group.id} className="border-b border-white/10 last:border-b-0 hover:bg-white/5 transition-colors"><td className="p-4 font-semibold">{group.name}</td><td className="p-4">{group.members.length}</td><td className="p-4">{group.password ? <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-300"><LockOpenIcon className="w-4 h-4" />Password Protected</span> : <span className="text-xs text-slate-400">Public</span>}</td><td className="p-4"><div className="flex items-center gap-2"><button onClick={() => setViewingGroupChat(group)} className="p-2 bg-white/10 rounded-md text-white hover:bg-white/20" title="View Chat"><EyeIcon className="w-4 h-4"/></button><button onClick={() => openEditGroupModal(group)} className="p-2 bg-white/10 rounded-md text-white hover:bg-white/20" title="Edit Group"><PencilIcon className="w-4 h-4"/></button><button onClick={() => handleDeleteGroupConfirm(group)} className="p-2 bg-red-500/20 rounded-md text-red-300 hover:bg-red-500/30" title="Delete Group"><TrashIcon className="w-4 h-4"/></button></div></td></tr>))}</tbody>
                                    </table>
                                )}
                                {view === 'connections' && (
                                     <table className="w-full text-left">
                                        <thead className="bg-white/5"><tr className="border-b border-white/10"><th className="p-4 font-semibold">From</th><th className="p-4 font-semibold">To</th><th className="p-4 font-semibold">Status</th><th className="p-4 font-semibold">Date</th><th className="p-4 font-semibold">Actions</th></tr></thead>
                                        <tbody>{connections.map(conn => { const fromUser = users.find(u => u.id === conn.fromUserId); const toUser = users.find(u => u.id === conn.toUserId); return (<tr key={conn.id} className="border-b border-white/10 last:border-b-0 hover:bg-white/5 transition-colors"><td className="p-4 font-semibold">{fromUser?.username || 'N/A'}</td><td className="p-4 font-semibold">{toUser?.username || 'N/A'}</td><td className="p-4 text-sm font-semibold capitalize" style={{color: conn.status === 'accepted' ? '#4ade80' : conn.status === 'pending' ? '#facc15' : '#f87171'}}>{conn.status}</td><td className="p-4 text-sm text-slate-400">{new Date(conn.requestedAt).toLocaleDateString()}</td><td className="p-4"><div className="flex items-center gap-2">{conn.status === 'pending' && <button onClick={() => onUpdateConnection(conn.id, ConnectionStatus.ACCEPTED)} className="p-2 bg-green-500/20 rounded-md text-green-300" title="Accept"><CheckCircleIcon className="w-4 h-4"/></button>}{conn.status === 'pending' && <button onClick={() => onUpdateConnection(conn.id, ConnectionStatus.REJECTED)} className="p-2 bg-red-500/20 rounded-md text-red-300" title="Reject"><XMarkIcon className="w-4 h-4"/></button>}<button onClick={() => onDeleteConnection(conn.id)} className="p-2 bg-red-500/20 rounded-md text-red-300 hover:bg-red-500/30" title="Delete Connection"><TrashIcon className="w-4 h-4"/></button></div></td></tr>)})}</tbody>
                                    </table>
                                )}
                                {view === 'verification' && (
                                    <div>
                                        <div className="flex border-b border-white/10"><button onClick={() => setVerificationTab('manage')} className={`px-4 py-2 text-sm font-semibold ${verificationTab === 'manage' ? 'border-b-2 border-blue-400 text-white' : 'text-slate-400'}`}>Manage</button><button onClick={() => setVerificationTab('requests')} className={`relative px-4 py-2 text-sm font-semibold ${verificationTab === 'requests' ? 'border-b-2 border-blue-400 text-white' : 'text-slate-400'}`}>Requests {verificationRequests.length > 0 && <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 text-xs rounded-full">{verificationRequests.length}</span>}</button></div>
                                        <table className="w-full text-left">
                                            <thead className="bg-white/5"><tr className="border-b border-white/10"><th className="p-4 font-semibold">User</th><th className="p-4 font-semibold">Status</th><th className="p-4 font-semibold">Actions</th></tr></thead>
                                            <tbody>{(verificationTab === 'manage' ? users.filter(u => !u.isAdmin) : verificationRequests).map(user => (<tr key={user.id} className="border-b border-white/10 last:border-b-0 hover:bg-white/5 transition-colors"><td className="p-4"><div className="flex items-center gap-3"><AvatarWithBorder user={user} containerClasses="w-10 h-10" textClasses="text-lg" /><div><UserName user={user} className="font-semibold" /></div></div></td><td className="p-4 font-semibold text-sm">{getVerificationStatusText(user)}</td><td className="p-4"><div className="flex items-center gap-2"><button onClick={() => openVerificationModal(user)} className="p-2 bg-white/10 rounded-md text-white hover:bg-white/20" title="Update Verification"><CheckBadgeIcon className="w-4 h-4"/></button>{user.verification?.status === 'approved' && <button onClick={() => handleVerificationRevoke()} className="p-2 bg-red-500/20 rounded-md text-red-300 hover:bg-red-500/30" title="Revoke Badge"><BanIcon className="w-4 h-4"/></button>}</div></td></tr>))}</tbody>
                                        </table>
                                    </div>
                                )}
                                {view === 'reports' && (
                                    <div className="p-4 space-y-4">{reports.sort((a,b) => b.timestamp - a.timestamp).map(report => { const reporter = users.find(u => u.id === report.reporterId); const reported = users.find(u => u.id === report.reportedUserId); return (<div key={report.id} className="bg-black/20 p-4 rounded-xl border border-white/10"><div className="flex justify-between items-start"><div><p><span className="font-semibold">{reporter?.username || 'Unknown'}</span> reported <span className="font-semibold">{reported?.username || 'Unknown'}</span></p><p className="text-xs text-slate-400">{new Date(report.timestamp).toLocaleString()}</p></div><div className="flex items-center gap-2"><select value={report.status} onChange={(e) => onUpdateReportStatus(report.id, e.target.value as Report['status'])} className="bg-white/10 text-xs font-semibold rounded-md py-1 px-2 border border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="pending">Pending</option><option value="resolved">Resolved</option><option value="dismissed">Dismissed</option></select></div></div><p className="mt-2 p-3 bg-black/20 rounded-lg text-sm whitespace-pre-wrap">{report.reason}</p></div>)})}</div>
                                )}
                                {view === 'transactions' && (
                                    <table className="w-full text-left">
                                        <thead className="bg-white/5"><tr className="border-b border-white/10 text-sm"><th className="p-4 font-semibold text-left">Date</th><th className="p-4 font-semibold text-left">Type</th><th className="p-4 font-semibold text-left">From</th><th className="p-4 font-semibold text-left">To</th><th className="p-4 font-semibold text-left">Description</th><th className="p-4 font-semibold text-right">Amount</th></tr></thead>
                                        <tbody>{transactions.sort((a, b) => b.timestamp - a.timestamp).map(t => (<tr key={t.id} className="border-b border-white/10 last:border-b-0 text-sm hover:bg-white/5 transition-colors"><td className="p-4 text-slate-400 whitespace-nowrap">{new Date(t.timestamp).toLocaleString()}</td><td className="p-4"><TransactionTypeBadge type={t.type} /></td><td className="p-4"><UserCell userId={t.fromUserId} users={users} /></td><td className="p-4"><UserCell userId={t.toUserId} users={users} /></td><td className="p-4 text-slate-300">{t.description}</td><td className="p-4 text-right font-bold font-mono whitespace-nowrap">{t.type === 'admin_grant' ? (<span className="text-green-400">+{formatCurrency(t.amount)}</span>) : (<span className="text-white">{formatCurrency(t.amount)}</span>)}</td></tr>))}</tbody>
                                    </table>
                                )}
                                {view === 'announcements' && (
                                    <div className="p-6">
                                        <div className="space-y-4">
                                            <div>
                                                <label htmlFor="broadcast" className="block text-sm font-medium text-slate-300 mb-1">Message</label>
                                                <textarea id="broadcast" value={broadcastMessage} onChange={e => setBroadcastMessage(e.target.value)} rows={5} className="w-full bg-white/5 border border-white/10 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
                                            </div>
                                            <button onClick={handleBroadcast} disabled={isBroadcasting || !broadcastMessage.trim()} className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg font-semibold disabled:opacity-50">{isBroadcasting ? 'Sending...' : 'Send to All Users'}</button>
                                        </div>
                                        <h2 className="text-2xl font-bold mt-8 mb-4 text-white">Previous Announcements</h2>
                                        <div className="space-y-4">{announcements.map(ann => <ChatMessage key={ann.id} message={ann} author={currentUser} isCurrentUser={false} isGroupChat={false} />)}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </main>
            </div>
            {/* --- Modals --- */}
            <Modal isOpen={isEditUserModalOpen} onClose={closeAllModals}>
                {selectedUser && (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold">Edit {selectedUser.username}</h2>
                            <button onClick={closeAllModals} className="p-1 text-slate-400 rounded-full hover:text-white hover:bg-white/10"><XMarkIcon /></button>
                        </div>
                        <div className="border-b border-white/10 mb-4"><nav className="flex -mb-px space-x-2"><button onClick={() => setModalView('profile')} className={`px-3 py-2 text-sm font-medium border-b-2 ${modalView === 'profile' ? 'border-blue-400 text-white' : 'border-transparent text-slate-400'}`}>Profile</button><button onClick={() => setModalView('connections')} className={`px-3 py-2 text-sm font-medium border-b-2 ${modalView === 'connections' ? 'border-blue-400 text-white' : 'border-transparent text-slate-400'}`}>Connections</button><button onClick={() => setModalView('wallet')} className={`px-3 py-2 text-sm font-medium border-b-2 ${modalView === 'wallet' ? 'border-blue-400 text-white' : 'border-transparent text-slate-400'}`}>Wallet</button></nav></div>
                        {modalView === 'profile' && (<div className="space-y-4"><input type="text" value={avatar} onChange={e => setAvatar(e.target.value)} placeholder="Avatar" className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-4"/><textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Bio" className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-4"/><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-4"/><input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone" className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-4"/><input type="number" value={messageLimit ?? ''} onChange={e => setMessageLimit(e.target.value === '' ? undefined : Number(e.target.value))} placeholder="Daily Message Limit (optional)" className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-4"/><div className="mt-6 flex justify-end gap-3"><button onClick={closeAllModals} className="px-4 py-2 bg-white/10 rounded-lg">Cancel</button><button onClick={handleProfileUpdate} disabled={isSubmitting} className="px-4 py-2 bg-blue-600 rounded-lg">{isSubmitting ? 'Saving...' : 'Save'}</button></div></div>)}
                        {modalView === 'connections' && (<div className="space-y-4"><div><h3 className="font-semibold mb-2">Block a user</h3><div className="flex gap-2"><input type="text" value={blockUsername} onChange={e => setBlockUsername(e.target.value)} placeholder="Enter username to block" className="flex-grow bg-white/5 border border-white/10 rounded-lg py-2 px-4"/><button onClick={handleAdminBlockUser} disabled={isSubmitting} className="px-4 py-2 bg-red-600 rounded-lg">{isSubmitting ? '...' : 'Block'}</button></div></div></div>)}
                        {modalView === 'wallet' && (<div className="space-y-4"><div><h3 className="font-semibold mb-2">Grant Funds</h3><div className="flex gap-2"><input type="number" value={grantAmount} onChange={e => setGrantAmount(e.target.value)} placeholder="Amount" className="flex-grow bg-white/5 border border-white/10 rounded-lg py-2 px-4"/><button onClick={handleAdminGrantFunds} disabled={isSubmitting} className="px-4 py-2 bg-green-600 rounded-lg">{isSubmitting ? '...' : 'Grant'}</button></div></div></div>)}
                    </div>
                )}
            </Modal>
            <Modal isOpen={isPasswordModalOpen} onClose={closeAllModals} maxWidth="max-w-sm">
                {selectedUser && (<div><h2 className="text-2xl font-bold mb-4">Reset Password for {selectedUser.username}</h2><input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New Password" className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-4"/><div className="mt-6 flex justify-end gap-3"><button onClick={closeAllModals} className="px-4 py-2 bg-white/10 rounded-lg">Cancel</button><button onClick={handlePasswordReset} disabled={isSubmitting || !newPassword.trim()} className="px-4 py-2 bg-blue-600 rounded-lg">{isSubmitting ? 'Saving...' : 'Save'}</button></div></div>)}
            </Modal>
            <Modal isOpen={isEditGroupModalOpen} onClose={closeAllModals}>
                {selectedGroup && (<div><h2 className="text-2xl font-bold mb-4">Edit Group: {selectedGroup.name}</h2><div className="space-y-4"><input type="text" value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="Group Name" className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-4" /><input type="text" value={groupPassword} onChange={e => setGroupPassword(e.target.value)} placeholder="Group Password (optional)" className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-4" /><div><h3 className="font-semibold mb-2">Members</h3><div className="max-h-60 overflow-y-auto custom-scrollbar space-y-2 p-2 bg-black/20 rounded-lg">{users.filter(u => !u.isAdmin).map(user => (<div key={user.id} className="flex items-center gap-3"><input type="checkbox" checked={groupMembers.includes(user.id)} onChange={() => toggleGroupMember(user.id)} className="w-4 h-4 rounded bg-white/20 border-white/30 text-blue-500 focus:ring-blue-500" /><span>{user.username}</span></div>))}</div></div></div><div className="mt-6 flex justify-end gap-3"><button onClick={closeAllModals} className="px-4 py-2 bg-white/10 rounded-lg">Cancel</button><button onClick={handleGroupUpdate} disabled={isSubmitting} className="px-4 py-2 bg-blue-600 rounded-lg">{isSubmitting ? 'Saving...' : 'Save'}</button></div></div>)}
            </Modal>
            <Modal isOpen={isVerificationModalOpen} onClose={closeAllModals} maxWidth="max-w-sm">
                {selectedUser && (<div><h2 className="text-2xl font-bold mb-4">Manage Verification</h2><div className="space-y-4"><div><label className="block text-sm font-medium text-slate-300 mb-1">Badge Type</label><div ref={badgeSelectorRef} className="relative"><button onClick={() => setIsBadgeSelectorOpen(p => !p)} className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-left flex justify-between items-center"><BadgeOption badge={badgeType} /><ChevronDownIcon className={`w-5 h-5 transition-transform ${isBadgeSelectorOpen ? 'rotate-180' : ''}`} /></button>{isBadgeSelectorOpen && (<div className="absolute top-full mt-1 w-full bg-slate-800 border border-white/10 rounded-lg z-10 p-1 space-y-1">
{/* FIX: Corrected badge type iteration logic. */}
{(['none', 'blue', 'red', 'gold', 'pink', 'grey', 'pastel_blue', 'aurora'] as const).map(b => (<div key={b} onClick={()=>{setBadgeType(b); setIsBadgeSelectorOpen(false);}} className="p-2 hover:bg-white/10 rounded-md cursor-pointer"><BadgeOption badge={b} /></div>))}</div>)}</div></div><div><label className="block text-sm font-medium text-slate-300 mb-1">Expiry</label><div className="grid grid-cols-3 gap-2"><select value={expiryType} onChange={e => setExpiryType(e.target.value as any)} className="col-span-1 bg-white/5 border border-white/10 rounded-lg p-2"><option value="permanent">Permanent</option><option value="hours">Hours</option><option value="days">Days</option></select><input type="number" value={expiryValue} onChange={e => setExpiryValue(e.target.value)} disabled={expiryType === 'permanent'} placeholder="Duration" className="col-span-2 bg-white/5 border border-white/10 rounded-lg p-2 disabled:opacity-50" /></div></div></div><div className="mt-6 flex justify-end gap-3"><button onClick={closeAllModals} className="px-4 py-2 bg-white/10 rounded-lg">Cancel</button><button onClick={handleVerificationUpdate} disabled={isSubmitting} className="px-4 py-2 bg-blue-600 rounded-lg">{isSubmitting ? 'Saving...' : 'Save'}</button></div></div>)}
            </Modal>
            <Modal isOpen={isGrantModalOpen} onClose={closeAllModals} maxWidth="max-w-sm">
                {selectedUser && (<div><h2 className="text-2xl font-bold mb-4">Grant Funds</h2><div className="flex gap-2"><input type="number" value={grantAmount} onChange={e => setGrantAmount(e.target.value)} placeholder={`Amount for ${selectedUser.username}`} className="flex-grow bg-white/5 border border-white/10 rounded-lg py-2 px-4" /><button onClick={handleAdminGrantFunds} disabled={isSubmitting} className="px-4 py-2 bg-green-600 rounded-lg">{isSubmitting ? '...' : 'Grant'}</button></div></div>)}
            </Modal>
            <Modal isOpen={isFreezeModalOpen} onClose={closeAllModals} maxWidth="max-w-sm">
                {selectedUser && (<div><h2 className="text-2xl font-bold mb-4">Freeze {selectedUser.username}'s Account</h2><div className="space-y-4"><div><label className="block text-sm font-medium text-slate-300 mb-1">Duration</label><div className="grid grid-cols-3 gap-2"><select value={freezeType} onChange={e => setFreezeType(e.target.value as any)} className="col-span-1 bg-white/5 border border-white/10 rounded-lg p-2"><option value="permanent">Permanent</option><option value="hours">Hours</option><option value="days">Days</option></select><input type="number" value={freezeValue} onChange={e => setFreezeValue(e.target.value)} disabled={freezeType === 'permanent'} placeholder="Duration" className="col-span-2 bg-white/5 border border-white/10 rounded-lg p-2 disabled:opacity-50" /></div></div></div><div className="mt-6 flex justify-end gap-3"><button onClick={closeAllModals} className="px-4 py-2 bg-white/10 rounded-lg">Cancel</button><button onClick={handleFreezeUpdate} disabled={isSubmitting} className="px-4 py-2 bg-red-600 rounded-lg">{isSubmitting ? 'Freezing...' : 'Freeze Account'}</button></div></div>)}
            </Modal>
        </>
    );
}