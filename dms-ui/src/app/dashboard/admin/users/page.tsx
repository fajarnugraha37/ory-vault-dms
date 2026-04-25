"use client"

import useSWR from 'swr'
import axios from 'axios'
import { useState, useEffect } from 'react'

const fetcher = (url: string) => axios.get(url, { withCredentials: true }).then(res => res.data)

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

  // Initialize edit form when selected user changes
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
      // Refresh selected user
      const updated = await fetcher(`/admin-api/identities/${selectedUser.id}`)
      setSelectedUser(updated)
    } catch (err) {
      alert('Failed to verify email')
    } finally {
      setLoading(null)
    }
  }

  const revokeSessions = async (id: string) => {
    if (!confirm('Are you sure you want to log out this user from all devices?')) return
    setLoading(id)
    try {
      await axios.delete(`/admin-api/identities/${id}/sessions`, { withCredentials: true })
      alert('All sessions revoked successfully')
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
  
  if (!identities) return <div className="p-8 text-center">Loading identities from Kratos...</div>

  const isEmailVerified = selectedUser?.verifiable_addresses?.[0]?.status === 'completed' || selectedUser?.verifiable_addresses?.[0]?.verified

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Identity Management</h1>
          <p className="text-slate-500 mt-1">Lifecycle, Traits, and Security Control (Zero Trust)</p>
        </div>
        <div className="flex gap-4">
           <a href="/" className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors">
            Dashboard
          </a>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Users Table */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-4 font-semibold text-slate-700 text-sm">Identity</th>
                  <th className="p-4 font-semibold text-slate-700 text-sm">Status</th>
                  <th className="p-4 font-semibold text-slate-700 text-sm text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {identities.map((user) => (
                  <tr 
                    key={user.id} 
                    className={`border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer ${selectedUser?.id === user.id ? 'bg-blue-50' : ''}`}
                    onClick={() => setSelectedUser(user)}
                  >
                    <td className="p-4">
                      <div className="font-medium text-slate-900">{user.traits.email}</div>
                      <div className="text-xs text-slate-400 font-mono mt-1">{user.id.substring(0, 8)}...</div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                        user.state === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {user.state}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        className="text-blue-600 text-sm font-semibold hover:underline"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* User Details Sidebar */}
        <div className="lg:col-span-1">
          {selectedUser ? (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 sticky top-8 max-h-[calc(100vh-4rem)] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-900">User Profile</h2>
                <button 
                  onClick={() => setIsEditing(!isEditing)}
                  className="text-sm text-blue-600 font-semibold"
                >
                  {isEditing ? 'Cancel' : 'Edit Traits'}
                </button>
              </div>
              
              {isEditing ? (
                <div className="space-y-4 mb-8">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">First Name</label>
                    <input 
                      type="text" 
                      value={editTraits.first_name || ''} 
                      onChange={e => setEditTraits({...editTraits, first_name: e.target.value})}
                      className="w-full border border-slate-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Last Name</label>
                    <input 
                      type="text" 
                      value={editTraits.last_name || ''} 
                      onChange={e => setEditTraits({...editTraits, last_name: e.target.value})}
                      className="w-full border border-slate-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Division</label>
                    <input 
                      type="text" 
                      value={editTraits.division || ''} 
                      onChange={e => setEditTraits({...editTraits, division: e.target.value})}
                      className="w-full border border-slate-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button 
                    onClick={handleUpdateTraits}
                    disabled={loading === selectedUser.id}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              ) : (
                <div className="space-y-4 mb-8">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase">Email Address</label>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-900 font-medium">{selectedUser.traits.email}</span>
                      {isEmailVerified ? (
                        <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">VERIFIED</span>
                      ) : (
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold">UNVERIFIED</span>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase">First Name</label>
                      <div className="text-slate-900">{selectedUser.traits.first_name || '-'}</div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase">Last Name</label>
                      <div className="text-slate-900">{selectedUser.traits.last_name || '-'}</div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase">Division</label>
                    <div className="text-slate-900">{selectedUser.traits.division || '-'}</div>
                  </div>
                </div>
              )}

              <div className="space-y-3 pt-6 border-t border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 mb-2">Security & Lifecycle</h3>
                
                <button 
                  onClick={() => toggleState(selectedUser)}
                  disabled={loading === selectedUser.id}
                  className={`w-full py-2 rounded-lg font-semibold text-sm transition-colors ${
                    selectedUser.state === 'active' 
                      ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' 
                      : 'bg-green-50 text-green-700 hover:bg-green-100'
                  }`}
                >
                  {selectedUser.state === 'active' ? 'Deactivate Account' : 'Reactivate Account'}
                </button>

                {!isEmailVerified && (
                  <button 
                    onClick={verifyEmail}
                    disabled={loading === selectedUser.id}
                    className="w-full py-2 bg-blue-50 text-blue-700 rounded-lg font-semibold text-sm hover:bg-blue-100 transition-colors"
                  >
                    Mark Email as Verified
                  </button>
                )}

                <button 
                  onClick={generateRecovery}
                  disabled={loading === selectedUser.id}
                  className="w-full py-2 bg-indigo-50 text-indigo-700 rounded-lg font-semibold text-sm hover:bg-indigo-100 transition-colors"
                >
                  Generate Recovery Link
                </button>

                {recoveryData && (
                  <div className="p-3 bg-indigo-900 text-white rounded-lg text-[10px] break-all font-mono">
                    <p className="mb-2 text-indigo-300 font-bold uppercase tracking-widest">Recovery URL (Secret):</p>
                    {recoveryData.recovery_link}
                  </div>
                )}

                <button 
                  onClick={() => revokeSessions(selectedUser.id)}
                  disabled={loading === selectedUser.id}
                  className="w-full py-2 bg-slate-50 text-slate-700 rounded-lg font-semibold text-sm hover:bg-slate-100 transition-colors"
                >
                  Revoke All Sessions
                </button>

                <button 
                  onClick={() => handleDelete(selectedUser.id)}
                  disabled={loading === selectedUser.id}
                  className="w-full py-2 bg-red-50 text-red-700 rounded-lg font-semibold text-sm hover:bg-red-100 transition-colors"
                >
                  Delete Identity
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-12 text-center text-slate-400 italic text-sm">
              Select a user to manage their profile and account lifecycle.
            </div>
          )}
        </div>
      </div>
      
      <footer className="mt-12 pt-6 border-t border-slate-100 text-xs text-slate-400 text-center">
        Zero-Trust Admin Proxy: All requests are signed with RS256 JWT and audited by the DMS Backend.
      </footer>
    </div>
  )
}
