import { Link, Await } from "@ucanto/interface"

export interface SignOptions {
  accessKeyId: string
  secretAccessKey: string
  region: string
  cache?: Map<string, ArrayBuffer>
  bucket: string
  expires?: number
}

export interface Signer {
  sign(
    link: Link<unknown, number, number, 0 | 1>,
    options: SignOptions
  ): Await<URL>
}
