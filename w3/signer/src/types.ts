import * as API from "@ucanto/interface"
export interface SignOptions {
  accessKeyId: string
  secretAccessKey: string
  region: string
  bucket: string
  expires?: number
}

export type Link = API.Link<unknown, number, number, 0 | 1>
