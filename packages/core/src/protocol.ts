import * as API from '@ucanto/interface'

interface Protocol<Abilities extends ProvidedCapabilities> {
  api: Abilities
  and<Extension extends ProvidedCapabilities>(
    protocol: Protocol<Extension>
  ): Protocol<Abilities & Extension>
}

interface Task<
  In extends API.Capability = API.Capability,
  Out extends API.Result<unknown, { error: true }> = API.Result<
    unknown,
    { error: true }
  >
> {
  can: In['can']
  uri: API.Reader<In['with']>
  in: API.Reader<In['nb']>
  out: API.Reader<Out>
}

type ProvidedCapabilities = {
  [K: string]: Task | ProvidedCapabilities
}

declare function task<
  In extends API.Capability,
  Ok extends {},
  Fail extends { error: true }
>(source: {
  in: API.Reader<In>
  ok: API.Reader<Ok>
  error?: API.Reader<Fail>
}): Task<In, API.Result<Ok, Fail>>

declare function protocol<Tasks extends [Task, ...Task[]]>(
  tasks: Tasks
): InferProtocolAPI<Tasks>

declare function api<T extends Task>(task: T): InferTaskAPI<T>

type InferProtocolAPI<Tasks> = Tasks extends [infer T]
  ? InferTaskAPI<T>
  : Tasks extends [infer T, ...infer TS]
  ? InferTaskAPI<T> & InferProtocolAPI<TS>
  : never

type InferTaskAPI<T> = T extends Task<infer C>
  ? InferTaskPath<C['can'], T>
  : never

type InferTaskPath<
  Path extends string,
  T extends Task
> = Path extends `${infer Key}/${infer Rest}`
  ? { [K in Key]: InferTaskPath<Rest, T> }
  : { [K in Path]: T }

export { task, protocol, api }
