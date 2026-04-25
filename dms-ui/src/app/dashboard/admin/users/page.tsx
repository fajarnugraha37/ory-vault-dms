"use client"

import useSWR from 'swr'
import axios from 'axios'
import { useState } from 'react'

const fetcher = (url: string) => axios.get(url, { withCredentials: true }).then(res => res.data)

interface Identity {
  id: string
  traits: {
    email: string
  }
  state: string
}

export default function AdminUsersPage() {
  const { data: identities, error, mutate } = useSWR<Identity[]>('/admin-api/identities', fetcher)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return
    
    setLoadingId(id)
    try {
      await axios.delete(`/admin-api/identities/${id}`, { withCredentials: true })
      mutate() // Refresh list
    } catch (err) {
      alert('Failed to delete user')
      console.error(err)
    } finally {
      setLoadingId(null)
    }
  }

  if (error) return (
    <div className="p-8 text-red-500">
      <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
      <p>Only users with @ory-vault.test or @ory-vault.admin emails can access this page.</p>
      <a href="/" className="mt-4 inline-block text-blue-500 hover:underline">Return to Home</a>
    </div>
  )
  
  if (!identities) return <div className="p-8">Loading identities...</div>

  return (
    <div className="p-8">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-slate-500">Identity Admin Panel (Zero Trust Verified)</p>
        </div>
        <a href="/" className="text-blue-500 hover:underline">Back to Dashboard</a>
      </header>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="p-4 font-semibold text-slate-700">Identity ID</th>
              <th className="p-4 font-semibold text-slate-700">Email</th>
              <th className="p-4 font-semibold text-slate-700">State</th>
              <th className="p-4 font-semibold text-slate-700 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {identities.map((user) => (
              <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="p-4 font-mono text-sm text-slate-600">{user.id}</td>
                <td className="p-4 font-medium">{user.traits.email}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    user.state === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {user.state}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button 
                    onClick={() => handleDelete(user.id)}
                    disabled={loadingId === user.id}
                    className="text-red-600 hover:bg-red-50 px-3 py-1 rounded-md transition-colors disabled:opacity-50"
                  >
                    {loadingId === user.id ? 'Deleting...' : 'Delete'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <footer className="mt-8 pt-4 border-t border-slate-100 text-xs text-slate-400">
        All actions are logged for audit purposes. Backend validates your JWT and Admin privileges.
      </footer>
    </div>
  )
}
