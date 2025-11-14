import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { Chat, Message, User, Connection, Transaction, VerificationBadgeType, Verification } from '../types';
import { ChatType, ConnectionStatus } from '../types';
import { ArrowLeftOnRectangleIcon, MagnifyingGlassIcon, PaperAirplaneIcon, UsersIcon, UserCircleIcon, ArrowLeftIcon, InstagramIcon, PlusCircleIcon, XMarkIcon, LockClosedIcon, ChevronDownIcon, UserPlusIcon, CheckCircleIcon, BellIcon, BanIcon, CheckBadgeIcon, PencilIcon, WalletIcon, ShoppingCartIcon, CurrencyDollarIcon, InformationCircleIcon, ChatBubbleLeftRightIcon, PaintBrushIcon, FlagIcon, PencilSquareIcon, CheckIcon, TrashIcon } from './icons';
import ChatMessage from './ChatMessage';
import { db, MARKETPLACE_ITEMS } from './db';

interface ChatRoomProps {
  currentUser: User;
  users: User[];
  chats: Chat[];
  messages: Message[];
  connections: Connection[];
  transactions: Transaction[];
  loggedInUsers: User[];
  onSendMessage: (chatId: string, text: string) => Promise<void>;
  onCreateChat: (targetUser: User) => Promise<Chat>;
  onCreateGroupChat: (params: { memberIds: string[]; groupName: string; }) => Promise<void>;
  onLogout: () => Promise<void>;
  onSwitchUser: (userId: string) => Promise<void>;
  onLogin: (user: User) => Promise<void>;
  onSendRequest: (toUserId: string) => Promise<void>;
  onUpdateConnection: (connectionId: string, status: ConnectionStatus) => Promise<void>;
  onRequestVerification: (userId: string) => Promise<void>;
  onUpdateUserProfile: (params: { avatar: string, bio: string }) => Promise<void>;
  onTransferFunds: (toUserId: string, amount: number) => Promise<{success: boolean, message: string}>;
  onPurchaseVerification: (badgeType: VerificationBadgeType, duration: number | 'permanent', cost: number) => Promise<{success: boolean, message: string}>;
  onPurchaseCosmetic: (item: { type: 'border' | 'nameColor', id: string, price: number, name: string }) => Promise<{success: boolean, message: string}>;
  onEquipCustomization: (type: 'border' | 'nameColor', itemId: string | undefined) => Promise<void>;
  onReportUser: (reportedUserId: string, reason: string, chatId?: string) => Promise<void>;
  onDeleteUserChats: (chatIds: string[]) => Promise<void>;
}

// --- Helper Components & Functions ---

