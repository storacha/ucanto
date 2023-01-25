import type { Task } from '../schema.js'
import type { Ability } from '@ucanto/interface'

export type { Task, Ability }

export interface Protocol<Abilities extends TaskGroup> {
  abilities: Abilities
  // and<Extension extends ProvidedCapabilities>(
  //   protocol: Protocol<Extension>
  // ): Protocol<Abilities & Extension>
}

export type TaskGroup = {
  [K: string]: Task | TaskGroup
}

export type InferAbilities<Tasks> = Tasks extends [infer T]
  ? InferAbility<T>
  : Tasks extends [infer T, ...infer TS]
  ? InferAbility<T> & InferAbilities<TS>
  : never

type InferAbility<T> = T extends Task<infer C>
  ? InferNamespacedAbility<C['can'], T>
  : never

type InferNamespacedAbility<
  Path extends string,
  T extends Task
> = Path extends `${infer Key}/${infer Rest}`
  ? { [K in Key]: InferNamespacedAbility<Rest, T> }
  : { [K in Path]: T }
