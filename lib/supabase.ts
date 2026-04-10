import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export function getSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }
  
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

export function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase service role key')
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

export async function getSession() {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.auth.getSession()
  
  if (error) {
    console.error('Error getting session:', error)
    return null
  }
  
  return data.session
}

export async function getUser() {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.auth.getUser()
  
  if (error) {
    console.error('Error getting user:', error)
    return null
  }
  
  return data.user
}

export async function signInWithMagicLink(email: string) {
  const supabase = getSupabaseClient()
  const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`
  
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectUrl,
    },
  })
  
  if (error) throw error
  return data
}

export async function signInWithGoogle() {
  const supabase = getSupabaseClient()
  const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
    },
  })
  
  if (error) throw error
  return data
}

export async function signOut() {
  const supabase = getSupabaseClient()
  const { error } = await supabase.auth.signOut()
  
  if (error) throw error
}

export async function getUserProfile(userId: string) {
  const supabase = getSupabaseClient()
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()
  
  if (error) throw error
  return data
}

export async function updateUserProfile(userId: string, updates: Partial<any>) {
  const supabase = getSupabaseClient()
  
  const { data, error } = await supabase
    .from('users')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function getUserCampaigns(userId: string) {
  const supabase = getSupabaseClient()
  
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

export async function getCampaign(campaignId: string) {
  const supabase = getSupabaseClient()
  
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .single()
  
  if (error) throw error
  return data
}

export async function createCampaign(campaign: any) {
  const supabase = getSupabaseClient()
  
  const { data, error } = await supabase
    .from('campaigns')
    .insert(campaign)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function updateCampaign(campaignId: string, updates: Partial<any>) {
  const supabase = getSupabaseClient()
  
  const { data, error } = await supabase
    .from('campaigns')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', campaignId)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function deleteCampaign(campaignId: string) {
  const supabase = getSupabaseClient()
  
  const { error } = await supabase
    .from('campaigns')
    .delete()
    .eq('id', campaignId)
  
  if (error) throw error
}

export async function getAgentOutputs(campaignId: string) {
  const supabase = getSupabaseClient()
  
  const { data, error } = await supabase
    .from('agent_outputs')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

export async function createAgentOutput(output: any) {
  const supabase = getSupabaseClient()
  
  const { data, error } = await supabase
    .from('agent_outputs')
    .insert(output)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function getChatMessages(agentOutputId: string) {
  const supabase = getSupabaseClient()
  
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('agent_output_id', agentOutputId)
    .order('created_at', { ascending: true })
  
  if (error) throw error
  return data
}

export async function createChatMessage(message: any) {
  const supabase = getSupabaseClient()
  
  const { data, error } = await supabase
    .from('chat_messages')
    .insert(message)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function getCreditTransactions(userId: string, limit = 10) {
  const supabase = getSupabaseClient()
  
  const { data, error } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  
  if (error) throw error
  return data
}

export async function createCreditTransaction(transaction: any) {
  const supabase = getSupabaseClient()
  
  const { data, error } = await supabase
    .from('credit_transactions')
    .insert(transaction)
    .select()
    .single()
  
  if (error) throw error
  return data
}
