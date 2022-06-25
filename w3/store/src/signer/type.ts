export type { Link } from '@ucanto/interface'

export interface SignOptions {
  accessKeyId: string
  secretAccessKey: string
  securityToken?: string
  region: string
  bucket: string
  expires?: number
}
