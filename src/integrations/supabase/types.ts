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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string
          duration_minutes: number
          id: string
          notes: string | null
          scheduled_at: string
          service_id: string
          shop_id: string
          status: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          scheduled_at: string
          service_id: string
          shop_id: string
          status?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          scheduled_at?: string
          service_id?: string
          shop_id?: string
          status?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          cpf: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          shop_id: string
          tags: string[] | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          shop_id: string
          tags?: string[] | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          shop_id?: string
          tags?: string[] | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_entries: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          date: string
          description: string | null
          id: string
          job_id: string | null
          payment_method: string | null
          shop_id: string
          type: string
        }
        Insert: {
          amount?: number
          category?: string | null
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          job_id?: string | null
          payment_method?: string | null
          shop_id: string
          type?: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          job_id?: string | null
          payment_method?: string | null
          shop_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_entries_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      job_checklist: {
        Row: {
          car_view: string | null
          created_at: string
          id: string
          item_type: string
          job_id: string
          label: string
          notes: string | null
          position_x: number | null
          position_y: number | null
        }
        Insert: {
          car_view?: string | null
          created_at?: string
          id?: string
          item_type?: string
          job_id: string
          label: string
          notes?: string | null
          position_x?: number | null
          position_y?: number | null
        }
        Update: {
          car_view?: string | null
          created_at?: string
          id?: string
          item_type?: string
          job_id?: string
          label?: string
          notes?: string | null
          position_x?: number | null
          position_y?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "job_checklist_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_photos: {
        Row: {
          created_at: string
          id: string
          job_id: string
          photo_type: string
          photo_url: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          photo_type?: string
          photo_url: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          photo_type?: string
          photo_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_photos_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_services: {
        Row: {
          created_at: string
          id: string
          job_id: string
          price: number
          service_id: string
          service_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          price?: number
          service_id: string
          service_name: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          price?: number
          service_id?: string
          service_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_services_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          created_at: string
          created_by: string | null
          discount: number
          entry_photo_url: string | null
          finished_at: string | null
          id: string
          internal_notes: string | null
          notes: string | null
          payment_method: string | null
          service_id: string | null
          shop_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["job_status"]
          total_price: number
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          discount?: number
          entry_photo_url?: string | null
          finished_at?: string | null
          id?: string
          internal_notes?: string | null
          notes?: string | null
          payment_method?: string | null
          service_id?: string | null
          shop_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          total_price?: number
          vehicle_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          discount?: number
          entry_photo_url?: string | null
          finished_at?: string | null
          id?: string
          internal_notes?: string | null
          notes?: string | null
          payment_method?: string | null
          service_id?: string | null
          shop_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          total_price?: number
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_plans: {
        Row: {
          active: boolean
          created_at: string
          id: string
          max_uses: number
          multi_vehicle: boolean
          name: string
          price: number
          services_included: string[]
          shop_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          max_uses?: number
          multi_vehicle?: boolean
          name: string
          price?: number
          services_included?: string[]
          shop_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          max_uses?: number
          multi_vehicle?: boolean
          name?: string
          price?: number
          services_included?: string[]
          shop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_plans_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_subscriptions: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          plan_id: string
          renewal_date: string
          shop_id: string
          status: string
          uses_this_month: number
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          plan_id: string
          renewal_date: string
          shop_id: string
          status?: string
          uses_this_month?: number
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          plan_id?: string
          renewal_date?: string
          shop_id?: string
          status?: string
          uses_this_month?: number
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_subscriptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "loyalty_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_subscriptions_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          created_at: string
          greeting: string
          id: string
          main_text: string
          shop_id: string
          signature: string
          thanks_message: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          greeting?: string
          id?: string
          main_text?: string
          shop_id: string
          signature?: string
          thanks_message?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          greeting?: string
          id?: string
          main_text?: string
          shop_id?: string
          signature?: string
          thanks_message?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: true
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          customer_id: string | null
          direction: string
          id: string
          sent_at: string
          shop_id: string
          status: string
          template_type: string | null
        }
        Insert: {
          content: string
          customer_id?: string | null
          direction?: string
          id?: string
          sent_at?: string
          shop_id: string
          status?: string
          template_type?: string | null
        }
        Update: {
          content?: string
          customer_id?: string | null
          direction?: string
          id?: string
          sent_at?: string
          shop_id?: string
          status?: string
          template_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          created_at: string
          customer_id: string | null
          estimated_value: number
          id: string
          last_contact_date: string | null
          notes: string | null
          responsible_id: string | null
          service_interest: string | null
          shop_id: string
          status: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          estimated_value?: number
          id?: string
          last_contact_date?: string | null
          notes?: string | null
          responsible_id?: string | null
          service_interest?: string | null
          shop_id: string
          status?: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          estimated_value?: number
          id?: string
          last_contact_date?: string | null
          notes?: string | null
          responsible_id?: string | null
          service_interest?: string | null
          shop_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string
          created_at: string
          id: string
          min_stock: number
          name: string
          quantity: number
          shop_id: string
          supplier: string | null
          unit_cost: number
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          min_stock?: number
          name: string
          quantity?: number
          shop_id: string
          supplier?: string | null
          unit_cost?: number
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          min_stock?: number
          name?: string
          quantity?: number
          shop_id?: string
          supplier?: string | null
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          shop_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name: string
          id: string
          phone?: string | null
          shop_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          shop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          customer_id: string | null
          id: string
          job_id: string | null
          platform: string
          rating: number
          shop_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          job_id?: string | null
          platform?: string
          rating: number
          shop_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          job_id?: string | null
          platform?: string
          rating?: number
          shop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean
          category: string | null
          created_at: string
          duration_minutes: number
          id: string
          name: string
          price: number
          shop_id: string
        }
        Insert: {
          active?: boolean
          category?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          name: string
          price?: number
          shop_id: string
        }
        Update: {
          active?: boolean
          category?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          name?: string
          price?: number
          shop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shops: {
        Row: {
          address: string | null
          cep: string | null
          city: string | null
          cnpj: string | null
          complement: string | null
          created_at: string
          email: string | null
          id: string
          logo_url: string | null
          name: string
          neighborhood: string | null
          number: string | null
          phone: string | null
          primary_color: string | null
          state: string | null
          street: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          cep?: string | null
          city?: string | null
          cnpj?: string | null
          complement?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          neighborhood?: string | null
          number?: string | null
          phone?: string | null
          primary_color?: string | null
          state?: string | null
          street?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          cep?: string | null
          city?: string | null
          cnpj?: string | null
          complement?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          neighborhood?: string | null
          number?: string | null
          phone?: string | null
          primary_color?: string | null
          state?: string | null
          street?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          job_id: string | null
          product_id: string
          quantity: number
          reason: string | null
          shop_id: string
          type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          job_id?: string | null
          product_id: string
          quantity: number
          reason?: string | null
          shop_id: string
          type?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          job_id?: string | null
          product_id?: string
          quantity?: number
          reason?: string | null
          shop_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      technicians: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          shop_id: string
          specialization: string | null
          user_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          shop_id: string
          specialization?: string | null
          user_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          shop_id?: string
          specialization?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "technicians_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          color: string | null
          created_at: string
          customer_id: string | null
          id: string
          km: number | null
          model: string | null
          observations: string | null
          photo_url: string | null
          plate: string
          shop_id: string
          year: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          km?: number | null
          model?: string | null
          observations?: string | null
          photo_url?: string | null
          plate: string
          shop_id: string
          year?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          km?: number | null
          model?: string | null
          observations?: string | null
          photo_url?: string | null
          plate?: string
          shop_id?: string
          year?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_templates: {
        Row: {
          active: boolean
          created_at: string
          id: string
          message_template: string
          name: string
          shop_id: string
          trigger_type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          message_template: string
          name: string
          shop_id: string
          trigger_type?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          message_template?: string
          name?: string
          shop_id?: string
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_templates_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_shop_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "owner" | "employee"
      job_status: "waiting" | "in_progress" | "done" | "delivered"
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
      app_role: ["owner", "employee"],
      job_status: ["waiting", "in_progress", "done", "delivered"],
    },
  },
} as const
