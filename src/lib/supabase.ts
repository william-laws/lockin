import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://gnwbenytvyovetboyrjb.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdud2Jlbnl0dnlvdmV0Ym95cmpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4Njg3MzksImV4cCI6MjA3MDQ0NDczOX0.4j1L87O0ol8IikmEwf3dOtPVCX8R_hn_xQtszwlJAK4'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Google Calendar connection status interface
export interface GoogleCalendarStatus {
  isConnected: boolean
  email?: string
  accessToken?: string
  refreshToken?: string
}