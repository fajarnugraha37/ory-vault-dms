"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { ory } from "@/lib/ory"
import { api } from "@/lib/api"
import { LoginFlow, UpdateLoginFlowBody } from "@ory/client"
import { AxiosError } from "axios"

function LoginContent() {
  const [flow, setFlow] = useState<LoginFlow | null>(null)
  const [values, setValues] = useState<Record<string, any>>({})
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const router = useRouter()
  const flowId = searchParams.get("flow")

  useEffect(() => {
    if (flowId) {
      ory.getLoginFlow({ id: flowId }).then(({ data }) => {
        setFlow(data)
        const initialValues: Record<string, any> = {}
        data.ui.nodes.forEach((node) => {
          if (node.type === "input") {
            const attrs = node.attributes as any
            if (attrs.value && attrs.type !== "password") {
              initialValues[attrs.name] = attrs.value
            }
          }
        })
        setValues((prev) => ({ ...initialValues, ...prev }))
      })
    } else {
      const returnTo = searchParams.get("return_to");
      const loginChallenge = searchParams.get("login_challenge");
      
      ory
        .createBrowserLoginFlow({
          refresh: true,
          returnTo: returnTo || undefined,
        })
        .then(({ data }) => {
          setFlow(data)
          let nextUrl = `/auth/login?flow=${data.id}`;
          if (returnTo) nextUrl += `&return_to=${encodeURIComponent(returnTo)}`;
          if (loginChallenge) nextUrl += `&login_challenge=${encodeURIComponent(loginChallenge)}`;
          router.replace(nextUrl);
        })
        .catch((err: AxiosError) => {
          console.error(err)
          setError("Could not create login flow")
        })
    }
  }, [flowId, router, searchParams])

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!flow) return

    ory
      .updateLoginFlow({
        flow: flow.id,
        updateLoginFlowBody: {
          method: "password",
          ...values,
        } as UpdateLoginFlowBody,
      })
      .then(async ({ data: loginResponse }) => {
        // Check for Hydra login challenge
        const loginChallenge = searchParams.get("login_challenge");
        
        if (loginChallenge) {
          try {
            // Use centralized API instance
            const res = await api.post("/api/oauth2/login/accept", {
              challenge: loginChallenge,
              subject: loginResponse.session?.identity?.id
            });
            
            if (res.data.redirect_to) {
              window.location.href = res.data.redirect_to;
              return;
            }
          } catch (e) {
            console.error("Hydra login accept failed", e);
            setError("OAuth2 integration error. Please contact admin.");
            return;
          }
        }
        
        // Use return_to if present, otherwise default to home
        const returnTo = searchParams.get("return_to");
        if (returnTo) {
            window.location.href = returnTo;
        } else {
            router.push("/");
        }
      })
      .catch((err: AxiosError) => {
        if (err.response?.status === 400) {
          setFlow(err.response.data as LoginFlow)
          return
        }
        console.error(err)
        setError("Login failed. Please check your credentials.")
      })
  }

  if (!flow) return <div className="flex justify-center items-center min-h-screen">Loading...</div>

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2 bg-gray-50 text-gray-900">
      <div className="p-8 bg-white shadow-md rounded-lg w-96">
        <h1 className="text-2xl font-bold mb-6 text-center">Login to Ory Vault</h1>
        
        {error && (
          <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 text-sm rounded">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          {flow.ui.nodes.map((node, index) => {
            if (node.type === "input") {
              const attributes = node.attributes as any
              if (attributes.type === "submit") {
                return (
                  <button
                    key={index}
                    type="submit"
                    name={attributes.name}
                    value={attributes.value}
                    className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition font-medium"
                  >
                    Login
                  </button>
                )
              }
              
              if (attributes.type === "hidden") {
                return <input key={index} type="hidden" name={attributes.name} value={attributes.value} />
              }

              return (
                <div key={index} className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 mb-1">
                    {node.meta.label?.text || attributes.name}
                  </label>
                  <input
                    type={attributes.type}
                    name={attributes.name}
                    defaultValue={values[attributes.name] || attributes.value || ""}
                    onChange={(e) =>
                      setValues({ ...values, [attributes.name]: e.target.value })
                    }
                    className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    required={attributes.required}
                  />
                  {node.messages.map((msg, i) => (
                    <span key={i} className="text-red-500 text-xs mt-1">
                      {msg.text}
                    </span>
                  ))}
                </div>
              )
            }
            return null
          })}
        </form>
        <div className="mt-6 text-center space-y-2 text-sm text-gray-600">
          <div>
            <a href="/auth/recovery" className="text-blue-600 hover:underline">
              Forgot your password?
            </a>
          </div>
          <div>
            Don't have an account?{" "}
            <a href="/auth/registration" className="text-blue-600 hover:underline">
              Register
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading login flow...</div>}>
      <LoginContent />
    </Suspense>
  )
}
