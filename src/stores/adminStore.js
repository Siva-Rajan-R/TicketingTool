import { create } from 'zustand'
import { api } from '../api/client'

export const useAdminStore = create((set, get) => ({
  agents: [],
  slaSettings: { critical: 1, high: 4, medium: 8, low: 24 },
  emailConfig: { type: 'smtp', smtp: {}, trigger_new: true, trigger_assign: true, trigger_resolve: true },
  loading: false,

  fetchAgents: async () => {
    try {
      const data = await api.get('/agents')
      set({ agents: data })
    } catch (e) {
      console.error('fetchAgents error', e)
    }
  },

  fetchSla: async () => {
    try {
      const data = await api.get('/admin/sla')
      set({
        slaSettings: {
          critical: data.critical_hours,
          high:     data.high_hours,
          medium:   data.medium_hours,
          low:      data.low_hours,
        },
      })
    } catch (e) {
      console.error('fetchSla error', e)
    }
  },

  fetchEmailConfig: async () => {
    try {
      const data = await api.get('/admin/email')
      set({ emailConfig: data })
    } catch (e) {
      console.error('fetchEmailConfig error', e)
    }
  },

  addAgent: async (agentData) => {
    const initials = agentData.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    const body = {
      name:      agentData.name,
      initials,
      group:     agentData.group,
      username:  agentData.username,
      password:  agentData.password,
      role:      agentData.role || 'technician',
    }
    const data = await api.post('/agents', body)
    set(s => ({ agents: [...s.agents, data] }))
    return data
  },

  deleteAgent: async (id) => {
    await api.delete(`/agents/${id}`)
    set(s => ({ agents: s.agents.filter(a => String(a.id) !== String(id)) }))
  },

  updateSla: async (slaValues) => {
    const body = {
      critical_hours: Number(slaValues.critical),
      high_hours:     Number(slaValues.high),
      medium_hours:   Number(slaValues.medium),
      low_hours:      Number(slaValues.low),
    }
    const data = await api.put('/admin/sla', body)
    set({
      slaSettings: {
        critical: data.critical_hours,
        high:     data.high_hours,
        medium:   data.medium_hours,
        low:      data.low_hours,
      },
    })
  },

  updateEmailConfig: async (payload) => {
    const data = await api.put('/admin/email', payload)
    set({ emailConfig: data })
  },

  getAgentById: (id) => get().agents.find(a => String(a.id) === String(id)),
  getAgentName: (id) => {
    if (!id) return '—'
    const a = get().agents.find(ag => String(ag.id) === String(id))
    return a ? a.name : '—'
  },
}))
