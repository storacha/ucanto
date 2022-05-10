import type { Link } from "../../api.js"
export * from "../../api.js"

export type Publish = {
  can: "name/publish"
  with: `${string}:${string}`
  content: Link<any>
  origin?: Link<Publish>
}

export type Resolve = {
  can: "name/resolve"
  with: `${string}:${string}`
}
