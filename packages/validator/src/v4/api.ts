import * as API from "../api.js"
export * from "../v3/api.js"
import type {
  SourceCapability,
  InvalidCapability,
  CanIssue,
  Tuple,
  ParsedCapability,
  Derives,
  Delegation,
} from "../v3/api.js"

interface GroupMatch<
  T extends Tuple<ParsedCapability> = Tuple<ParsedCapability>,
  M extends GroupMatch = UnknownGroupMatch
> {
  capabilities: T
  proofs: InferProofs<T>
}

type InferProofs<T extends unknown[]> = T extends []
  ? []
  : T extends [infer C, ...infer Rest]
  ? [Evidence<C & ParsedCapability>, ...InferProofs<Rest>]
  : never

export type InferEvidence<
  T extends [unknown, ...unknown[]] = [unknown, ...unknown[]]
> = T extends [SingleCapability<infer I>, []]
  ? [Evidence<I>]
  : T extends [SingleCapability<infer I>, infer A, ...infer Rest]
  ? [Evidence<I>, InferEvidence<[A, ...Rest]>]
  : never

export interface Evidence<T extends ParsedCapability = ParsedCapability> {
  capability: T
  delegation: Delegation
}

interface UnknownGroupMatch extends GroupMatch {}

export interface SingleCapability<
  T extends API.ParsedCapability = API.ParsedCapability
> extends MultipleCapabilities<[T]> {}

export interface MultipleCapabilities<
  From extends [API.ParsedCapability, ...API.ParsedCapability[]] = [
    API.ParsedCapability,
    ...API.ParsedCapability[]
  ]
> {
  members: From

  claim(proofs: API.Delegation[]): Claim<InferEvidence<From>>
}

export interface DerivedCapability<
  T extends API.ParsedCapability = API.ParsedCapability,
  From extends [API.ParsedCapability, ...API.ParsedCapability[]] = [
    API.ParsedCapability,
    ...API.ParsedCapability[]
  ]
> extends SingleCapability<T> {
  as: SingleCapability<T>
  from: MultipleCapabilities<From>

  derives: Derives<T, From>
}

export interface Claim<T extends Tuple<Evidence>> {
  unknown: API.Capability[]
  malformed: API.Capability[]
  matched: MatchedCapabilities<T>[]
}

export interface MatchedCapabilities<T extends Tuple<Evidence>> {
  evidence: T
}

export interface SelectedCapability<T extends API.ParsedCapability, Then> {
  matched: { capabilities: [T]; next: Then }[]
  unknown: API.Capability[]
  malformed: API.Capability[]
  escalated: API.Problem[]
}

export interface State<
  T extends unknown = unknown,
  P extends Prover = UnknownProver
> {
  value: T
  next: P
}

export interface Prover<S extends [State, ...State[]] = [State, ...State[]]> {
  select(proofs: API.Delegation[]): Selected<S>
}

export interface Selected<S> {
  matches: S[]
}

interface UnknownProver extends Prover {}

export interface MonoProver<T> extends Prover<[State<T, MonoProver<T>>]> {}

export interface PolyProver<P extends [Prover<[State]>, ...Prover<[State]>[]]>
  extends Prover<InferStates<P>> {}

export interface DerivedProver<T, P extends Prover>
  extends Prover<[State<T, P | DerivedProver<T, P>>]> {}

export type InferStates<P extends [unknown, ...unknown[]]> = P extends [
  Prover<[State<infer T, infer P>]>
]
  ? [State<T, P>]
  : P extends [Prover<[State<infer T, infer P>]>, infer First, ...infer Rest]
  ? [State<T, P>, ...InferStates<[First, ...Rest]>]
  : never
