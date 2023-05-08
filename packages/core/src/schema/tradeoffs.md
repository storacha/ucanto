- we either have:
  1. Another set of APIs for working with dags alongside of regular APIs
    that take `BlockStore / BlockLoader` in addition.
  2. We have set of properties that fail decode when `.link().resolve()` is used.
  3. We have a modifier that turns regular struct decoder into DAG decoder.
  4. We have alternative to `struct({})` which takes `.link().resolve()`.
