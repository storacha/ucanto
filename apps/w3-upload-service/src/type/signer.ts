import { Link, Await } from "@ucanto/interface"

export interface SignOptions {
  link: Link<unknown, number, number, 0 | 1>
  expires?: number
}
export interface Signer {
  sign(options: SignOptions): Await<URL>
}
