import { supabase } from './supabase'
import { GOOGLE_CONFIG, isGoogleConfigured } from '../config/google'

export class GoogleCalendarService {
  private static instance: GoogleCalendarService
  private accessToken: string | null = null
  private refreshToken: string | null = null

  static getInstance(): GoogleCalendarService {
    if (!GoogleCalendarService.instance) {
      GoogleCalendarService.instance = new GoogleCalendarService()
    }
    return GoogleCalendarService.instance
  }

  // Initialize OAuth flow
  async connectGoogleCalendar(): Promise<void> {
    if (!isGoogleConfigured()) {
      throw new Error('Google OAuth not configured. Please update src/config/google.ts with your credentials.')
    }

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${GOOGLE_CONFIG.CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(GOOGLE_CONFIG.REDIRECT_URI)}&` +
      `scope=${encodeURIComponent(GOOGLE_CONFIG.SCOPES)}&` +
      `response_type=code&` +
      `access_type=offline&` +
      `prompt=consent`

    // Open OAuth popup
    const popup = window.open(authUrl, 'google-oauth', 'width=500,height=600')
    
    if (!popup) {
      throw new Error('Popup blocked. Please allow popups for this site.')
    }

    // Listen for the OAuth callback
    return new Promise((resolve, reject) => {
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed)
          reject(new Error('OAuth popup was closed'))
        }
      }, 1000)

      // Handle OAuth callback
      window.addEventListener('message', async (event) => {
        if (event.origin !== window.location.origin) return
        
        if (event.data.type === 'GOOGLE_OAUTH_SUCCESS') {
          const { code } = event.data
          try {
            await this.handleOAuthCallback(code)
            popup.close()
            clearInterval(checkClosed)
            resolve()
          } catch (error) {
            popup.close()
            clearInterval(checkClosed)
            reject(error)
          }
        } else if (event.data.type === 'GOOGLE_OAUTH_ERROR') {
          const { error } = event.data
          popup.close()
          clearInterval(checkClosed)
          reject(new Error(`OAuth Error: ${error}`))
        }
      })
    })
  }

  // Handle OAuth callback - exchange code for tokens
  private async handleOAuthCallback(code: string): Promise<void> {
    try {
      // Exchange authorization code for access and refresh tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CONFIG.CLIENT_ID,
          client_secret: GOOGLE_CONFIG.CLIENT_SECRET,
          redirect_uri: GOOGLE_CONFIG.REDIRECT_URI,
          grant_type: 'authorization_code',
        }),
      })

      if (!tokenResponse.ok) {
        throw new Error('Failed to exchange authorization code for tokens')
      }

      const tokenData = await tokenResponse.json()
      
      // Store tokens securely
      this.accessToken = tokenData.access_token
      this.refreshToken = tokenData.refresh_token

      // Get user info to get email
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      })

      if (!userInfoResponse.ok) {
        throw new Error('Failed to get user info')
      }

      const userInfo = await userInfoResponse.json()
      const email = userInfo.email

      // Store connection in Supabase
      if (this.accessToken && this.refreshToken) {
        await this.storeConnectionInSupabase({
          access_token: this.accessToken,
          refresh_token: this.refreshToken,
          expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
          email,
        })
      } else {
        throw new Error('Failed to obtain access and refresh tokens')
      }

      console.log('Google Calendar connected successfully')
    } catch (error) {
      console.error('Error handling OAuth callback:', error)
      throw error
    }
  }

  // Store connection in Supabase
  private async storeConnectionInSupabase(tokenData: {
    access_token: string
    refresh_token: string
    expires_at: string
    email: string
  }): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('google_calendar_connections')
        .upsert({
          user_id: 'current_user', // You'll need to implement user authentication
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: tokenData.expires_at,
          email: tokenData.email,
          created_at: new Date().toISOString()
        })

      if (error) {
        console.error('Error storing connection in Supabase:', error)
        throw error
      }
    } catch (error) {
      console.error('Error storing connection:', error)
      throw error
    }
  }

  // Check if connected
  async isConnected(): Promise<boolean> {
    try {
      // Check Supabase for existing connection
      const { data, error } = await supabase
        .from('google_calendar_connections')
        .select('*')
        .single()

      if (error || !data) {
        return false
      }

      // Check if token is expired
      if (new Date(data.expires_at) <= new Date()) {
        // Try to refresh the token
        if (data.refresh_token) {
          try {
            await this.refreshAccessToken(data.refresh_token)
            return true
          } catch (refreshError) {
            console.error('Failed to refresh token:', refreshError)
            return false
          }
        }
        return false
      }

      this.accessToken = data.access_token
      this.refreshToken = data.refresh_token
      return true
    } catch (error) {
      console.error('Error checking connection status:', error)
      return false
    }
  }

  // Refresh access token
  private async refreshAccessToken(refreshToken: string): Promise<void> {
    try {
          const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: GOOGLE_CONFIG.CLIENT_ID,
        client_secret: GOOGLE_CONFIG.CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })

      if (!response.ok) {
        throw new Error('Failed to refresh access token')
      }

      const tokenData = await response.json()
      
      // Update tokens
      this.accessToken = tokenData.access_token
      if (tokenData.refresh_token) {
        this.refreshToken = tokenData.refresh_token
      }

      // Update in Supabase
      await supabase
        .from('google_calendar_connections')
        .update({
          access_token: this.accessToken,
          refresh_token: this.refreshToken,
          expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        })
        .eq('refresh_token', refreshToken)

    } catch (error) {
      console.error('Error refreshing access token:', error)
      throw error
    }
  }

  // Disconnect Google Calendar
  async disconnectGoogleCalendar(): Promise<void> {
    try {
      // Revoke tokens with Google
      if (this.accessToken) {
        try {
          await fetch(`https://oauth2.googleapis.com/revoke?token=${this.accessToken}`, {
            method: 'POST',
          })
        } catch (error) {
          console.warn('Failed to revoke token with Google:', error)
        }
      }

      // Remove from Supabase
      await supabase
        .from('google_calendar_connections')
        .delete()
        .neq('id', 0) // Delete all records

      this.accessToken = null
      this.refreshToken = null
    } catch (error) {
      console.error('Error disconnecting Google Calendar:', error)
      throw error
    }
  }

  // Get connection email
  async getConnectionEmail(): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('google_calendar_connections')
        .select('email')
        .single()

      if (error || !data) {
        return null
      }

      return data.email
    } catch (error) {
      console.error('Error getting connection email:', error)
      return null
    }
  }

  // Get calendar events (example method)
  async getCalendarEvents(calendarId: string = 'primary', timeMin?: string, timeMax?: string): Promise<any[]> {
    if (!this.accessToken) {
      throw new Error('Not connected to Google Calendar')
    }

    try {
      const params = new URLSearchParams({
        timeMin: timeMin || new Date().toISOString(),
        timeMax: timeMax || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        singleEvents: 'true',
        orderBy: 'startTime',
      })

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch calendar events')
      }

      const data = await response.json()
      return data.items || []
    } catch (error) {
      console.error('Error fetching calendar events:', error)
      throw error
    }
  }
}

export const googleCalendarService = GoogleCalendarService.getInstance() 