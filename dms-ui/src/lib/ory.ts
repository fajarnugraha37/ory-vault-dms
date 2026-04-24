import { Configuration, FrontendApi } from "@ory/client"

export const ory = new FrontendApi(
  new Configuration({
    basePath: "http://auth.ory-vault.test", // Access Kratos via Nginx Gateway
    baseOptions: {
      withCredentials: true,
    },
  }),
)
