"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ory } from "@/lib/ory";
import { Session } from "@ory/client";
import { AxiosError } from "axios";

export default function Dashboard() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    ory
      .toSession()
      .then(({ data }) => {
        setSession(data);
        setLoading(false);
      })
      .catch((err: AxiosError) => {
        console.error("Session check failed:", err);
        // If 401 or generic network error (CORS/Network), redirect to login
        if (err.response?.status === 401 || !err.response) {
          router.push("/auth/login");
          return;
        }
        setLoading(false);
      });
  }, [router]);

  const onLogout = () => {
    ory.createBrowserLogoutFlow().then(({ data }) => {
      window.location.href = data.logout_url;
    });
  };

  if (loading) return <div>Checking session...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-8 pb-4 border-b">
          <h1 className="text-3xl font-bold text-gray-800">ORY Vault DMS</h1>
          <button
            onClick={onLogout}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
          >
            Logout
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50 p-6 rounded-lg border border-blue-100">
            <h2 className="text-xl font-semibold mb-4 text-blue-800">
              Identity Details
            </h2>
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-bold">Subject:</span>{" "}
                {session?.identity?.id}
              </p>
              <p>
                <span className="font-bold">Email:</span>{" "}
                {session?.identity?.traits.email}
              </p>
              <p>
                <span className="font-bold">Name:</span>{" "}
                {session?.identity?.traits.first_name}{" "}
                {session?.identity?.traits.last_name}
              </p>
              <p>
                <span className="font-bold">Division:</span>{" "}
                {session?.identity?.traits.division}
              </p>
            </div>
          </div>

          <div className="bg-green-50 p-6 rounded-lg border border-green-100">
            <h2 className="text-xl font-semibold mb-4 text-green-800">
              API Health
            </h2>
            <div className="space-y-4">
              <button
                onClick={() => {
                  fetch("https://api.ory-vault.test/health", {
                    credentials: "include",
                  })
                    .then((res) => res.text())
                    .then(alert)
                    .catch((err) => alert("Error: " + err.message));
                }}
                className="w-full py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Check API Health (Public)
              </button>
              <button
                onClick={() => {
                  fetch("https://api.ory-vault.test/api/me", {
                    credentials: "include",
                  })
                    .then((res) => {
                      if (res.status === 401)
                        throw new Error("Unauthorized (Oathkeeper block)");
                      return res.json();
                    })
                    .then((data) => alert(JSON.stringify(data, null, 2)))
                    .catch((err) => alert("Error: " + err.message));
                }}
                className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Call /api/me (Protected)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
