import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Campaign, CampaignDNA } from '@/types'

interface CampaignState {
  activeCampaign: Campaign | null
  campaignDNA: CampaignDNA
  setActiveCampaign: (campaign: Campaign | null) => void
  updateDNA: (dna: Partial<CampaignDNA>) => void
  clearCampaign: () => void
}

const initialDNA: CampaignDNA = {
  business_idea: '',
  target_audience: '',
  unique_value_proposition: '',
  positioning_statement: '',
  brand_voice: '',
  key_messages: [],
  content_pillars: [],
  distribution_channels: [],
  success_metrics: [],
  budget_allocation: {},
  timeline: {},
  competitive_advantages: [],
  market_insights: []
}

export const useCampaignStore = create<CampaignState>()(
  persist(
    (set) => ({
      activeCampaign: null,
      campaignDNA: initialDNA,
      
      setActiveCampaign: (campaign) => {
        set({ 
          activeCampaign: campaign,
          campaignDNA: campaign?.campaign_dna || initialDNA
        })
      },
      
      updateDNA: (dna) => {
        set((state) => ({
          campaignDNA: {
            ...state.campaignDNA,
            ...dna
          }
        }))
      },
      
      clearCampaign: () => {
        set({
          activeCampaign: null,
          campaignDNA: initialDNA
        })
      }
    }),
    {
      name: 'growtos-campaign',
      partialize: (state) => ({
        activeCampaign: state.activeCampaign,
        campaignDNA: state.campaignDNA
      })
    }
  )
)
