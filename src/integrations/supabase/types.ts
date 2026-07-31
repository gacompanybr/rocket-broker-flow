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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      alerts: {
        Row: {
          broker_campaign_id: string
          created_at: string
          id: string
          lida: boolean
          mensagem: string
          tipo: Database["public"]["Enums"]["alert_type"]
        }
        Insert: {
          broker_campaign_id: string
          created_at?: string
          id?: string
          lida?: boolean
          mensagem: string
          tipo: Database["public"]["Enums"]["alert_type"]
        }
        Update: {
          broker_campaign_id?: string
          created_at?: string
          id?: string
          lida?: boolean
          mensagem?: string
          tipo?: Database["public"]["Enums"]["alert_type"]
        }
        Relationships: [
          {
            foreignKeyName: "alerts_broker_campaign_id_fkey"
            columns: ["broker_campaign_id"]
            isOneToOne: false
            referencedRelation: "broker_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      broker_campaigns: {
        Row: {
          agency_match: number
          broker_deposit: number
          broker_id: string
          campaign_id: string
          created_at: string
          finished_at: string | null
          id: string
          status: Database["public"]["Enums"]["bc_status"]
          total_budget: number | null
        }
        Insert: {
          agency_match?: number
          broker_deposit?: number
          broker_id: string
          campaign_id: string
          created_at?: string
          finished_at?: string | null
          id?: string
          status?: Database["public"]["Enums"]["bc_status"]
          total_budget?: number | null
        }
        Update: {
          agency_match?: number
          broker_deposit?: number
          broker_id?: string
          campaign_id?: string
          created_at?: string
          finished_at?: string | null
          id?: string
          status?: Database["public"]["Enums"]["bc_status"]
          total_budget?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "broker_campaigns_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broker_campaigns_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      brokers: {
        Row: {
          ativo: boolean
          created_at: string
          email: string | null
          id: string
          nome: string
          profile_id: string | null
          telefone: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          email?: string | null
          id?: string
          nome: string
          profile_id?: string | null
          telefone?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          profile_id?: string | null
          telefone?: string | null
        }
        Relationships: []
      }
      campaign_metrics: {
        Row: {
          campaign_id: string
          clicks: number
          coletado_em: string
          cost_per_lead: number
          cpc: number
          cpm: number
          date: string
          id: string
          impressions: number
          leads: number
          reach: number
          spend: number
        }
        Insert: {
          campaign_id: string
          clicks?: number
          coletado_em?: string
          cost_per_lead?: number
          cpc?: number
          cpm?: number
          date: string
          id?: string
          impressions?: number
          leads?: number
          reach?: number
          spend?: number
        }
        Update: {
          campaign_id?: string
          clicks?: number
          coletado_em?: string
          cost_per_lead?: number
          cpc?: number
          cpm?: number
          date?: string
          id?: string
          impressions?: number
          leads?: number
          reach?: number
          spend?: number
        }
        Relationships: [
          {
            foreignKeyName: "campaign_metrics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          criada_em: string
          daily_budget: number | null
          external_id: string
          id: string
          nome: string
          objetivo: string | null
          platform: Database["public"]["Enums"]["ad_platform"]
          status: Database["public"]["Enums"]["campaign_status"]
        }
        Insert: {
          criada_em?: string
          daily_budget?: number | null
          external_id: string
          id?: string
          nome: string
          objetivo?: string | null
          platform: Database["public"]["Enums"]["ad_platform"]
          status?: Database["public"]["Enums"]["campaign_status"]
        }
        Update: {
          criada_em?: string
          daily_budget?: number | null
          external_id?: string
          id?: string
          nome?: string
          objetivo?: string | null
          platform?: Database["public"]["Enums"]["ad_platform"]
          status?: Database["public"]["Enums"]["campaign_status"]
        }
        Relationships: []
      }
      integration_logs: {
        Row: {
          code: number | null
          created_at: string
          details: Json | null
          id: string
          level: string
          message: string
          source: string
        }
        Insert: {
          code?: number | null
          created_at?: string
          details?: Json | null
          id?: string
          level?: string
          message: string
          source: string
        }
        Update: {
          code?: number | null
          created_at?: string
          details?: Json | null
          id?: string
          level?: string
          message?: string
          source?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ativo: boolean
          created_at: string
          foto: string | null
          id: string
          nome: string
          telefone: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          foto?: string | null
          id: string
          nome?: string
          telefone?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          foto?: string | null
          id?: string
          nome?: string
          telefone?: string | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          alert_threshold: number
          gbp_location_id: string | null
          google_ads_customer_id: string | null
          id: string
          instagram_business_id: string | null
          meta_ad_account_id: string | null
          meta_page_id: string | null
          singleton: boolean
          site_url: string | null
          updated_at: string
        }
        Insert: {
          alert_threshold?: number
          gbp_location_id?: string | null
          google_ads_customer_id?: string | null
          id?: string
          instagram_business_id?: string | null
          meta_ad_account_id?: string | null
          meta_page_id?: string | null
          singleton?: boolean
          site_url?: string | null
          updated_at?: string
        }
        Update: {
          alert_threshold?: number
          gbp_location_id?: string | null
          google_ads_customer_id?: string | null
          id?: string
          instagram_business_id?: string | null
          meta_ad_account_id?: string | null
          meta_page_id?: string | null
          singleton?: boolean
          site_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      settlements: {
        Row: {
          agency_share_spent: number
          broker_campaign_id: string
          broker_share_spent: number
          calculated_at: string
          id: string
          refund_to_agency: number
          refund_to_broker: number
          total_spent: number
        }
        Insert: {
          agency_share_spent?: number
          broker_campaign_id: string
          broker_share_spent?: number
          calculated_at?: string
          id?: string
          refund_to_agency?: number
          refund_to_broker?: number
          total_spent?: number
        }
        Update: {
          agency_share_spent?: number
          broker_campaign_id?: string
          broker_share_spent?: number
          calculated_at?: string
          id?: string
          refund_to_agency?: number
          refund_to_broker?: number
          total_spent?: number
        }
        Relationships: [
          {
            foreignKeyName: "settlements_broker_campaign_id_fkey"
            columns: ["broker_campaign_id"]
            isOneToOne: false
            referencedRelation: "broker_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      site_metrics: {
        Row: {
          created_at: string
          date: string
          id: string
          page_speed_score: number
          posicao_gmb: number | null
          seo_score: number
          visitas_diarias: number
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          page_speed_score?: number
          posicao_gmb?: number | null
          seo_score?: number
          visitas_diarias?: number
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          page_speed_score?: number
          posicao_gmb?: number | null
          seo_score?: number
          visitas_diarias?: number
        }
        Relationships: []
      }
      social_metrics: {
        Row: {
          alcance_perfil: number
          compartilhamentos: number
          created_at: string
          date: string
          engajamento: number
          id: string
          seguidores: number
        }
        Insert: {
          alcance_perfil?: number
          compartilhamentos?: number
          created_at?: string
          date: string
          engajamento?: number
          id?: string
          seguidores?: number
        }
        Update: {
          alcance_perfil?: number
          compartilhamentos?: number
          created_at?: string
          date?: string
          engajamento?: number
          id?: string
          seguidores?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      my_broker_ids: { Args: never; Returns: string[] }
    }
    Enums: {
      ad_platform: "meta" | "google"
      alert_type: "near_limit" | "exhausted" | "over_budget"
      app_role: "admin" | "owner" | "broker"
      bc_status:
        | "running"
        | "near_limit"
        | "exhausted"
        | "over_budget"
        | "finished_early"
        | "completed"
      campaign_status: "active" | "paused" | "finished"
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
    Enums: {
      ad_platform: ["meta", "google"],
      alert_type: ["near_limit", "exhausted", "over_budget"],
      app_role: ["admin", "owner", "broker"],
      bc_status: [
        "running",
        "near_limit",
        "exhausted",
        "over_budget",
        "finished_early",
        "completed",
      ],
      campaign_status: ["active", "paused", "finished"],
    },
  },
} as const
