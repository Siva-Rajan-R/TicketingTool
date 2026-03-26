import { useState, useEffect } from 'react'
import { Users, SlidersHorizontal, Mail, LayoutGrid, Trash2, Plus, Save, RefreshCw } from 'lucide-react'
import { useAdminStore } from '../stores/adminStore'
import { useTicketStore } from '../stores/ticketStore'
import { useUiStore } from '../stores/uiStore'
import { useUserStore } from '../stores/userStore'
import { Card, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { PriorityBadge } from '../components/ui/Badge'
import { TicketDetailModal } from '../components/tickets/TicketDetailModal'
import { PRIORITIES } from '../utils/ticketUtils'

const TABS = [
  { id: 'overview', icon: LayoutGrid, label: 'Overview' },
  { id: 'agents',   icon: Users,      label: 'Agents' },
  { id: 'sla',      icon: SlidersHorizontal, label: 'SLA' },
  { id: 'email',    icon: Mail,       label: 'Email' },
]

export default function Admin() {
  const [tab, setTab] = useState('overview')
  const { agents, slaSettings, emailConfig, addAgent, deleteAgent, updateSla, updateEmailConfig, fetchAgents, fetchSla, fetchEmailConfig } = useAdminStore()
  const { tickets, fetchTickets } = useTicketStore()
  const { addToast } = useUiStore()
  const { currentUser } = useUserStore()
  const [selectedTicket, setSelectedTicket] = useState(null)

  const unassigned = tickets.filter(t => !t.assignee && !['resolved', 'closed'].includes(t.status))

  const [newAgent, setNewAgent] = useState({ name: '', group: '', username: '', password: '', role: 'technician' })
  const [slaEdits, setSlaEdits] = useState({ ...slaSettings })
  const [emailEdits, setEmailEdits] = useState({
    new:    emailConfig?.trigger_new    ?? true,
    assign: emailConfig?.trigger_assign ?? true,
    resolve: emailConfig?.trigger_resolve ?? true,
    smtp: {
      host: emailConfig?.smtp_host || '',
      port: emailConfig?.smtp_port || '587',
      from: emailConfig?.smtp_from || '',
      user: emailConfig?.smtp_user || '',
      pass: '',
    },
  })

  // Keep slaEdits in sync when slaSettings loads
  useEffect(() => { setSlaEdits({ ...slaSettings }) }, [slaSettings])

  // Keep emailEdits in sync when emailConfig loads
  useEffect(() => {
    setEmailEdits({
      new:    emailConfig?.trigger_new    ?? true,
      assign: emailConfig?.trigger_assign ?? true,
      resolve: emailConfig?.trigger_resolve ?? true,
      smtp: {
        host: emailConfig?.smtp_host || '',
        port: emailConfig?.smtp_port || '587',
        from: emailConfig?.smtp_from || '',
        user: emailConfig?.smtp_user || '',
        pass: '',
      },
    })
  }, [emailConfig])

  const handleAddAgent = async (e) => {
    e.preventDefault()
    if (!newAgent.name || !newAgent.group || !newAgent.username || !newAgent.password) {
      addToast('All fields required', 'error'); return
    }
    try {
      await addAgent(newAgent)
      setNewAgent({ name: '', group: '', username: '', password: '', role: 'technician' })
      addToast('Agent added', 'success')
    } catch (err) {
      addToast(err.message || 'Failed to add agent', 'error')
    }
  }

  const handleSaveSla = async () => {
    try {
      await updateSla(slaEdits)
      addToast('SLA settings saved', 'success')
    } catch (err) {
      addToast(err.message || 'Failed to save SLA', 'error')
    }
  }

  const handleSaveEmail = async () => {
    try {
      const payload = {
        type: 'smtp',
        triggers: {
          trigger_new:    emailEdits.new,
          trigger_assign: emailEdits.assign,
          trigger_resolve: emailEdits.resolve,
        },
        smtp: {
          host:         emailEdits.smtp.host,
          port:         emailEdits.smtp.port,
          from_address: emailEdits.smtp.from,
          user:         emailEdits.smtp.user,
          password:     emailEdits.smtp.pass,
          security:     'tls',
        },
      }
      await updateEmailConfig(payload)
      addToast('Email settings saved', 'success')
    } catch (err) {
      addToast(err.message || 'Failed to save email config', 'error')
    }
  }

  const handleRefresh = async () => {
    await Promise.all([fetchTickets(), fetchAgents(), fetchSla(), fetchEmailConfig()])
    addToast('Data refreshed', 'info')
  }

  const agentWorkload = agents.map(a => ({
    ...a,
    count: tickets.filter(t => t.assignee === String(a.id) && !['resolved', 'closed'].includes(t.status)).length,
  })).sort((a, b) => b.count - a.count)

  const maxWorkload = Math.max(...agentWorkload.map(a => a.count), 1)
  const inputCls = 'glass-input w-full text-sm'

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold t-main">Admin Panel</h1>
          <p className="text-sm t-muted mt-0.5">System configuration and management</p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleRefresh}>
          <RefreshCw size={13} /> Refresh
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 glass-card w-fit border border-glass">
        {TABS.map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === id ? 'bg-indigo-600/30 dark:bg-indigo-600/30 t-main border border-indigo-500/30' : 't-muted hover:t-main hover:bg-black/5 dark:hover:bg-white/5'}`}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Card>
            <CardHeader title="Unassigned Tickets" subtitle={`${unassigned.length} tickets need assignment`} />
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {unassigned.length === 0
                ? <div className="py-6 text-center text-sm t-sub">All tickets are assigned</div>
                : unassigned.map(t => (
                  <div key={t._uuid} onClick={() => setSelectedTicket(t)}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-all group">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-mono t-sub mb-0.5">{t.id}</div>
                      <div className="text-sm t-main font-medium group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">{t.subject}</div>
                    </div>
                    <PriorityBadge priority={t.priority} />
                  </div>
                ))
              }
            </div>
          </Card>

          <Card>
            <CardHeader title="Agent Workload" subtitle="Active tickets per agent" />
            <div className="space-y-3">
              {agentWorkload.map(agent => (
                <div key={String(agent.id)} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500/20 to-violet-500/20 dark:from-indigo-500/40 dark:to-violet-500/40 border border-indigo-500/20 flex items-center justify-center text-xs font-bold t-main flex-shrink-0">
                    {agent.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs t-muted">{agent.name}</span>
                      <span className="text-xs t-sub">{agent.count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-black/5 dark:bg-white/8 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all shadow-glow-indigo"
                        style={{ width: `${(agent.count / maxWorkload) * 100}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Agents */}
      {tab === 'agents' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Card>
            <CardHeader title="Add New Agent" />
            <form onSubmit={handleAddAgent} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1">Full Name</label>
                  <input className={inputCls} value={newAgent.name} onChange={e => setNewAgent(a => ({ ...a, name: e.target.value }))} placeholder="Jane Smith" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1">Group / Team</label>
                  <input className={inputCls} value={newAgent.group} onChange={e => setNewAgent(a => ({ ...a, group: e.target.value }))} placeholder="L1 Support" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1">Username</label>
                  <input className={inputCls} value={newAgent.username} onChange={e => setNewAgent(a => ({ ...a, username: e.target.value }))} placeholder="jsmith" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1">Password</label>
                  <input type="password" className={inputCls} value={newAgent.password} onChange={e => setNewAgent(a => ({ ...a, password: e.target.value }))} placeholder="••••••••" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1">Role</label>
                  <select className={inputCls} value={newAgent.role} onChange={e => setNewAgent(a => ({ ...a, role: e.target.value }))}>
                    <option value="technician">Technician</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <Button type="submit" variant="primary" size="sm" className="w-full"><Plus size={13} /> Add Agent</Button>
            </form>
          </Card>

          <Card>
            <CardHeader title="Current Agents" subtitle={`${agents.length} agents`} />
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {agents.map(agent => (
                <div key={String(agent.id)} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 group transition-all">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500/20 to-violet-500/20 dark:from-indigo-500/40 dark:to-violet-500/40 border border-indigo-500/20 flex items-center justify-center text-xs font-bold t-main flex-shrink-0">
                    {agent.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm t-main font-medium">{agent.name}</div>
                    <div className="text-[10px] t-muted">{agent.group} · {agent.role || 'technician'}</div>
                  </div>
                  {String(agent.id) !== String(currentUser?.id) && (
                    <button onClick={async () => {
                      try {
                        await deleteAgent(String(agent.id))
                        addToast('Agent removed', 'info')
                      } catch (err) {
                        addToast(err.message || 'Failed to remove agent', 'error')
                      }
                    }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-rose-500/20 t-sub hover:text-rose-500 dark:hover:text-rose-400 transition-all">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* SLA */}
      {tab === 'sla' && (
        <Card className="max-w-lg">
          <CardHeader title="SLA Response Times" subtitle="Configure response time targets per priority" />
          <div className="space-y-3 mb-4">
            {PRIORITIES.map(p => {
              const colors = { critical: 'text-rose-500 dark:text-rose-400', high: 'text-orange-500 dark:text-orange-400', medium: 'text-amber-500 dark:text-amber-400', low: 't-muted' }
              return (
                <div key={p} className="flex items-center gap-4 p-3 rounded-lg bg-black/5 dark:bg-white/3 border border-glass">
                  <span className={`text-sm font-bold w-20 flex-shrink-0 ${colors[p]}`}>{p.charAt(0).toUpperCase() + p.slice(1)}</span>
                  <input
                    type="number" min={1} max={168}
                    className="glass-input w-24 text-sm text-center"
                    value={slaEdits[p] || ''}
                    onChange={e => setSlaEdits(s => ({ ...s, [p]: e.target.value }))}
                  />
                  <span className="text-xs t-sub">hours</span>
                </div>
              )
            })}
          </div>
          <Button variant="primary" size="sm" onClick={handleSaveSla}><Save size={13} /> Save SLA Settings</Button>
        </Card>
      )}

      {/* Email */}
      {tab === 'email' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Card>
            <CardHeader title="Email Triggers" subtitle="Automated notifications" />
            <div className="space-y-3 mb-4">
              {[
                { key: 'new',     label: 'New ticket submitted', desc: 'Notify team on new ticket creation' },
                { key: 'assign',  label: 'Ticket assigned',      desc: 'Notify agent when ticket assigned' },
                { key: 'resolve', label: 'Ticket resolved',      desc: 'Notify submitter on resolution' },
              ].map(({ key, label, desc }) => (
                <label key={key} className="flex items-start gap-3 p-3 rounded-lg bg-black/5 dark:bg-white/3 border border-glass cursor-pointer hover:bg-black/10 dark:hover:bg-white/5 transition-all">
                  <input type="checkbox" checked={emailEdits[key]} onChange={e => setEmailEdits(t => ({ ...t, [key]: e.target.checked }))}
                    className="mt-0.5 accent-indigo-500" />
                  <div>
                    <div className="text-sm t-main font-medium">{label}</div>
                    <div className="text-xs t-muted mt-0.5">{desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="SMTP Configuration" />
            <div className="space-y-3 mb-4">
              {[
                { key: 'host', label: 'SMTP Host', placeholder: 'smtp.office365.com' },
                { key: 'port', label: 'Port', placeholder: '587' },
                { key: 'from', label: 'From Address', placeholder: 'helpdesk@company.com' },
                { key: 'user', label: 'Username', placeholder: 'username' },
                { key: 'pass', label: 'Password', placeholder: '••••••••', type: 'password' },
              ].map(({ key, label, placeholder, type = 'text' }) => (
                <div key={key}>
                  <label className="block text-[10px] font-bold t-sub uppercase tracking-wider mb-1">{label}</label>
                  <input type={type} className={inputCls}
                    value={emailEdits.smtp?.[key] || ''}
                    placeholder={placeholder}
                    onChange={e => setEmailEdits(c => ({ ...c, smtp: { ...c.smtp, [key]: e.target.value } }))} />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="primary" size="sm" onClick={handleSaveEmail}><Save size={13} /> Save</Button>
            </div>
          </Card>
        </div>
      )}

      {selectedTicket && <TicketDetailModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />}
    </div>
  )
}
