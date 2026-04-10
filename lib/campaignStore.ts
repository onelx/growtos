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

const initialDNA: CampaignDNA = {}

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
