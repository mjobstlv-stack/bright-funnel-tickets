export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string;
          actor_email: string | null;
          actor_name: string | null;
          actor_role: Database["public"]["Enums"]["org_role"] | null;
          actor_user_id: string | null;
          created_at: string;
          entity: string | null;
          entity_id: string | null;
          event_id: string | null;
          id: string;
          meta: Json;
          org_id: string;
          summary: string | null;
        };
        Insert: {
          action: string;
          actor_email?: string | null;
          actor_name?: string | null;
          actor_role?: Database["public"]["Enums"]["org_role"] | null;
          actor_user_id?: string | null;
          created_at?: string;
          entity?: string | null;
          entity_id?: string | null;
          event_id?: string | null;
          id?: string;
          meta?: Json;
          org_id: string;
          summary?: string | null;
        };
        Update: {
          action?: string;
          actor_email?: string | null;
          actor_name?: string | null;
          actor_role?: Database["public"]["Enums"]["org_role"] | null;
          actor_user_id?: string | null;
          created_at?: string;
          entity?: string | null;
          entity_id?: string | null;
          event_id?: string | null;
          id?: string;
          meta?: Json;
          org_id?: string;
          summary?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "activity_log_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_generation_events: {
        Row: {
          created_at: string;
          error_message: string | null;
          event_id: string | null;
          event_type: string;
          has_brand_book: boolean;
          has_facebook: boolean;
          has_instagram: boolean;
          has_logo: boolean;
          has_website: boolean;
          id: string;
          language: string;
          prompt_length: number;
          succeeded: boolean;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          error_message?: string | null;
          event_id?: string | null;
          event_type: string;
          has_brand_book?: boolean;
          has_facebook?: boolean;
          has_instagram?: boolean;
          has_logo?: boolean;
          has_website?: boolean;
          id?: string;
          language: string;
          prompt_length?: number;
          succeeded?: boolean;
          user_id: string;
        };
        Update: {
          created_at?: string;
          error_message?: string | null;
          event_id?: string | null;
          event_type?: string;
          has_brand_book?: boolean;
          has_facebook?: boolean;
          has_instagram?: boolean;
          has_logo?: boolean;
          has_website?: boolean;
          id?: string;
          language?: string;
          prompt_length?: number;
          succeeded?: boolean;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_generation_events_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      dining_areas: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
          org_id: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          org_id: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          org_id?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "dining_areas_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      dining_tables: {
        Row: {
          area_id: string | null;
          created_at: string;
          id: string;
          is_active: boolean;
          max_seats: number;
          min_seats: number;
          name: string;
          org_id: string;
          seats: number;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          area_id?: string | null;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          max_seats?: number;
          min_seats?: number;
          name: string;
          org_id: string;
          seats?: number;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          area_id?: string | null;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          max_seats?: number;
          min_seats?: number;
          name?: string;
          org_id?: string;
          seats?: number;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "dining_tables_area_id_fkey";
            columns: ["area_id"];
            isOneToOne: false;
            referencedRelation: "dining_areas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dining_tables_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      event_expenses: {
        Row: {
          amount: number;
          category: string;
          created_at: string;
          event_id: string;
          id: string;
          label: string;
          note: string | null;
          updated_at: string;
        };
        Insert: {
          amount?: number;
          category?: string;
          created_at?: string;
          event_id: string;
          id?: string;
          label: string;
          note?: string | null;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          category?: string;
          created_at?: string;
          event_id?: string;
          id?: string;
          label?: string;
          note?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "event_expenses_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      event_inventory: {
        Row: {
          created_at: string;
          current_qty: number;
          event_id: string;
          id: string;
          item_id: string;
          opening_qty: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          current_qty?: number;
          event_id: string;
          id?: string;
          item_id: string;
          opening_qty?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          current_qty?: number;
          event_id?: string;
          id?: string;
          item_id?: string;
          opening_qty?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "event_inventory_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_inventory_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "inventory_items";
            referencedColumns: ["id"];
          },
        ];
      };
      event_staff: {
        Row: {
          approval_status: string;
          created_at: string;
          decided_at: string | null;
          event_id: string;
          gcal_event_id: string | null;
          hourly_rate: number;
          id: string;
          name: string;
          notes: string | null;
          phone: string | null;
          role: string;
          shift_end: string | null;
          shift_start: string | null;
          submitted_at: string | null;
          updated_at: string;
        };
        Insert: {
          approval_status?: string;
          created_at?: string;
          decided_at?: string | null;
          event_id: string;
          gcal_event_id?: string | null;
          hourly_rate?: number;
          id?: string;
          name: string;
          notes?: string | null;
          phone?: string | null;
          role?: string;
          shift_end?: string | null;
          shift_start?: string | null;
          submitted_at?: string | null;
          updated_at?: string;
        };
        Update: {
          approval_status?: string;
          created_at?: string;
          decided_at?: string | null;
          event_id?: string;
          gcal_event_id?: string | null;
          hourly_rate?: number;
          id?: string;
          name?: string;
          notes?: string | null;
          phone?: string | null;
          role?: string;
          shift_end?: string | null;
          shift_start?: string | null;
          submitted_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "event_staff_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      events: {
        Row: {
          approval_criteria: string | null;
          bg_color: string | null;
          booking_deposit_enabled: boolean;
          booking_deposit_per_guest: number;
          booking_slug: string | null;
          circle_logo_url: string | null;
          cover_url: string | null;
          cover_video_url: string | null;
          created_at: string;
          currency: string;
          day_hours: Json;
          description: string | null;
          end_at: string | null;
          event_type: string;
          faq: Json;
          gallery: Json;
          highlights: Json;
          id: string;
          includes: Json;
          inventory_token: string;
          location_info: Json;
          logo_layout: Json | null;
          logo_url: string | null;
          meeting_event_id: string | null;
          meeting_provider: string | null;
          name: string;
          online_url: string | null;
          org_id: string;
          require_facebook: boolean;
          require_instagram: boolean;
          requires_approval: boolean;
          rules: Json;
          sale_mode: string;
          schedule: Json;
          sections: Json;
          shift_manager_email: string | null;
          slug: string;
          staff_token: string;
          start_at: string | null;
          status: string;
          tagline: string | null;
          template: string;
          text_color: string | null;
          updated_at: string;
          venue_address: string | null;
          venue_name: string | null;
          video_url: string | null;
          visual_criteria: string | null;
        };
        Insert: {
          approval_criteria?: string | null;
          bg_color?: string | null;
          booking_deposit_enabled?: boolean;
          booking_deposit_per_guest?: number;
          booking_slug?: string | null;
          circle_logo_url?: string | null;
          cover_url?: string | null;
          cover_video_url?: string | null;
          created_at?: string;
          currency?: string;
          day_hours?: Json;
          description?: string | null;
          end_at?: string | null;
          event_type?: string;
          faq?: Json;
          gallery?: Json;
          highlights?: Json;
          id?: string;
          includes?: Json;
          inventory_token?: string;
          location_info?: Json;
          logo_layout?: Json | null;
          logo_url?: string | null;
          meeting_event_id?: string | null;
          meeting_provider?: string | null;
          name: string;
          online_url?: string | null;
          org_id: string;
          require_facebook?: boolean;
          require_instagram?: boolean;
          requires_approval?: boolean;
          rules?: Json;
          sale_mode?: string;
          schedule?: Json;
          sections?: Json;
          shift_manager_email?: string | null;
          slug: string;
          staff_token?: string;
          start_at?: string | null;
          status?: string;
          tagline?: string | null;
          template?: string;
          text_color?: string | null;
          updated_at?: string;
          venue_address?: string | null;
          venue_name?: string | null;
          video_url?: string | null;
          visual_criteria?: string | null;
        };
        Update: {
          approval_criteria?: string | null;
          bg_color?: string | null;
          booking_deposit_enabled?: boolean;
          booking_deposit_per_guest?: number;
          booking_slug?: string | null;
          circle_logo_url?: string | null;
          cover_url?: string | null;
          cover_video_url?: string | null;
          created_at?: string;
          currency?: string;
          day_hours?: Json;
          description?: string | null;
          end_at?: string | null;
          event_type?: string;
          faq?: Json;
          gallery?: Json;
          highlights?: Json;
          id?: string;
          includes?: Json;
          inventory_token?: string;
          location_info?: Json;
          logo_layout?: Json | null;
          logo_url?: string | null;
          meeting_event_id?: string | null;
          meeting_provider?: string | null;
          name?: string;
          online_url?: string | null;
          org_id?: string;
          require_facebook?: boolean;
          require_instagram?: boolean;
          requires_approval?: boolean;
          rules?: Json;
          sale_mode?: string;
          schedule?: Json;
          sections?: Json;
          shift_manager_email?: string | null;
          slug?: string;
          staff_token?: string;
          start_at?: string | null;
          status?: string;
          tagline?: string | null;
          template?: string;
          text_color?: string | null;
          updated_at?: string;
          venue_address?: string | null;
          venue_name?: string | null;
          video_url?: string | null;
          visual_criteria?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "events_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      inventory_items: {
        Row: {
          category: string;
          created_at: string;
          id: string;
          is_active: boolean;
          min_threshold: number;
          name: string;
          org_id: string;
          supplier_id: string | null;
          unit: string;
          unit_cost: number;
          updated_at: string;
        };
        Insert: {
          category?: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          min_threshold?: number;
          name: string;
          org_id: string;
          supplier_id?: string | null;
          unit?: string;
          unit_cost?: number;
          updated_at?: string;
        };
        Update: {
          category?: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          min_threshold?: number;
          name?: string;
          org_id?: string;
          supplier_id?: string | null;
          unit?: string;
          unit_cost?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_items_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_items_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          },
        ];
      };
      inventory_movements: {
        Row: {
          actor_name: string | null;
          actor_user_id: string | null;
          created_at: string;
          delta: number;
          event_id: string;
          id: string;
          item_id: string;
          new_qty: number | null;
          reason: string;
        };
        Insert: {
          actor_name?: string | null;
          actor_user_id?: string | null;
          created_at?: string;
          delta: number;
          event_id: string;
          id?: string;
          item_id: string;
          new_qty?: number | null;
          reason?: string;
        };
        Update: {
          actor_name?: string | null;
          actor_user_id?: string | null;
          created_at?: string;
          delta?: number;
          event_id?: string;
          id?: string;
          item_id?: string;
          new_qty?: number | null;
          reason?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_movements_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_movements_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "inventory_items";
            referencedColumns: ["id"];
          },
        ];
      };
      meta_campaigns: {
        Row: {
          body_text: string | null;
          clicks: number | null;
          created_at: string;
          cta: string | null;
          daily_budget_cents: number | null;
          destination_url: string | null;
          end_at: string | null;
          event_id: string;
          headline: string | null;
          id: string;
          image_url: string | null;
          impressions: number | null;
          last_synced_at: string | null;
          meta_ad_id: string | null;
          meta_adset_id: string | null;
          meta_campaign_id: string | null;
          meta_creative_id: string | null;
          name: string;
          objective: string | null;
          org_id: string;
          spend_cents: number | null;
          start_at: string | null;
          status: string | null;
          ticket_type_id: string | null;
          updated_at: string;
        };
        Insert: {
          body_text?: string | null;
          clicks?: number | null;
          created_at?: string;
          cta?: string | null;
          daily_budget_cents?: number | null;
          destination_url?: string | null;
          end_at?: string | null;
          event_id: string;
          headline?: string | null;
          id?: string;
          image_url?: string | null;
          impressions?: number | null;
          last_synced_at?: string | null;
          meta_ad_id?: string | null;
          meta_adset_id?: string | null;
          meta_campaign_id?: string | null;
          meta_creative_id?: string | null;
          name: string;
          objective?: string | null;
          org_id: string;
          spend_cents?: number | null;
          start_at?: string | null;
          status?: string | null;
          ticket_type_id?: string | null;
          updated_at?: string;
        };
        Update: {
          body_text?: string | null;
          clicks?: number | null;
          created_at?: string;
          cta?: string | null;
          daily_budget_cents?: number | null;
          destination_url?: string | null;
          end_at?: string | null;
          event_id?: string;
          headline?: string | null;
          id?: string;
          image_url?: string | null;
          impressions?: number | null;
          last_synced_at?: string | null;
          meta_ad_id?: string | null;
          meta_adset_id?: string | null;
          meta_campaign_id?: string | null;
          meta_creative_id?: string | null;
          name?: string;
          objective?: string | null;
          org_id?: string;
          spend_cents?: number | null;
          start_at?: string | null;
          status?: string | null;
          ticket_type_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "meta_campaigns_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meta_campaigns_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "meta_campaigns_ticket_type_id_fkey";
            columns: ["ticket_type_id"];
            isOneToOne: false;
            referencedRelation: "ticket_types";
            referencedColumns: ["id"];
          },
        ];
      };
      meta_connections: {
        Row: {
          ad_account_currency: string | null;
          ad_account_id: string | null;
          ad_account_name: string | null;
          created_at: string;
          expires_at: string | null;
          granted_scopes: string[] | null;
          meta_user_id: string | null;
          org_id: string;
          page_id: string | null;
          page_name: string | null;
          pixel_id: string | null;
          pixel_name: string | null;
          updated_at: string;
          user_access_token: string;
        };
        Insert: {
          ad_account_currency?: string | null;
          ad_account_id?: string | null;
          ad_account_name?: string | null;
          created_at?: string;
          expires_at?: string | null;
          granted_scopes?: string[] | null;
          meta_user_id?: string | null;
          org_id: string;
          page_id?: string | null;
          page_name?: string | null;
          pixel_id?: string | null;
          pixel_name?: string | null;
          updated_at?: string;
          user_access_token: string;
        };
        Update: {
          ad_account_currency?: string | null;
          ad_account_id?: string | null;
          ad_account_name?: string | null;
          created_at?: string;
          expires_at?: string | null;
          granted_scopes?: string[] | null;
          meta_user_id?: string | null;
          org_id?: string;
          page_id?: string | null;
          page_name?: string | null;
          pixel_id?: string | null;
          pixel_name?: string | null;
          updated_at?: string;
          user_access_token?: string;
        };
        Relationships: [
          {
            foreignKeyName: "meta_connections_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: true;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      meta_insights_daily: {
        Row: {
          campaign_id: string;
          clicks: number | null;
          created_at: string;
          date: string;
          impressions: number | null;
          spend_cents: number | null;
        };
        Insert: {
          campaign_id: string;
          clicks?: number | null;
          created_at?: string;
          date: string;
          impressions?: number | null;
          spend_cents?: number | null;
        };
        Update: {
          campaign_id?: string;
          clicks?: number | null;
          created_at?: string;
          date?: string;
          impressions?: number | null;
          spend_cents?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "meta_insights_daily_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "meta_campaigns";
            referencedColumns: ["id"];
          },
        ];
      };
      order_items: {
        Row: {
          created_at: string;
          id: string;
          order_id: string;
          quantity: number;
          ticket_type_id: string;
          unit_price: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          order_id: string;
          quantity: number;
          ticket_type_id: string;
          unit_price: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          order_id?: string;
          quantity?: number;
          ticket_type_id?: string;
          unit_price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_ticket_type_id_fkey";
            columns: ["ticket_type_id"];
            isOneToOne: false;
            referencedRelation: "ticket_types";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          access_token: string;
          buyer_email: string;
          buyer_name: string;
          buyer_phone: string | null;
          created_at: string;
          currency: string;
          event_id: string;
          fbclid: string | null;
          fees: number;
          id: string;
          notes: string | null;
          order_number: string;
          paid_at: string | null;
          payment_method: string | null;
          payment_ref: string | null;
          status: string;
          subtotal: number;
          total: number;
          updated_at: string;
          utm_campaign: string | null;
          utm_content: string | null;
          utm_medium: string | null;
          utm_source: string | null;
          utm_term: string | null;
        };
        Insert: {
          access_token?: string;
          buyer_email: string;
          buyer_name: string;
          buyer_phone?: string | null;
          created_at?: string;
          currency?: string;
          event_id: string;
          fbclid?: string | null;
          fees?: number;
          id?: string;
          notes?: string | null;
          order_number?: string;
          paid_at?: string | null;
          payment_method?: string | null;
          payment_ref?: string | null;
          status?: string;
          subtotal?: number;
          total?: number;
          updated_at?: string;
          utm_campaign?: string | null;
          utm_content?: string | null;
          utm_medium?: string | null;
          utm_source?: string | null;
          utm_term?: string | null;
        };
        Update: {
          access_token?: string;
          buyer_email?: string;
          buyer_name?: string;
          buyer_phone?: string | null;
          created_at?: string;
          currency?: string;
          event_id?: string;
          fbclid?: string | null;
          fees?: number;
          id?: string;
          notes?: string | null;
          order_number?: string;
          paid_at?: string | null;
          payment_method?: string | null;
          payment_ref?: string | null;
          status?: string;
          subtotal?: number;
          total?: number;
          updated_at?: string;
          utm_campaign?: string | null;
          utm_content?: string | null;
          utm_medium?: string | null;
          utm_source?: string | null;
          utm_term?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "orders_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      org_invites: {
        Row: {
          accepted_at: string | null;
          accepted_by: string | null;
          created_at: string;
          display_name: string | null;
          email: string;
          id: string;
          invited_by: string | null;
          last_sent_at: string | null;
          mail_status: string;
          opened_at: string | null;
          org_id: string;
          role: Database["public"]["Enums"]["org_role"];
          send_count: number;
        };
        Insert: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string;
          display_name?: string | null;
          email: string;
          id?: string;
          invited_by?: string | null;
          last_sent_at?: string | null;
          mail_status?: string;
          opened_at?: string | null;
          org_id: string;
          role?: Database["public"]["Enums"]["org_role"];
          send_count?: number;
        };
        Update: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string;
          display_name?: string | null;
          email?: string;
          id?: string;
          invited_by?: string | null;
          last_sent_at?: string | null;
          mail_status?: string;
          opened_at?: string | null;
          org_id?: string;
          role?: Database["public"]["Enums"]["org_role"];
          send_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: "org_invites_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      org_members: {
        Row: {
          created_at: string;
          display_name: string | null;
          email: string | null;
          id: string;
          is_active: boolean;
          org_id: string;
          role: Database["public"]["Enums"]["org_role"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          display_name?: string | null;
          email?: string | null;
          id?: string;
          is_active?: boolean;
          org_id: string;
          role?: Database["public"]["Enums"]["org_role"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          email?: string | null;
          id?: string;
          is_active?: boolean;
          org_id?: string;
          role?: Database["public"]["Enums"]["org_role"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "org_members_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      org_modules: {
        Row: {
          created_at: string;
          enabled: boolean;
          id: string;
          module: string;
          org_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          enabled?: boolean;
          id?: string;
          module: string;
          org_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          enabled?: boolean;
          id?: string;
          module?: string;
          org_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "org_modules_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      org_subscriptions: {
        Row: {
          amount: number;
          cancel_at: string | null;
          created_at: string;
          currency: string;
          current_period_end: string | null;
          id: string;
          module: string;
          notes: string | null;
          org_id: string;
          plan: string;
          provider: string | null;
          provider_customer_id: string | null;
          provider_subscription_id: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          amount?: number;
          cancel_at?: string | null;
          created_at?: string;
          currency?: string;
          current_period_end?: string | null;
          id?: string;
          module: string;
          notes?: string | null;
          org_id: string;
          plan?: string;
          provider?: string | null;
          provider_customer_id?: string | null;
          provider_subscription_id?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          cancel_at?: string | null;
          created_at?: string;
          currency?: string;
          current_period_end?: string | null;
          id?: string;
          module?: string;
          notes?: string | null;
          org_id?: string;
          plan?: string;
          provider?: string | null;
          provider_customer_id?: string | null;
          provider_subscription_id?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "org_subscriptions_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organization_payment_credentials: {
        Row: {
          created_at: string;
          organization_id: string;
          payplus_api_key: string | null;
          payplus_payment_page_uid: string | null;
          payplus_secret_key: string | null;
          payplus_terminal_uid: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          organization_id: string;
          payplus_api_key?: string | null;
          payplus_payment_page_uid?: string | null;
          payplus_secret_key?: string | null;
          payplus_terminal_uid?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          organization_id?: string;
          payplus_api_key?: string | null;
          payplus_payment_page_uid?: string | null;
          payplus_secret_key?: string | null;
          payplus_terminal_uid?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organization_payment_credentials_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: true;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organizations: {
        Row: {
          contact_email: string | null;
          contact_phone: string | null;
          created_at: string;
          custom_domain: string | null;
          description: string | null;
          id: string;
          logo_url: string | null;
          meta_pixel_id: string | null;
          name: string;
          owner_id: string;
          payplus_enabled: boolean;
          payplus_mode: string;
          slug: string;
          updated_at: string;
          website: string | null;
        };
        Insert: {
          contact_email?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          custom_domain?: string | null;
          description?: string | null;
          id?: string;
          logo_url?: string | null;
          meta_pixel_id?: string | null;
          name: string;
          owner_id: string;
          payplus_enabled?: boolean;
          payplus_mode?: string;
          slug: string;
          updated_at?: string;
          website?: string | null;
        };
        Update: {
          contact_email?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          custom_domain?: string | null;
          description?: string | null;
          id?: string;
          logo_url?: string | null;
          meta_pixel_id?: string | null;
          name?: string;
          owner_id?: string;
          payplus_enabled?: boolean;
          payplus_mode?: string;
          slug?: string;
          updated_at?: string;
          website?: string | null;
        };
        Relationships: [];
      };
      platform_admin_log: {
        Row: {
          action: string;
          actor_email: string | null;
          actor_user_id: string | null;
          created_at: string;
          id: string;
          meta: Json;
          org_id: string | null;
          summary: string | null;
          target_email: string | null;
          target_member_id: string | null;
          target_name: string | null;
          target_user_id: string | null;
        };
        Insert: {
          action: string;
          actor_email?: string | null;
          actor_user_id?: string | null;
          created_at?: string;
          id?: string;
          meta?: Json;
          org_id?: string | null;
          summary?: string | null;
          target_email?: string | null;
          target_member_id?: string | null;
          target_name?: string | null;
          target_user_id?: string | null;
        };
        Update: {
          action?: string;
          actor_email?: string | null;
          actor_user_id?: string | null;
          created_at?: string;
          id?: string;
          meta?: Json;
          org_id?: string | null;
          summary?: string | null;
          target_email?: string | null;
          target_member_id?: string | null;
          target_name?: string | null;
          target_user_id?: string | null;
        };
        Relationships: [];
      };
      platform_admins: {
        Row: {
          created_at: string;
          email: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      pos_integrations: {
        Row: {
          api_key: string;
          auto_deduct: boolean;
          created_at: string;
          event_id: string | null;
          id: string;
          is_active: boolean;
          last_error: string | null;
          last_sync_at: string | null;
          org_id: string;
          provider: string;
          updated_at: string;
          webhook_secret: string;
        };
        Insert: {
          api_key?: string;
          auto_deduct?: boolean;
          created_at?: string;
          event_id?: string | null;
          id?: string;
          is_active?: boolean;
          last_error?: string | null;
          last_sync_at?: string | null;
          org_id: string;
          provider?: string;
          updated_at?: string;
          webhook_secret?: string;
        };
        Update: {
          api_key?: string;
          auto_deduct?: boolean;
          created_at?: string;
          event_id?: string | null;
          id?: string;
          is_active?: boolean;
          last_error?: string | null;
          last_sync_at?: string | null;
          org_id?: string;
          provider?: string;
          updated_at?: string;
          webhook_secret?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pos_integrations_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: true;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pos_integrations_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      pos_item_map: {
        Row: {
          created_at: string;
          id: string;
          item_id: string;
          org_id: string;
          pos_name: string | null;
          pos_sku: string;
          qty_per_unit: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          item_id: string;
          org_id: string;
          pos_name?: string | null;
          pos_sku: string;
          qty_per_unit?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          item_id?: string;
          org_id?: string;
          pos_name?: string | null;
          pos_sku?: string;
          qty_per_unit?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pos_item_map_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "inventory_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pos_item_map_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      pos_sales_log: {
        Row: {
          applied: Json;
          created_at: string;
          error: string | null;
          event_id: string;
          external_id: string;
          id: string;
          integration_id: string;
          payload: Json;
          status: string;
          unmapped: Json;
        };
        Insert: {
          applied?: Json;
          created_at?: string;
          error?: string | null;
          event_id: string;
          external_id: string;
          id?: string;
          integration_id: string;
          payload?: Json;
          status?: string;
          unmapped?: Json;
        };
        Update: {
          applied?: Json;
          created_at?: string;
          error?: string | null;
          event_id?: string;
          external_id?: string;
          id?: string;
          integration_id?: string;
          payload?: Json;
          status?: string;
          unmapped?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "pos_sales_log_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pos_sales_log_integration_id_fkey";
            columns: ["integration_id"];
            isOneToOne: false;
            referencedRelation: "pos_integrations";
            referencedColumns: ["id"];
          },
        ];
      };
      purchase_order_items: {
        Row: {
          created_at: string;
          id: string;
          item_id: string;
          po_id: string;
          quantity: number;
          unit_cost: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          item_id: string;
          po_id: string;
          quantity?: number;
          unit_cost?: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          item_id?: string;
          po_id?: string;
          quantity?: number;
          unit_cost?: number;
        };
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "inventory_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_order_items_po_id_fkey";
            columns: ["po_id"];
            isOneToOne: false;
            referencedRelation: "purchase_orders";
            referencedColumns: ["id"];
          },
        ];
      };
      purchase_orders: {
        Row: {
          created_at: string;
          event_id: string | null;
          id: string;
          notes: string | null;
          org_id: string;
          received_at: string | null;
          status: string;
          supplier_id: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          event_id?: string | null;
          id?: string;
          notes?: string | null;
          org_id: string;
          received_at?: string | null;
          status?: string;
          supplier_id?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          event_id?: string | null;
          id?: string;
          notes?: string | null;
          org_id?: string;
          received_at?: string | null;
          status?: string;
          supplier_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "purchase_orders_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_orders_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey";
            columns: ["supplier_id"];
            isOneToOne: false;
            referencedRelation: "suppliers";
            referencedColumns: ["id"];
          },
        ];
      };
      reservation_settings: {
        Row: {
          about: string | null;
          accent_color: string | null;
          accessibility: string | null;
          address: string | null;
          bg_color: string | null;
          cancel_window_hours: number;
          closed_dates: Json;
          cover_url: string | null;
          created_at: string;
          cuisine: string | null;
          currency: string;
          deposit_enabled: boolean;
          deposit_min_party: number;
          deposit_per_guest: number;
          display_name: string | null;
          enabled: boolean;
          facebook_url: string | null;
          gallery_urls: Json;
          hours_note: string | null;
          instagram_url: string | null;
          lead_time_minutes: number;
          logo_url: string | null;
          max_days_ahead: number;
          max_party_size: number;
          menu_images: Json;
          no_show_fee: number;
          org_id: string;
          phone: string | null;
          policy_text: string | null;
          service_windows: Json;
          slot_minutes: number;
          slug: string;
          text_color: string | null;
          turn_minutes: number;
          updated_at: string;
          website_url: string | null;
        };
        Insert: {
          about?: string | null;
          accent_color?: string | null;
          accessibility?: string | null;
          address?: string | null;
          bg_color?: string | null;
          cancel_window_hours?: number;
          closed_dates?: Json;
          cover_url?: string | null;
          created_at?: string;
          cuisine?: string | null;
          currency?: string;
          deposit_enabled?: boolean;
          deposit_min_party?: number;
          deposit_per_guest?: number;
          display_name?: string | null;
          enabled?: boolean;
          facebook_url?: string | null;
          gallery_urls?: Json;
          hours_note?: string | null;
          instagram_url?: string | null;
          lead_time_minutes?: number;
          logo_url?: string | null;
          max_days_ahead?: number;
          max_party_size?: number;
          menu_images?: Json;
          no_show_fee?: number;
          org_id: string;
          phone?: string | null;
          policy_text?: string | null;
          service_windows?: Json;
          slot_minutes?: number;
          slug: string;
          text_color?: string | null;
          turn_minutes?: number;
          updated_at?: string;
          website_url?: string | null;
        };
        Update: {
          about?: string | null;
          accent_color?: string | null;
          accessibility?: string | null;
          address?: string | null;
          bg_color?: string | null;
          cancel_window_hours?: number;
          closed_dates?: Json;
          cover_url?: string | null;
          created_at?: string;
          cuisine?: string | null;
          currency?: string;
          deposit_enabled?: boolean;
          deposit_min_party?: number;
          deposit_per_guest?: number;
          display_name?: string | null;
          enabled?: boolean;
          facebook_url?: string | null;
          gallery_urls?: Json;
          hours_note?: string | null;
          instagram_url?: string | null;
          lead_time_minutes?: number;
          logo_url?: string | null;
          max_days_ahead?: number;
          max_party_size?: number;
          menu_images?: Json;
          no_show_fee?: number;
          org_id?: string;
          phone?: string | null;
          policy_text?: string | null;
          service_windows?: Json;
          slot_minutes?: number;
          slug?: string;
          text_color?: string | null;
          turn_minutes?: number;
          updated_at?: string;
          website_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "reservation_settings_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: true;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      reservations: {
        Row: {
          access_token: string;
          area_id: string | null;
          cancelled_at: string | null;
          created_at: string;
          currency: string;
          deposit_amount: number;
          deposit_status: string;
          ends_at: string;
          guest_email: string;
          guest_name: string;
          guest_phone: string | null;
          id: string;
          internal_notes: string | null;
          notes: string | null;
          org_id: string;
          party_size: number;
          seated_at: string | null;
          source: string;
          starts_at: string;
          status: string;
          table_id: string | null;
          updated_at: string;
        };
        Insert: {
          access_token?: string;
          area_id?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
          currency?: string;
          deposit_amount?: number;
          deposit_status?: string;
          ends_at: string;
          guest_email: string;
          guest_name: string;
          guest_phone?: string | null;
          id?: string;
          internal_notes?: string | null;
          notes?: string | null;
          org_id: string;
          party_size: number;
          seated_at?: string | null;
          source?: string;
          starts_at: string;
          status?: string;
          table_id?: string | null;
          updated_at?: string;
        };
        Update: {
          access_token?: string;
          area_id?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
          currency?: string;
          deposit_amount?: number;
          deposit_status?: string;
          ends_at?: string;
          guest_email?: string;
          guest_name?: string;
          guest_phone?: string | null;
          id?: string;
          internal_notes?: string | null;
          notes?: string | null;
          org_id?: string;
          party_size?: number;
          seated_at?: string | null;
          source?: string;
          starts_at?: string;
          status?: string;
          table_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reservations_area_id_fkey";
            columns: ["area_id"];
            isOneToOne: false;
            referencedRelation: "dining_areas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reservations_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reservations_table_id_fkey";
            columns: ["table_id"];
            isOneToOne: false;
            referencedRelation: "dining_tables";
            referencedColumns: ["id"];
          },
        ];
      };
      shift_incidents: {
        Row: {
          created_at: string;
          detail: string | null;
          event_id: string;
          id: string;
          kind: string;
          occurred_on: string;
          punch_id: string | null;
          resolution_note: string | null;
          resolved_at: string | null;
          resolved_by: string | null;
          staff_id: string | null;
          staff_name: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          detail?: string | null;
          event_id: string;
          id?: string;
          kind: string;
          occurred_on?: string;
          punch_id?: string | null;
          resolution_note?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          staff_id?: string | null;
          staff_name: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          detail?: string | null;
          event_id?: string;
          id?: string;
          kind?: string;
          occurred_on?: string;
          punch_id?: string | null;
          resolution_note?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          staff_id?: string | null;
          staff_name?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shift_incidents_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shift_incidents_punch_id_fkey";
            columns: ["punch_id"];
            isOneToOne: false;
            referencedRelation: "staff_time_clock";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shift_incidents_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "event_staff";
            referencedColumns: ["id"];
          },
        ];
      };
      staff_availability: {
        Row: {
          available_from: string | null;
          available_to: string | null;
          created_at: string;
          end_time: string | null;
          event_id: string;
          id: string;
          max_hours: number;
          max_weekly_hours: number;
          name: string;
          notes: string | null;
          phone: string | null;
          role: string;
          start_time: string | null;
          updated_at: string;
          weekday: number | null;
        };
        Insert: {
          available_from?: string | null;
          available_to?: string | null;
          created_at?: string;
          end_time?: string | null;
          event_id: string;
          id?: string;
          max_hours?: number;
          max_weekly_hours?: number;
          name: string;
          notes?: string | null;
          phone?: string | null;
          role?: string;
          start_time?: string | null;
          updated_at?: string;
          weekday?: number | null;
        };
        Update: {
          available_from?: string | null;
          available_to?: string | null;
          created_at?: string;
          end_time?: string | null;
          event_id?: string;
          id?: string;
          max_hours?: number;
          max_weekly_hours?: number;
          name?: string;
          notes?: string | null;
          phone?: string | null;
          role?: string;
          start_time?: string | null;
          updated_at?: string;
          weekday?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "staff_availability_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      staff_time_clock: {
        Row: {
          clock_in: string;
          clock_out: string | null;
          created_at: string;
          event_id: string;
          hourly_rate: number;
          id: string;
          name: string;
          notes: string | null;
          role: string;
          staff_id: string | null;
          updated_at: string;
        };
        Insert: {
          clock_in?: string;
          clock_out?: string | null;
          created_at?: string;
          event_id: string;
          hourly_rate?: number;
          id?: string;
          name: string;
          notes?: string | null;
          role?: string;
          staff_id?: string | null;
          updated_at?: string;
        };
        Update: {
          clock_in?: string;
          clock_out?: string | null;
          created_at?: string;
          event_id?: string;
          hourly_rate?: number;
          id?: string;
          name?: string;
          notes?: string | null;
          role?: string;
          staff_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "staff_time_clock_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "staff_time_clock_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "event_staff";
            referencedColumns: ["id"];
          },
        ];
      };
      suppliers: {
        Row: {
          contact_name: string | null;
          created_at: string;
          email: string | null;
          id: string;
          name: string;
          notes: string | null;
          org_id: string;
          phone: string | null;
          updated_at: string;
        };
        Insert: {
          contact_name?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          name: string;
          notes?: string | null;
          org_id: string;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          contact_name?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          name?: string;
          notes?: string | null;
          org_id?: string;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "suppliers_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      support_tickets: {
        Row: {
          area: string;
          body: string | null;
          contact_email: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          internal_notes: string | null;
          org_id: string | null;
          priority: string;
          resolved_at: string | null;
          status: string;
          subject: string;
          updated_at: string;
        };
        Insert: {
          area?: string;
          body?: string | null;
          contact_email?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          internal_notes?: string | null;
          org_id?: string | null;
          priority?: string;
          resolved_at?: string | null;
          status?: string;
          subject: string;
          updated_at?: string;
        };
        Update: {
          area?: string;
          body?: string | null;
          contact_email?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          internal_notes?: string | null;
          org_id?: string | null;
          priority?: string;
          resolved_at?: string | null;
          status?: string;
          subject?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "support_tickets_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      ticket_requests: {
        Row: {
          access_token: string;
          ai_decision: Database["public"]["Enums"]["request_status"] | null;
          ai_reasoning: string | null;
          ai_score: number | null;
          buyer_email: string;
          buyer_name: string;
          buyer_phone: string | null;
          created_at: string;
          event_id: string;
          facebook_url: string | null;
          id: string;
          instagram_url: string | null;
          order_id: string | null;
          quantity: number;
          reviewed_at: string | null;
          reviewed_by: string | null;
          reviewer_notes: string | null;
          status: Database["public"]["Enums"]["request_status"];
          ticket_type_id: string | null;
          updated_at: string;
        };
        Insert: {
          access_token?: string;
          ai_decision?: Database["public"]["Enums"]["request_status"] | null;
          ai_reasoning?: string | null;
          ai_score?: number | null;
          buyer_email: string;
          buyer_name: string;
          buyer_phone?: string | null;
          created_at?: string;
          event_id: string;
          facebook_url?: string | null;
          id?: string;
          instagram_url?: string | null;
          order_id?: string | null;
          quantity?: number;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          reviewer_notes?: string | null;
          status?: Database["public"]["Enums"]["request_status"];
          ticket_type_id?: string | null;
          updated_at?: string;
        };
        Update: {
          access_token?: string;
          ai_decision?: Database["public"]["Enums"]["request_status"] | null;
          ai_reasoning?: string | null;
          ai_score?: number | null;
          buyer_email?: string;
          buyer_name?: string;
          buyer_phone?: string | null;
          created_at?: string;
          event_id?: string;
          facebook_url?: string | null;
          id?: string;
          instagram_url?: string | null;
          order_id?: string | null;
          quantity?: number;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          reviewer_notes?: string | null;
          status?: Database["public"]["Enums"]["request_status"];
          ticket_type_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ticket_requests_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ticket_requests_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ticket_requests_ticket_type_id_fkey";
            columns: ["ticket_type_id"];
            isOneToOne: false;
            referencedRelation: "ticket_types";
            referencedColumns: ["id"];
          },
        ];
      };
      ticket_types: {
        Row: {
          balance_on_site: boolean;
          created_at: string;
          deposit_amount: number;
          description: string | null;
          event_id: string;
          id: string;
          is_active: boolean;
          kind: string;
          max_per_order: number;
          min_per_order: number;
          name: string;
          price: number;
          quantity_sold: number;
          quantity_total: number;
          sales_end_at: string | null;
          sales_start_at: string | null;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          balance_on_site?: boolean;
          created_at?: string;
          deposit_amount?: number;
          description?: string | null;
          event_id: string;
          id?: string;
          is_active?: boolean;
          kind?: string;
          max_per_order?: number;
          min_per_order?: number;
          name: string;
          price?: number;
          quantity_sold?: number;
          quantity_total?: number;
          sales_end_at?: string | null;
          sales_start_at?: string | null;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          balance_on_site?: boolean;
          created_at?: string;
          deposit_amount?: number;
          description?: string | null;
          event_id?: string;
          id?: string;
          is_active?: boolean;
          kind?: string;
          max_per_order?: number;
          min_per_order?: number;
          name?: string;
          price?: number;
          quantity_sold?: number;
          quantity_total?: number;
          sales_end_at?: string | null;
          sales_start_at?: string | null;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ticket_types_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      tickets: {
        Row: {
          created_at: string;
          event_id: string;
          holder_name: string | null;
          id: string;
          order_id: string;
          qr_code: string;
          scanned_at: string | null;
          status: string;
          ticket_type_id: string;
        };
        Insert: {
          created_at?: string;
          event_id: string;
          holder_name?: string | null;
          id?: string;
          order_id: string;
          qr_code?: string;
          scanned_at?: string | null;
          status?: string;
          ticket_type_id: string;
        };
        Update: {
          created_at?: string;
          event_id?: string;
          holder_name?: string | null;
          id?: string;
          order_id?: string;
          qr_code?: string;
          scanned_at?: string | null;
          status?: string;
          ticket_type_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tickets_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tickets_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tickets_ticket_type_id_fkey";
            columns: ["ticket_type_id"];
            isOneToOne: false;
            referencedRelation: "ticket_types";
            referencedColumns: ["id"];
          },
        ];
      };
      venue_layouts: {
        Row: {
          created_at: string;
          event_id: string;
          id: string;
          image_height: number | null;
          image_path: string;
          image_width: number | null;
          notes: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          event_id: string;
          id?: string;
          image_height?: number | null;
          image_path: string;
          image_width?: number | null;
          notes?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          event_id?: string;
          id?: string;
          image_height?: number | null;
          image_path?: string;
          image_width?: number | null;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "venue_layouts_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: true;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      venue_placements: {
        Row: {
          color: string;
          created_at: string;
          h: number | null;
          id: string;
          kind: string;
          label: string;
          layout_id: string;
          staff_id: string | null;
          tables: string | null;
          updated_at: string;
          w: number | null;
          x: number;
          y: number;
        };
        Insert: {
          color?: string;
          created_at?: string;
          h?: number | null;
          id?: string;
          kind: string;
          label: string;
          layout_id: string;
          staff_id?: string | null;
          tables?: string | null;
          updated_at?: string;
          w?: number | null;
          x: number;
          y: number;
        };
        Update: {
          color?: string;
          created_at?: string;
          h?: number | null;
          id?: string;
          kind?: string;
          label?: string;
          layout_id?: string;
          staff_id?: string | null;
          tables?: string | null;
          updated_at?: string;
          w?: number | null;
          x?: number;
          y?: number;
        };
        Relationships: [
          {
            foreignKeyName: "venue_placements_layout_id_fkey";
            columns: ["layout_id"];
            isOneToOne: false;
            referencedRelation: "venue_layouts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "venue_placements_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "event_staff";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_order_by_token: {
        Args: { p_order_number: string; p_token: string };
        Returns: Json;
      };
      mock_finalize_order: {
        Args: { p_order_id: string; p_token: string };
        Returns: undefined;
      };
      release_ticket_inventory: {
        Args: { _qty: number; _ticket_type_id: string };
        Returns: undefined;
      };
      reserve_ticket_inventory: {
        Args: { _event_id: string; _qty: number; _ticket_type_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      org_role: "admin" | "manager" | "staff";
      request_status: "pending" | "ai_reviewing" | "approved" | "rejected" | "maybe";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      org_role: ["admin", "manager", "staff"],
      request_status: ["pending", "ai_reviewing", "approved", "rejected", "maybe"],
    },
  },
} as const;
