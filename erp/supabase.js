// Supabase Configuration
const SUPABASE_URL = "https://vmepvvrceqjypadkcfkj.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtZXB2dnJjZXFqeXBhZGtjZmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NjU3ODIsImV4cCI6MjA4ODA0MTc4Mn0.YjOVSoz1GYx5igqJveiS7r0Gyyt-UKmbj5zPysc6ut4";

// Initialize the Supabase Client
// Attached to window.supa to ensure global access across all module scripts
window.supa = supabase.createClient(
    SUPABASE_URL, 
    SUPABASE_KEY
);