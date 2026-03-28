import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_AGENTS, DEFAULT_SLA, DEFAULT_EMAIL_CONFIG, DEFAULT_EMAIL_TRIGGERS, DEFAULT_INBOUND_EMAIL, DEFAULT_EMAIL_LOG, DEFAULT_CATEGORIES, DEFAULT_TICKET_SETTINGS, DEFAULT_EMAIL_TEMPLATES, DEFAULT_GROUPS } from '../data/seedData'

export const useAdminStore = create(
  persist(
    (set, get) => ({
      companyProfile: {
        name: 'HelpdeskPro',
        website: '',
        phone: '',
        address: '',
        logo: null,
      },

      updateCompanyProfile: (changes) => {
        set(s => ({ companyProfile: { ...s.companyProfile, ...changes } }))
      },

      groups: DEFAULT_GROUPS,
      ticketSettings: DEFAULT_TICKET_SETTINGS,
      emailTemplates: DEFAULT_EMAIL_TEMPLATES,

      addGroup: (group) => {
        const id = 'grp-' + Date.now()
        set(s => ({ groups: [...s.groups, { ...group, id, isBuiltin: false }] }))
      },
      updateGroup: (id, changes) => {
        set(s => ({ groups: s.groups.map(g => g.id === id ? { ...g, ...changes } : g) }))
      },
      deleteGroup: (id) => {
        set(s => ({ groups: s.groups.filter(g => g.id !== id || g.isBuiltin) }))
      },
      getGroupById:  (id) => get().groups.find(g => g.id === id),
      getGroupName:  (id) => { const g = get().groups.find(g => g.id === id); return g ? g.name : '—' },

      updateTicketSettings: (changes) => {
        set(s => ({ ticketSettings: { ...s.ticketSettings, ...changes } }))
      },

      updateEmailTemplate: (key, changes) => {
        set(s => ({
          emailTemplates: {
            ...s.emailTemplates,
            [key]: { ...s.emailTemplates[key], ...changes },
          },
        }))
      },

        agents: DEFAULT_AGENTS,
      slaSettings: DEFAULT_SLA,
      emailConfig: DEFAULT_EMAIL_CONFIG,
      emailTriggers: DEFAULT_EMAIL_TRIGGERS,
      inboundEmail: DEFAULT_INBOUND_EMAIL,
      emailLog: DEFAULT_EMAIL_LOG,
      categories: DEFAULT_CATEGORIES,

      addAgent: (agent) => {
        const id = 'agent-' + Date.now()
        const initials = agent.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
        set(s => ({
          agents: [...s.agents.filter(a => a.id !== 'unassigned'), { ...agent, id, initials }, s.agents.find(a => a.id === 'unassigned')].filter(Boolean)
        }))
      },

      deleteAgent: (id) => {
        set(s => ({ agents: s.agents.filter(a => a.id !== id) }))
      },

      updateSla: (priority, hours) => {
        set(s => ({ slaSettings: { ...s.slaSettings, [priority]: Number(hours) } }))
      },

      updateEmailConfig: (changes) => {
        set(s => ({ emailConfig: { ...s.emailConfig, ...changes } }))
      },

      updateEmailTriggers: (changes) => {
        set(s => ({ emailTriggers: { ...s.emailTriggers, ...changes } }))
      },

      updateInboundEmail: (changes) => {
        set(s => ({ inboundEmail: { ...s.inboundEmail, ...changes } }))
      },

      addEmailLogEntry: (entry) => {
        set(s => ({ emailLog: [entry, ...s.emailLog].slice(0, 100) }))
      },

      clearEmailLog: () => set({ emailLog: [] }),

      // ── Category actions ──────────────────────────────────────────────
      addCategory: (cat) => {
        const id = cat.name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
        const maxOrder = get().categories.reduce((m, c) => Math.max(m, c.sortOrder), 0)
        set(s => ({
          categories: [
            ...s.categories,
            { ...cat, id, isBuiltin: false, sortOrder: maxOrder + 10 }
          ]
        }))
        return id
      },

      updateCategory: (id, changes) => {
        set(s => ({
          categories: s.categories.map(c => c.id === id ? { ...c, ...changes } : c)
        }))
      },

      deleteCategory: (id) => {
        set(s => ({
          categories: s.categories.filter(c => c.id !== id || c.isBuiltin)
        }))
      },

      getCategoryById: (id) => get().categories.find(c => c.id === id),
      getCategoryName: (id) => {
        const c = get().categories.find(cat => cat.id === id)
        return c ? c.name : id
      },

      resetAgents: () => set({ agents: DEFAULT_AGENTS }),

      getAgentById: (id) => get().agents.find(a => a.id === id),
      getAgentName: (id) => {
        const a = get().agents.find(ag => ag.id === id)
        return a ? a.name : '—'
      },
    }),
    { name: 'helpdesk-admin' }
  )
)
