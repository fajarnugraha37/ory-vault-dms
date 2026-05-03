import { Configuration, FrontendApi } from "@ory/client"

export const ory = new FrontendApi(
  new Configuration({
    basePath: process.env.NEXT_PUBLIC_ORY_URL || "https://auth.ory-vault.test", // Access Kratos via Nginx Gateway
    baseOptions: {
      withCredentials: true,
    },
  }),
)
