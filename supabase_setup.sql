-- Create the google_calendar_connections table
CREATE TABLE IF NOT EXISTS google_calendar_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_google_calendar_connections_user_id ON google_calendar_connections(user_id);

-- Create an index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_google_calendar_connections_email ON google_calendar_connections(email);

-- Enable Row Level Security (RLS)
ALTER TABLE google_calendar_connections ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations (for demo purposes)
-- In production, you should restrict this based on user authentication
CREATE POLICY "Allow all operations" ON google_calendar_connections
  FOR ALL USING (true)
  WITH CHECK (true);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to automatically update the updated_at column
CREATE TRIGGER update_google_calendar_connections_updated_at
  BEFORE UPDATE ON google_calendar_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 