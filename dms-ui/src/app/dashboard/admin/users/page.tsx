"use client";

import useSWR from 'swr'
import axios from 'axios'
import { useState, useEffect } from 'react'

const fetcher = (url: string) => axios.get(url, { withCredentials: true }).then(res => res.data)

interface Session {
  id: string
  active: boolean
  authenticated_at: string
  authentication_methods: Array<{ method: string }>
  devices: Array<{
    ip_address: string
    user_agent: string
  }>
}

interface Identity {
  id: string
  traits: {
    email: string
    first_name?: string
    last_name?: string
    division?: string
  }
  state: 'active' | 'inactive'
  verifiable_addresses?: Array<{
    status: string
    verified: boolean
  }>
  credentials?: Record<string, any>
}

export default function AdminUsersPage() {
  const { data: identities, error, mutate } = useSWR<Identity[]>('/admin-api/identities', fetcher)
  
  const [selectedUser, setSelectedUser] = useState<Identity | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editTraits, setEditTraits] = useState<any>({})
  const [loading, setLoading] = useState<string | null>(null)
  const [recoveryData, setRecoveryData] = useState<any>(null)

  const { data: sessions, mutate: mutateSessions } = useSWR<Session[]>(
    selectedUser ? `/admin-api/identities/${selectedUser.id}/sessions` : null,
    fetcher
  )

  useEffect(() => {
    if (selectedUser) {
      setEditTraits({ ...selectedUser.traits })
      setRecoveryData(null)
      setIsEditing(false)
    }
  }, [selectedUser])

  // --- Actions ---

  const handleRevokeSession = async (sid: string) => {
    if (!confirm('Revoke this specific session?')) return
    setLoading(sid)
    try {
      await axios.delete(`/admin-api/identities/${selectedUser!.id}/sessions/${sid}`, { withCredentials: true })
      mutateSessions()
    } catch (err) { alert('Failed') } finally { setLoading(null) }
  }

  const handleRevokeAllSessions = async () => {
    if (!confirm('Revoke ALL sessions for this user?')) return
    setLoading('revoke-all')
    try {
      await axios.delete(`/admin-api/identities/${selectedUser!.id}/sessions`, { withCredentials: true })
      mutateSessions()
    } catch (err) { alert('Failed') } finally { setLoading(null) }
  }

  const handleToggleState = async () => {
    const newState = selectedUser!.state === 'active' ? 'inactive' : 'active'
    if (!confirm(`Switch user to ${newState.toUpperCase()}?`)) return
    setLoading('state')
    try {
      await axios.put(`/admin-api/identities/${selectedUser!.id}/state`, { state: newState }, { withCredentials: true })
      mutate()
      setSelectedUser({ ...selectedUser!, state: newState })
    } catch (err) { alert('Failed') } finally { setLoading(null) }
  }

  const handleManualVerify = async () => {
    if (!confirm('Mark email as verified manually?')) return
    setLoading('verify')
    try {
      await axios.post(`/admin-api/identities/${selectedUser!.id}/verify`, {}, { withCredentials: true })
      mutate()
      const updated = await fetcher(`/admin-api/identities/${selectedUser!.id}`)
      setSelectedUser(updated)
    } catch (err) { alert('Failed') } finally { setLoading(null) }
  }

  const handleGenerateRecovery = async () => {
    setLoading('recovery')
    try {
      const res = await axios.post(`/admin-api/identities/${selectedUser!.id}/recovery`, {}, { withCredentials: true })
      setRecoveryData(res.data)
    } catch (err) { alert('Failed') } finally { setLoading(null) }
  }

  const handleSaveTraits = async () => {
    setLoading('traits')
    try {
      await axios.patch(`/admin-api/identities/${selectedUser!.id}/traits`, editTraits, { withCredentials: true })
      mutate()
      setSelectedUser({ ...selectedUser!, traits: editTraits })
      setIsEditing(false)
    } catch (err) { alert('Failed') } finally { setLoading(null) }
  }

  const handleDeleteUser = async () => {
    if (!confirm('PERMANENTLY DELETE THIS USER?')) return
    try {
      await axios.delete(`/admin-api/identities/${selectedUser!.id}`, { withCredentials: true })
      mutate()
      setSelectedUser(null)
    } catch (err) { alert('Failed') }
  }

  if (error) return <div className="p-8 text-red-500 font-black uppercase tracking-tighter text-center text-2xl">Access Denied // Admin Only</div>
  if (!identities) return <div className="p-12 text-slate-400 font-mono text-xs animate-pulse text-center">SYNCING_VAULT_DATA...</div>

  const is2FA = selectedUser?.credentials?.totp || selectedUser?.credentials?.webauthn
  const isVerified = selectedUser?.verifiable_addresses?.[0]?.verified

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-12 bg-white min-h-screen">
      <header className="flex justify-between items-end border-b-4 border-slate-900 pb-8">
        <div>
          <h1 className="text-7xl font-black text-slate-900 tracking-tighter">VAULT_OPS</h1>
          <p className="text-slate-500 font-mono text-xs mt-2 uppercase tracking-[0.5em] font-bold">Root Control Interface // Phase D active</p>
        </div>
        <a href="/" className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs tracking-widest hover:bg-blue-600 transition-all shadow-[6px_6px_0px_0px_rgba(59,130,246,1)] active:translate-y-1 active:shadow-none">EXIT_TO_HUB</a>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* User Table */}
        <div className="lg:col-span-7">
          <div className="bg-white border-4 border-slate-900 rounded-[2.5rem] shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-900 text-white">
                <tr>
                  <th className="p-8 font-black text-xs uppercase tracking-widest">Subject Identity</th>
                  <th className="p-8 font-black text-xs uppercase tracking-widest text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {identities.map((user) => (
                  <tr 
                    key={user.id} 
                    onClick={() => setSelectedUser(user)}
                    className={`border-b-4 border-slate-50 cursor-pointer transition-all ${selectedUser?.id === user.id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                  >
                    <td className="p-8">
                      <div className="font-black text-slate-900 text-2xl tracking-tight">{user.traits.email}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-2 uppercase tracking-widest">{user.id}</div>
                    </td>
                    <td className="p-8 text-center">
                       <div className={`inline-block px-4 py-1.5 rounded-xl text-xs font-black tracking-widest ${user.state === 'active' ? 'bg-green-100 text-green-700 border-2 border-green-200' : 'bg-red-100 text-red-700 border-2 border-red-200'}`}>
                        {user.state.toUpperCase()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-5">
          {selectedUser ? (
            <div className="space-y-8 sticky top-8">
              {/* Profile Card */}
              <div className="bg-white border-4 border-slate-900 rounded-[2.5rem] shadow-[16px_16px_0px_0px_rgba(59,130,246,1)] p-10 space-y-10">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Subject Info</h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Posture Analysis</p>
                  </div>
                  <button 
                    onClick={() => setIsEditing(!isEditing)}
                    className="text-xs font-black text-blue-600 bg-blue-50 px-5 py-2.5 rounded-2xl hover:bg-blue-100 transition-all border-4 border-blue-100"
                  >
                    {isEditing ? 'DISCARD' : 'EDIT_TRAITS'}
                  </button>
                </div>

                {isEditing ? (
                  <div className="space-y-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase ml-2">First Name</label>
                       <input value={editTraits.first_name || ''} onChange={e => setEditTraits({...editTraits, first_name: e.target.value})} className="w-full border-4 border-slate-100 bg-slate-50 rounded-2xl px-6 py-4 font-bold text-lg outline-none focus:border-blue-500" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Last Name</label>
                       <input value={editTraits.last_name || ''} onChange={e => setEditTraits({...editTraits, last_name: e.target.value})} className="w-full border-4 border-slate-100 bg-slate-50 rounded-2xl px-6 py-4 font-bold text-lg outline-none focus:border-blue-500" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Division</label>
                       <input value={editTraits.division || ''} onChange={e => setEditTraits({...editTraits, division: e.target.value})} className="w-full border-4 border-slate-100 bg-slate-50 rounded-2xl px-6 py-4 font-bold text-lg outline-none focus:border-blue-500" />
                    </div>
                    <button onClick={handleSaveTraits} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-[0.3em] shadow-xl active:translate-y-1">APPLY_CHANGES</button>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="grid grid-cols-2 gap-6">
                       <div className="p-6 bg-slate-50 rounded-3xl border-4 border-slate-100">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Security</label>
                          <div className={`text-sm font-black ${is2FA ? 'text-green-600' : 'text-amber-600'}`}>{is2FA ? '2FA_ENFORCED' : '2FA_NONE'}</div>
                       </div>
                       <div className="p-6 bg-slate-50 rounded-3xl border-4 border-slate-100">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">E-Mail</label>
                          <div className={`text-sm font-black ${isVerified ? 'text-green-600' : 'text-red-500'}`}>{isVerified ? 'VERIFIED' : 'PENDING'}</div>
                       </div>
                    </div>
                    
                    <div className="space-y-4">
                       <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2">Identity Details</label>
                       <div className="bg-slate-900 rounded-[2rem] p-8 space-y-4 font-mono text-sm font-bold text-white shadow-xl">
                          <div className="flex justify-between border-b border-slate-800 pb-2"><span>NAME:</span> <span className="text-blue-400">{selectedUser.traits.first_name} {selectedUser.traits.last_name}</span></div>
                          <div className="flex justify-between border-b border-slate-800 pb-2"><span>DEPT:</span> <span className="text-blue-400">{selectedUser.traits.division || 'N/A'}</span></div>
                          <div className="flex justify-between border-b border-slate-800 pb-2"><span>EMAIL:</span> <span className="text-blue-400">{selectedUser.traits.email}</span></div>
                          <div className="pt-2 text-[10px] text-slate-500 uppercase">UID: {selectedUser.id}</div>
                       </div>
                    </div>
                  </div>
                )}

                {/* Operations */}
                <div className="space-y-6 pt-10 border-t-4 border-slate-100">
                   <h4 className="text-xs font-black text-slate-900 uppercase tracking-[0.3em] mb-4 italic text-center">Administrative_Actions</h4>
                   
                   <div className="grid grid-cols-2 gap-4">
                      <button onClick={handleToggleState} className="bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg active:translate-y-1">Toggle Access</button>
                      <button onClick={handleGenerateRecovery} className="bg-indigo-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg active:translate-y-1 shadow-indigo-100">Recovery Link</button>
                   </div>

                   {!isVerified && (
                      <button onClick={handleManualVerify} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:translate-y-1">Manually Verify Email</button>
                   )}

                   {recoveryData && (
                      <div className="p-6 bg-slate-900 text-green-400 rounded-3xl text-xs break-all font-mono leading-relaxed mt-6 border-4 border-blue-900 shadow-inner">
                        <p className="mb-3 text-white font-black uppercase tracking-[0.2em] border-b border-slate-700 pb-2 text-[10px]">Confidential Recovery URL:</p>
                        {recoveryData.recovery_link}
                      </div>
                   )}

                   {/* Session Control */}
                   <div className="mt-10 space-y-6 bg-slate-50 p-8 rounded-[2.5rem] border-4 border-slate-100 shadow-inner">
                      <div className="flex justify-between items-center px-2">
                        <label className="text-xs font-black text-slate-900 uppercase tracking-widest italic">Session_Control</label>
                        <button 
                          onClick={handleRevokeAllSessions} 
                          className="bg-red-600 text-white px-5 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-100"
                        >
                          Revoke All
                        </button>
                      </div>
                      
                      <div className="space-y-4 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                        {sessions?.map(s => (
                          <div key={s.id} className="group p-6 bg-white border-4 border-slate-100 rounded-3xl hover:border-slate-900 transition-all relative shadow-sm">
                            <div className="flex justify-between items-start">
                              <div className="space-y-2">
                                <div className="text-sm font-black text-slate-900 flex items-center gap-3">
                                  <span className={`w-3 h-3 rounded-full ${s.active ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></span>
                                  {s.devices[0]?.ip_address}
                                </div>
                                <div className="text-[9px] text-slate-400 font-mono line-clamp-2 max-w-[200px]" title={s.devices[0]?.user_agent}>{s.devices[0]?.user_agent}</div>
                                <div className="flex flex-wrap gap-2">
                                  {s.authentication_methods.map((m, i) => (
                                    <span key={i} className="text-[8px] bg-slate-900 text-white px-2 py-0.5 rounded font-black uppercase tracking-tighter">{m.method}</span>
                                  ))}
                                </div>
                              </div>
                              <button 
                                onClick={() => handleRevokeSession(s.id)}
                                className="bg-red-50 text-red-600 p-3 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm active:scale-90"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ))}
                        {!sessions?.length && <div className="text-center py-10 text-xs text-slate-300 font-black italic tracking-widest uppercase">No Active Signals</div>}
                      </div>
                   </div>

                   <div className="pt-10 mt-10 border-t-4 border-slate-100">
                      <button onClick={handleDeleteUser} className="w-full bg-white text-red-600 border-4 border-red-600 py-5 rounded-3xl font-black text-xs uppercase tracking-[0.4em] hover:bg-red-600 hover:text-white transition-all shadow-xl shadow-red-50 active:translate-y-1">Destroy Identity</button>
                   </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border-4 border-dashed border-slate-200 rounded-[4rem] p-32 text-center sticky top-8">
               <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-10 shadow-lg border-4 border-slate-100 text-slate-100">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <p className="text-slate-400 font-black text-sm uppercase tracking-[0.4em] leading-loose">Awaiting Subject Selection<br/>for Deep-Posture Analysis</p>
            </div>
          )}
        </div>
      </div>
      
      <footer className="mt-32 py-12 border-t-4 border-slate-900 text-xs text-slate-400 text-center font-black tracking-[1em] uppercase">
        Zero-Trust Admin Proxy // Core Engine: Ory Stack // Hardware: Vault_Ops_04
      </footer>
    </div>
  )
}
