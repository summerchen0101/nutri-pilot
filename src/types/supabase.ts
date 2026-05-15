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
      activity_logs: {
        Row: {
          activity_type: string
          calories_est: number | null
          created_at: string | null
          duration_minutes: number
          id: string
          logged_date: string
          notes: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          calories_est?: number | null
          created_at?: string | null
          duration_minutes: number
          id?: string
          logged_date: string
          notes?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          calories_est?: number | null
          created_at?: string | null
          duration_minutes?: number
          id?: string
          logged_date?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_usage_events: {
        Row: {
          billing_month: string
          created_at: string
          id: string
          input_tokens: number | null
          output_tokens: number | null
          quota_used: number
          source: string
          user_id: string
        }
        Insert: {
          billing_month: string
          created_at?: string
          id?: string
          input_tokens?: number | null
          output_tokens?: number | null
          quota_used: number
          source: string
          user_id: string
        }
        Update: {
          billing_month?: string
          created_at?: string
          id?: string
          input_tokens?: number | null
          output_tokens?: number | null
          quota_used?: number
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          body: string
          created_at: string | null
          id: string
          is_active: boolean
          published_at: string
          title: string
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          published_at?: string
          title: string
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          published_at?: string
          title?: string
        }
        Relationships: []
      }
      brands: {
        Row: {
          country: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          slug: string
          vendor_id: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          slug: string
          vendor_id?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          slug?: string
          vendor_id?: string | null
        }
        Relationships: []
      }
      food_cache: {
        Row: {
          alias: string[] | null
          brand: string | null
          calories_per_100g: number
          carb_g_per_100g: number
          external_id: string | null
          fat_g_per_100g: number
          fiber_g_per_100g: number | null
          id: string
          is_verified: boolean | null
          name: string
          off_code: string | null
          protein_g_per_100g: number
          sodium_mg_per_100g: number | null
          source: string
          updated_at: string | null
        }
        Insert: {
          alias?: string[] | null
          brand?: string | null
          calories_per_100g: number
          carb_g_per_100g?: number
          external_id?: string | null
          fat_g_per_100g?: number
          fiber_g_per_100g?: number | null
          id?: string
          is_verified?: boolean | null
          name: string
          off_code?: string | null
          protein_g_per_100g?: number
          sodium_mg_per_100g?: number | null
          source?: string
          updated_at?: string | null
        }
        Update: {
          alias?: string[] | null
          brand?: string | null
          calories_per_100g?: number
          carb_g_per_100g?: number
          external_id?: string | null
          fat_g_per_100g?: number
          fiber_g_per_100g?: number | null
          id?: string
          is_verified?: boolean | null
          name?: string
          off_code?: string | null
          protein_g_per_100g?: number
          sodium_mg_per_100g?: number | null
          source?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      food_log_items: {
        Row: {
          brand: string | null
          calories: number
          carb_g: number
          fat_g: number
          fiber_g: number | null
          id: string
          is_verified: boolean | null
          log_id: string
          name: string
          protein_g: number
          quantity_g: number
          sodium_mg: number | null
        }
        Insert: {
          brand?: string | null
          calories: number
          carb_g: number
          fat_g: number
          fiber_g?: number | null
          id?: string
          is_verified?: boolean | null
          log_id: string
          name: string
          protein_g: number
          quantity_g: number
          sodium_mg?: number | null
        }
        Update: {
          brand?: string | null
          calories?: number
          carb_g?: number
          fat_g?: number
          fiber_g?: number | null
          id?: string
          is_verified?: boolean | null
          log_id?: string
          name?: string
          protein_g?: number
          quantity_g?: number
          sodium_mg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "food_log_items_log_id_fkey"
            columns: ["log_id"]
            isOneToOne: false
            referencedRelation: "food_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      food_logs: {
        Row: {
          date: string
          id: string
          log_type: string
          logged_at: string | null
          meal_type: string
          method: string
          user_id: string
        }
        Insert: {
          date: string
          id?: string
          log_type?: string
          logged_at?: string | null
          meal_type: string
          method: string
          user_id: string
        }
        Update: {
          date?: string
          id?: string
          log_type?: string
          logged_at?: string | null
          meal_type?: string
          method?: string
          user_id?: string
        }
        Relationships: []
      }
      label_guard_jobs: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          result_json: Json | null
          status: string
          storage_path: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          result_json?: Json | null
          status?: string
          storage_path: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          result_json?: Json | null
          status?: string
          storage_path?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      label_guard_saved_reports: {
        Row: {
          created_at: string | null
          id: string
          job_id: string | null
          name: string
          report_json: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          job_id?: string | null
          name: string
          report_json: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          job_id?: string | null
          name?: string
          report_json?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "label_guard_saved_reports_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "label_guard_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          qty: number
          sub_order_id: string | null
          unit_price: number
          variant_id: string
          vendor_id: string | null
        }
        Insert: {
          id?: string
          order_id: string
          qty: number
          sub_order_id?: string | null
          unit_price: number
          variant_id: string
          vendor_id?: string | null
        }
        Update: {
          id?: string
          order_id?: string
          qty?: number
          sub_order_id?: string | null
          unit_price?: number
          variant_id?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          checkout_snapshot: Json | null
          created_at: string | null
          gateway_session_ref: string | null
          gateway_trade_no: string | null
          id: string
          items_subtotal: number | null
          legacy_stripe_payment_intent_id: string | null
          merchant_order_no: string | null
          payment_gateway: string
          public_order_no: string | null
          recipient_address_full: string | null
          recipient_name: string | null
          recipient_phone: string | null
          shipping_total: number | null
          status: string
          total: number
          user_id: string
        }
        Insert: {
          checkout_snapshot?: Json | null
          created_at?: string | null
          gateway_session_ref?: string | null
          gateway_trade_no?: string | null
          id?: string
          items_subtotal?: number | null
          legacy_stripe_payment_intent_id?: string | null
          merchant_order_no?: string | null
          payment_gateway?: string
          public_order_no?: string | null
          recipient_address_full?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          shipping_total?: number | null
          status?: string
          total: number
          user_id: string
        }
        Update: {
          checkout_snapshot?: Json | null
          created_at?: string | null
          gateway_session_ref?: string | null
          gateway_trade_no?: string | null
          id?: string
          items_subtotal?: number | null
          legacy_stripe_payment_intent_id?: string | null
          merchant_order_no?: string | null
          payment_gateway?: string
          public_order_no?: string | null
          recipient_address_full?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          shipping_total?: number | null
          status?: string
          total?: number
          user_id?: string
        }
        Relationships: []
      }
      photo_analysis_jobs: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          job_kind: string
          result_json: Json | null
          status: string
          storage_path: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          job_kind?: string
          result_json?: Json | null
          status?: string
          storage_path: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          job_kind?: string
          result_json?: Json | null
          status?: string
          storage_path?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      product_variants: {
        Row: {
          id: string
          label: string
          price: number
          product_id: string
          stock: number | null
          weight_g: number
        }
        Insert: {
          id?: string
          label: string
          price: number
          product_id: string
          stock?: number | null
          weight_g: number
        }
        Update: {
          id?: string
          label?: string
          price?: number
          product_id?: string
          stock?: number | null
          weight_g?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          allergen_free: string[] | null
          avg_rating: number | null
          brand_id: string
          calories: number
          carb_g: number
          category: string
          cert_tags: string[] | null
          created_at: string | null
          description: string | null
          diet_tags: string[] | null
          fat_g: number
          fiber_g: number | null
          id: string
          image_url: string | null
          ingredients: string | null
          is_active: boolean | null
          name: string
          origin: string | null
          protein_g: number
          serving_size_g: number
          slug: string
          sodium_mg: number | null
          sugar_g: number | null
        }
        Insert: {
          allergen_free?: string[] | null
          avg_rating?: number | null
          brand_id: string
          calories: number
          carb_g: number
          category: string
          cert_tags?: string[] | null
          created_at?: string | null
          description?: string | null
          diet_tags?: string[] | null
          fat_g: number
          fiber_g?: number | null
          id?: string
          image_url?: string | null
          ingredients?: string | null
          is_active?: boolean | null
          name: string
          origin?: string | null
          protein_g: number
          serving_size_g: number
          slug: string
          sodium_mg?: number | null
          sugar_g?: number | null
        }
        Update: {
          allergen_free?: string[] | null
          avg_rating?: number | null
          brand_id?: string
          calories?: number
          carb_g?: number
          category?: string
          cert_tags?: string[] | null
          created_at?: string | null
          description?: string | null
          diet_tags?: string[] | null
          fat_g?: number
          fiber_g?: number | null
          id?: string
          image_url?: string | null
          ingredients?: string | null
          is_active?: boolean | null
          name?: string
          origin?: string | null
          protein_g?: number
          serving_size_g?: number
          slug?: string
          sodium_mg?: number | null
          sugar_g?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_items: {
        Row: {
          external_item_id: string | null
          id: string
          qty: number
          subscription_id: string
          variant_id: string
        }
        Insert: {
          external_item_id?: string | null
          id?: string
          qty: number
          subscription_id: string
          variant_id: string
        }
        Update: {
          external_item_id?: string | null
          id?: string
          qty?: number
          subscription_id?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_items_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string | null
          external_customer_id: string
          external_subscription_id: string | null
          frequency: string
          id: string
          next_ship_at: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          external_customer_id: string
          external_subscription_id?: string | null
          frequency: string
          id?: string
          next_ship_at?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          external_customer_id?: string
          external_subscription_id?: string | null
          frequency?: string
          id?: string
          next_ship_at?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      sub_orders: {
        Row: {
          created_at: string
          id: string
          items_subtotal: number
          order_id: string
          public_no: string
          shipped_at: string | null
          shipping_carrier: string | null
          shipping_fee: number
          status: string
          total: number
          tracking_number: string | null
          vendor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          items_subtotal: number
          order_id: string
          public_no: string
          shipped_at?: string | null
          shipping_carrier?: string | null
          shipping_fee?: number
          status?: string
          total: number
          tracking_number?: string | null
          vendor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          items_subtotal?: number
          order_id?: string
          public_no?: string
          shipped_at?: string | null
          shipping_carrier?: string | null
          shipping_fee?: number
          status?: string
          total?: number
          tracking_number?: string | null
          vendor_id?: string
        }
        Relationships: []
      }
      user_announcement_reads: {
        Row: {
          announcement_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_goals: {
        Row: {
          created_at: string | null
          daily_cal_target: number
          id: string
          is_active: boolean | null
          target_date: string | null
          target_weight_kg: number
          type: string
          user_id: string
          weekly_rate_kg: number
        }
        Insert: {
          created_at?: string | null
          daily_cal_target: number
          id?: string
          is_active?: boolean | null
          target_date?: string | null
          target_weight_kg: number
          type: string
          user_id: string
          weekly_rate_kg?: number
        }
        Update: {
          created_at?: string | null
          daily_cal_target?: number
          id?: string
          is_active?: boolean | null
          target_date?: string | null
          target_weight_kg?: number
          type?: string
          user_id?: string
          weekly_rate_kg?: number
        }
        Relationships: []
      }
      user_milestones: {
        Row: {
          milestone_key: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          milestone_key: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          milestone_key?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_product_favorites: {
        Row: {
          created_at: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_product_favorites_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      user_product_scores: {
        Row: {
          product_id: string
          score: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          product_id: string
          score: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          product_id?: string
          score?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_product_scores_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      user_shop_point_ledger: {
        Row: {
          balance_after: number
          created_at: string
          delta: number
          id: string
          note: string | null
          reason: string
          ref_id: string | null
          ref_type: string | null
          user_id: string
        }
        Insert: {
          balance_after: number
          created_at?: string
          delta: number
          id?: string
          note?: string | null
          reason: string
          ref_id?: string | null
          ref_type?: string | null
          user_id: string
        }
        Update: {
          balance_after?: number
          created_at?: string
          delta?: number
          id?: string
          note?: string | null
          reason?: string
          ref_id?: string | null
          ref_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_shipping_addresses: {
        Row: {
          address_full: string
          created_at: string
          id: string
          is_default: boolean
          phone: string
          recipient_name: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          address_full: string
          created_at?: string
          id?: string
          is_default?: boolean
          phone: string
          recipient_name: string
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          address_full?: string
          created_at?: string
          id?: string
          is_default?: boolean
          phone?: string
          recipient_name?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          activity_level: string
          allergens: string[] | null
          avoid_foods: string[] | null
          birth_date: string
          bmi: number | null
          bmr: number | null
          diet_method: string | null
          diet_type: string
          gender: string
          height_cm: number
          id: string
          meal_frequency: number
          membership_plan: string
          name: string
          shipping_address_full: string | null
          shipping_phone: string | null
          shipping_recipient_name: string | null
          shop_personalize_recommendations: boolean
          shop_points_balance: number
          tdee: number | null
          tracks_glycemic_concern: boolean
          updated_at: string | null
          user_id: string
          weight_kg: number
        }
        Insert: {
          activity_level: string
          allergens?: string[] | null
          avoid_foods?: string[] | null
          birth_date: string
          bmi?: number | null
          bmr?: number | null
          diet_method?: string | null
          diet_type: string
          gender: string
          height_cm: number
          id?: string
          meal_frequency?: number
          membership_plan?: string
          name: string
          shipping_address_full?: string | null
          shipping_phone?: string | null
          shipping_recipient_name?: string | null
          shop_personalize_recommendations?: boolean
          shop_points_balance?: number
          tdee?: number | null
          tracks_glycemic_concern?: boolean
          updated_at?: string | null
          user_id: string
          weight_kg: number
        }
        Update: {
          activity_level?: string
          allergens?: string[] | null
          avoid_foods?: string[] | null
          birth_date?: string
          bmi?: number | null
          bmr?: number | null
          diet_method?: string | null
          diet_type?: string
          gender?: string
          height_cm?: number
          id?: string
          meal_frequency?: number
          membership_plan?: string
          name?: string
          shipping_address_full?: string | null
          shipping_phone?: string | null
          shipping_recipient_name?: string | null
          shop_personalize_recommendations?: boolean
          shop_points_balance?: number
          tdee?: number | null
          tracks_glycemic_concern?: boolean
          updated_at?: string | null
          user_id?: string
          weight_kg?: number
        }
        Relationships: []
      }
      vendor_users: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          user_id: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
          vendor_id?: string
        }
        Relationships: []
      }
      vendors: {
        Row: {
          contact_email: string | null
          created_at: string
          free_shipping_threshold: number | null
          id: string
          is_active: boolean
          lead_time_days: number
          name: string
          notification_email: string | null
          shipping_fee: number
          slug: string
        }
        Insert: {
          contact_email?: string | null
          created_at?: string
          free_shipping_threshold?: number | null
          id?: string
          is_active?: boolean
          lead_time_days?: number
          name: string
          notification_email?: string | null
          shipping_fee?: number
          slug: string
        }
        Update: {
          contact_email?: string | null
          created_at?: string
          free_shipping_threshold?: number | null
          id?: string
          is_active?: boolean
          lead_time_days?: number
          name?: string
          notification_email?: string | null
          shipping_fee?: number
          slug?: string
        }
        Relationships: []
      }
      vital_logs: {
        Row: {
          date: string
          id: string
          logged_at: string | null
          sleep_hours: number | null
          user_id: string
          water_ml: number | null
          weight_kg: number | null
        }
        Insert: {
          date: string
          id?: string
          logged_at?: string | null
          sleep_hours?: number | null
          user_id: string
          water_ml?: number | null
          weight_kg?: number | null
        }
        Update: {
          date?: string
          id?: string
          logged_at?: string | null
          sleep_hours?: number | null
          user_id?: string
          water_ml?: number | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      weekly_insights: {
        Row: {
          created_at: string | null
          id: string
          insights: Json
          user_id: string
          week_start: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          insights: Json
          user_id: string
          week_start: string
        }
        Update: {
          created_at?: string | null
          id?: string
          insights?: Json
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_monthly_ai_quota_used: {
        Args: { p_month: string }
        Returns: number
      }
      match_food_cache: {
        Args: { p_query: string }
        Returns: {
          alias: string[] | null
          brand: string | null
          calories_per_100g: number
          carb_g_per_100g: number
          external_id: string | null
          fat_g_per_100g: number
          fiber_g_per_100g: number | null
          id: string
          is_verified: boolean | null
          name: string
          off_code: string | null
          protein_g_per_100g: number
          sodium_mg_per_100g: number | null
          source: string
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "food_cache"
          isOneToOne: false
          isSetofReturn: true
        }
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
