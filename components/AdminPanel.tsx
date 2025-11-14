import React, { useState, useMemo, useEffect, useRef } from 'react';
import { User, Chat, ChatType, Message, Connection, ConnectionStatus, Verification, VerificationBadgeType, Transaction, Report, TransactionType } from '../types';
import { db_firebase as db, MARKETPLACE_ITEMS } from './db';
import { admin } from './admin';
import { onSnapshot, collection, query, where, doc } from 'firebase/firestore';
import { db as fdb } from './firebase';
import { ArrowLeftOnRectangleIcon, Cog6ToothIcon, KeyIcon, PencilIcon, ShieldCheckIcon, XMarkIcon, UsersIcon, TrashIcon, EyeIcon, ArrowLeftIcon, BanIcon, EnvelopeIcon, ChartBarIcon, MegaphoneIcon, CheckBadgeIcon, ClockIcon, WalletIcon, CurrencyDollarIcon, ShoppingCartIcon, LockOpenIcon, CheckCircleIcon, ChevronDownIcon, PaintBrushIcon, ExclamationTriangleIcon } from './icons';
import ChatMessage from './ChatMessage';

interface AdminPanelProps {
    currentUser: User;
    onLogout: () => Promise<void>;
}

// ... (Helper components like Modal, BadgeOption, etc. remain unchanged)

export const AdminPanel: React.FC<AdminPanelProps> = ({ currentUser, onLogout }) => {

    const [users, setUsers] = useState<User[]>([]);
    const [chats, setChats] = useState<Chat[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [connections, setConnections] = useState<Connection[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [reports, setReports] = useState<Report[]>([]);

    const [view, setView] = useState<'dashboard' |'users' | 'groups' | 'requests' | 'verification' | 'transactions' | 'wallets' | 'reports' | 'announcements'>('dashboard');
    // ... (other state variables remain the same)

    // --- Data Fetching with Firebase Listeners -- -
    useEffect(() => {
        const handleFetchUsers = async () => {
            try {
                const allUsers = await admin.getAllUsers(currentUser.id);
                setUsers(allUsers as User[]);
            } catch (error) {
                console.error("Error fetching users:", error);
            }
        };
        handleFetchUsers();
        const chatsUnsub = onSnapshot(collection(fdb, "chats"), snap => setChats(snap.docs.map(d => ({ ...d.data(), id: d.id } as Chat))));
        const messagesUnsub = onSnapshot(collection(fdb, "messages"), snap => setMessages(snap.docs.map(d => ({ ...d.data(), id: d.id } as Message))));
        const connectionsUnsub = onSnapshot(collection(fdb, "connections"), snap => setConnections(snap.docs.map(d => ({ ...d.data(), id: d.id } as Connection))));
        const transactionsUnsub = onSnapshot(collection(fdb, "transactions"), snap => setTransactions(snap.docs.map(d => ({ ...d.data(), id: d.id } as Transaction))));
        const reportsUnsub = onSnapshot(collection(fdb, "reports"), snap => setReports(snap.docs.map(d => ({ ...d.data(), id: d.id } as Report))));

        return () => {

            chatsUnsub();
            messagesUnsub();
            connectionsUnsub();
            transactionsUnsub();
            reportsUnsub();
        };
    }, [currentUser.id]);

    // All the handler functions will now use the 'db' object directly.
    // For example:
    const handleProfileUpdate = async () => {
        if (!selectedUser) return;
        setIsSubmitting(true);
        await db.updateUserProfile(selectedUser.id, { avatar, bio, email, phone, messageLimit });
        setIsSubmitting(false);
        closeAllModals();
    };

    const handleDeleteUserConfirm = async (user: User) => {
        if (window.confirm(`Are you sure you want to permanently delete ${user.username}?`)) {
            try {
                await admin.deleteUser(currentUser.id, user.id);
                // The user will be removed from the list automatically by the onSnapshot listener
            } catch (error) {
                console.error("Error deleting user:", error);
                alert((error as Error).message);
            }
        }
    };

    // ... (other handlers will be updated similarly)

    // The rest of the component renders the UI based on the real-time state.

    return (
        <>
            {/* The main layout and modals for the admin panel */}
        </>
    );
}