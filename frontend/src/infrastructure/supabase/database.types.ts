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
  alert_system: {
    Tables: {
      air_quality_cache: {
        Row: {
          aqi: number
          expires_at: string
          fetched_at: string | null
          id: string
          pm10: number
          pm25: number
          sido_name: string
          station_name: string
          status: string
        }
        Insert: {
          aqi: number
          expires_at: string
          fetched_at?: string | null
          id?: string
          pm10: number
          pm25: number
          sido_name: string
          station_name: string
          status: string
        }
        Update: {
          aqi?: number
          expires_at?: string
          fetched_at?: string | null
          id?: string
          pm10?: number
          pm25?: number
          sido_name?: string
          station_name?: string
          status?: string
        }
        Relationships: []
      }
      alerts: {
        Row: {
          alert_types: string
          bus_stop_id: string | null
          created_at: string
          enabled: boolean
          id: string
          name: string
          route_id: string | null
          schedule: string
          subway_station_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_types: string
          bus_stop_id?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          name: string
          route_id?: string | null
          schedule: string
          subway_station_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_types?: string
          bus_stop_id?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          name?: string
          route_id?: string | null
          schedule?: string
          subway_station_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "FK_f1eba840c1761991f142affee66"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      api_call_log: {
        Row: {
          api_name: string
          called_at: string | null
          endpoint: string
          error_message: string | null
          id: string
          response_time_ms: number
          success: boolean
        }
        Insert: {
          api_name: string
          called_at?: string | null
          endpoint: string
          error_message?: string | null
          id?: string
          response_time_ms: number
          success?: boolean
        }
        Update: {
          api_name?: string
          called_at?: string | null
          endpoint?: string
          error_message?: string | null
          id?: string
          response_time_ms?: number
          success?: boolean
        }
        Relationships: []
      }
      bus_arrival_cache: {
        Row: {
          arrivals: Json
          expires_at: string
          fetched_at: string | null
          id: string
          stop_id: string
        }
        Insert: {
          arrivals?: Json
          expires_at: string
          fetched_at?: string | null
          id?: string
          stop_id: string
        }
        Update: {
          arrivals?: Json
          expires_at?: string
          fetched_at?: string | null
          id?: string
          stop_id?: string
        }
        Relationships: []
      }
      checkpoint_records: {
        Row: {
          actual_duration_from_previous: number | null
          actual_wait_time: number | null
          arrived_at: string | null
          checkpoint_id: string
          created_at: string | null
          delay_minutes: number | null
          id: string
          notes: string | null
          session_id: string
          wait_delay_minutes: number | null
        }
        Insert: {
          actual_duration_from_previous?: number | null
          actual_wait_time?: number | null
          arrived_at?: string | null
          checkpoint_id: string
          created_at?: string | null
          delay_minutes?: number | null
          id?: string
          notes?: string | null
          session_id: string
          wait_delay_minutes?: number | null
        }
        Update: {
          actual_duration_from_previous?: number | null
          actual_wait_time?: number | null
          arrived_at?: string | null
          checkpoint_id?: string
          created_at?: string | null
          delay_minutes?: number | null
          id?: string
          notes?: string | null
          session_id?: string
          wait_delay_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "checkpoint_records_checkpoint_id_fkey"
            columns: ["checkpoint_id"]
            isOneToOne: false
            referencedRelation: "route_checkpoints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkpoint_records_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "commute_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      commute_routes: {
        Row: {
          created_at: string | null
          id: string
          is_preferred: boolean | null
          name: string
          route_type: string
          total_expected_duration: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_preferred?: boolean | null
          name: string
          route_type: string
          total_expected_duration?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_preferred?: boolean | null
          name?: string
          route_type?: string
          total_expected_duration?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commute_routes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      commute_sessions: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          notes: string | null
          route_id: string
          started_at: string | null
          status: string
          total_delay_minutes: number | null
          total_duration_minutes: number | null
          total_wait_minutes: number | null
          user_id: string
          weather_condition: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          route_id: string
          started_at?: string | null
          status?: string
          total_delay_minutes?: number | null
          total_duration_minutes?: number | null
          total_wait_minutes?: number | null
          user_id: string
          weather_condition?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          route_id?: string
          started_at?: string | null
          status?: string
          total_delay_minutes?: number | null
          total_duration_minutes?: number | null
          total_wait_minutes?: number | null
          user_id?: string
          weather_condition?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commute_sessions_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "commute_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commute_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          keys: string
          user_id: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          keys: string
          user_id: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          keys?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "FK_6771f119f1c06d2ccf38f238664"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      route_checkpoints: {
        Row: {
          checkpoint_type: string
          created_at: string | null
          expected_duration_to_next: number | null
          expected_wait_time: number | null
          id: string
          line_info: string | null
          linked_bus_stop_id: string | null
          linked_station_id: string | null
          name: string
          route_id: string
          sequence_order: number
          transport_mode: string | null
        }
        Insert: {
          checkpoint_type: string
          created_at?: string | null
          expected_duration_to_next?: number | null
          expected_wait_time?: number | null
          id?: string
          line_info?: string | null
          linked_bus_stop_id?: string | null
          linked_station_id?: string | null
          name: string
          route_id: string
          sequence_order: number
          transport_mode?: string | null
        }
        Update: {
          checkpoint_type?: string
          created_at?: string | null
          expected_duration_to_next?: number | null
          expected_wait_time?: number | null
          id?: string
          line_info?: string | null
          linked_bus_stop_id?: string | null
          linked_station_id?: string | null
          name?: string
          route_id?: string
          sequence_order?: number
          transport_mode?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "route_checkpoints_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "commute_routes"
            referencedColumns: ["id"]
          },
        ]
      }
      subway_arrival_cache: {
        Row: {
          arrivals: Json
          expires_at: string
          fetched_at: string | null
          id: string
          station_name: string
        }
        Insert: {
          arrivals?: Json
          expires_at: string
          fetched_at?: string | null
          id?: string
          station_name: string
        }
        Update: {
          arrivals?: Json
          expires_at?: string
          fetched_at?: string | null
          id?: string
          station_name?: string
        }
        Relationships: []
      }
      subway_stations: {
        Row: {
          code: string | null
          created_at: string
          id: string
          line: string
          name: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          line: string
          name: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          line?: string
          name?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string
          email: string
          google_id: string | null
          id: string
          location: string | null
          name: string
          password_hash: string | null
          phone_number: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          google_id?: string | null
          id?: string
          location?: string | null
          name: string
          password_hash?: string | null
          phone_number?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          google_id?: string | null
          id?: string
          location?: string | null
          name?: string
          password_hash?: string | null
          phone_number?: string
          updated_at?: string
        }
        Relationships: []
      }
      weather_cache: {
        Row: {
          condition: string
          expires_at: string
          fetched_at: string | null
          humidity: number
          id: string
          lat: number
          lng: number
          location: string
          temperature: number
          wind_speed: number
        }
        Insert: {
          condition: string
          expires_at: string
          fetched_at?: string | null
          humidity: number
          id?: string
          lat: number
          lng: number
          location: string
          temperature: number
          wind_speed: number
        }
        Update: {
          condition?: string
          expires_at?: string
          fetched_at?: string | null
          humidity?: number
          id?: string
          lat?: number
          lng?: number
          location?: string
          temperature?: number
          wind_speed?: number
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
  alert_system: {
    Enums: {},
  },
} as const
