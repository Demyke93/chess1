export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      business_data: {
        Row: {
          content: Json
          created_at: string | null
          data_type: string
          id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          content?: Json
          created_at?: string | null
          data_type: string
          id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          content?: Json
          created_at?: string | null
          data_type?: string
          id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_data_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_logs: {
        Row: {
          ai_response: string | null
          created_at: string | null
          customer_number: string
          id: string
          message: string
          user_id: string | null
        }
        Insert: {
          ai_response?: string | null
          created_at?: string | null
          customer_number: string
          id?: string
          message: string
          user_id?: string | null
        }
        Update: {
          ai_response?: string | null
          created_at?: string | null
          customer_number?: string
          id?: string
          message?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      display_name: {
        Row: {
          created_at: string
          id: number
        }
        Insert: {
          created_at?: string
          id: number
        }
        Update: {
          created_at?: string
          id?: number
        }
        Relationships: []
      }
      matches: {
        Row: {
          black_player_id: string | null
          completed_at: string | null
          created_at: string | null
          id: string
          pgn: string | null
          stake_amount: number
          status: string
          time_control: number
          updated_at: string | null
          white_player_id: string
          winner_id: string | null
        }
        Insert: {
          black_player_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          pgn?: string | null
          stake_amount: number
          status: string
          time_control: number
          updated_at?: string | null
          white_player_id: string
          winner_id?: string | null
        }
        Update: {
          black_player_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          pgn?: string | null
          stake_amount?: number
          status?: string
          time_control?: number
          updated_at?: string | null
          white_player_id?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_black_player_id_fkey"
            columns: ["black_player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_white_player_id_fkey"
            columns: ["white_player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          gaming_preferences: Json | null
          id: string
          is_demo: boolean | null
          rating: number | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          gaming_preferences?: Json | null
          id?: string
          is_demo?: boolean | null
          rating?: number | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          gaming_preferences?: Json | null
          id?: string
          is_demo?: boolean | null
          rating?: number | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          auto_reply_enabled: boolean | null
          id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          auto_reply_enabled?: boolean | null
          id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          auto_reply_enabled?: boolean | null
          id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          created_at: string | null
          id: string
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          created_at?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          created_at?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          payout_details: Json | null
          reference: string | null
          status: string
          type: string
          wallet_id: string
          withdrawal_status: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          payout_details?: Json | null
          reference?: string | null
          status: string
          type: string
          wallet_id: string
          withdrawal_status?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          payout_details?: Json | null
          reference?: string | null
          status?: string
          type?: string
          wallet_id?: string
          withdrawal_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          created_at: string | null
          display_preferences: Json | null
          id: string
          language: string | null
          notification_preferences: Json | null
          privacy_settings: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_preferences?: Json | null
          id: string
          language?: string | null
          notification_preferences?: Json | null
          privacy_settings?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_preferences?: Json | null
          id?: string
          language?: string | null
          notification_preferences?: Json | null
          privacy_settings?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          business_name: string
          created_at: string | null
          id: string
          last_active: string | null
          whatsapp_number: string
        }
        Insert: {
          business_name: string
          created_at?: string | null
          id?: string
          last_active?: string | null
          whatsapp_number: string
        }
        Update: {
          business_name?: string
          created_at?: string | null
          id?: string
          last_active?: string | null
          whatsapp_number?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance: number | null
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_config: {
        Row: {
          access_token: string
          created_at: string | null
          id: string
          phone_number_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          access_token: string
          created_at?: string | null
          id?: string
          phone_number_id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          access_token?: string
          created_at?: string | null
          id?: string
          phone_number_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_config_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_or_join_match: {
        Args: {
          p_user_id: string
          p_time_control: number
          p_stake_amount: number
        }
        Returns: {
          black_player_id: string | null
          completed_at: string | null
          created_at: string | null
          id: string
          pgn: string | null
          stake_amount: number
          status: string
          time_control: number
          updated_at: string | null
          white_player_id: string
          winner_id: string | null
        }
      }
      create_transaction: {
        Args: {
          p_wallet_id: string
          p_amount: number
          p_type: string
          p_reference: string
        }
        Returns: {
          amount: number
          created_at: string | null
          id: string
          payout_details: Json | null
          reference: string | null
          status: string
          type: string
          wallet_id: string
          withdrawal_status: string | null
        }
      }
      update_transaction_status: {
        Args: { p_reference: string; p_status: string }
        Returns: undefined
      }
      update_wallet_balance: {
        Args: { p_wallet_id: string; p_amount: number }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
