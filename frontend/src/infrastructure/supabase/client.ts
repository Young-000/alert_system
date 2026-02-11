import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'alert_system',
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Types for database tables
export interface DbUser {
  id: string;
  email: string;
  phone_number: string;
  name: string | null;
  password_hash: string | null;
  location: string | null;
  google_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbAlert {
  id: string;
  user_id: string;
  name: string;
  time: string;
  days_of_week: number[];
  is_active: boolean;
  include_weather: boolean;
  include_air_quality: boolean;
  include_bus: boolean;
  include_subway: boolean;
  bus_stop_id: string | null;
  bus_route_id: string | null;
  subway_station_id: string | null;
  subway_line: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbSubwayStation {
  id: string;
  station_id: string;
  station_name: string;
  line_name: string;
  created_at: string;
}

export interface DbAirQualityCache {
  id: string;
  sido_name: string;
  station_name: string;
  pm10: number;
  pm25: number;
  aqi: number;
  status: string;
  fetched_at: string;
  expires_at: string;
}

export interface DbWeatherCache {
  id: string;
  lat: number;
  lng: number;
  location: string;
  temperature: number;
  condition: string;
  humidity: number;
  wind_speed: number;
  fetched_at: string;
  expires_at: string;
}
