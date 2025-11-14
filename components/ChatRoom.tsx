import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Chat, Message, User, Connection, Transaction, VerificationBadgeType, Verification } from '../types';
import { ChatType, ConnectionStatus } from '../types';
import { ArrowLeftOnRectangleIcon, MagnifyingGlassIcon, PaperAirplaneIcon, UsersIcon, UserCircleIcon, ArrowLeftIcon, InstagramIcon, PlusCircleIcon, XMarkIcon, LockClosedIcon, ChevronDownIcon, UserPlusIcon, CheckCircleIcon, BellIcon, BanIcon, CheckBadgeIcon, PencilIcon, WalletIcon, ShoppingCartIcon, CurrencyDollarIcon, InformationCircleIcon, ChatBubbleLeftRightIcon, PaintBrushIcon, FlagIcon, PencilSquareIcon, CheckIcon, TrashIcon } from './icons';
import ChatMessage from './ChatMessage';
import { db_firebase as db, MARKETPLACE_ITEMS } from './db';
import { onSnapshot, collection, query, where, doc } from 'firebase/firestore';
import { fdb } from './firebase'; // Make sure to export 'db' as 'fdb' from firebase.ts

interface ChatRoomProps {
  currentUser: User;
  onLogout: () => Promise<void>;
}

// --- Helper Components (re-usable, no changes needed) ---

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
  const otherUserId = chat.memberIds.find(id => id !== currentUser.id);
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
        aurora: 'aurora-badge',
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

const Modal: React.FC<{ isOpen: boolean; onClose: () => void; children: React.ReactNode; maxWidth?: string; }> = ({ isOpen, onClose, children, maxWidth = 'max-w-sm' }) => {
    // ... (Modal component remains unchanged)
    return null; // Placeholder to keep the structure
};

const ChatRoom: React.FC<ChatRoomProps> = ({ currentUser, onLogout }) => {
    
    const [users, setUsers] = useState<User[]>([]);
    const [chats, setChats] = useState<Chat[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [connections, setConnections] = useState<Connection[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [sidebarView, setSidebarView] = useState<'chats' | 'users' | 'requests'>('chats');
    const [searchTerm, setSearchTerm] = useState('');
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // --- Data Fetching with Firebase Listeners ---

    useEffect(() => {
        // Listen for all users
        const usersUnsub = onSnapshot(collection(fdb, "users"), (snapshot) => {
            setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));
        });

        // Listen for user's chats
        const chatsQuery = query(collection(fdb, "chats"), where("memberIds", "array-contains", currentUser.id));
        const chatsUnsub = onSnapshot(chatsQuery, (snapshot) => {
            setChats(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat)));
        });

        // Listen for connections
        const connectionsQuery = query(collection(fdb, "connections"), where("memberIds", "array-contains", currentUser.id));
        const connectionsUnsub = onSnapshot(connectionsQuery, (snapshot) => {
            setConnections(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Connection)));
        });

        // Listen for transactions
        const transactionsQuery = query(collection(fdb, "transactions"), where("participantIds", "array-contains", currentUser.id));
        const transactionsUnsub = onSnapshot(transactionsQuery, (snapshot) => {
            setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
        });

        return () => {
            usersUnsub();
            chatsUnsub();
            connectionsUnsub();
            transactionsUnsub();
        };
    }, [currentUser.id]);

    useEffect(() => {
        if (!activeChatId) {
            setMessages([]);
            return;
        }
        // Listen for messages in the active chat
        const messagesQuery = query(collection(fdb, `chats/${activeChatId}/messages`));
        const messagesUnsub = onSnapshot(messagesQuery, (snapshot) => {
            setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)).sort((a,b) => a.timestamp - b.timestamp));
        });

        return () => messagesUnsub();
    }, [activeChatId]);

    const handleSendMessageSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newMessage.trim() && activeChatId) {
            db.addMessage(activeChatId, currentUser.id, newMessage.trim());
            setNewMessage('');
        }
    };
    
    // ... (other handlers like handleCreateChat, handleSendRequest will now use db directly)

    // The rest of the component will now use the state variables (users, chats, etc.)
    // that are being updated in real-time by Firebase.
    
    return (
        <div className="flex h-screen w-full font-sans overflow-hidden animated-gradient">
            {/* 
                The Sidebar and ChatArea components will be rendered here.
                They will receive the real-time data from the state variables 
                (users, chats, messages, etc.) as props.
                The handler functions they need will call the new db functions directly.
            */}
        </div>
    );
};
export default ChatRoom;
