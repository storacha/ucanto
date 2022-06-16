import * as Server from "@ucanto/server"
import type {
  Link,
  Block,
  ServerView,
  ConnectionView,
  SigningAuthority,
  Audience,
  MalformedCapability,
  InvocationError,
} from "@ucanto/interface"
import type { Capability, ServiceMethod, DID, Failure } from "@ucanto/server"
import * as Accounting from "./accounting"
import * as Identity from "./identity"
import * as Signer from "./signer"

export type { Link }

export interface StoreService {
  start(options: ServiceOptions): Server.ServerView<Store>
}
export interface ServiceOptions {
  self: SigningAuthority
  identity: ConnectionView<{ identity: Identity.Identity }> & { id: Audience }

  accounting: Accounting.Provider

  signer: Signer.Signer
}

export interface Options
  extends Server.TranpsortOptions,
    Server.ValidatorOptions,
    ServiceOptions {}

export interface Store {
  add: ServiceMethod<
    Add,
    AddState,
    | Identity.NotRegistered
    | Accounting.Error
    | MalformedCapability
    | InvocationError
  >
  remove: ServiceMethod<Remove, AnyLink, MalformedCapability | InvocationError>

  list: ServiceMethod<List, AnyLink[], InvocationError>
}

export type AddState = AddDone | UploadRequired

export interface AddDone {
  status: "done"
  with: DID
  link: CARLink
}

export interface UploadRequired {
  status: "upload"
  with: DID
  link: CARLink
  url: string
}

export type AnyLink = Link<unknown, number, number, 0 | 1>
export type CARLink = Link<
  { roots: Block[]; blocks: Map<string, Block> },
  0x0202
>

export interface Add extends Capability<"store/add", DID> {
  link: CARLink
}

export interface Remove extends Capability<"store/remove", DID> {
  link: CARLink
}

export interface List extends Capability<"store/list", DID> {}
