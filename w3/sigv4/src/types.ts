export interface SigV4Options {
  accessKeyId: string
  secretAccessKey: string
  securityToken?: string
  region: string
  cache?: Map<string, ArrayBuffer>
}

export interface SignOptions {
  bucket: string
  key: string
  checksum?: string
  expires?: number
}
