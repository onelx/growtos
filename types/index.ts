export type UserPlan = 'free' | 'pro' | 'enterprise'

export type CampaignStatus = 
  | 'intake' 
  | 'strategist' 
  | 'researcher' 
  | 'copywriter' 
  | 'completed' 
  | 'failed'

export type AgentType = 'strategist' | 'researcher' | 'copywriter'

export type ChatRole = 'user' | 'assistant' | 'system'

export interface User {
  id: string
  email: string
  full_name?: string
  plan: UserPlan
  credits_balance: number
  created_at: string
  updated_at: string
}

export interface IntakeData {
  businessName: string
  businessDescription: string
  targetAudience: string
  goals: string[]
  budget?: number
  timeline?: string
  constraints?: string
  existingAssets?: string[]
}

export interface CampaignDNA {
  brandVoice?: {
    tone: string
    language: string
    values: string[]
  }
  targetMarket?: {
    demographics: Record<string, any>
    psychographics: Record<string, any>
    painPoints: string[]
  }
  positioning?: {
    uniqueValueProposition: string
    differentiators: string[]
    competitiveAdvantage: string
  }
  messaging?: {
    coreMessages: string[]
    hooks: string[]
    callsToAction: string[]
  }
  strategy?: {
    channels: string[]
    tactics: string[]
    metrics: Record<string, any>
  }
  research?: {
    competitorInsights: Record<string, any>
    marketTrends: string[]
    opportunityAreas: string[]
  }
  content?: {
    headlines: string[]
    bodyCopy: string[]
    socialPosts: Array<{ platform: string; content: string }>
    emailSequences: Array<{ subject: string; body: string }>
  }
}

export interface Campaign {
  id: string
  user_id: string
  name: string
  status: CampaignStatus
  intake_data: IntakeData
  campaign_dna: CampaignDNA
  created_at: string
  updated_at: string
}

export interface AgentOutputContent {
  summary?: string
  details?: Record<string, any>
  recommendations?: string[]
  nextSteps?: string[]
  dnaContributions?: Partial<CampaignDNA>
  artifacts?: Array<{
    type: string
    title: string
    content: string | Record<string, any>
  }>
}

export interface AgentOutput {
  id: string
  campaign_id: string
  agent_type: AgentType
  version: number
  input_context: Record<string, any>
  output_content: AgentOutputContent
  quality_score?: number
  tokens_used?: number
  created_at: string
}

export interface ChatMessage {
  id: string
  agent_output_id: string
  role: ChatRole
  content: string
  created_at: string
}

export interface CreditTransaction {
  id: string
  user_id: string
  amount: number
  balance_after: number
  reason: string
  metadata: Record<string, any>
  created_at: string
}

export interface QualityGate {
  id: string
  agent_type: AgentType
  checklist: Array<{
    id: string
    label: string
    description?: string
    required: boolean
    checked: boolean
  }>
  passed: boolean
  feedback?: string
}

export interface AgentConfig {
  type: AgentType
  name: string
  role: string
  description: string
  systemPrompt: string
  estimatedTokens: number
  qualityGateChecks: Array<{
    id: string
    label: string
    description?: string
    required: boolean
  }>
}

export interface StreamingMessage {
  content: string
  done: boolean
  error?: string
}

export interface APIError {
  error: string
  message: string
  statusCode: number
  details?: any
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface AuthState {
  user: User | null
  session: any | null
  loading: boolean
  signIn: (email: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

export interface CampaignState {
  campaigns: Campaign[]
  activeCampaign: Campaign | null
  loading: boolean
  error: string | null
  fetchCampaigns: () => Promise<void>
  fetchCampaign: (id: string) => Promise<void>
  createCampaign: (data: { name: string; intake_data: IntakeData }) => Promise<Campaign>
  updateCampaign: (id: string, updates: Partial<Campaign>) => Promise<void>
  deleteCampaign: (id: string) => Promise<void>
  setActiveCampaign: (campaign: Campaign | null) => void
  updateCampaignDNA: (id: string, dna: Partial<CampaignDNA>) => Promise<void>
}

export interface AgentState {
  currentAgent: AgentType | null
  messages: ChatMessage[]
  streaming: boolean
  error: string | null
  sendMessage: (agentType: AgentType, content: string, campaignId: string) => Promise<void>
  executeAgent: (agentType: AgentType, campaignId: string, context: Record<string, any>) => Promise<AgentOutput>
  clearMessages: () => void
}

export interface CreditsState {
  balance: number
  loading: boolean
  fetchBalance: () => Promise<void>
  deductCredits: (amount: number, reason: string, metadata?: Record<string, any>) => Promise<void>
  estimateCost: (agentType: AgentType, contextSize?: number) => number
}
