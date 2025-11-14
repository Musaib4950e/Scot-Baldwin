import { supabase } from './supabaseClient';
import { User, Chat, Message, ChatType, Connection, ConnectionStatus, Verification, Transaction, Report } from '../types';

class SupabaseDatabase {
  private currentUserId: string | null = null;
  private loggedInUserIds: string[] = [];
  private messageSubscriptions: Map<string, any> = new Map();
  private userStatusSubscription: any = null;
  private onMessageCallback: ((message: Message) => void) | null = null;
  private onUserStatusCallback: ((user: User) => void) | null = null;

  async initialize() {
    try {
      await this.ensureAdminExists();
      await this.ensureAnnouncementChatExists();
      await this.loadSession();
    } catch (error) {
      console.error('Error initializing database:', error);
    }
  }

  subscribeToMessages(chatId: string, callback: (message: Message) => void) {
    this.onMessageCallback = callback;

    const subscription = supabase
      .channel(`messages:${chatId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`,
      }, (payload) => {
        const message = this.mapToMessage(payload.new);
        callback(message);
      })
      .subscribe();

    this.messageSubscriptions.set(chatId, subscription);
    return () => this.unsubscribeFromMessages(chatId);
  }

  unsubscribeFromMessages(chatId: string) {
    const subscription = this.messageSubscriptions.get(chatId);
    if (subscription) {
      supabase.removeChannel(subscription);
      this.messageSubscriptions.delete(chatId);
    }
  }

  subscribeToUserStatus(callback: (user: User) => void) {
    this.onUserStatusCallback = callback;

    this.userStatusSubscription = supabase
      .channel('user_status')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'users',
      }, (payload) => {
        const user = this.mapToUser(payload.new);
        callback(user);
      })
      .subscribe();

    return () => this.unsubscribeFromUserStatus();
  }

  unsubscribeFromUserStatus() {
    if (this.userStatusSubscription) {
      supabase.removeChannel(this.userStatusSubscription);
      this.userStatusSubscription = null;
    }
  }

  cleanup() {
    this.messageSubscriptions.forEach((subscription) => {
      supabase.removeChannel(subscription);
    });
    this.messageSubscriptions.clear();
    if (this.userStatusSubscription) {
      supabase.removeChannel(this.userStatusSubscription);
    }
  }

  private async ensureAdminExists() {
    const { data: existingAdmin } = await supabase
      .from('users')
      .select('*')
      .eq('username', 'admin')
      .maybeSingle();

    if (!existingAdmin) {
      const adminId = '00000000-0000-0000-0000-000000000001';
      await supabase.from('users').insert({
        id: adminId,
        username: 'admin',
        avatar: '👑',
        password: '197700',
        online: false,
        is_admin: true,
        verification_status: 'approved',
        verification_badge_type: 'aurora',
        bio: 'The administrator of BAK-Ko.',
        wallet_balance: 999999999,
      });
    }
  }

  private async ensureAnnouncementChatExists() {
    const ANNOUNCEMENT_CHAT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

    const { data: existingChat } = await supabase
      .from('chats')
      .select('*')
      .eq('id', ANNOUNCEMENT_CHAT_ID)
      .maybeSingle();

    if (!existingChat) {
      const { data: users } = await supabase.from('users').select('id');
      const allUserIds = users?.map(u => u.id) || [];

      await supabase.from('chats').insert({
        id: ANNOUNCEMENT_CHAT_ID,
        type: 'group',
        name: '📢 Announcements',
        members: allUserIds,
        creator_id: '00000000-0000-0000-0000-000000000001',
      });
    }
  }

  private loadSession() {
    const session = localStorage.getItem('bakko_session');
    if (session) {
      const { currentUserId, loggedInUserIds } = JSON.parse(session);
      this.currentUserId = currentUserId;
      this.loggedInUserIds = loggedInUserIds || [];
    }
  }

  private saveSession() {
    localStorage.setItem('bakko_session', JSON.stringify({
      currentUserId: this.currentUserId,
      loggedInUserIds: this.loggedInUserIds,
    }));
  }

  // User operations
  async getUsers(): Promise<User[]> {
    const { data, error } = await supabase.from('users').select('*');
    if (error) throw error;
    return (data || []).map(this.mapToUser);
  }

  async getChats(): Promise<Chat[]> {
    const { data, error } = await supabase.from('chats').select('*');
    if (error) throw error;
    return (data || []).map(this.mapToChat);
  }

  async getMessages(): Promise<Message[]> {
    const { data, error } = await supabase.from('messages').select('*');
    if (error) throw error;
    return (data || []).map(this.mapToMessage);
  }

  async getConnections(): Promise<Connection[]> {
    const { data, error } = await supabase.from('connections').select('*');
    if (error) throw error;
    return (data || []).map(this.mapToConnection);
  }

  async getTransactions(): Promise<Transaction[]> {
    const { data, error } = await supabase.from('transactions').select('*');
    if (error) throw error;
    return (data || []).map(this.mapToTransaction);
  }

  async getReports(): Promise<Report[]> {
    const { data, error } = await supabase.from('reports').select('*');
    if (error) throw error;
    return (data || []).map(this.mapToReport);
  }

  async getCurrentUser(): Promise<User | null> {
    if (!this.currentUserId) return null;
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', this.currentUserId)
      .maybeSingle();
    if (error) throw error;
    return data ? this.mapToUser(data) : null;
  }

  async getLoggedInUsers(): Promise<User[]> {
    if (this.loggedInUserIds.length === 0) return [];
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .in('id', this.loggedInUserIds);
    if (error) throw error;
    return (data || []).map(this.mapToUser);
  }

  isUserLoggedIn(): boolean {
    return !!this.currentUserId;
  }

  async authenticate(username: string, password: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .ilike('username', username)
      .maybeSingle();

    if (error) throw error;
    if (data && data.password === password) {
      return this.mapToUser(data);
    }
    return null;
  }

  async createUser(params: { username: string; password: string; instagramUsername?: string }): Promise<User | null> {
    const { data: existing } = await supabase
      .from('users')
      .select('*')
      .ilike('username', params.username)
      .maybeSingle();

    if (existing) return null;

    const newUser = {
      username: params.username.trim(),
      avatar: params.username.trim().charAt(0).toUpperCase(),
      password: params.password,
      instagram_username: params.instagramUsername?.trim(),
      online: false,
      is_admin: false,
      verification_status: 'none',
      wallet_balance: 0,
      borders: [],
      name_colors: [],
    };

    const { data, error } = await supabase
      .from('users')
      .insert([newUser])
      .select()
      .single();

    if (error) throw error;
    return data ? this.mapToUser(data) : null;
  }

  async login(user: User): Promise<User> {
    if (!this.loggedInUserIds.includes(user.id)) {
      this.loggedInUserIds.push(user.id);
    }
    this.currentUserId = user.id;

    const { error } = await supabase
      .from('users')
      .update({ online: true })
      .eq('id', user.id);

    if (error) throw error;
    this.saveSession();
    return (await this.getCurrentUser())!;
  }

  async logout(): Promise<void> {
    if (!this.currentUserId) return;

    for (const userId of this.loggedInUserIds) {
      await supabase.from('users').update({ online: false }).eq('id', userId);
    }

    this.currentUserId = null;
    this.loggedInUserIds = [];
    this.saveSession();
  }

  async switchCurrentUser(userId: string): Promise<void> {
    if (this.loggedInUserIds.includes(userId)) {
      this.currentUserId = userId;
      this.saveSession();
    }
  }

  async addMessage(chatId: string, authorId: string, text: string): Promise<Message> {
    const newMessage = {
      chat_id: chatId,
      author_id: authorId,
      text,
      timestamp: Date.now(),
    };

    const { data, error } = await supabase
      .from('messages')
      .insert([newMessage])
      .select()
      .single();

    if (error) throw error;
    return this.mapToMessage(data);
  }

  async findOrCreateDM(user1: User, user2: User): Promise<Chat> {
    const { data: existing } = await supabase
      .from('chats')
      .select('*')
      .eq('type', 'dm')
      .contains('members', [user1.id])
      .contains('members', [user2.id])
      .maybeSingle();

    if (existing) {
      return this.mapToChat(existing);
    }

    const newChat = {
      type: 'dm',
      members: [user1.id, user2.id],
    };

    const { data, error } = await supabase
      .from('chats')
      .insert([newChat])
      .select()
      .single();

    if (error) throw error;
    return this.mapToChat(data);
  }

  async createGroupChat(creatorId: string, memberIds: string[], groupName: string): Promise<Chat> {
    const uniqueMembers = Array.from(new Set([creatorId, ...memberIds]));

    const newChat = {
      type: 'group',
      name: groupName,
      members: uniqueMembers,
      creator_id: creatorId,
    };

    const { data, error } = await supabase
      .from('chats')
      .insert([newChat])
      .select()
      .single();

    if (error) throw error;
    return this.mapToChat(data);
  }

  async updateUserProfile(userId: string, updates: Partial<User>): Promise<void> {
    const mapped: any = {};
    if (updates.avatar !== undefined) mapped.avatar = updates.avatar;
    if (updates.bio !== undefined) mapped.bio = updates.bio;
    if (updates.email !== undefined) mapped.email = updates.email;
    if (updates.phone !== undefined) mapped.phone = updates.phone;
    if (updates.messageLimit !== undefined) mapped.message_limit = updates.messageLimit;

    const { error } = await supabase
      .from('users')
      .update(mapped)
      .eq('id', userId);

    if (error) throw error;
  }

  async updateGroupDetails(chatId: string, details: { name: string; password?: string }): Promise<void> {
    const { error } = await supabase
      .from('chats')
      .update({
        name: details.name,
        password: details.password,
      })
      .eq('id', chatId);

    if (error) throw error;
  }

  async updateGroupMembers(chatId: string, memberIds: string[]): Promise<void> {
    const { error } = await supabase
      .from('chats')
      .update({ members: memberIds })
      .eq('id', chatId);

    if (error) throw error;
  }

  async deleteUser(userId: string): Promise<void> {
    const { error } = await supabase.from('users').delete().eq('id', userId);
    if (error) throw error;
  }

  async deleteGroup(chatId: string): Promise<void> {
    const { error } = await supabase.from('chats').delete().eq('id', chatId);
    if (error) throw error;
  }

  async deleteUserChats(chatIds: string[]): Promise<void> {
    const ANNOUNCEMENT_CHAT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const validChatIds = chatIds.filter(id => id !== ANNOUNCEMENT_CHAT_ID);

    if (validChatIds.length === 0) return;

    const { error } = await supabase
      .from('chats')
      .delete()
      .in('id', validChatIds);

    if (error) throw error;
  }

  async addConnection(fromUserId: string, toUserId: string): Promise<void> {
    const newConnection = {
      from_user_id: fromUserId,
      to_user_id: toUserId,
      status: 'pending',
      requested_at: Date.now(),
      updated_at: Date.now(),
    };

    const { error } = await supabase
      .from('connections')
      .insert([newConnection]);

    if (error) throw error;
  }

  async updateConnection(connectionId: string, status: ConnectionStatus): Promise<Connection | null> {
    const { data, error } = await supabase
      .from('connections')
      .update({
        status,
        updated_at: Date.now(),
      })
      .eq('id', connectionId)
      .select()
      .single();

    if (error) throw error;
    return data ? this.mapToConnection(data) : null;
  }

  async deleteConnection(connectionId: string): Promise<void> {
    const { error } = await supabase
      .from('connections')
      .delete()
      .eq('id', connectionId);

    if (error) throw error;
  }

  async requestUserVerification(userId: string): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update({ verification_status: 'pending' })
      .eq('id', userId);

    if (error) throw error;
  }

  async adminUpdateUserVerification(userId: string, verificationDetails: Partial<Verification>): Promise<void> {
    const mapped: any = {};
    if (verificationDetails.status !== undefined) mapped.verification_status = verificationDetails.status;
    if (verificationDetails.badgeType !== undefined) mapped.verification_badge_type = verificationDetails.badgeType;
    if (verificationDetails.expiresAt !== undefined) mapped.verification_expires_at = verificationDetails.expiresAt;

    const { error } = await supabase
      .from('users')
      .update(mapped)
      .eq('id', userId);

    if (error) throw error;
  }

  async resetUserPassword(userId: string, newPassword: string): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update({ password: newPassword })
      .eq('id', userId);

    if (error) throw error;
  }

  async addBroadcastAnnouncement(text: string, adminId: string): Promise<void> {
    const ANNOUNCEMENT_CHAT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

    const { error } = await supabase
      .from('messages')
      .insert([{
        chat_id: ANNOUNCEMENT_CHAT_ID,
        author_id: adminId,
        text,
        message_type: 'announcement',
        timestamp: Date.now(),
      }]);

    if (error) throw error;
  }

  async adminForceConnectionStatus(fromUserId: string, toUserId: string, status: ConnectionStatus): Promise<void> {
    const { data: existing } = await supabase
      .from('connections')
      .select('*')
      .or(`and(from_user_id.eq.${fromUserId},to_user_id.eq.${toUserId}),and(from_user_id.eq.${toUserId},to_user_id.eq.${fromUserId})`)
      .maybeSingle();

    if (existing) {
      await this.updateConnection(existing.id, status);
    } else {
      await this.addConnection(fromUserId, toUserId);
      const { data: newConnection } = await supabase
        .from('connections')
        .select('*')
        .eq('from_user_id', fromUserId)
        .eq('to_user_id', toUserId)
        .maybeSingle();

      if (newConnection) {
        await this.updateConnection(newConnection.id, status);
      }
    }
  }

  async transferFunds(fromUserId: string, toUserId: string, amount: number, description: string): Promise<{ success: boolean; message: string }> {
    const { data: fromUser } = await supabase
      .from('users')
      .select('wallet_balance, is_frozen, frozen_until')
      .eq('id', fromUserId)
      .maybeSingle();

    if (!fromUser) return { success: false, message: 'User not found.' };

    const isFrozen = fromUser.is_frozen && (!fromUser.frozen_until || fromUser.frozen_until > Date.now());
    if (isFrozen) return { success: false, message: 'Your account is frozen.' };
    if (fromUser.wallet_balance < amount) return { success: false, message: 'Insufficient funds.' };

    const { data: toUser } = await supabase
      .from('users')
      .select('wallet_balance')
      .eq('id', toUserId)
      .maybeSingle();

    if (!toUser) return { success: false, message: 'Recipient not found.' };

    const { error: updateError } = await supabase
      .from('users')
      .update([
        { wallet_balance: fromUser.wallet_balance - amount },
        { wallet_balance: toUser.wallet_balance + amount },
      ]);

    if (updateError) return { success: false, message: 'Database error.' };

    const { error: txError } = await supabase
      .from('transactions')
      .insert([{
        type: 'transfer',
        from_user_id: fromUserId,
        to_user_id: toUserId,
        amount,
        description,
        timestamp: Date.now(),
      }]);

    if (txError) return { success: false, message: 'Database error.' };
    return { success: true, message: 'Transfer successful!' };
  }

  async adminGrantFunds(toUserId: string, amount: number, description: string): Promise<{ success: boolean; message: string }> {
    const { data: toUser } = await supabase
      .from('users')
      .select('wallet_balance')
      .eq('id', toUserId)
      .maybeSingle();

    if (!toUser) return { success: false, message: 'User not found.' };

    const { error: updateError } = await supabase
      .from('users')
      .update({ wallet_balance: toUser.wallet_balance + amount })
      .eq('id', toUserId);

    if (updateError) return { success: false, message: 'Database error.' };

    const { error: txError } = await supabase
      .from('transactions')
      .insert([{
        type: 'admin_grant',
        from_user_id: 'admin-grant',
        to_user_id: toUserId,
        amount,
        description,
        timestamp: Date.now(),
      }]);

    if (txError) return { success: false, message: 'Database error.' };
    return { success: true, message: 'Funds granted.' };
  }

  async purchaseVerification(userId: string, cost: number, description: string, verification: Verification): Promise<{ success: boolean; message: string }> {
    const { data: user } = await supabase
      .from('users')
      .select('wallet_balance, verification_status, verification_badge_type, verification_expires_at')
      .eq('id', userId)
      .maybeSingle();

    if (!user) return { success: false, message: 'User not found.' };
    if (user.wallet_balance < cost) return { success: false, message: 'Insufficient funds.' };

    if (user.verification_status === 'approved' && !user.verification_expires_at && user.verification_badge_type === verification.badgeType) {
      return { success: false, message: 'You already own this permanent badge.' };
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({
        wallet_balance: user.wallet_balance - cost,
        verification_status: verification.status,
        verification_badge_type: verification.badgeType,
        verification_expires_at: verification.expiresAt,
      })
      .eq('id', userId);

    if (updateError) return { success: false, message: 'Database error.' };

    const { error: txError } = await supabase
      .from('transactions')
      .insert([{
        type: 'purchase',
        from_user_id: userId,
        to_user_id: 'marketplace',
        amount: cost,
        description,
        timestamp: Date.now(),
      }]);

    if (txError) return { success: false, message: 'Database error.' };
    return { success: true, message: 'Purchase successful!' };
  }

  async purchaseCosmetic(userId: string, item: { type: 'border' | 'nameColor'; id: string; price: number; name: string }): Promise<{ success: boolean; message: string }> {
    const { data: user } = await supabase
      .from('users')
      .select('wallet_balance, borders, name_colors')
      .eq('id', userId)
      .maybeSingle();

    if (!user) return { success: false, message: 'User not found.' };
    if (user.wallet_balance < item.price) return { success: false, message: 'Insufficient funds.' };

    const inventoryList = item.type === 'border' ? (user.borders || []) : (user.name_colors || []);
    if (inventoryList.includes(item.id)) {
      return { success: false, message: 'You already own this item.' };
    }

    inventoryList.push(item.id);
    const updateData: any = {
      wallet_balance: user.wallet_balance - item.price,
    };
    if (item.type === 'border') {
      updateData.borders = inventoryList;
    } else {
      updateData.name_colors = inventoryList;
    }

    const { error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId);

    if (updateError) return { success: false, message: 'Database error.' };

    const { error: txError } = await supabase
      .from('transactions')
      .insert([{
        type: 'purchase',
        from_user_id: userId,
        to_user_id: 'marketplace',
        amount: item.price,
        description: `Purchased cosmetic: ${item.name}`,
        timestamp: Date.now(),
      }]);

    if (txError) return { success: false, message: 'Database error.' };
    return { success: true, message: `${item.name} purchased!` };
  }

  async equipCustomization(userId: string, type: 'border' | 'nameColor', itemId: string | undefined): Promise<void> {
    const fieldName = type === 'border' ? 'profile_border_id' : 'name_color_id';
    const { error } = await supabase
      .from('users')
      .update({ [fieldName]: itemId })
      .eq('id', userId);

    if (error) throw error;
  }

  async adminUpdateUserFreezeStatus(userId: string, isFrozen: boolean, frozenUntil?: number): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update({
        is_frozen: isFrozen,
        frozen_until: isFrozen ? frozenUntil : null,
      })
      .eq('id', userId);

    if (error) throw error;
  }

  async addReport(reporterId: string, reportedUserId: string, reason: string, chatId?: string): Promise<Report> {
    const newReport = {
      reporter_id: reporterId,
      reported_user_id: reportedUserId,
      reason,
      timestamp: Date.now(),
      status: 'pending',
      chat_id_at_time_of_report: chatId,
    };

    const { data, error } = await supabase
      .from('reports')
      .insert([newReport])
      .select()
      .single();

    if (error) throw error;

    await this.addBroadcastAnnouncement('A new user report has been filed. Admins, please review in the Reports panel.', '00000000-0000-0000-0000-000000000001');

    return this.mapToReport(data);
  }

  async updateReportStatus(reportId: string, status: Report['status']): Promise<void> {
    const { error } = await supabase
      .from('reports')
      .update({ status })
      .eq('id', reportId);

    if (error) throw error;
  }

  async generatePasswordRecoveryToken(email: string): Promise<User | null> {
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (!user) return null;

    const token = Math.random().toString(36).substr(2, 6).toUpperCase();
    const expiry = Date.now() + 10 * 60 * 1000;

    const { error } = await supabase
      .from('users')
      .update({
        recovery_token: token,
        recovery_token_expiry: expiry,
      })
      .eq('id', user.id);

    if (error) throw error;
    return this.mapToUser(user);
  }

  async resetPasswordWithToken(token: string, newPassword: string): Promise<User | null> {
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('recovery_token', token)
      .maybeSingle();

    if (!user || !user.recovery_token_expiry || user.recovery_token_expiry < Date.now()) {
      return null;
    }

    const { error } = await supabase
      .from('users')
      .update({
        password: newPassword,
        recovery_token: null,
        recovery_token_expiry: null,
      })
      .eq('id', user.id);

    if (error) throw error;
    return this.mapToUser(user);
  }

  // Mappers
  private mapToUser(data: any): User {
    return {
      id: data.id,
      username: data.username,
      avatar: data.avatar,
      password: data.password,
      email: data.email,
      phone: data.phone,
      bio: data.bio,
      instagramUsername: data.instagram_username,
      online: data.online,
      isAdmin: data.is_admin,
      walletBalance: Number(data.wallet_balance) || 0,
      isFrozen: data.is_frozen,
      frozenUntil: data.frozen_until,
      verification: data.verification_status ? {
        status: data.verification_status as any,
        badgeType: data.verification_badge_type,
        expiresAt: data.verification_expires_at,
      } : { status: 'none' },
      customization: {
        profileBorderId: data.profile_border_id,
        nameColorId: data.name_color_id,
      },
      inventory: {
        borders: data.borders || [],
        nameColors: data.name_colors || [],
      },
    };
  }

  private mapToChat(data: any): Chat {
    return {
      id: data.id,
      type: data.type === 'dm' ? ChatType.DM : ChatType.GROUP,
      name: data.name,
      members: data.members || [],
      creatorId: data.creator_id,
      password: data.password,
    };
  }

  private mapToMessage(data: any): Message {
    return {
      id: data.id,
      chatId: data.chat_id,
      authorId: data.author_id,
      text: data.text,
      timestamp: data.timestamp,
      type: data.message_type as any,
    };
  }

  private mapToConnection(data: any): Connection {
    return {
      id: data.id,
      fromUserId: data.from_user_id,
      toUserId: data.to_user_id,
      status: data.status as ConnectionStatus,
      requestedAt: data.requested_at,
      updatedAt: data.updated_at,
    };
  }

  private mapToTransaction(data: any): Transaction {
    return {
      id: data.id,
      type: data.type as any,
      fromUserId: data.from_user_id,
      toUserId: data.to_user_id,
      amount: Number(data.amount) || 0,
      timestamp: data.timestamp,
      description: data.description,
    };
  }

  private mapToReport(data: any): Report {
    return {
      id: data.id,
      reporterId: data.reporter_id,
      reportedUserId: data.reported_user_id,
      reason: data.reason,
      timestamp: data.timestamp,
      status: data.status as any,
      chatIdAtTimeOfReport: data.chat_id_at_time_of_report,
    };
  }
}

export const db = new SupabaseDatabase();
