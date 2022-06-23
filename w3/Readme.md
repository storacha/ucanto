# uploads v2 packages

This directory contains set of packages for uploads v2 implementation. Eventually they will migrate into a different repository, but right now they are been developed along the side of ucanto libraries to reduce
amount of coordination needed.

### sigv4

Is helper library for [generating a presigned URL to upload an object into S3](https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html)

### w3-cli

uploads v2 cli application. It can be used to:

1. Register an account via email by running `register` command.
2. Print local DID (of the CLI client) by running `id` command.
3. Print account identifier CLI is registered with by running `whoami` command.

### w3-store

This package provides uploads v2 buisness logic. It takes several components:

1. [Accounting.Provider](./store/src/type/accounting.ts#L16-L35) which in used to:

   1. Persist user `DID -> CID<CAR>` relationships.
   2. Query those relations.

   This is simply an interface by which "uploads" service interacts with "accounting" service through a **trusted** channel.

   Package also comes with the reference implementation (not fit for production use) of this interface which can be instantiated as

   ```ts
   import { Accounting } from "w3-store"

   Accounting.create({
    db: {
      /**
       * Takes DID in string representation and expects
       * a map of CID string -> CID`
       */
      async get(key:string): Promise<Map<string, CID>> {
        // your implementation here
      }
      async set(key:string, links:Map<string, CID>>) {
        // your implementation here
      }
    }
   })
   ```

2. "ucanto connection" to an [Identity](./store/src/type/identity.ts#L11-L38)
   service. which is used to:

   1. Identify whether users is registered.
   2. Propagate `identity/*` capabilities that service.

   This is an interface by which "uploads" service interacts with "identity" service through an **untrusted** channel (meaning that "identity" service verify
   UCANs and deny service if not authorized).

   Package also comes with the reference implementation (not fit for the production use) of the identity service, which can be instantiated as follows:

   ```ts
   import { Identity } from 'w3-store'

   Identity.create({
     id: process.env.W3_ID_KEYPAIR,
   })
   ```
