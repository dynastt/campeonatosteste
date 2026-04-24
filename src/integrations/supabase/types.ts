export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      championship_shares: {
        Row: {
          championship_id: string
          created_at: string
          id: string
          short_code: string
          token: string
          user_id: string
        }
        Insert: {
          championship_id: string
          created_at?: string
          id?: string
          short_code?: string
          token?: string
          user_id: string
        }
        Update: {
          championship_id?: string
          created_at?: string
          id?: string
          short_code?: string
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "championship_shares_championship_id_fkey"
            columns: ["championship_id"]
            isOneToOne: false
            referencedRelation: "championships"
            referencedColumns: ["id"]
          },
        ]
      }
      championships: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          game_day_names: string[] | null
          game_days: string[] | null
          id: string
          knockout_phase_dates: Json
          knockout_phases: string[] | null
          logo: string | null
          name: string
          qualifying_teams: Json | null
          sponsors: string[]
          start_date: string | null
          team_ids: string[] | null
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          game_day_names?: string[] | null
          game_days?: string[] | null
          id?: string
          knockout_phase_dates?: Json
          knockout_phases?: string[] | null
          logo?: string | null
          name: string
          qualifying_teams?: Json | null
          sponsors?: string[]
          start_date?: string | null
          team_ids?: string[] | null
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          game_day_names?: string[] | null
          game_days?: string[] | null
          id?: string
          knockout_phase_dates?: Json
          knockout_phases?: string[] | null
          logo?: string | null
          name?: string
          qualifying_teams?: Json | null
          sponsors?: string[]
          start_date?: string | null
          team_ids?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      game_days: {
        Row: {
          championship_id: string
          created_at: string
          id: string
          name: string
          team_ids: string[] | null
          user_id: string
        }
        Insert: {
          championship_id: string
          created_at?: string
          id?: string
          name: string
          team_ids?: string[] | null
          user_id: string
        }
        Update: {
          championship_id?: string
          created_at?: string
          id?: string
          name?: string
          team_ids?: string[] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_days_championship_id_fkey"
            columns: ["championship_id"]
            isOneToOne: false
            referencedRelation: "championships"
            referencedColumns: ["id"]
          },
        ]
      }
      knockout_matches: {
        Row: {
          away_goals: number | null
          away_team_id: string | null
          away_wo: boolean
          championship_id: string
          created_at: string
          home_goals: number | null
          home_team_id: string | null
          home_wo: boolean
          id: string
          match_time: string | null
          phase: string
          position: number
          user_id: string
          winner_id: string | null
        }
        Insert: {
          away_goals?: number | null
          away_team_id?: string | null
          away_wo?: boolean
          championship_id: string
          created_at?: string
          home_goals?: number | null
          home_team_id?: string | null
          home_wo?: boolean
          id?: string
          match_time?: string | null
          phase: string
          position: number
          user_id: string
          winner_id?: string | null
        }
        Update: {
          away_goals?: number | null
          away_team_id?: string | null
          away_wo?: boolean
          championship_id?: string
          created_at?: string
          home_goals?: number | null
          home_team_id?: string | null
          home_wo?: boolean
          id?: string
          match_time?: string | null
          phase?: string
          position?: number
          user_id?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knockout_matches_championship_id_fkey"
            columns: ["championship_id"]
            isOneToOne: false
            referencedRelation: "championships"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          away_goals: number | null
          away_team_id: string
          away_wo: boolean
          championship_id: string
          created_at: string
          game_day_id: string | null
          home_goals: number | null
          home_team_id: string
          home_wo: boolean
          id: string
          match_time: string | null
          played: boolean
          round: number
          user_id: string
        }
        Insert: {
          away_goals?: number | null
          away_team_id: string
          away_wo?: boolean
          championship_id: string
          created_at?: string
          game_day_id?: string | null
          home_goals?: number | null
          home_team_id: string
          home_wo?: boolean
          id?: string
          match_time?: string | null
          played?: boolean
          round: number
          user_id: string
        }
        Update: {
          away_goals?: number | null
          away_team_id?: string
          away_wo?: boolean
          championship_id?: string
          created_at?: string
          game_day_id?: string | null
          home_goals?: number | null
          home_team_id?: string
          home_wo?: boolean
          id?: string
          match_time?: string | null
          played?: boolean
          round?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_championship_id_fkey"
            columns: ["championship_id"]
            isOneToOne: false
            referencedRelation: "championships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_game_day_id_fkey"
            columns: ["game_day_id"]
            isOneToOne: false
            referencedRelation: "game_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      public_announcements: {
        Row: {
          championship_id: string | null
          created_at: string
          description: string | null
          expires_at: string | null
          id: string
          image_url: string | null
          is_global: boolean
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          championship_id?: string | null
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          is_global?: boolean
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          championship_id?: string | null
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          is_global?: boolean
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_announcements_championship_id_fkey"
            columns: ["championship_id"]
            isOneToOne: false
            referencedRelation: "championships"
            referencedColumns: ["id"]
          },
        ]
      }
      rounds: {
        Row: {
          championship_id: string
          created_at: string
          date: string | null
          game_day_id: string | null
          id: string
          name: string | null
          number: number
          user_id: string
        }
        Insert: {
          championship_id: string
          created_at?: string
          date?: string | null
          game_day_id?: string | null
          id?: string
          name?: string | null
          number: number
          user_id: string
        }
        Update: {
          championship_id?: string
          created_at?: string
          date?: string | null
          game_day_id?: string | null
          id?: string
          name?: string | null
          number?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rounds_championship_id_fkey"
            columns: ["championship_id"]
            isOneToOne: false
            referencedRelation: "championships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rounds_game_day_id_fkey"
            columns: ["game_day_id"]
            isOneToOne: false
            referencedRelation: "game_days"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          id: string
          logo: string | null
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo?: string | null
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          logo?: string | null
          name?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