const AvatarWithBorder: React.FC<{ user: User, containerClasses: string, textClasses: string, statusClasses: string }> = ({ user, containerClasses, textClasses, statusClasses }) => {
    const borderId = user.customization?.profileBorderId;
    const borderItem = borderId ? MARKETPLACE_ITEMS.borders.find(b => b.id === borderId) : null;
    const style = borderItem ? borderItem.style : {};

    return (
        <div className="relative flex-shrink-0">
            <div className={`${containerClasses} rounded-full`} style={style}>
                 <div className={`w-full h-full rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center font-bold ${textClasses}`}>{user.avatar}</div>
            </div>
            { user.online && <span className={`absolute block rounded-full ring-2 ring-slate-900/50 ${statusClasses} bg-green-400`}></span> }
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

const getChatDisplayName = (chat: Chat, currentUser: User, users: User[]): string => {
  if (chat.type === ChatType.GROUP) {
    return chat.name || 'Unnamed Group';
  }
  const otherUserId = chat.members.find(id => id !== currentUser.id);
  const otherUser = users.find(u => u.id === otherUserId);
  return otherUser?.username || 'Unknown User';
};

const renderUserBadge = (user: User, size: 'small' | 'large' = 'small') => {
    if (user?.verification?.status !== 'approved') return null;
    if (user.verification.expiresAt && user.verification.expiresAt < Date.now()) return null;

    const sizeClass = size === 'large' ? 'w-5 h-5' : 'w-4 h-4';

    if (user.verification.badgeType === 'aurora') {
        return <CheckBadgeIcon className={`${sizeClass} aurora-badge flex-shrink-0`} />;
    }
    
    const colorClasses: Record<VerificationBadgeType, string> = {
        blue: 'text-blue-400',
        red: 'text-red-400',
        gold: 'text-amber-400',
        pink: 'text-pink-400',
        grey: 'text-slate-400',
        pastel_blue: 'text-sky-300',
        aurora: 'aurora-badge', // This case is handled above, but included for completeness
    };
    
    const badgeColor = colorClasses[user.verification.badgeType || 'blue'] || 'text-blue-400';

    return <CheckBadgeIcon className={`${sizeClass} ${badgeColor} flex-shrink-0`} />;
};

const formatCurrency = (amount: number | null | undefined) => {
    if (typeof amount !== 'number' || isNaN(amount)) {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(0);
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

// --- Custom User Selector Component ---
const UserSelector: React.FC<{
    users: User[];
    selectedUserId: string;
    onSelectUser: (userId: string) => void;
    disabled?: boolean;
}> = ({ users, selectedUserId, onSelectUser, disabled }) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectorRef = useRef<HTMLDivElement>(null);
    const selectedUser = useMemo(() => users.find(u => u.id === selectedUserId), [users, selectedUserId]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={selectorRef}>
            <button
                type="button"
                onClick={() => setIsOpen(p => !p)}
                disabled={disabled}
                className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 px-4 text-white flex items-center gap-3 text-left transition-colors hover:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {selectedUser ? (
                    <>
                        <AvatarWithBorder user={selectedUser} containerClasses="w-8 h-8" textClasses="text-sm" statusClasses="h-2.5 w-2.5 bottom-0 right-0" />
                        <div className="flex-grow flex items-center gap-1.5 overflow-hidden">
                            <UserName user={selectedUser} className="font-semibold truncate" />
                            {renderUserBadge(selectedUser)}
                        </div>
                    </>
                ) : (
                    <span className="text-slate-400">Select a user...</span>
                )}
                 <ChevronDownIcon className={`w-5 h-5 text-slate-400 ml-auto flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="absolute top-full mt-2 w-full bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl z-20 p-1 space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
                    {users.map(user => (
                        <div
                            key={user.id}
                            onClick={() => { onSelectUser(user.id); setIsOpen(false); }}
                            className="flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-cyan-500/20 transition-colors"
                        >
                            <AvatarWithBorder user={user} containerClasses="w-8 h-8" textClasses="text-sm" statusClasses="h-2.5 w-2.5 bottom-0 right-0" />
                            <div className="flex-grow flex items-center gap-1.5 overflow-hidden">
                                <UserName user={user} className="font-semibold truncate" />
                                {renderUserBadge(user)}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};


const Modal: React.FC<{ isOpen: boolean; onClose: () => void; children: React.ReactNode; maxWidth?: string; }> = ({ isOpen, onClose, children, maxWidth = 'max-w-sm' }) => {
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

// --- Profile, Wallet & Marketplace Modal ---
const ProfileModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    currentUser: User;
    users: User[];
    transactions: Transaction[];
    onUpdateProfile: (params: { avatar: string, bio: string }) => Promise<void>;
    onRequestVerification: (userId: string) => Promise<void>;
    onTransferFunds: (toUserId: string, amount: number) => Promise<{success: boolean, message: string}>;
    onPurchaseVerification: (badgeType: VerificationBadgeType, duration: number | 'permanent', cost: number) => Promise<{success: boolean, message: string}>;
    onPurchaseCosmetic: (item: { type: 'border' | 'nameColor', id: string, price: number, name: string }) => Promise<{success: boolean, message: string}>;
    onEquipCustomization: (type: 'border' | 'nameColor', itemId: string | undefined) => Promise<void>;
    isAccountFrozen: boolean;
}> = (props) => {
    const { isOpen, onClose, currentUser, users, transactions, onUpdateProfile, onRequestVerification, onTransferFunds, onPurchaseVerification, onPurchaseCosmetic, onEquipCustomization, isAccountFrozen } = props;
    
    const [view, setView] = useState<'profile' | 'wallet' | 'market' | 'customize'>('profile');
    const [marketView, setMarketView] = useState<'badges' | 'cosmetics'>('badges');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Profile state
    const [avatar, setAvatar] = useState(currentUser.avatar);
    const [bio, setBio] = useState(currentUser.bio || '');

    // Wallet state
    const [transferUser, setTransferUser] = useState('');
    const [transferAmount, setTransferAmount] = useState('');
    const [transferMessage, setTransferMessage] = useState({ type: '', text: '' });
    
    const userTransactions = useMemo(() => {
        return transactions
            .filter(t => t.fromUserId === currentUser.id || t.toUserId === currentUser.id)
            .sort((a, b) => b.timestamp - a.timestamp);
    }, [transactions, currentUser.id]);

    const allOtherUsers = useMemo(() => {
        return users.filter(u => u.id !== currentUser.id && !u.isAdmin);
    }, [users, currentUser.id]);


    // Badge Prices
    const badgePrices: Record<string, Record<string, number>> = {
        blue: { '7': 5, '30': 15, permanent: 50 },
        red: { '7': 10, '30': 25, permanent: 75 },
        pink: { '7': 15, '30': 40, permanent: 90 },
        grey: { '7': 1, '30': 3, permanent: 10 },
        gold: { permanent: 100 },
    };

    useEffect(() => {
        if (isOpen) {
            setAvatar(currentUser.avatar);
            setBio(currentUser.bio || '');
        }
    }, [currentUser, isOpen]);

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

    const handleTransfer = async (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(transferAmount);
        if (!transferUser || !amount || amount <= 0) {
            setTransferMessage({type: 'error', text: 'Please select a user and enter a valid amount.'});
            return;
        }
        if (currentUser.walletBalance < amount) {
            setTransferMessage({type: 'error', text: 'Insufficient funds.'});
            return;
        }
        setIsSubmitting(true);
        setTransferMessage({type: '', text: ''});
        const result = await onTransferFunds(transferUser, amount);
        if (result.success) {
            setTransferMessage({type: 'success', text: result.message});
            setTransferUser('');
            setTransferAmount('');
        } else {
            setTransferMessage({type: 'error', text: result.message});
        }
        setIsSubmitting(false);
    };

    const handlePurchaseBadge = async (badge: VerificationBadgeType, duration: string, cost: number) => {
        if (currentUser.walletBalance < cost) {
            alert("Insufficient funds.");
            return;
        }
        if (window.confirm(`Are you sure you want to purchase the ${badge} badge for ${formatCurrency(cost)}?`)) {
            setIsSubmitting(true);
            const durationDays = duration === 'permanent' ? 'permanent' : parseInt(duration, 10);
            await onPurchaseVerification(badge, durationDays, cost);
            setIsSubmitting(false);
        }
    }
    
    const handlePurchaseCosmetic = async (item: { type: 'border' | 'nameColor', id: string, price: number, name: string }) => {
        if (currentUser.walletBalance < item.price) {
            alert("Insufficient funds.");
            return;
        }
        if (window.confirm(`Are you sure you want to purchase the ${item.name} for ${formatCurrency(item.price)}?`)) {
            setIsSubmitting(true);
            await onPurchaseCosmetic(item);
            setIsSubmitting(false);
        }
    }
    
    const handleEquip = async (type: 'border' | 'nameColor', itemId: string | undefined) => {
        await onEquipCustomization(type, itemId);
    };

    // Discount Calculation
    const discountInfo = useMemo(() => {
        const currentVerification = currentUser.verification;
        if (currentVerification?.status === 'approved' && currentVerification.expiresAt && currentVerification.expiresAt > Date.now()) {
            const remainingMs = currentVerification.expiresAt - Date.now();
            const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
            if (remainingDays > 0) {
                return {
                    applicable: true,
                    percentage: Math.min(remainingDays, 7) * 10,
                    daysLeft: remainingDays,
                    badgeType: currentVerification.badgeType
                };
            }
        }
        return { applicable: false, percentage: 0, daysLeft: 0, badgeType: undefined };
    }, [currentUser.verification]);


    return (
        <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
             <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-white">My Account</h2>
                <button onClick={onClose} className="p-1 text-slate-400 rounded-full hover:text-white hover:bg-white/10 transition-colors"><XMarkIcon /></button>
            </div>
            <div className="border-b border-white/10 mb-4">
                <nav className="flex -mb-px space-x-1 sm:space-x-2">
                    <button onClick={() => setView('profile')} className={`px-2 sm:px-3 py-2 text-sm font-medium border-b-2 flex items-center gap-1.5 ${view === 'profile' ? 'border-cyan-400 text-cyan-300' : 'border-transparent text-slate-400 hover:text-white'}`}><PencilIcon className="w-4 h-4" /> Profile</button>
                    <button onClick={() => setView('wallet')} className={`px-2 sm:px-3 py-2 text-sm font-medium border-b-2 flex items-center gap-1.5 ${view === 'wallet' ? 'border-cyan-400 text-cyan-300' : 'border-transparent text-slate-400 hover:text-white'}`}><WalletIcon className="w-4 h-4" /> Wallet</button>
                    <button onClick={() => setView('market')} className={`px-2 sm:px-3 py-2 text-sm font-medium border-b-2 flex items-center gap-1.5 ${view === 'market' ? 'border-cyan-400 text-cyan-300' : 'border-transparent text-slate-400 hover:text-white'}`}><ShoppingCartIcon className="w-4 h-4" /> Market</button>
                    <button onClick={() => setView('customize')} className={`px-2 sm:px-3 py-2 text-sm font-medium border-b-2 flex items-center gap-1.5 ${view === 'customize' ? 'border-cyan-400 text-cyan-300' : 'border-transparent text-slate-400 hover:text-white'}`}><PaintBrushIcon className="w-4 h-4" /> Customize</button>
                </nav>
            </div>
            
            {view === 'profile' && (
                <>
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
                        {(() => {
                            const verification = currentUser.verification;
                            const isExpired = verification?.expiresAt && verification.expiresAt < Date.now();

                            switch (verification?.status) {
                                case 'approved':
                                    if (isExpired) return <p className="text-sm text-center text-slate-400 bg-slate-500/10 p-3 rounded-lg">Your verification has expired.</p>;
                                    return <div className="text-sm text-center text-blue-300 flex flex-col items-center justify-center gap-2 bg-blue-500/10 p-3 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            {renderUserBadge(currentUser)}
                                            <span>You are verified with a {verification.badgeType || 'blue'} badge.</span>
                                        </div>
                                        <span className="text-xs text-slate-400">{verification.expiresAt ? `Expires on ${new Date(verification.expiresAt).toLocaleDateString()}` : "This badge is permanent."}</span>
                                    </div>;
                                case 'pending':
                                    return <p className="text-sm text-center text-amber-300 bg-amber-500/10 p-3 rounded-lg">Your verification request is pending.</p>;
                                default:
                                    return <button onClick={handleRequest} disabled={isSubmitting} className="w-full px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors font-semibold disabled:bg-slate-600 disabled:opacity-70">{isSubmitting ? 'Submitting...' : 'Request Verification'}</button>;
                            }
                        })()}
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors font-semibold">Cancel</button>
                    <button onClick={handleUpdate} disabled={isSubmitting} className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg transition-colors font-semibold disabled:bg-slate-600 disabled:opacity-70">{isSubmitting ? 'Saving...' : 'Save Changes'}</button>
                </div>
                </>
            )}
            {view === 'wallet' && (
                <>
                <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 p-4 rounded-xl mb-4 text-center">
                    <p className="text-sm text-slate-300">Current Balance</p>
                    <p className="text-4xl font-bold text-white tracking-tight">{formatCurrency(currentUser.walletBalance)}</p>
                </div>
                <form onSubmit={handleTransfer} className="space-y-3 p-4 bg-black/20 rounded-xl border border-white/10">
                    <h3 className="font-semibold text-lg text-white">Send Funds</h3>
                    <UserSelector
                        users={allOtherUsers}
                        selectedUserId={transferUser}
                        onSelectUser={setTransferUser}
                        disabled={isAccountFrozen}
                    />
                    <input type="number" value={transferAmount} onChange={e => setTransferAmount(e.target.value)} placeholder="Amount (USD)" min="0.01" step="0.01" className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500" disabled={isAccountFrozen} />
                    {transferMessage.text && <p className={`text-sm text-center ${transferMessage.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>{transferMessage.text}</p>}
                    <button type="submit" disabled={isSubmitting || isAccountFrozen || (!!parseFloat(transferAmount) && currentUser.walletBalance < parseFloat(transferAmount))} className="w-full px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg font-semibold disabled:from-slate-600 disabled:opacity-70">
                        {isSubmitting ? 'Sending...' : 'Send'}
                    </button>
                </form>
                 <div className="mt-4">
                    <h3 className="font-semibold text-lg mb-2 text-white">Transaction History</h3>
                    <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-2 pr-2 -mr-2">
                        {userTransactions.length > 0 ? userTransactions.map(t => {
                            return (
                                <div key={t.id} className="text-sm p-2 bg-white/5 rounded-lg flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold">{t.description}</p>
                                        <p className="text-xs text-slate-400">{new Date(t.timestamp).toLocaleString()}</p>
                                    </div>
                                    <p className={`font-bold ${t.fromUserId === currentUser.id ? 'text-red-400' : 'text-green-400'}`}>{t.fromUserId === currentUser.id ? '-' : '+'}{formatCurrency(t.amount)}</p>
                                </div>
                            )
                        }) : <p className="text-sm text-center text-slate-500 p-4">No transactions yet.</p>}
                    </div>
                 </div>
                </>
            )}
            {view === 'market' && (
                <div className="space-y-4 max-h-[28rem] overflow-y-auto custom-scrollbar pr-2 -mr-2">
                     <div className="flex justify-center gap-2 mb-4 p-1 bg-black/20 rounded-full border border-white/10 sticky top-0 backdrop-blur-sm">
                        <button onClick={() => setMarketView('badges')} className={`flex-1 px-3 py-1.5 text-sm font-semibold rounded-full transition-colors ${marketView === 'badges' ? 'bg-white/10 text-white' : 'text-slate-400'}`}>Badges</button>
                        <button onClick={() => setMarketView('cosmetics')} className={`flex-1 px-3 py-1.5 text-sm font-semibold rounded-full transition-colors ${marketView === 'cosmetics' ? 'bg-white/10 text-white' : 'text-slate-400'}`}>Cosmetics</button>
                    </div>
                    
                    {marketView === 'badges' && (
                        <>
                        {discountInfo.applicable && (
                            <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-center text-sm text-cyan-200">
                                <p><InformationCircleIcon className="w-5 h-5 inline-block mr-1" />You have <strong className="font-bold">{discountInfo.daysLeft} {discountInfo.daysLeft > 1 ? 'days' : 'day'}</strong> left on your {discountInfo.badgeType} badge. Get a <strong className="font-bold">{discountInfo.percentage}% discount</strong> on any NEW badge!</p>
                            </div>
                        )}
                        {Object.entries(badgePrices).map(([badgeStr, prices]) => {
                            const badge = badgeStr as VerificationBadgeType;
                            const colorClasses: Record<string, string> = { blue: 'text-blue-400', red: 'text-red-400', gold: 'text-amber-400', pink: 'text-pink-400', grey: 'text-slate-400', pastel_blue: 'text-sky-300' };
                            return (
                            <div key={badge} className="bg-black/20 p-4 rounded-xl border border-white/10">
                                <div className="flex items-center gap-2 mb-3">
                                    <CheckBadgeIcon className={`w-6 h-6 ${colorClasses[badge]}`} />
                                    <h3 className={`font-bold text-xl capitalize text-white`}>{badge} Badge</h3>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-center text-sm">
                                    {Object.entries(prices).map(([duration, originalCost]) => {
                                        const hasPermanent = currentUser.verification?.status === 'approved' && !currentUser.verification.expiresAt && currentUser.verification.badgeType === badge;
                                        
                                        if (duration === 'permanent' && hasPermanent) {
                                            return <div key={duration} className="p-2 bg-white/5 rounded-lg border border-white/10 opacity-60"><p className="font-semibold">Permanent</p><p className="font-bold text-green-400">Owned</p></div>
                                        }

                                        const isUpgrade = discountInfo.applicable && discountInfo.badgeType !== badge;
                                        const finalCost = isUpgrade ? originalCost * (1 - discountInfo.percentage / 100) : originalCost;
                                        
                                        return (
                                            <button 
                                                key={duration}
                                                onClick={() => handlePurchaseBadge(badge, duration, finalCost)}
                                                disabled={isSubmitting || isAccountFrozen || currentUser.walletBalance < finalCost}
                                                className="p-2 bg-white/5 rounded-lg border border-white/10 hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                                <p className="font-semibold capitalize">{duration === 'permanent' ? 'Permanent' : `${duration} Days`}</p>
                                                <div className="flex items-center justify-center gap-1">
                                                     {isUpgrade && <span className="line-through text-slate-500 text-xs">{formatCurrency(originalCost)}</span>}
                                                    <p className="font-bold text-cyan-300">{formatCurrency(finalCost)}</p>
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                            )
                        })}
                        </>
                    )}
                    {marketView === 'cosmetics' && (
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-xl font-bold text-white mb-2">Profile Borders</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {MARKETPLACE_ITEMS.borders.map(border => {
                                        const isOwned = currentUser.inventory?.borders?.includes(border.id);
                                        return (
                                            <div key={border.id} className="bg-black/20 p-3 rounded-xl border border-white/10 text-center">
                                                <div className="flex justify-center items-center mb-2">
                                                    <div className="w-16 h-16 rounded-full" style={border.style}><div className="w-full h-full rounded-full bg-gradient-to-br from-purple-600 to-blue-600"></div></div>
                                                </div>
                                                <p className="font-semibold text-sm">{border.name}</p>
                                                {isOwned ? (
                                                    <p className="font-bold text-green-400 mt-1">Owned</p>
                                                ) : (
                                                    <button onClick={() => handlePurchaseCosmetic({ type: 'border', ...border })} disabled={isSubmitting || isAccountFrozen || currentUser.walletBalance < border.price} className="mt-1 w-full text-sm font-bold bg-cyan-500/20 text-cyan-300 py-1 rounded-md hover:bg-cyan-500/30 disabled:opacity-50">
                                                        {formatCurrency(border.price)}
                                                    </button>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                             <div>
                                <h3 className="text-xl font-bold text-white mb-2">Name Colors</h3>
                                <div className="grid grid-cols-2 gap-3">
                                     {MARKETPLACE_ITEMS.nameColors.map(color => {
                                        const isOwned = currentUser.inventory?.nameColors?.includes(color.id);
                                         return (
                                            <div key={color.id} className="bg-black/20 p-3 rounded-xl border border-white/10 text-center">
                                                <p className="font-bold text-lg mb-2" style={color.style}>{color.name}</p>
                                                {isOwned ? (
                                                    <p className="font-bold text-green-400 mt-1">Owned</p>
                                                ) : (
                                                    <button onClick={() => handlePurchaseCosmetic({ type: 'nameColor', ...color })} disabled={isSubmitting || isAccountFrozen || currentUser.walletBalance < color.price} className="mt-1 w-full text-sm font-bold bg-cyan-500/20 text-cyan-300 py-1 rounded-md hover:bg-cyan-500/30 disabled:opacity-50">
                                                        {formatCurrency(color.price)}
                                                    </button>
                                                )}
                                            </div>
                                         )
                                     })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
             {view === 'customize' && (
                <div className="space-y-6 max-h-[28rem] overflow-y-auto custom-scrollbar pr-2 -mr-2">
                    <div>
                        <h3 className="text-xl font-bold text-white mb-3">Equip Profile Border</h3>
                        <div className="grid grid-cols-3 gap-3">
                            <div onClick={() => handleEquip('border', undefined)} className={`cursor-pointer bg-black/20 p-3 rounded-xl border-2 text-center flex flex-col items-center justify-center gap-2 ${!currentUser.customization?.profileBorderId ? 'border-cyan-400' : 'border-white/10'}`}>
                                <BanIcon className="w-8 h-8 text-slate-400" />
                                <span className="text-sm font-semibold">None</span>
                            </div>
                            {currentUser.inventory?.borders?.map(borderId => {
                                const border = MARKETPLACE_ITEMS.borders.find(b => b.id === borderId);
                                if (!border) return null;
                                return (
                                    <div key={border.id} onClick={() => handleEquip('border', border.id)} className={`cursor-pointer bg-black/20 p-3 rounded-xl border-2 text-center flex flex-col items-center justify-center gap-2 ${currentUser.customization?.profileBorderId === border.id ? 'border-cyan-400' : 'border-white/10'}`}>
                                        <div className="w-10 h-10 rounded-full" style={border.style}><div className="w-full h-full rounded-full bg-gradient-to-br from-purple-600 to-blue-600"></div></div>
                                        <span className="text-xs font-semibold text-center leading-tight">{border.name}</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white mb-3">Equip Name Color</h3>
                         <div className="grid grid-cols-2 gap-3">
                             <div onClick={() => handleEquip('nameColor', undefined)} className={`cursor-pointer bg-black/20 p-3 rounded-xl border-2 text-center ${!currentUser.customization?.nameColorId ? 'border-cyan-400' : 'border-white/10'}`}>
                                <p className="font-bold text-lg">Default</p>
                            </div>
                            {currentUser.inventory?.nameColors?.map(colorId => {
                                const color = MARKETPLACE_ITEMS.nameColors.find(c => c.id === colorId);
                                if (!color) return null;
                                return (
                                    <div key={color.id} onClick={() => handleEquip('nameColor', color.id)} className={`cursor-pointer bg-black/20 p-3 rounded-xl border-2 text-center ${currentUser.customization?.nameColorId === color.id ? 'border-cyan-400' : 'border-white/10'}`}>
                                        <p className="font-bold text-lg" style={color.style}>{color.name}</p>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}
        </Modal>
    );
};

interface SidebarProps {
  currentUser: User;
  setIsProfileModalOpen: (isOpen: boolean) => void;
  onLogout: () => Promise<void>;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  sidebarView: 'chats' | 'users' | 'requests';
  setSidebarView: (view: 'chats' | 'users' | 'requests') => void;
  friendRequests: Connection[];
  isMultiDeleteMode: boolean;
  setIsMultiDeleteMode: (isDeleting: boolean) => void;
  isMobileSidebarOpen: boolean;
  filteredChats: (Chat & { lastMessage?: Message })[];
  activeChatId: string | null;
  handleSelectChat: (chatId: string) => void;
  chatsToDelete: string[];
  users: User[];
  filteredUsers: User[];
  connections: Connection[];
  onSendRequest: (toUserId: string) => Promise<void>;
  handleCreateNewChat: (targetUser: User) => Promise<void>;
  onUpdateConnection: (connectionId: string, status: ConnectionStatus) => Promise<void>;
  handleDeleteSelectedChats: () => Promise<void>;
}

const Sidebar: React.FC<SidebarProps> = ({ currentUser, setIsProfileModalOpen, onLogout, searchTerm, setSearchTerm, sidebarView, setSidebarView, friendRequests, isMultiDeleteMode, setIsMultiDeleteMode, isMobileSidebarOpen, filteredChats, activeChatId, handleSelectChat, chatsToDelete, users, filteredUsers, connections, onSendRequest, handleCreateNewChat, onUpdateConnection, handleDeleteSelectedChats }) => (
    <aside className={`absolute md:relative z-20 w-80 md:w-96 h-full bg-black/20 backdrop-blur-2xl border-r border-white/10 flex-shrink-0 flex flex-col transition-transform duration-300 ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-4 border-b border-white/10 flex-shrink-0">
            <div className="flex items-center gap-3">
                <button onClick={() => setIsProfileModalOpen(true)}>
                    <AvatarWithBorder user={currentUser} containerClasses="w-12 h-12" textClasses="text-2xl" statusClasses="h-3.5 w-3.5 bottom-0 right-0" />
                </button>
                <div className="flex-grow overflow-hidden">
                    <div className="flex items-center gap-1.5"><UserName user={currentUser} className="font-bold text-lg truncate" />{renderUserBadge(currentUser)}</div>
                    <p className="text-sm text-slate-400 truncate">{currentUser.bio || "No bio set"}</p>
                </div>
                <button onClick={onLogout} className="p-2 text-slate-400 hover:text-white transition-colors flex-shrink-0"><ArrowLeftOnRectangleIcon className="w-6 h-6" /></button>
            </div>
        </div>

        <div className="p-4 flex-shrink-0">
            <div className="relative">
                <MagnifyingGlassIcon className="w-5 h-5 absolute top-1/2 -translate-y-1/2 left-4 text-slate-400" />
                <input type="text" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-white/5 border border-transparent rounded-full pl-11 pr-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50" />
            </div>
        </div>
        
        <div className="px-4 pb-2 border-b border-white/10 flex-shrink-0">
            <nav className="flex justify-between items-center">
                <div className="flex space-x-1 bg-black/20 p-1 rounded-full">
                    <button onClick={() => setSidebarView('chats')} className={`px-3 py-1.5 text-sm font-semibold rounded-full transition-colors ${sidebarView === 'chats' ? 'bg-white/10 text-white' : 'text-slate-400'}`}>Chats</button>
                    <button onClick={() => setSidebarView('users')} className={`px-3 py-1.5 text-sm font-semibold rounded-full transition-colors ${sidebarView === 'users' ? 'bg-white/10 text-white' : 'text-slate-400'}`}>Users</button>
                    <button onClick={() => setSidebarView('requests')} className={`relative px-3 py-1.5 text-sm font-semibold rounded-full transition-colors ${sidebarView === 'requests' ? 'bg-white/10 text-white' : 'text-slate-400'}`}>
                        Requests {friendRequests.length > 0 && <span className="absolute -top-1 -right-1 h-4 w-4 text-xs bg-red-500 rounded-full">{friendRequests.length}</span>}
                    </button>
                </div>
                 {sidebarView === 'chats' && (
                    <button onClick={() => setIsMultiDeleteMode(!isMultiDeleteMode)} className={`p-2 rounded-full transition-colors ${isMultiDeleteMode ? 'bg-red-500/20 text-red-300' : 'text-slate-400 hover:bg-white/10'}`}>
                       <TrashIcon className="w-5 h-5" />
                    </button>
                )}
            </nav>
        </div>
        
        <div className="flex-grow overflow-y-auto custom-scrollbar">
            {sidebarView === 'chats' && (
                <div className="p-2 space-y-1">
                    {filteredChats.map(chat => {
                        const otherUserId = chat.members.find(id => id !== currentUser.id);
                        const otherUser = users.find(u => u.id === otherUserId);
                        return (
                            <div key={chat.id} onClick={() => handleSelectChat(chat.id)} className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-colors ${activeChatId === chat.id && !isMultiDeleteMode ? 'bg-cyan-500/20' : 'hover:bg-white/5'}`}>
                                {isMultiDeleteMode && (
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 flex-shrink-0 ${chatsToDelete.includes(chat.id) ? 'bg-cyan-500 border-cyan-400' : 'border-slate-500 bg-white/10'}`}>
                                        {chatsToDelete.includes(chat.id) && <CheckIcon className="w-3 h-3 text-white" />}
                                    </div>
                                )}
                                {chat.type === 'dm' && otherUser ? <AvatarWithBorder user={otherUser} containerClasses="w-12 h-12" textClasses="text-2xl" statusClasses="h-3.5 w-3.5 bottom-0 right-0" /> : <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-xl font-bold flex-shrink-0"><UsersIcon className="w-7 h-7"/></div> }
                                <div className="flex-grow overflow-hidden">
                                    <p className="font-semibold truncate">{getChatDisplayName(chat, currentUser, users)}</p>
                                    <p className="text-sm text-slate-400 truncate">{chat.lastMessage?.text || "No messages yet"}</p>
                                </div>
                                {chat.lastMessage && <span className="text-xs text-slate-500 self-start">{new Date(chat.lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'})}</span>}
                            </div>
                        );
                    })}
                </div>
            )}
            {sidebarView === 'users' && (
                <div className="p-2 space-y-1">
                    {filteredUsers.map(user => {
                        const connection = connections.find(c => (c.fromUserId === currentUser.id && c.toUserId === user.id) || (c.fromUserId === user.id && c.toUserId === currentUser.id));
                        return (
                            <div key={user.id} className="flex items-center gap-3 p-3 rounded-2xl">
                                <AvatarWithBorder user={user} containerClasses="w-12 h-12" textClasses="text-2xl" statusClasses="h-3.5 w-3.5 bottom-0 right-0" />
                                <div className="flex-grow overflow-hidden"><div className="flex items-center gap-1.5"><UserName user={user} className="font-semibold truncate" />{renderUserBadge(user)}</div></div>
                                {(!connection || connection.status === ConnectionStatus.REJECTED) && <button onClick={() => onSendRequest(user.id)} className="p-2 bg-white/10 rounded-full text-white hover:bg-white/20"><UserPlusIcon className="w-5 h-5"/></button>}
                                {connection?.status === ConnectionStatus.PENDING && <span className="text-xs text-amber-400 font-semibold">Pending</span>}
                                {connection?.status === ConnectionStatus.ACCEPTED && <button onClick={() => handleCreateNewChat(user)} className="p-2 bg-white/10 rounded-full text-white hover:bg-white/20"><ChatBubbleLeftRightIcon className="w-5 h-5"/></button>}
                                {connection?.status === ConnectionStatus.BLOCKED && <span className="text-xs text-red-400 font-semibold">Blocked</span>}
                            </div>
                        );
                    })}
                </div>
            )}
            {sidebarView === 'requests' && (
                <div className="p-2 space-y-1">
                    {friendRequests.map(req => {
                        const fromUser = users.find(u => u.id === req.fromUserId);
                        if (!fromUser) return null;
                        return (
                            <div key={req.id} className="flex items-center gap-3 p-3 rounded-2xl">
                                <AvatarWithBorder user={fromUser} containerClasses="w-12 h-12" textClasses="text-2xl" statusClasses="h-3.5 w-3.5 bottom-0 right-0" />
                                <div className="flex-grow overflow-hidden"><div className="flex items-center gap-1.5"><UserName user={fromUser} className="font-semibold truncate" />{renderUserBadge(fromUser)}</div></div>
                                <button onClick={() => onUpdateConnection(req.id, ConnectionStatus.REJECTED)} className="p-2 bg-red-500/20 text-red-300 rounded-full hover:bg-red-500/30"><XMarkIcon className="w-5 h-5"/></button>
                                <button onClick={() => onUpdateConnection(req.id, ConnectionStatus.ACCEPTED)} className="p-2 bg-green-500/20 text-green-300 rounded-full hover:bg-green-500/30"><CheckIcon className="w-5 h-5" /></button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
        {isMultiDeleteMode && (
            <div className="p-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-sm font-semibold">{chatsToDelete.length} selected</span>
                <button onClick={handleDeleteSelectedChats} disabled={chatsToDelete.length === 0} className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold text-sm disabled:opacity-50">Delete</button>
            </div>
        )}
    </aside>
);

interface ChatAreaProps {
  activeChat: Chat | undefined;
  currentUser: User;
  users: User[];
  chatMessages: Message[];
  messagesEndRef: React.RefObject<HTMLDivElement>;
  isAccountFrozen: boolean;
  newMessage: string;
  setNewMessage: (value: string) => void;
  handleSendMessageSubmit: (e: React.FormEvent) => void;
  setIsMobileSidebarOpen: (isOpen: boolean) => void;
  openReportModal: (user: User) => void;
}

const ChatArea: React.FC<ChatAreaProps> = ({ activeChat, currentUser, users, chatMessages, messagesEndRef, isAccountFrozen, newMessage, setNewMessage, handleSendMessageSubmit, setIsMobileSidebarOpen, openReportModal }) => {
    const otherUser = activeChat?.type === ChatType.DM ? users.find(u => u.id === activeChat.members.find(id => id !== currentUser.id)) : null;
    
    return (
        <main className="flex-1 flex flex-col bg-black/10">
            {activeChat ? (
                <>
                    <header className="p-4 border-b border-white/10 flex items-center gap-4 flex-shrink-0 bg-black/10 backdrop-blur-2xl z-10">
                        <button onClick={() => setIsMobileSidebarOpen(true)} className="md:hidden p-2 text-slate-400 hover:text-white"><ChatBubbleLeftRightIcon className="w-6 h-6" /></button>
                        {activeChat.type === 'dm' && otherUser ? <AvatarWithBorder user={otherUser} containerClasses="w-12 h-12" textClasses="text-2xl" statusClasses="h-3.5 w-3.5 bottom-0 right-0" /> : <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-xl font-bold flex-shrink-0"><UsersIcon className="w-7 h-7"/></div> }
                        <div className="flex-grow">
                            <div className="flex items-center gap-2"><p className="text-xl font-bold">{getChatDisplayName(activeChat, currentUser, users)}</p>{otherUser && renderUserBadge(otherUser, 'large')}</div>
                            {otherUser?.online && <p className="text-sm text-green-400">Online</p>}
                        </div>
                        {otherUser && <button onClick={() => openReportModal(otherUser)} title="Report User" className="p-2 text-slate-400 hover:text-red-400"><FlagIcon className="w-6 h-6"/></button>}
                    </header>
                    <div className="flex-grow p-6 overflow-y-auto space-y-6 custom-scrollbar">
                        {chatMessages.map(msg => {
                            const author = users.find(u => u.id === msg.authorId);
                            if (!author) return null;
                            return <ChatMessage key={msg.id} message={msg} author={author} isCurrentUser={author.id === currentUser.id} isGroupChat={activeChat.type === ChatType.GROUP} />;
                        })}
                        <div ref={messagesEndRef} />
                    </div>
                    <footer className="p-4 flex-shrink-0">
                        {isAccountFrozen && (
                            <div className="text-center p-3 mb-2 bg-red-500/10 text-red-300 rounded-lg text-sm">Your account is frozen. You cannot send messages.</div>
                        )}
                        <form onSubmit={handleSendMessageSubmit} className="flex items-center gap-3">
                            <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} disabled={isAccountFrozen} placeholder="Type a message..." className="flex-grow w-full bg-white/5 border border-white/10 rounded-full px-5 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50" />
                            <button type="submit" disabled={!newMessage.trim() || isAccountFrozen} className="p-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-full transition-transform transform hover:scale-110 disabled:from-slate-600 disabled:to-slate-700 disabled:opacity-70 disabled:scale-100"><PaperAirplaneIcon className="w-6 h-6" /></button>
                        </form>
                    </footer>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                    <button onClick={() => setIsMobileSidebarOpen(true)} className="md:hidden absolute top-4 left-4 p-2 text-slate-400 hover:text-white"><ChatBubbleLeftRightIcon className="w-6 h-6" /></button>
                    <ChatBubbleLeftRightIcon className="w-24 h-24 text-slate-700 mb-4" />
                    <h2 className="text-3xl font-bold">Welcome to BAK -Ko</h2>
                    <p className="text-slate-400 mt-2">Select a chat to start messaging.</p>
                </div>
            )}
        </main>
    );
};

const ChatRoom: React.FC<ChatRoomProps> = (props) => {
    const { currentUser, users, chats, messages, connections, transactions, onSendMessage, onCreateChat, onLogout, onSendRequest, onUpdateConnection, onRequestVerification, onUpdateUserProfile, onTransferFunds, onPurchaseVerification, onPurchaseCosmetic, onEquipCustomization, onReportUser, onDeleteUserChats } = props;
    
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [sidebarView, setSidebarView] = useState<'chats' | 'users' | 'requests'>('chats');
    const [searchTerm, setSearchTerm] = useState('');
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [userToReport, setUserToReport] = useState<User | null>(null);
    const [reportReason, setReportReason] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [isUserSwitcherOpen, setIsUserSwitcherOpen] = useState(false);
    const userSwitcherRef = useRef<HTMLDivElement>(null);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [isMultiDeleteMode, setIsMultiDeleteMode] = useState(false);
    const [chatsToDelete, setChatsToDelete] = useState<string[]>([]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, activeChatId]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (userSwitcherRef.current && !userSwitcherRef.current.contains(event.target as Node)) {
                setIsUserSwitcherOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const isAccountFrozen = useMemo(() => {
        return !!(currentUser.isFrozen && (!currentUser.frozenUntil || currentUser.frozenUntil > Date.now()));
    }, [currentUser]);

    const userChats = useMemo(() => {
        return chats
            .filter(c => c.members.includes(currentUser.id))
            .map(chat => {
                const lastMessage = messages
                    .filter(m => m.chatId === chat.id)
                    .sort((a, b) => b.timestamp - a.timestamp)[0];
                return { ...chat, lastMessage };
            })
            .sort((a, b) => (b.lastMessage?.timestamp || 0) - (a.lastMessage?.timestamp || 0));
    }, [chats, messages, currentUser.id]);

    const activeChat = useMemo(() => {
        return chats.find(c => c.id === activeChatId);
    }, [chats, activeChatId]);

    const chatMessages = useMemo(() => {
        if (!activeChatId) return [];
        return messages.filter(m => m.chatId === activeChatId).sort((a, b) => a.timestamp - b.timestamp);
    }, [messages, activeChatId]);
    
    const otherUsers = useMemo(() => {
        return users.filter(u => u.id !== currentUser.id && !u.isAdmin);
    }, [users, currentUser.id]);

    const friendRequests = useMemo(() => {
        return connections.filter(c => c.toUserId === currentUser.id && c.status === ConnectionStatus.PENDING);
    }, [connections, currentUser.id]);

    const filteredUsers = useMemo(() => {
        return otherUsers.filter(u => u.username.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [otherUsers, searchTerm]);
    
    const filteredChats = useMemo(() => {
        return userChats.filter(c => getChatDisplayName(c, currentUser, users).toLowerCase().includes(searchTerm.toLowerCase()));
    }, [userChats, searchTerm, currentUser, users]);

    const handleSelectChat = (chatId: string) => {
        if (isMultiDeleteMode) {
            toggleChatToDelete(chatId);
        } else {
            setActiveChatId(chatId);
            setIsMobileSidebarOpen(false);
        }
    };

    const handleCreateNewChat = async (targetUser: User) => {
        const newChat = await onCreateChat(targetUser);
        setActiveChatId(newChat.id);
        setSidebarView('chats');
        setIsMobileSidebarOpen(false);
    };

    const handleSendMessageSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newMessage.trim() && activeChatId && !isAccountFrozen) {
            onSendMessage(activeChatId, newMessage.trim());
            setNewMessage('');
        }
    };
    
    const openReportModal = (user: User) => {
        setUserToReport(user);
        setIsReportModalOpen(true);
    };

    const handleReportSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (userToReport && reportReason.trim()) {
            await onReportUser(userToReport.id, reportReason.trim(), activeChat?.id);
            setReportReason('');
            setUserToReport(null);
            setIsReportModalOpen(false);
            alert('Report submitted successfully.');
        }
    };
    
    const toggleChatToDelete = (chatId: string) => {
        setChatsToDelete(prev => prev.includes(chatId) ? prev.filter(id => id !== chatId) : [...prev, chatId]);
    };

    const handleDeleteSelectedChats = async () => {
        if (chatsToDelete.length > 0 && window.confirm(`Are you sure you want to delete ${chatsToDelete.length} chat(s)? This action cannot be undone.`)) {
            await onDeleteUserChats(chatsToDelete);
            setChatsToDelete([]);
            setIsMultiDeleteMode(false);
            if (chatsToDelete.includes(activeChatId ?? '')) {
                setActiveChatId(null);
            }
        }
    };

    return (
        <>
            <ProfileModal
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
                currentUser={currentUser}
                users={users}
                transactions={transactions}
                onUpdateProfile={onUpdateUserProfile}
                onRequestVerification={onRequestVerification}
                onTransferFunds={onTransferFunds}
                onPurchaseVerification={onPurchaseVerification}
                onPurchaseCosmetic={onPurchaseCosmetic}
                onEquipCustomization={onEquipCustomization}
                isAccountFrozen={isAccountFrozen}
            />
            <Modal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)}>
                <form onSubmit={handleReportSubmit}>
                    <h2 className="text-2xl font-bold mb-4">Report {userToReport?.username}</h2>
                    <p className="text-sm text-slate-400 mb-4">Please provide a reason for your report. Your report will be sent to the administrators for review.</p>
                    <textarea value={reportReason} onChange={e => setReportReason(e.target.value)} rows={4} placeholder="Reason for reporting..." className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500"></textarea>
                    <div className="mt-6 flex justify-end gap-3">
                        <button type="button" onClick={() => setIsReportModalOpen(false)} className="px-5 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg font-semibold">Cancel</button>
                        <button type="submit" disabled={!reportReason.trim()} className="px-5 py-2.5 bg-red-600 hover:bg-red-500 rounded-lg font-semibold disabled:bg-slate-600">Submit Report</button>
                    </div>
                </form>
            </Modal>
            <div className="flex h-screen w-full font-sans overflow-hidden animated-gradient">
                <Sidebar
                    currentUser={currentUser}
                    setIsProfileModalOpen={setIsProfileModalOpen}
                    onLogout={onLogout}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    sidebarView={sidebarView}
                    setSidebarView={setSidebarView}
                    friendRequests={friendRequests}
                    isMultiDeleteMode={isMultiDeleteMode}
                    setIsMultiDeleteMode={setIsMultiDeleteMode}
                    isMobileSidebarOpen={isMobileSidebarOpen}
                    filteredChats={filteredChats}
                    activeChatId={activeChatId}
                    handleSelectChat={handleSelectChat}
                    chatsToDelete={chatsToDelete}
                    users={users}
                    filteredUsers={filteredUsers}
                    connections={connections}
                    onSendRequest={onSendRequest}
                    handleCreateNewChat={handleCreateNewChat}
                    onUpdateConnection={onUpdateConnection}
                    handleDeleteSelectedChats={handleDeleteSelectedChats}
                />
                <ChatArea
                    activeChat={activeChat}
                    currentUser={currentUser}
                    users={users}
                    chatMessages={chatMessages}
                    messagesEndRef={messagesEndRef}
                    isAccountFrozen={isAccountFrozen}
                    newMessage={newMessage}
                    setNewMessage={setNewMessage}
                    handleSendMessageSubmit={handleSendMessageSubmit}
                    setIsMobileSidebarOpen={setIsMobileSidebarOpen}
                    openReportModal={openReportModal}
                />
            </div>
        </>
    );
};
export default ChatRoom;
// Health check comment
// N