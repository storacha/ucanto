export * from './connection.js'

export * from '@ucanto/interface'
import { Delegation, invoke, Schema, DAG, ok, error } from '@ucanto/core'

export const delegate = Delegation.delegate
export { invoke, ok, error, Schema, DAG }
