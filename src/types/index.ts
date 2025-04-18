export interface User {
  id: string;
  username: string;
  balance: number;
  avatar?: string;
  email?: string;
}

export interface Match {
  id: string;
  whitePlayerId: string;
  blackPlayerId: string;
  whiteUsername: string;
  blackUsername: string;
  stake: number;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  winner?: string;
  timeControl: string;
  gameMode: string;
  lichessGameId?: string;
  createdAt: string;
  updatedAt: string;
  fee_accepted?: boolean;
}

export interface StakeSettings {
  amount: number;
  timeControl: string;
  gameMode: string;
}

export interface LichessUserProfile {
  id: string;
  username: string;
  perfs: {
    [key: string]: {
      games: number;
      rating: number;
      rd: number;
      prog: number;
    };
  };
  createdAt: number;
  profile?: {
    country?: string;
    bio?: string;
    firstName?: string;
    lastName?: string;
  };
}

export type GameResult = 'win' | 'loss' | 'draw' | 'ongoing';
