import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://rxjnytqivnirqemkixul.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4am55dHFpdm5pcnFlbWtpeHVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyOTM2MTIsImV4cCI6MjA4OTg2OTYxMn0.wBkZmaJFC5GA2j8Mwl33Nt8VUX5oVPjk-S7NsqbDeyA'
)