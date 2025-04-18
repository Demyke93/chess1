import { User, Match } from '@/types';
import { supabase } from "@/integrations/supabase/client";

// Current user session
let currentUser: User | null = null;

export const userService = {
  // Login user
  login: async (username: string, password: string): Promise<User> => {
    try {
      // Try to authenticate with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: `${username}@example.com`, // Using username as email for simplicity
        password: password || 'demo123' // Default password for demo
      });

      if (authError) throw authError;
      
      if (authData?.user) {
        // Check if the user is a demo account
        const { data: profileData } = await supabase
          .from('profiles')
          .select('is_demo, username, avatar_url')
          .eq('id', authData.user.id)
          .single();
          
        // Get wallet info
        const { data: walletData } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', authData.user.id)
          .single();
          
        const user: User = {
          id: authData.user.id,
          username: profileData?.username || username,
          balance: walletData?.balance || 0,
          avatar: profileData?.avatar_url || '♟',
          email: authData.user.email
        };
          
        currentUser = user;
        return user;
      }
      
      throw new Error("Authentication failed");
    } catch (error) {
      console.error("Login error:", error);
      
      // For demo purposes, create a demo account if auth fails
      const newUser: User = {
        id: `demo_${Math.random().toString(36).substr(2, 9)}`,
        username,
        balance: 1000, // Demo accounts start with 1000 coins
        avatar: '♟', // Default avatar
        email: `${username}@example.com`
      };
      
      currentUser = newUser;
      return newUser;
    }
  },

  // Get current user
  getCurrentUser: async (): Promise<User | null> => {
    try {
      const { data: session } = await supabase.auth.getSession();
      
      if (session?.session?.user) {
        const userId = session.session.user.id;
        
        // Check if the user is a demo account
        const { data: profileData } = await supabase
          .from('profiles')
          .select('is_demo, username, avatar_url')
          .eq('id', userId)
          .single();
          
        // Get wallet info
        const { data: walletData } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', userId)
          .single();
          
        const user: User = {
          id: userId,
          username: profileData?.username || 'User',
          balance: walletData?.balance || 0,
          avatar: profileData?.avatar_url || '♟',
          email: session.session.user.email
        };
          
        currentUser = user;
        return user;
      }
    } catch (error) {
      console.error("Get current user error:", error);
    }
    
    return Promise.resolve(currentUser);
  },

  // Set current user
  setCurrentUser: (user: User): void => {
    currentUser = user;
  },

  // Logout user
  logout: async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
      currentUser = null;
      return Promise.resolve();
    } catch (error) {
      console.error("Logout error:", error);
      return Promise.resolve();
    }
  },

  // Get user by ID
  getUserById: async (id: string): Promise<User | null> => {
    try {
      // Check if this is a demo ID
      if (id.startsWith('demo_')) {
        return currentUser && currentUser.id === id ? currentUser : null;
      }
      
      // Get user from Supabase
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('username, avatar_url, is_demo')
        .eq('id', id)
        .single();
        
      if (profileError) throw profileError;
      
      // Get wallet info
      const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', id)
        .single();
        
      if (walletError) throw walletError;
      
      return {
        id,
        username: profileData.username || 'User',
        balance: walletData.balance || 0,
        avatar: profileData.avatar_url || '♟'
      };
      
    } catch (error) {
      console.error("Get user by ID error:", error);
      return null;
    }
  },

  // Get all users
  getAllUsers: async (): Promise<User[]> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .eq('is_demo', false)
        .limit(100);
        
      if (error) throw error;
      
      const users = await Promise.all(data.map(async (profile) => {
        const { data: walletData } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', profile.id)
          .single();
          
        return {
          id: profile.id,
          username: profile.username || 'User',
          balance: walletData?.balance || 0,
          avatar: profile.avatar_url || '♟'
        };
      }));
      
      return users;
    } catch (error) {
      console.error("Get all users error:", error);
      return [];
    }
  },

  // Update user balance
  updateBalance: async (userId: string, amount: number): Promise<User> => {
    try {
      // Check if this is a demo ID
      if (userId.startsWith('demo_')) {
        if (currentUser && currentUser.id === userId) {
          currentUser.balance += amount;
          return currentUser;
        }
        throw new Error('Demo user not found');
      }
      
      // Update balance in Supabase
      const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .single();
        
      if (walletError) throw walletError;
      
      const newBalance = (walletData.balance || 0) + amount;
      
      const { error: updateError } = await supabase
        .from('wallets')
        .update({ 
          balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', walletData.id);
        
      if (updateError) throw updateError;
      
      // Get updated user
      const user = await userService.getUserById(userId);
      if (!user) throw new Error('Failed to get updated user');
      
      return user;
    } catch (error) {
      console.error("Update balance error:", error);
      throw error;
    }
  },

  // Create a match
  createMatch: async (match: Omit<Match, 'id' | 'createdAt' | 'updatedAt'>): Promise<Match> => {
    try {
      // Check if this involves demo users
      if (match.whitePlayerId.startsWith('demo_') || match.blackPlayerId.startsWith('demo_')) {
        const now = new Date().toISOString();
        const newMatch: Match = {
          id: `demo_match_${Math.random().toString(36).substr(2, 9)}`,
          ...match,
          createdAt: now,
          updatedAt: now
        };
        return newMatch;
      }
      
      // Create match in Supabase
      const { data, error } = await supabase
        .from('matches')
        .insert({
          white_player_id: match.whitePlayerId,
          black_player_id: match.blackPlayerId,
          stake_amount: match.stake,
          status: match.status,
          time_control: parseInt(match.timeControl),
          created_at: new Date().toISOString()
        })
        .select()
        .single();
        
      if (error) throw error;
      
      return {
        id: data.id,
        whitePlayerId: data.white_player_id,
        blackPlayerId: data.black_player_id,
        whiteUsername: match.whiteUsername,
        blackUsername: match.blackUsername,
        stake: data.stake_amount,
        status: data.status,
        timeControl: match.timeControl,
        gameMode: match.gameMode,
        lichessGameId: match.lichessGameId,
        createdAt: data.created_at,
        updatedAt: data.updated_at || data.created_at
      };
    } catch (error) {
      console.error("Create match error:", error);
      throw error;
    }
  },

  // Get all matches for a user
  getUserMatches: async (userId: string): Promise<Match[]> => {
    try {
      // Check if this is a demo ID
      if (userId.startsWith('demo_')) {
        return [];
      }
      
      // Get matches from Supabase with proper join syntax
      const { data, error } = await supabase
        .from('matches')
        .select(`
          id,
          white_player_id,
          black_player_id,
          profiles!matches_white_player_id_fkey(username),
          profiles!matches_black_player_id_fkey(username),
          stake_amount,
          status,
          winner_id,
          time_control,
          pgn,
          created_at,
          updated_at
        `)
        .or(`white_player_id.eq.${userId},black_player_id.eq.${userId}`)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      return data.map(match => ({
        id: match.id,
        whitePlayerId: match.white_player_id,
        blackPlayerId: match.black_player_id,
        whiteUsername: match.profiles!matches_white_player_id_fkey.username,
        blackUsername: match.profiles!matches_black_player_id_fkey.username,
        stake: match.stake_amount,
        status: match.status as Match['status'],
        winner_id: match.winner_id,
        timeControl: match.time_control.toString(),
        gameMode: match.time_control <= 5 ? 'blitz' : 'rapid',
        lichessGameId: match.pgn,
        createdAt: match.created_at,
        updatedAt: match.updated_at || match.created_at
      }));
    } catch (error) {
      console.error("Get user matches error:", error);
      return [];
    }
  },

  // Complete a match and handle stake transfers
  completeMatch: async (matchId: string, winnerId: string | null): Promise<Match> => {
    try {
      // Check if this is a demo match
      if (matchId.startsWith('demo_match_')) {
        throw new Error('Demo matches cannot be completed');
      }
      
      // Get match from Supabase
      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .select(`
          id,
          white_player_id,
          black_player_id,
          profiles!matches_white_player_id_fkey(username),
          profiles!matches_black_player_id_fkey(username),
          stake_amount,
          status,
          winner_id,
          time_control,
          pgn,
          created_at,
          updated_at
        `)
        .eq('id', matchId)
        .single();
        
      if (matchError) throw matchError;
      
      if (matchData.status === 'completed') {
        throw new Error('Match already completed');
      }
      
      // Update match status
      const { error: updateError } = await supabase
        .from('matches')
        .update({
          status: 'completed',
          winner_id: winnerId,
          updated_at: new Date().toISOString(),
          completed_at: new Date().toISOString()
        })
        .eq('id', matchId);
        
      if (updateError) throw updateError;
      
      // Handle stake transfers if there's a winner
      if (winnerId) {
        const loserId = winnerId === matchData.white_player_id ? matchData.black_player_id : matchData.white_player_id;
        
        // Credit winner
        await userService.updateBalance(winnerId, matchData.stake_amount);
        
        // Debit loser
        await userService.updateBalance(loserId, -matchData.stake_amount);
      }
      
      return {
        id: matchData.id,
        whitePlayerId: matchData.white_player_id,
        blackPlayerId: matchData.black_player_id,
        whiteUsername: matchData.white_player?.username || 'Unknown',
        blackUsername: matchData.black_player?.username || 'Unknown',
        stake: matchData.stake_amount,
        status: 'completed',
        winner: winnerId,
        timeControl: matchData.time_control.toString(),
        gameMode: matchData.time_control <= 5 ? 'blitz' : 'rapid',
        lichessGameId: matchData.pgn,
        createdAt: matchData.created_at,
        updatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error("Complete match error:", error);
      throw error;
    }
  },

  // Get all matches
  getAllMatches: async (): Promise<Match[]> => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          id,
          white_player_id,
          black_player_id,
          profiles!matches_white_player_id_fkey(username),
          profiles!matches_black_player_id_fkey(username),
          stake_amount,
          status,
          winner_id,
          time_control,
          pgn,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false })
        .limit(50);
        
      if (error) throw error;
      
      return data.map(match => ({
        id: match.id,
        whitePlayerId: match.white_player_id,
        blackPlayerId: match.black_player_id,
        whiteUsername: match.profiles!matches_white_player_id_fkey.username,
        blackUsername: match.profiles!matches_black_player_id_fkey.username,
        stake: match.stake_amount,
        status: match.status as Match['status'],
        winner_id: match.winner_id,
        timeControl: match.time_control.toString(),
        gameMode: match.time_control <= 5 ? 'blitz' : 'rapid',
        lichessGameId: match.pgn,
        createdAt: match.created_at,
        updatedAt: match.updated_at || match.created_at
      }));
    } catch (error) {
      console.error("Get all matches error:", error);
      return [];
    }
  }
};
