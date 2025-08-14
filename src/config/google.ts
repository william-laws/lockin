// Google OAuth Configuration
// Update these values with your actual Google Cloud Console credentials

export const GOOGLE_CONFIG = {
  // Your Google OAuth 2.0 Client ID from Google Cloud Console
  CLIENT_ID: 'YOUR_GOOGLE_CLIENT_ID',
  
  // Your Google OAuth 2.0 Client Secret from Google Cloud Console
  CLIENT_SECRET: 'YOUR_GOOGLE_CLIENT_SECRET',
  
  // OAuth redirect URI - must match exactly what's configured in Google Cloud Console
  REDIRECT_URI: 'http://localhost:5173/auth/callback',
  
  // Scopes for Google Calendar access
  SCOPES: [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/userinfo.email'
  ].join(' ')
}

// Helper function to check if credentials are configured
export const isGoogleConfigured = (): boolean => {
  return GOOGLE_CONFIG.CLIENT_ID !== 'YOUR_GOOGLE_CLIENT_ID' && 
         GOOGLE_CONFIG.CLIENT_SECRET !== 'YOUR_GOOGLE_CLIENT_SECRET'
} 