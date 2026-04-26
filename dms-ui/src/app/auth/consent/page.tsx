"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import axios from "axios"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Shield, CheckCircle2, XCircle, ExternalLink } from "lucide-react"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.ory-vault.test";

function ConsentContent() {
  const searchParams = useSearchParams()
  const challenge = searchParams.get("consent_challenge")
  const [request, setConsentRequest] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (challenge) {
      axios.get(`${API_BASE_URL}/api/oauth2/consent?consent_challenge=${challenge}`, { withCredentials: true })
        .then(({ data }) => {
          setConsentRequest(data)
          setLoading(false)
        })
        .catch(err => {
          console.error(err)
          setError("Failed to fetch consent request. Link may be invalid or expired.")
          setLoading(false)
        })
    } else {
      setError("Missing consent challenge")
      setLoading(false)
    }
  }, [challenge])

  const handleDecision = async (accept: boolean) => {
    setLoading(true)
    try {
      const res = await axios.post(`${API_BASE_URL}/api/oauth2/consent/accept`, {
        challenge: challenge,
        grant_scope: accept ? request.requested_scope : []
      }, { withCredentials: true })
      
      if (res.data.redirect_to) {
        window.location.href = res.data.redirect_to
      }
    } catch (err) {
      console.error(err)
      setError("An error occurred while submitting your decision.")
      setLoading(false)
    }
  }

  if (loading && !request) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-4 border-slate-900 rounded-[2rem] shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
          <CardContent className="p-10 flex flex-col items-center">
            <XCircle size={48} className="text-red-500 mb-4" />
            <p className="font-black text-center uppercase text-xs tracking-widest">{error}</p>
            <Button className="mt-6 font-black rounded-xl" onClick={() => window.location.href = "/"}>Back to Home</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <Card className="max-w-md w-full border-4 border-slate-900 rounded-[2rem] shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] overflow-hidden bg-white">
        <CardHeader className="bg-slate-50 border-b-2 border-slate-100 p-8 text-center">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-blue-100">
            <Shield size={32} />
          </div>
          <CardTitle className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Permission_Request</CardTitle>
          <CardDescription className="font-bold text-[10px] text-slate-400 uppercase tracking-[0.2em] mt-2">
            Third-Party Access Authorization
          </CardDescription>
        </CardHeader>
        
        <CardContent className="p-8 space-y-6">
          <div className="bg-slate-900 text-white p-6 rounded-2xl flex items-center gap-4">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center border border-white/20">
              <ExternalLink size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Application</p>
              <p className="font-black text-lg">{request?.client?.client_name || "Unknown App"}</p>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Wants permission to:</p>
            <div className="space-y-2">
              {request?.requested_scope?.map((scope: string) => (
                <div key={scope} className="flex items-center gap-3 p-3 bg-slate-50 border-2 border-slate-100 rounded-xl">
                  <CheckCircle2 size={16} className="text-green-500" />
                  <span className="font-bold text-xs text-slate-700">{scope}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[9px] text-slate-400 font-bold leading-relaxed">
            By clicking "Allow Access", you authorize this application to access the data listed above. You can revoke this access at any time from your settings.
          </p>
        </CardContent>

        <CardFooter className="p-8 bg-slate-50 border-t-2 border-slate-100 flex gap-3">
          <Button 
            variant="outline" 
            className="flex-1 font-black rounded-xl h-14 border-2 uppercase text-[10px] tracking-widest hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all"
            onClick={() => handleDecision(false)}
            disabled={loading}
          >
            Deny
          </Button>
          <Button 
            className="flex-1 font-black rounded-xl h-14 bg-slate-900 text-white uppercase text-[10px] tracking-widest hover:bg-blue-600 transition-all shadow-lg active:translate-y-1"
            onClick={() => handleDecision(true)}
            disabled={loading}
          >
            Allow Access
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

export default function ConsentPage() {
  return (
    <Suspense fallback={<div>Loading consent...</div>}>
      <ConsentContent />
    </Suspense>
  )
}
