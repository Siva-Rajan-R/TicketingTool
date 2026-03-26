import { create } from 'zustand'
import { api } from '../api/client'

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,

  fetchNotifications: async () => {
    try {
      const data = await api.get('/notifications')
      set({
        notifications: (data.items || []).map(n => ({
          id:   String(n.id),
          text: n.text,
          time: n.created_at,
          read: n.read,
          type: n.type,
        })),
        unreadCount: data.unread_count,
      })
    } catch (e) {
      console.error('fetchNotifications error', e)
    }
  },

  addNotification: (text, type = 'info') => {
    const notif = { id: `local-${Date.now()}`, text, time: new Date().toISOString(), read: false, type }
    set(s => ({
      notifications: [notif, ...s.notifications],
      unreadCount: s.unreadCount + 1,
    }))
  },

  markRead: async (id) => {
    if (String(id).startsWith('local-')) {
      set(s => ({
        notifications: s.notifications.map(n => n.id === id ? { ...n, read: true } : n),
        unreadCount: Math.max(0, s.unreadCount - 1),
      }))
      return
    }
    try {
      await api.patch(`/notifications/${id}/read`, {})
      set(s => ({
        notifications: s.notifications.map(n => n.id === id ? { ...n, read: true } : n),
        unreadCount: Math.max(0, s.unreadCount - 1),
      }))
    } catch (e) {
      console.error('markRead error', e)
    }
  },

  markAllRead: async () => {
    try {
      await api.patch('/notifications/read-all', {})
      set(s => ({
        notifications: s.notifications.map(n => ({ ...n, read: true })),
        unreadCount: 0,
      }))
    } catch (e) {
      console.error('markAllRead error', e)
    }
  },

  clearAll: async () => {
    try {
      await api.delete('/notifications')
      set({ notifications: [], unreadCount: 0 })
    } catch (e) {
      console.error('clearAll error', e)
    }
  },
}))
