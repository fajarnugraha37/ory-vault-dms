"use client";

import useSWR from 'swr'
import axios from 'axios'
import { useState, useEffect } from 'react'

const fetcher = (url: string) => axios.get(url, { withCredentials: true }).then(res => res.data)

interface Session {
  id: string
  active: boolean
  authenticated_at: string
  expires_at: string
  issued_at: string
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
    value: string
  }>
  credentials?: Record<string, any>
  created_at: string
  updated_at: string
}

export default function AdminUsersPage() {
  const { data: identities, error, mutate } = useSWR<Identity[]>('/admin-api/identities', fetcher)
  const [selectedUser, setSelectedUser] = useState<Identity | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editTraits, setEditTraits] = useState<any>({})
  const [loading, setLoading] = useState<string | null>(null)
  const [recoveryData, setRecoveryData] = useState<any>(null)

  // Fetch sessions only when a user is selected
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

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user? This cannot be undone.')) return
    setLoading(id)
    try {
      await axios.delete(`/admin-api/identities/${id}`, { withCredentials: true })
      mutate()
      if (selectedUser?.id === id) setSelectedUser(null)
    } catch (err) {
      alert('Failed to delete user')
    } finally {
      setLoading(null)
    }
  }

  const toggleState = async (user: Identity) => {
    const newState = user.state === 'active' ? 'inactive' : 'active'
    if (!confirm(`Are you sure you want to ${newState === 'inactive' ? 'deactivate' : 'reactivate'} this user?`)) return
    
    setLoading(user.id)
    try {
      await axios.put(`/admin-api/identities/${user.id}/state`, { state: newState }, { withCredentials: true })
      mutate()
      if (selectedUser?.id === user.id) {
        setSelectedUser({ ...user, state: newState })
      }
    } catch (err) {
      alert('Failed to update user state')
    } finally {
      setLoading(null)
    }
  }

  const handleUpdateTraits = async () => {
    if (!selectedUser) return
    setLoading(selectedUser.id)
    try {
      await axios.patch(`/admin-api/identities/${selectedUser.id}/traits`, editTraits, { withCredentials: true })
      mutate()
      setSelectedUser({ ...selectedUser, traits: editTraits })
      setIsEditing(false)
      alert('User traits updated successfully')
    } catch (err) {
      alert('Failed to update traits')
    } finally {
      setLoading(null)
    }
  }

  const generateRecovery = async () => {
    if (!selectedUser) return
    setLoading(selectedUser.id)
    try {
      const res = await axios.post(`/admin-api/identities/${selectedUser.id}/recovery`, {}, { withCredentials: true })
      setRecoveryData(res.data)
    } catch (err) {
      alert('Failed to generate recovery link')
    } finally {
      setLoading(null)
    }
  }

  const verifyEmail = async () => {
    if (!selectedUser) return
    setLoading(selectedUser.id)
    try {
      await axios.post(`/admin-api/identities/${selectedUser.id}/verify`, {}, { withCredentials: true })
      alert('Email verified successfully')
      mutate()
      const updated = await fetcher(`/admin-api/identities/${selectedUser.id}`)
      setSelectedUser(updated)
    } catch (err) {
      alert('Failed to verify email')
    } finally {
      setLoading(null)
    }
  }

  const revokeAllSessions = async (id: string) => {
    if (!confirm('Are you sure you want to log out this user from ALL devices?')) return
    setLoading(id)
    try {
      await axios.delete(`/admin-api/identities/${id}/sessions`, { withCredentials: true })
      alert('All sessions revoked')
      mutateSessions()
    } catch (err) {
      alert('Failed to revoke sessions')
    } finally {
      setLoading(null)
    }
  }

  if (error) return (
    <div className="p-8 text-red-500 text-center">
      <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
      <p>Only authorized administrators can access this panel.</p>
      <a href="/" className="mt-4 inline-block text-blue-500 hover:underline">Return to Home</a>
    </div>
  )
  
  if (!identities) return <div className="p-8 text-center text-slate-500">Loading identities...</div>

  const isEmailVerified = selectedUser?.verifiable_addresses?.[0]?.status === 'completed' || selectedUser?.verifiable_addresses?.[0]?.verified

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="flex justify-between items-start mb-12">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Identity Vault</h1>
          <p className="text-slate-500 mt-2 font-medium flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Zero Trust Administrator Control Plane
          </p>
        </div>
        <div className="flex gap-4">
           <a href="/" className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all shadow-sm">
            Dashboard
          </a>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Users Table */}
        <div className="lg:col-span-7">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-4 font-bold text-slate-500 text-xs uppercase tracking-widest">User Identity</th>
                  <th className="p-4 font-bold text-slate-500 text-xs uppercase tracking-widest">Status</th>
                  <th className="p-4 font-bold text-slate-500 text-xs uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {identities.map((user) => (
                  <tr 
                    key={user.id} 
                    className={`border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer group ${selectedUser?.id === user.id ? 'bg-blue-50/50' : ''}`}
                    onClick={() => setSelectedUser(user)}
                  >
                    <td className="p-4">
                      <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{user.traits.email}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-1">{user.id}</div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                        user.state === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {user.state}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        className="text-slate-400 group-hover:text-blue-600 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* User Details Sidebar */}
        <div className="lg:col-span-5">
          {selectedUser ? (
            <div className="space-y-6 sticky top-8">
              {/* Profile Card */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-black text-slate-900">User Profile</h2>
                  <button 
                    onClick={() => setIsEditing(!isEditing)}
                    className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    {isEditing ? 'CANCEL' : 'EDIT TRAITS'}
                  </button>
                </div>
                
                {isEditing ? (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">First Name</label>
                      <input 
                        type="text" 
                        value={editTraits.first_name || ''} 
                        onChange={e => setEditTraits({...editTraits, first_name: e.target.value})}
                        className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Last Name</label>
                      <input 
                        type="text" 
                        value={editTraits.last_name || ''} 
                        onChange={e => setEditTraits({...editTraits, last_name: e.target.value})}
                        className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Division</label>
                      <input 
                        type="text" 
                        value={editTraits.division || ''} 
                        onChange={e => setEditTraits({...editTraits, division: e.target.value})}
                        className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all"
                      />
                    </div>
                    <button 
                      onClick={handleUpdateTraits}
                      disabled={loading === selectedUser.id}
                      className="w-full bg-slate-900 text-white py-3 rounded-xl font-black text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                    >
                      SAVE CHANGES
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Email Identity</label>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-900 font-bold">{selectedUser.traits.email}</span>
                        {isEmailVerified ? (
                          <span className="text-[9px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-black tracking-tighter">VERIFIED</span>
                        ) : (
                          <span className="text-[9px] bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full font-black tracking-tighter">UNVERIFIED</span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">First Name</label>
                        <div className="text-slate-900 font-medium">{selectedUser.traits.first_name || '-'}</div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Last Name</label>
                        <div className="text-slate-900 font-medium">{selectedUser.traits.last_name || '-'}</div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Division</label>
                      <div className="text-slate-900 font-medium">{selectedUser.traits.division || '-'}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Security Audit & Sessions */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-black text-slate-900">Security Audit</h3>
                  <button 
                    onClick={() => revokeAllSessions(selectedUser.id)}
                    className="text-[10px] font-black text-red-600 hover:underline"
                  >
                    REVOKE ALL SESSIONS
                  </button>
                </div>

                <div className="space-y-4">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Device Sessions</label>
                  {sessions && sessions.length > 0 ? (
                    <div className="space-y-3">
                      {sessions.map((s, idx) => (
                        <div key={s.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 relative overflow-hidden">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                                <span className={`w-1.5 h-1.5 rounded-full ${s.active ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                                {s.devices[0]?.ip_address || 'Unknown IP'}
                              </div>
                              <div className="text-[10px] text-slate-500 mt-1 truncate max-w-[200px]">
                                {s.devices[0]?.user_agent || 'Unknown Device'}
                              </div>
                              <div className="text-[9px] text-slate-400 mt-2 font-mono uppercase tracking-tighter">
                                Last Active: {new Date(s.authenticated_at).toLocaleString()}
                              </div>
                            </div>
                            <span className="text-[8px] font-black text-slate-300 font-mono">#{idx+1}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-400 italic">
                      No active sessions found.
                    </div>
                  )}
                </div>

                <div className="mt-8 space-y-3">
                   <button 
                    onClick={() => toggleState(selectedUser)}
                    disabled={loading === selectedUser.id}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs tracking-wide transition-all ${
                      selectedUser.state === 'active' 
                        ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' 
                        : 'bg-green-50 text-green-700 hover:bg-green-100'
                    }`}
                  >
                    {selectedUser.state === 'active' ? 'DEACTIVATE ACCOUNT' : 'REACTIVATE ACCOUNT'}
                  </button>

                  <button 
                    onClick={generateRecovery}
                    className="w-full py-2.5 bg-indigo-50 text-indigo-700 rounded-xl font-bold text-xs tracking-wide hover:bg-indigo-100 transition-all"
                  >
                    GENERATE RECOVERY LINK
                  </button>

                  {recoveryData && (
                    <div className="p-4 bg-indigo-900 text-white rounded-xl text-[9px] break-all font-mono leading-relaxed shadow-inner">
                      <p className="mb-2 text-indigo-300 font-black uppercase tracking-widest border-b border-indigo-800 pb-1">Confidential Link:</p>
                      {recoveryData.recovery_link}
                    </div>
                  )}

                  {!isEmailVerified && (
                    <button 
                      onClick={verifyEmail}
                      className="w-full py-2.5 bg-blue-50 text-blue-700 rounded-xl font-bold text-xs tracking-wide hover:bg-blue-100 transition-all"
                    >
                      MANUALLY VERIFY EMAIL
                    </button>
                  )}

                  <div className="pt-4 mt-4 border-t border-slate-100">
                    <button 
                      onClick={() => handleDelete(selectedUser.id)}
                      className="w-full py-2.5 bg-red-50 text-red-700 rounded-xl font-bold text-xs tracking-wide hover:bg-red-100 transition-all"
                    >
                      PERMANENTLY DELETE
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center text-slate-400 sticky top-8">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-100 text-slate-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <p className="font-bold text-sm">Select an identity from the vault to inspect security posture and manage lifecycle.</p>
            </div>
          )}
        </div>
      </div>
      
      <footer className="mt-20 py-8 border-t border-slate-100 text-[10px] text-slate-400 text-center font-bold tracking-widest uppercase">
        Zero-Trust Admin Proxy // Authenticated via RS256 JWT // Ory Kratos 1.1.0 Internal Port 4434
      </footer>
    </div>
  )
}
