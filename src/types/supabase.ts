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
        }
        Relationships: []
      }
      daily_menus: {
        Row: {
          completion_pct: number | null
          created_at: string | null
          date: string
          generated_by_ai: boolean | null
          id: string
          is_completed: boolean | null
          plan_id: string
          status: string
          total_calories: number | null
        }
        Insert: {
          completion_pct?: number | null
          created_at?: string | null
          date: string
          generated_by_ai?: boolean | null
          id?: string
          is_completed?: boolean | null
          plan_id: string
          status?: string
          total_calories?: number | null
        }
        Update: {
          completion_pct?: number | null
          created_at?: string | null
          date?: string
          generated_by_ai?: boolean | null
          id?: string
          is_completed?: boolean | null
          plan_id?: string
          status?: string
          total_calories?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_menus_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "diet_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      diet_plans: {
        Row: {
          carb_pct: number | null
          created_at: string | null
          diet_method: string
          duration_days: number
          end_date: string
          fat_pct: number | null
          id: string
          is_active: boolean | null
          protein_pct: number | null
          start_date: string
          user_id: string
        }
        Insert: {
          carb_pct?: number | null
          created_at?: string | null
          diet_method: string
          duration_days: number
          end_date: string
          fat_pct?: number | null
          id?: string
          is_active?: boolean | null
          protein_pct?: number | null
          start_date: string
          user_id: string
        }
        Update: {
          carb_pct?: number | null
          created_at?: string | null
          diet_method?: string
          duration_days?: number
          end_date?: string
          fat_pct?: number | null
          id?: string
          is_active?: boolean | null
          protein_pct?: number | null
          start_date?: string
          user_id?: string
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
          source: 'off' | 'mohw_tw' | 'usda' | 'ai_estimate' | 'user'
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
          source?: 'off' | 'mohw_tw' | 'usda' | 'ai_estimate' | 'user'
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
          source?: 'off' | 'mohw_tw' | 'usda' | 'ai_estimate' | 'user'
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
          from_plan_meal_id: string | null
          id: string
          log_type: string
          logged_at: string | null
          meal_type: string
          method: string
          user_id: string
        }
        Insert: {
          date: string
          from_plan_meal_id?: string | null
          id?: string
          log_type?: string
          logged_at?: string | null
          meal_type: string
          method: string
          user_id: string
        }
        Update: {
          date?: string
          from_plan_meal_id?: string | null
          id?: string
          log_type?: string
          logged_at?: string | null
          meal_type?: string
          method?: string
          user_id?: string
        }
        Relationships: []
      }
      photo_analysis_jobs: {
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
      meal_items: {
        Row: {
          calories: number
          carb_g: number
          fat_g: number
          fiber_g: number | null
          id: string
          meal_id: string
          name: string
          protein_g: number
          quantity_g: number
          sodium_mg: number | null
        }
        Insert: {
          calories: number
          carb_g: number
          fat_g: number
          fiber_g?: number | null
          id?: string
          meal_id: string
          name: string
          protein_g: number
          quantity_g: number
          sodium_mg?: number | null
        }
        Update: {
          calories?: number
          carb_g?: number
          fat_g?: number
          fiber_g?: number | null
          id?: string
          meal_id?: string
          name?: string
          protein_g?: number
          quantity_g?: number
          sodium_mg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "meal_items_meal_id_fkey"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "meals"
            referencedColumns: ["id"]
          },
        ]
      }
      meals: {
        Row: {
          checkin_type: string | null
          checked_in_at: string | null
          id: string
          is_checked_in: boolean | null
          menu_id: string
          scheduled_at: string | null
          total_calories: number | null
          type: string
        }
        Insert: {
          checkin_type?: string | null
          checked_in_at?: string | null
          id?: string
          is_checked_in?: boolean | null
          menu_id: string
          scheduled_at?: string | null
          total_calories?: number | null
          type: string
        }
        Update: {
          checkin_type?: string | null
          checked_in_at?: string | null
          id?: string
          is_checked_in?: boolean | null
          menu_id?: string
          scheduled_at?: string | null
          total_calories?: number | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "meals_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "daily_menus"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          qty: number
          unit_price: number
          variant_id: string
        }
        Insert: {
          id?: string
          order_id: string
          qty: number
          unit_price: number
          variant_id: string
        }
        Update: {
          id?: string
          order_id?: string
          qty?: number
          unit_price?: number
          variant_id?: string
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
          created_at: string | null
          id: string
          status: string
          stripe_session_id: string | null
          total: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id: string
          status?: string
          stripe_session_id?: string | null
          total: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          status?: string
          stripe_session_id?: string | null
          total?: number
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
          stripe_price_id: string | null
          stripe_sub_price_id: string | null
          sub_price: number | null
          weight_g: number
        }
        Insert: {
          id?: string
          label: string
          price: number
          product_id: string
          stock?: number | null
          stripe_price_id?: string | null
          stripe_sub_price_id?: string | null
          sub_price?: number | null
          weight_g: number
        }
        Update: {
          id?: string
          label?: string
          price?: number
          product_id?: string
          stock?: number | null
          stripe_price_id?: string | null
          stripe_sub_price_id?: string | null
          sub_price?: number | null
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
          id: string
          qty: number
          stripe_item_id: string | null
          subscription_id: string
          variant_id: string
        }
        Insert: {
          id?: string
          qty: number
          stripe_item_id?: string | null
          subscription_id: string
          variant_id: string
        }
        Update: {
          id?: string
          qty?: number
          stripe_item_id?: string | null
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
          frequency: string
          id: string
          next_ship_at: string | null
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          frequency: string
          id?: string
          next_ship_at?: string | null
          status?: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          frequency?: string
          id?: string
          next_ship_at?: string | null
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
          name: string
          tdee: number | null
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
          name: string
          tdee?: number | null
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
          name?: string
          tdee?: number | null
          updated_at?: string | null
          user_id?: string
          weight_kg?: number
        }
        Relationships: []
      }
      vital_logs: {
        Row: {
          date: string
          id: string
          logged_at: string | null
          user_id: string
          water_ml: number | null
          weight_kg: number | null
        }
        Insert: {
          date: string
          id?: string
          logged_at?: string | null
          user_id: string
          water_ml?: number | null
          weight_kg?: number | null
        }
        Update: {
          date?: string
          id?: string
          logged_at?: string | null
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
      match_food_cache: {
        Args: {
          p_query: string
        }
        Returns: Database['public']['Tables']['food_cache']['Row'][]
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
