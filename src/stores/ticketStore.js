import { create } from 'zustand'
import { api, normalizeTicket } from '../api/client'

export const useTicketStore = create((set, get) => ({
  tickets: [],
  loading: false,
  filters: { status: '', priority: '', category: '', sort: 'newest', search: '' },
  selectedIds: [],  // stores _uuid values

  fetchTickets: async () => {
    set({ loading: true })
    try {
      const data = await api.get('/tickets?page_size=100')
      set({ tickets: (data.items || []).map(normalizeTicket) })
    } catch (e) {
      console.error('fetchTickets error', e)
    } finally {
      set({ loading: false })
    }
  },

  addTicket: async (formData) => {
    const body = {
      subject:       formData.subject,
      category:      formData.category,
      priority:      formData.priority,
      submitter_name: formData.contactName || formData.submitter || '',
      company:       formData.company || '',
      contact_name:  formData.contactName || '',
      email:         formData.email || '',
      phone:         formData.phone || null,
      asset:         formData.asset || null,
      description:   formData.description,
    }
    const data = await api.post('/tickets', body)
    const ticket = normalizeTicket(data)
    set(s => ({ tickets: [ticket, ...s.tickets] }))
    return ticket
  },

  updateTicket: async (uuid, changes) => {
    const body = {}
    if (changes.status   !== undefined) body.status    = changes.status
    if (changes.priority !== undefined) body.priority  = changes.priority
    if (changes.assignee !== undefined) body.assignee_id = changes.assignee || null
    const data = await api.patch(`/tickets/${uuid}`, body)
    const updated = normalizeTicket(data)
    set(s => ({ tickets: s.tickets.map(t => t._uuid === uuid ? updated : t) }))
    return updated
  },

  addTimelineEvent: async (uuid, event) => {
    const data = await api.post(`/tickets/${uuid}/comments`, { text: event.text })
    const updated = normalizeTicket(data)
    set(s => ({ tickets: s.tickets.map(t => t._uuid === uuid ? updated : t) }))
    return updated
  },

  deleteTicket: async (uuid) => {
    await api.delete(`/tickets/${uuid}`)
    set(s => ({ tickets: s.tickets.filter(t => t._uuid !== uuid) }))
  },

  bulkUpdate: async (uuids, changes) => {
    const action = changes.status === 'resolved' ? 'resolve' : 'close'
    await api.post('/tickets/bulk', { ticket_ids: uuids, action })
    await get().fetchTickets()
    set({ selectedIds: [] })
  },

  bulkDelete: async (uuids) => {
    await api.post('/tickets/bulk', { ticket_ids: uuids, action: 'delete' })
    set(s => ({ tickets: s.tickets.filter(t => !uuids.includes(t._uuid)), selectedIds: [] }))
  },

  setFilter: (key, value) => {
    set(s => ({ filters: { ...s.filters, [key]: value } }))
  },

  resetFilters: () => {
    set({ filters: { status: '', priority: '', category: '', sort: 'newest', search: '' } })
  },

  toggleSelect: (uuid) => {
    set(s => ({
      selectedIds: s.selectedIds.includes(uuid)
        ? s.selectedIds.filter(i => i !== uuid)
        : [...s.selectedIds, uuid],
    }))
  },

  selectAll: (uuids) => set({ selectedIds: uuids }),
  clearSelection: () => set({ selectedIds: [] }),

  getFilteredTickets: () => {
    const { tickets, filters } = get()
    let result = [...tickets]
    if (filters.status)   result = result.filter(t => t.status === filters.status)
    if (filters.priority) result = result.filter(t => t.priority === filters.priority)
    if (filters.category) result = result.filter(t => t.category === filters.category)
    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter(t =>
        t.subject.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        t.submitter.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      )
    }
    switch (filters.sort) {
      case 'oldest':   result.sort((a, b) => new Date(a.created) - new Date(b.created)); break
      case 'priority': result.sort((a, b) => ['critical','high','medium','low'].indexOf(a.priority) - ['critical','high','medium','low'].indexOf(b.priority)); break
      case 'updated':  result.sort((a, b) => new Date(b.updated) - new Date(a.updated)); break
      default:         result.sort((a, b) => new Date(b.created) - new Date(a.created))
    }
    return result
  },
}))
