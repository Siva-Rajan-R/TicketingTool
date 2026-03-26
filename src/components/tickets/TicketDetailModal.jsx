import { useState } from 'react'
import { Trash2, Save, MessageSquare } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { PriorityBadge, StatusBadge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { useTicketStore } from '../../stores/ticketStore'
import { useAdminStore } from '../../stores/adminStore'
import { useUserStore } from '../../stores/userStore'
import { useUiStore } from '../../stores/uiStore'
import { STATUSES, PRIORITIES, CATEGORIES, categoryLabel, fmtDateTime, timeAgo } from '../../utils/ticketUtils'

const TIMELINE_STYLES = {
  created:  { dot: 'bg-blue-500',    label: 'Opened' },
  assign:   { dot: 'bg-violet-500',  label: 'Assigned' },
  status:   { dot: 'bg-amber-500',   label: 'Updated' },
  comment:  { dot: 'bg-indigo-500',  label: 'Comment' },
  resolved: { dot: 'bg-emerald-500', label: 'Resolved' },
}

export function TicketDetailModal({ ticket, onClose }) {
  const { updateTicket, addTimelineEvent, deleteTicket } = useTicketStore()
  const { agents, getAgentName } = useAdminStore()
  const { currentUser } = useUserStore()
  const { addToast } = useUiStore()

  const [edits, setEdits] = useState({
    status:   ticket.status,
    priority: ticket.priority,
    assignee: ticket.assignee || '',
  })
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    const changes = {}
    if (edits.status   !== ticket.status)   changes.status   = edits.status
    if (edits.priority !== ticket.priority) changes.priority = edits.priority
    if (edits.assignee !== (ticket.assignee || '')) changes.assignee = edits.assignee || null

    if (Object.keys(changes).length === 0) {
      addToast('No changes to save', 'info')
      return
    }
    setSaving(true)
    try {
      await updateTicket(ticket._uuid, changes)
      addToast('Ticket updated successfully', 'success')
      onClose()
    } catch (e) {
      addToast(e.message || 'Failed to update ticket', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleComment = async () => {
    if (!comment.trim()) return
    try {
      await addTimelineEvent(ticket._uuid, { text: comment })
      setComment('')
      addToast('Comment added', 'success')
    } catch (e) {
      addToast(e.message || 'Failed to add comment', 'error')
    }
  }

  const handleDelete = async () => {
    if (window.confirm('Delete this ticket? This cannot be undone.')) {
      try {
        await deleteTicket(ticket._uuid)
        addToast('Ticket deleted', 'error')
        onClose()
      } catch (e) {
        addToast(e.message || 'Failed to delete ticket', 'error')
      }
    }
  }

  const selectCls = 'glass-input w-full text-sm py-1.5'

  return (
    <Modal isOpen onClose={onClose} title={ticket.id} size="lg">
      <div className="flex flex-col lg:flex-row gap-0">
        {/* Left: details + timeline */}
        <div className="flex-1 p-5 min-w-0">
          <div className="flex items-start gap-3 mb-4">
            <div>
              <h3 className="text-base font-bold t-main mb-2 tracking-tight">{ticket.subject}</h3>
              <div className="flex items-center gap-2 flex-wrap">
                <PriorityBadge priority={ticket.priority} />
                <StatusBadge status={ticket.status} />
                <span className="text-xs t-sub font-bold uppercase tracking-wider">{categoryLabel(ticket.category)}</span>
              </div>
            </div>
          </div>

          {/* Edit controls */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div>
              <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1">Status</label>
              <select className={selectCls} value={edits.status} onChange={e => setEdits(x => ({ ...x, status: e.target.value }))}>
                {STATUSES.map(s => <option key={s} value={s}>{s.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1">Priority</label>
              <select className={selectCls} value={edits.priority} onChange={e => setEdits(x => ({ ...x, priority: e.target.value }))}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1">Assignee</label>
              <select className={selectCls} value={edits.assignee} onChange={e => setEdits(x => ({ ...x, assignee: e.target.value }))}>
                <option value="">— Unassigned —</option>
                {agents.map(a => <option key={String(a.id)} value={String(a.id)}>{a.name}</option>)}
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="mb-5">
            <div className="text-[10px] font-bold t-sub uppercase tracking-wider mb-2">Description</div>
            <div className="text-sm t-main leading-relaxed bg-black/5 dark:bg-white/3 rounded-lg p-3 border border-glass">{ticket.description}</div>
          </div>

          {/* Timeline */}
          <div>
            <div className="text-[10px] font-bold t-sub uppercase tracking-wider mb-3">Timeline</div>
            <div className="space-y-3">
              {(ticket.timeline || []).map((ev, i) => {
                const style = TIMELINE_STYLES[ev.type] || { dot: 'bg-black/20 dark:bg-white/30', label: 'Event' }
                return (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${style.dot}`} />
                      {i < ticket.timeline.length - 1 && <div className="w-px flex-1 bg-black/5 dark:bg-white/6 mt-1 min-h-[12px]" />}
                    </div>
                    <div className="pb-3 flex-1 min-w-0">
                      {ev.author && <div className="text-[10px] font-bold t-sub mb-0.5">{ev.author}</div>}
                      <div className="text-xs t-main leading-relaxed" dangerouslySetInnerHTML={{ __html: ev.text }} />
                      <div className="text-[10px] t-sub opacity-70 mt-0.5">{timeAgo(ev.ts)}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Comment box */}
          <div className="mt-4 pt-4 border-t border-glass">
            <div className="text-[10px] font-bold t-sub uppercase tracking-wider mb-2">Add Comment</div>
            <div className="flex gap-2">
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                className="glass-input flex-1 text-sm resize-none"
                rows={2}
                placeholder="Write a comment…"
              />
              <Button variant="ghost" size="sm" onClick={handleComment} className="self-end flex-shrink-0">
                <MessageSquare size={14} /> Post
              </Button>
            </div>
          </div>
        </div>

        {/* Right: metadata sidebar */}
        <div className="lg:w-56 p-5 border-t lg:border-t-0 lg:border-l border-white/6 flex-shrink-0 space-y-4">
          {[
            ['Ticket ID',   ticket.id],
            ['Submitter',   ticket.submitter],
            ['Company',     ticket.company],
            ['Email',       ticket.email],
            ['Category',    categoryLabel(ticket.category)],
            ['Asset',       ticket.asset || '—'],
            ['Created',     fmtDateTime(ticket.created)],
            ['Updated',     fmtDateTime(ticket.updated)],
          ].map(([label, value]) => (
            <div key={label}>
              <div className="text-[10px] font-bold t-sub uppercase tracking-wider mb-0.5">{label}</div>
              <div className="text-xs t-main font-medium">{value || '—'}</div>
            </div>
          ))}

          <div className="pt-4 border-t border-glass space-y-2">
            <Button variant="primary" size="sm" className="w-full" onClick={handleSave} disabled={saving}>
              <Save size={13} /> {saving ? 'Saving…' : 'Save Changes'}
            </Button>
            <Button variant="danger" size="sm" className="w-full" onClick={handleDelete}>
              <Trash2 size={13} /> Delete Ticket
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
