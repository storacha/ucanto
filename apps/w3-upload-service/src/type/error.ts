export interface ServiceError<Name extends string> {
  readonly name: Name
  readonly error: true
  toJSON(): ToJSON<Omit<this, "toJSON">>
}

type ToJSON<T> = T extends undefined
  ? never
  : T extends number | null | string | boolean
  ? T
  : T extends { toJSON(): infer U }
  ? ToJSON<U>
  : T extends Array<infer U>
  ? Array<ToJSON<U>>
  : T extends (...args: any[]) => any
  ? never
  : T extends object
  ? { [K in keyof T]: ToJSON<T[K]> }
  : never
