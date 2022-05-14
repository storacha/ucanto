import * as API from "../../../src/api.js"
export * from "../../../src/api.js"

export interface Register
  extends API.Capability<"account/register", `did:key:${string}`> {}

export interface VerifyEmail
  extends API.Capability<
    "verify/verify",
    `mailto:${string}@${string}.${string}`
  > {}

export interface VerifyGithub
  extends API.Capability<"account/verify", "did:web:github:"> {}

export interface VerifyTwitter
  extends API.Capability<"account/verify", "did:web:twitter:"> {}

export type Verify = VerifyGithub | VerifyEmail | VerifyTwitter
