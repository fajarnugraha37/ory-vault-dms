"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { ory } from "@/lib/ory"
import { RegistrationFlow, UpdateRegistrationFlowBody } from "@ory/client"
import { AxiosError } from "axios"

function RegistrationContent() {
  const [flow, setFlow] = useState<RegistrationFlow | null>(null)
  const [values, setValues] = useState<Record<string, any>>({})
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const router = useRouter()
  const flowId = searchParams.get("flow")

  const initializeValues = (nodes: any[]) => {
    const val: Record<string, any> = {}
    nodes.forEach((node) => {
      if (node.type === "input") {
        const attrs = node.attributes as any
        if (attrs.value && attrs.type !== "password") {
          val[attrs.name] = attrs.value
        }
      }
    })
    setValues(val)
  }

  useEffect(() => {
    if (flowId) {
      ory.getRegistrationFlow({ id: flowId }).then(({ data }) => {
        setFlow(data)
        initializeValues(data.ui.nodes)
      })
    } else {
      ory
        .createBrowserRegistrationFlow({
          returnTo: searchParams.get("return_to") || undefined,
        })
        .then(({ data }) => {
          setFlow(data)
          router.replace(`/auth/registration?flow=${data.id}`)
        })
        .catch((err: AxiosError) => {
          console.error(err)
          setError("Could not create registration flow")
        })
    }
  }, [flowId, router, searchParams])

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!flow) return

    // CRITICAL: Construct proper Kratos payload
    const payload: any = {
      method: "password",
      traits: {},
    }

    // Capture everything from current state
    Object.keys(values).forEach((key) => {
      if (key.startsWith("traits.")) {
        const traitKey = key.replace("traits.", "")
        payload.traits[traitKey] = values[key]
      } else {
        payload[key] = values[key]
      }
    })

    console.log("Submitting Registration Payload:", payload)

    ory
      .updateRegistrationFlow({
        flow: flow.id,
        updateRegistrationFlowBody: payload as UpdateRegistrationFlowBody,
      })
      .then(() => {
        router.push("/")
      })
      .catch((err: AxiosError) => {
        if (err.response?.status === 400) {
          setFlow(err.response.data as RegistrationFlow)
          // Re-initialize to make sure we don't lose the new CSRF token if Kratos refreshed it
          const newNodes = (err.response.data as RegistrationFlow).ui.nodes
          const nextValues = { ...values }
          newNodes.forEach((node: any) => {
             if (node.type === "input" && node.attributes.type === "hidden") {
                nextValues[node.attributes.name] = node.attributes.value
             }
          })
          setValues(nextValues)
          return
        }
        console.error("Registration Error:", err.response?.data || err.message)
        setError("Registration failed. Please check your inputs.")
      })
  }

  if (!flow) return <div className="flex justify-center items-center min-h-screen">Loading...</div>

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2 bg-gray-50 text-gray-900">
      <div className="p-8 bg-white shadow-md rounded-lg w-96">
        <h1 className="text-2xl font-bold mb-6 text-center">Create Account</h1>
        
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
                    className="w-full py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 transition font-medium"
                  >
                    {node.meta.label?.text || "Register"}
                  </button>
                )
              }

              if (attributes.type === "hidden") {
                return <input key={index} type="hidden" name={attributes.name} value={values[attributes.name] || attributes.value} />
              }

              return (
                <div key={index} className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 mb-1">
                    {node.meta.label?.text || attributes.name}
                  </label>
                  <input
                    type={attributes.type}
                    name={attributes.name}
                    value={values[attributes.name] || ""}
                    onChange={(e) =>
                      setValues({ ...values, [attributes.name]: e.target.value })
                    }
                    className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    required={attributes.required}
                  />
                  {node.messages.map((msg, i) => (
                    <span key={i} className={`text-xs mt-1 ${msg.type === "error" ? "text-red-500" : "text-blue-500"}`}>
                      {msg.text}
                    </span>
                  ))}
                </div>
              )
            }
            return null
          })}
        </form>
        <div className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <a href="/auth/login" className="text-blue-600 hover:underline">
            Login
          </a>
        </div>
      </div>
    </div>
  )
}

export default function RegistrationPage() {
  return (
    <Suspense fallback={<div>Loading registration flow...</div>}>
      <RegistrationContent />
    </Suspense>
  )
}
