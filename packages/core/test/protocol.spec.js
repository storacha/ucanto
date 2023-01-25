import { test, assert } from './test.js'
import { capability, Failure, Schema, protocol } from '../src/lib.js'
import * as API from '@ucanto/interface'
import * as Store from './capabilities/store.js'
import * as Upload from './capabilities/upload.js'

/**
 * @template T
 * @param {API.Reader<T>} item
 */
const list = item =>
  Schema.struct({
    cursor: Schema.string().optional(),
    size: Schema.integer(),
    results: Schema.array(item),
  })

const car = Schema.struct({
  link: Schema.Link,
  size: Schema.integer(),
  origin: Schema.Link.optional(),
})

const unit = Schema.struct({})

const up = Schema.struct({
  root: Schema.Link,
  shards: Upload.CARLink.array().optional(),
})

const CARAdded = Schema.struct({
  status: 'done',
  with: Schema.DID.match({ method: 'key' }),
  link: Schema.Link,
})

const CARReceiving = Schema.struct({
  status: 'upload',
  with: Schema.DID.match({ method: 'key' }),
  link: Schema.Link,
  url: Schema.URI,
})

// roughly based on https://github.com/web3-storage/w3protocol/blob/6e83725072ee093dda16549675b9ac943ea096b7/packages/upload-client/src/types.ts#L30-L41

const store = {
  add: Schema.task({
    in: Store.add,
    ok: CARAdded.or(CARReceiving),
  }),
  list: Schema.task({
    in: Store.list,
    ok: list(car),
  }),
  remove: Schema.task({
    in: Store.remove,
    ok: unit,
  }),
}

const upload = {
  add: Schema.task({
    in: Upload.add,
    ok: up,
  }),
  list: Schema.task({
    in: Upload.list,
    ok: list(up),
  }),
  remove: Schema.task({
    in: Upload.remove,
    ok: up,
  }),
}

test('task api', () => {
  assert.deepInclude(store.add, {
    can: 'store/add',
    with: Schema.DID.match({ method: 'key' }),
    in: Store.add,
    out: Schema.result({ ok: CARAdded.or(CARReceiving) }),
  })

  assert.deepInclude(store.remove, {
    can: 'store/remove',
    with: Schema.URI.match({ protocol: 'did:' }),
    in: Store.remove,
    out: Schema.result({ ok: unit }),
  })
})

test('protocol derives capabilities', () => {
  const w3Store = protocol([store.add, store.list, store.remove])

  assert.deepEqual(w3Store.abilities, { store })

  const w3 = protocol([
    store.add,
    store.list,
    store.remove,
    upload.add,
    upload.list,
    upload.remove,
  ])

  assert.deepEqual(w3.abilities, { store, upload })
})
