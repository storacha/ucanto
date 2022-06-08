export * from "../../../src/api.js"
import * as API from "../../../src/api.js"

export interface Read extends API.Capability<"file/read", `file://${string}`> {}

export interface Write
  extends API.Capability<"file/write", `file://${string}`> {}

export interface ReadWrite
  extends API.Capability<"file/read+write", `file://${string}`> {}

export type Any = Read | Write | ReadWrite
