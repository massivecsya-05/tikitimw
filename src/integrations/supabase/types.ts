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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_activity_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          details: Json
          id: string
          target_id: string | null
          target_label: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          target_id?: string | null
          target_label?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          target_id?: string | null
          target_label?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      events: {
        Row: {
          banner_url: string | null
          category: Database["public"]["Enums"]["event_category"]
          city: string
          created_at: string
          description: string | null
          ends_at: string | null
          id: string
          starts_at: string
          status: Database["public"]["Enums"]["event_status"]
          title: string
          updated_at: string
          vendor_id: string | null
          venue: string
        }
        Insert: {
          banner_url?: string | null
          category?: Database["public"]["Enums"]["event_category"]
          city: string
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          starts_at: string
          status?: Database["public"]["Enums"]["event_status"]
          title: string
          updated_at?: string
          vendor_id?: string | null
          venue: string
        }
        Update: {
          banner_url?: string | null
          category?: Database["public"]["Enums"]["event_category"]
          city?: string
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["event_status"]
          title?: string
          updated_at?: string
          vendor_id?: string | null
          venue?: string
        }
        Relationships: []
      }
      order_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          order_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          order_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_audit_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          checked_in: boolean
          checked_in_at: string | null
          created_at: string
          event_id: string | null
          id: string
          order_id: string
          qr_code: string
          quantity: number
          tier_id: string
          unit_price_mwk: number
        }
        Insert: {
          checked_in?: boolean
          checked_in_at?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          order_id: string
          qr_code?: string
          quantity: number
          tier_id: string
          unit_price_mwk: number
        }
        Update: {
          checked_in?: boolean
          checked_in_at?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          order_id?: string
          qr_code?: string
          quantity?: number
          tier_id?: string
          unit_price_mwk?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "ticket_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_email: string | null
          customer_id: string
          customer_name: string | null
          customer_phone: string | null
          email_sent_at: string | null
          id: string
          paid_at: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          payment_provider: string | null
          payment_ref: string | null
          status: Database["public"]["Enums"]["order_status"]
          total_mwk: number
        }
        Insert: {
          created_at?: string
          customer_email?: string | null
          customer_id: string
          customer_name?: string | null
          customer_phone?: string | null
          email_sent_at?: string | null
          id?: string
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_provider?: string | null
          payment_ref?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_mwk: number
        }
        Update: {
          created_at?: string
          customer_email?: string | null
          customer_id?: string
          customer_name?: string | null
          customer_phone?: string | null
          email_sent_at?: string | null
          id?: string
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_provider?: string | null
          payment_ref?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_mwk?: number
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          fee_flat_mwk: number
          fee_percent: number
          id: boolean
          updated_at: string
        }
        Insert: {
          fee_flat_mwk?: number
          fee_percent?: number
          id?: boolean
          updated_at?: string
        }
        Update: {
          fee_flat_mwk?: number
          fee_percent?: number
          id?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      scan_logs: {
        Row: {
          event_id: string | null
          id: string
          raw_code: string | null
          result: string
          scanned_at: string
          scanned_by: string | null
          ticket_id: string | null
        }
        Insert: {
          event_id?: string | null
          id?: string
          raw_code?: string | null
          result: string
          scanned_at?: string
          scanned_by?: string | null
          ticket_id?: string | null
        }
        Update: {
          event_id?: string | null
          id?: string
          raw_code?: string | null
          result?: string
          scanned_at?: string
          scanned_by?: string | null
          ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scan_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_logs_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_tiers: {
        Row: {
          created_at: string
          description: string | null
          event_id: string
          id: string
          is_active: boolean
          name: string
          price_mwk: number
          quantity: number
          quantity_sold: number
          sale_end: string | null
          sale_start: string | null
          sold: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_id: string
          id?: string
          is_active?: boolean
          name: string
          price_mwk: number
          quantity: number
          quantity_sold?: number
          sale_end?: string | null
          sale_start?: string | null
          sold?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          event_id?: string
          id?: string
          is_active?: boolean
          name?: string
          price_mwk?: number
          quantity?: number
          quantity_sold?: number
          sale_end?: string | null
          sale_start?: string | null
          sold?: number
        }
        Relationships: [
          {
            foreignKeyName: "ticket_tiers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          buyer_email: string | null
          buyer_name: string | null
          buyer_phone: string | null
          created_at: string
          event_id: string
          id: string
          order_id: string
          qr_code: string
          status: Database["public"]["Enums"]["ticket_status"]
          tier_id: string
        }
        Insert: {
          buyer_email?: string | null
          buyer_name?: string | null
          buyer_phone?: string | null
          created_at?: string
          event_id: string
          id?: string
          order_id: string
          qr_code: string
          status?: Database["public"]["Enums"]["ticket_status"]
          tier_id: string
        }
        Update: {
          buyer_email?: string | null
          buyer_name?: string | null
          buyer_phone?: string | null
          created_at?: string
          event_id?: string
          id?: string
          order_id?: string
          qr_code?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          tier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "ticket_tiers"
            referencedColumns: ["id"]
          },
        ]
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
      vendor_applications: {
        Row: {
          address: string | null
          agreed_to_terms: boolean
          business_name: string
          business_type: string
          city: string
          contact_email: string
          contact_name: string
          contact_phone: string
          created_at: string
          description: string
          event_types: string | null
          id: string
          id_document_type: string | null
          id_number: string | null
          note: string | null
          registration_number: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          tax_id: string | null
          updated_at: string
          user_id: string
          website_or_social: string | null
        }
        Insert: {
          address?: string | null
          agreed_to_terms?: boolean
          business_name: string
          business_type: string
          city: string
          contact_email: string
          contact_name: string
          contact_phone: string
          created_at?: string
          description: string
          event_types?: string | null
          id?: string
          id_document_type?: string | null
          id_number?: string | null
          note?: string | null
          registration_number?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tax_id?: string | null
          updated_at?: string
          user_id: string
          website_or_social?: string | null
        }
        Update: {
          address?: string | null
          agreed_to_terms?: boolean
          business_name?: string
          business_type?: string
          city?: string
          contact_email?: string
          contact_name?: string
          contact_phone?: string
          created_at?: string
          description?: string
          event_types?: string | null
          id?: string
          id_document_type?: string | null
          id_number?: string | null
          note?: string | null
          registration_number?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tax_id?: string | null
          updated_at?: string
          user_id?: string
          website_or_social?: string | null
        }
        Relationships: []
      }
      vendor_payouts: {
        Row: {
          created_at: string
          fee_flat_snapshot: number
          fee_mwk: number
          fee_percent_snapshot: number
          gross_mwk: number
          id: string
          net_mwk: number
          notes: string | null
          order_id: string
          paid_at: string | null
          status: Database["public"]["Enums"]["payout_status"]
          tickets_count: number
          vendor_id: string | null
        }
        Insert: {
          created_at?: string
          fee_flat_snapshot: number
          fee_mwk: number
          fee_percent_snapshot: number
          gross_mwk: number
          id?: string
          net_mwk: number
          notes?: string | null
          order_id: string
          paid_at?: string | null
          status?: Database["public"]["Enums"]["payout_status"]
          tickets_count: number
          vendor_id?: string | null
        }
        Update: {
          created_at?: string
          fee_flat_snapshot?: number
          fee_mwk?: number
          fee_percent_snapshot?: number
          gross_mwk?: number
          id?: string
          net_mwk?: number
          notes?: string | null
          order_id?: string
          paid_at?: string | null
          status?: Database["public"]["Enums"]["payout_status"]
          tickets_count?: number
          vendor_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_in: { Args: { p_order_item_id: string }; Returns: Json }
      cleanup_past_events: { Args: never; Returns: number }
      confirm_payment: {
        Args: {
          p_order_id: string
          p_provider?: string
          p_provider_ref: string
        }
        Returns: Json
      }
      delete_event: { Args: { p_event_id: string }; Returns: undefined }
      get_home_stats: {
        Args: never
        Returns: {
          events_hosted: number
          organisers: number
          tickets_sold: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      scan_ticket: {
        Args: { p_event_id?: string; p_ticket_id: string }
        Returns: Json
      }
      vendor_owns_order: {
        Args: { _order_id: string; _vendor: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "vendor" | "customer"
      event_category:
        | "concert"
        | "sports"
        | "conference"
        | "cultural"
        | "festival"
        | "theatre"
        | "other"
      event_status: "draft" | "published" | "cancelled" | "completed"
      order_status: "pending" | "paid" | "failed" | "refunded"
      payment_method: "airtel_money" | "tnm_mpamba" | "card" | "bank_transfer"
      payout_status: "pending" | "paid" | "cancelled"
      ticket_status: "unused" | "used" | "cancelled"
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
      app_role: ["admin", "vendor", "customer"],
      event_category: [
        "concert",
        "sports",
        "conference",
        "cultural",
        "festival",
        "theatre",
        "other",
      ],
      event_status: ["draft", "published", "cancelled", "completed"],
      order_status: ["pending", "paid", "failed", "refunded"],
      payment_method: ["airtel_money", "tnm_mpamba", "card", "bank_transfer"],
      payout_status: ["pending", "paid", "cancelled"],
      ticket_status: ["unused", "used", "cancelled"],
    },
  },
} as const
