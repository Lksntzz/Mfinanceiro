import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = "https://ckpqoqwvnltmbvyqmmme.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrcHFvcXd2bmx0bWJ2eXFtbW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NjI2NDgsImV4cCI6MjA5MTEzODY0OH0.mlVom68ohDU4A4AjHHsAeCdzlIW6f_7A_G7JANBPfno";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export { supabase };