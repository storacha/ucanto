# Changelog

### [4.2.3](https://www.github.com/web3-storage/ucanto/compare/interface-v4.1.0...interface-v4.2.3) (2023-02-08)


### Miscellaneous Chores

* release 4.2.3 ([5dc8158](https://www.github.com/web3-storage/ucanto/commit/5dc8158341cd668304c94a4b83e1d9b9affae410))

## [4.1.0](https://www.github.com/web3-storage/ucanto/compare/interface-v4.0.3...interface-v4.1.0) (2023-01-24)


### Features

* delegation.toJSON ([#186](https://www.github.com/web3-storage/ucanto/issues/186)) ([f8ffa74](https://www.github.com/web3-storage/ucanto/commit/f8ffa74bcbb1376b54633003a7c2609f70135c70))
* support execution of materialized invocations ([#199](https://www.github.com/web3-storage/ucanto/issues/199)) ([275bc24](https://www.github.com/web3-storage/ucanto/commit/275bc2439d81d0822c03ac62ba56f63d965d2622))
* update multiformats ([#197](https://www.github.com/web3-storage/ucanto/issues/197)) ([b92a6c6](https://www.github.com/web3-storage/ucanto/commit/b92a6c6f5c066890a25e62205ff9848b1fb8dde1))


### Bug Fixes

* toJSON behavior on the ucan.data ([#185](https://www.github.com/web3-storage/ucanto/issues/185)) ([d1ee6b6](https://www.github.com/web3-storage/ucanto/commit/d1ee6b6a0044d53359f0e20f631e3b86e4b94ab3))

## [4.1.0](https://www.github.com/web3-storage/ucanto/compare/interface-v4.0.3...interface-v4.1.0) (2023-01-18)


### Features

* delegation.toJSON ([#186](https://www.github.com/web3-storage/ucanto/issues/186)) ([f8ffa74](https://www.github.com/web3-storage/ucanto/commit/f8ffa74bcbb1376b54633003a7c2609f70135c70))
* update multiformats ([#197](https://www.github.com/web3-storage/ucanto/issues/197)) ([b92a6c6](https://www.github.com/web3-storage/ucanto/commit/b92a6c6f5c066890a25e62205ff9848b1fb8dde1))


### Bug Fixes

* toJSON behavior on the ucan.data ([#185](https://www.github.com/web3-storage/ucanto/issues/185)) ([d1ee6b6](https://www.github.com/web3-storage/ucanto/commit/d1ee6b6a0044d53359f0e20f631e3b86e4b94ab3))

### [4.0.3](https://www.github.com/web3-storage/ucanto/compare/interface-v4.0.2...interface-v4.0.3) (2022-12-14)


### Bug Fixes

* trigger releases ([a0d9291](https://www.github.com/web3-storage/ucanto/commit/a0d9291f9e20456e115fa6c7890cafe937fa511e))

## [4.0.2](https://github.com/web3-storage/ucanto/compare/interface-v4.1.0...interface-v4.0.2) (2022-12-14)

### ⚠ BREAKING CHANGES

* did prinicipal ([#149](https://github.com/web3-storage/ucanto/issues/149))
* upgrades to multiformats@10 ([#117](https://github.com/web3-storage/ucanto/issues/117))
* switch decoder API to zod like schema API ([#108](https://github.com/web3-storage/ucanto/issues/108))
* upgrade to ucan 0.9 ([#95](https://github.com/web3-storage/ucanto/issues/95))
* update dag-ucan, types and names ([#90](https://github.com/web3-storage/ucanto/issues/90))

### Features

* alight link API with multiformats ([#36](https://github.com/web3-storage/ucanto/issues/36)) ([0ec460e](https://github.com/web3-storage/ucanto/commit/0ec460e43ddda0bb3a3fea8a7881da1463154f36))
* capability provider API ([#34](https://github.com/web3-storage/ucanto/issues/34)) ([ea89f97](https://github.com/web3-storage/ucanto/commit/ea89f97125bb484a12ce3ca09a7884911a9fd4d6))
* cherry pick changes from uploads-v2 demo ([#43](https://github.com/web3-storage/ucanto/issues/43)) ([4308fd2](https://github.com/web3-storage/ucanto/commit/4308fd2f392b9fcccc52af64432dcb04c8257e0b))
* delgation iterate, more errors and types  ([0606168](https://github.com/web3-storage/ucanto/commit/0606168313d17d66bcc1ad6091440765e1700a4f))
* did prinicipal ([#149](https://github.com/web3-storage/ucanto/issues/149)) ([4c11092](https://github.com/web3-storage/ucanto/commit/4c11092e420292af697bd5bec126112f9b961612))
* embedded key resolution ([#168](https://github.com/web3-storage/ucanto/issues/168)) ([5e650f3](https://github.com/web3-storage/ucanto/commit/5e650f376db79c690e4771695d1ff4e6deece40e))
* Impelment InferInvokedCapability per [#99](https://github.com/web3-storage/ucanto/issues/99) ([#100](https://github.com/web3-storage/ucanto/issues/100)) ([fc5a2ac](https://github.com/web3-storage/ucanto/commit/fc5a2ace33f2a3599a654d8edd1641d111032074))
* implement .delegate on capabilities ([#110](https://github.com/web3-storage/ucanto/issues/110)) ([fd0bb9d](https://github.com/web3-storage/ucanto/commit/fd0bb9da58836c05d6ee9f60cd6b1cb6b747e3b1))
* implement rsa signer / verifier ([#102](https://github.com/web3-storage/ucanto/issues/102)) ([8ed7777](https://github.com/web3-storage/ucanto/commit/8ed77770142259be03c3d6a8108365db1ab796b2))
* refactor into monorepo ([#13](https://github.com/web3-storage/ucanto/issues/13)) ([1f99506](https://github.com/web3-storage/ucanto/commit/1f995064ec6e5953118c2dd1065ee6be959f25b9))
* rip out special handling of my: and as: capabilities ([#109](https://github.com/web3-storage/ucanto/issues/109)) ([3ec8e64](https://github.com/web3-storage/ucanto/commit/3ec8e6434a096221bf72193e074810cc18dd5cd8))
* setup pnpm & release-please ([84ac7f1](https://github.com/web3-storage/ucanto/commit/84ac7f12e5a66ee4919fa7527858dc916850e3e0))
* switch decoder API to zod like schema API ([#108](https://github.com/web3-storage/ucanto/issues/108)) ([e2e03ff](https://github.com/web3-storage/ucanto/commit/e2e03ffeb35f00627335dbfd3e128e2cf9dcfdee))
* **ucanto:** capability create / inovke methods ([#51](https://github.com/web3-storage/ucanto/issues/51)) ([ddf56b1](https://github.com/web3-storage/ucanto/commit/ddf56b1ec80ff6c0698255c531936d8eeab532fd))
* **ucanto:** upstream changes from w3 branch ([#54](https://github.com/web3-storage/ucanto/issues/54)) ([861e997](https://github.com/web3-storage/ucanto/commit/861e997e31c2a51195b8384eff5df656b6ec9efc))
* **ucanto:** URI protocol type retention & capability constructors ([e291544](https://github.com/web3-storage/ucanto/commit/e2915447254990d6e2384ff79a1da38120426ed5))
* update dag-ucan, types and names ([#90](https://github.com/web3-storage/ucanto/issues/90)) ([cd792c9](https://github.com/web3-storage/ucanto/commit/cd792c934fbd358d6ccfa5d02f205b14b5f2e14e))
* update to latest dag-ucan ([#165](https://github.com/web3-storage/ucanto/issues/165)) ([20e50de](https://github.com/web3-storage/ucanto/commit/20e50de5e311781ee8dc10e32de4eb12e8df2080))
* upgrade to ucan 0.9 ([#95](https://github.com/web3-storage/ucanto/issues/95)) ([b752b39](https://github.com/web3-storage/ucanto/commit/b752b398950120d6121badcdbb639f4dc9ce8794))
* upgrades to multiformats@10 ([#117](https://github.com/web3-storage/ucanto/issues/117)) ([61dc4ca](https://github.com/web3-storage/ucanto/commit/61dc4cafece3365bbf60f709265ea71180f226d7))


### Bug Fixes

* build types before publishing ([#71](https://github.com/web3-storage/ucanto/issues/71)) ([04b7958](https://github.com/web3-storage/ucanto/commit/04b79588f77dba234aaf628f62f574b124bd540b))
* optional field validation ([#124](https://github.com/web3-storage/ucanto/issues/124)) ([87b70d2](https://github.com/web3-storage/ucanto/commit/87b70d2d56c07f8257717fa5ef584a21eb0417c8))
* remove non-existing exports from map ([8f1a75c](https://github.com/web3-storage/ucanto/commit/8f1a75cea5a7d63435ec265dbd4bb7ed26c8bb4c))


### Miscellaneous Chores

* release 0.0.1-beta ([d6c7e73](https://github.com/web3-storage/ucanto/commit/d6c7e73de56278e2f2c92c4a0e1a2709c92bcbf9))
* release 4.0.2 ([e9e35df](https://github.com/web3-storage/ucanto/commit/e9e35dffeeb7e5b5e19627f791b66bbdd35d2d11))

## [4.1.0](https://github.com/web3-storage/ucanto/compare/interface-v4.0.2...interface-v4.1.0) (2022-12-14)


### Features

* embedded key resolution ([#168](https://github.com/web3-storage/ucanto/issues/168)) ([5e650f3](https://github.com/web3-storage/ucanto/commit/5e650f376db79c690e4771695d1ff4e6deece40e))

## [4.0.2](https://github.com/web3-storage/ucanto/compare/interface-v4.1.0...interface-v4.0.2) (2022-12-14)


### ⚠ BREAKING CHANGES

* did prinicipal ([#149](https://github.com/web3-storage/ucanto/issues/149))
* upgrades to multiformats@10 ([#117](https://github.com/web3-storage/ucanto/issues/117))
* switch decoder API to zod like schema API ([#108](https://github.com/web3-storage/ucanto/issues/108))
* upgrade to ucan 0.9 ([#95](https://github.com/web3-storage/ucanto/issues/95))
* update dag-ucan, types and names ([#90](https://github.com/web3-storage/ucanto/issues/90))

### Features

* alight link API with multiformats ([#36](https://github.com/web3-storage/ucanto/issues/36)) ([0ec460e](https://github.com/web3-storage/ucanto/commit/0ec460e43ddda0bb3a3fea8a7881da1463154f36))
* capability provider API ([#34](https://github.com/web3-storage/ucanto/issues/34)) ([ea89f97](https://github.com/web3-storage/ucanto/commit/ea89f97125bb484a12ce3ca09a7884911a9fd4d6))
* cherry pick changes from uploads-v2 demo ([#43](https://github.com/web3-storage/ucanto/issues/43)) ([4308fd2](https://github.com/web3-storage/ucanto/commit/4308fd2f392b9fcccc52af64432dcb04c8257e0b))
* delgation iterate, more errors and types  ([0606168](https://github.com/web3-storage/ucanto/commit/0606168313d17d66bcc1ad6091440765e1700a4f))
* did prinicipal ([#149](https://github.com/web3-storage/ucanto/issues/149)) ([4c11092](https://github.com/web3-storage/ucanto/commit/4c11092e420292af697bd5bec126112f9b961612))
* embedded key resolution ([#168](https://github.com/web3-storage/ucanto/issues/168)) ([5e650f3](https://github.com/web3-storage/ucanto/commit/5e650f376db79c690e4771695d1ff4e6deece40e))
* Impelment InferInvokedCapability per [#99](https://github.com/web3-storage/ucanto/issues/99) ([#100](https://github.com/web3-storage/ucanto/issues/100)) ([fc5a2ac](https://github.com/web3-storage/ucanto/commit/fc5a2ace33f2a3599a654d8edd1641d111032074))
* implement .delegate on capabilities ([#110](https://github.com/web3-storage/ucanto/issues/110)) ([fd0bb9d](https://github.com/web3-storage/ucanto/commit/fd0bb9da58836c05d6ee9f60cd6b1cb6b747e3b1))
* implement rsa signer / verifier ([#102](https://github.com/web3-storage/ucanto/issues/102)) ([8ed7777](https://github.com/web3-storage/ucanto/commit/8ed77770142259be03c3d6a8108365db1ab796b2))
* refactor into monorepo ([#13](https://github.com/web3-storage/ucanto/issues/13)) ([1f99506](https://github.com/web3-storage/ucanto/commit/1f995064ec6e5953118c2dd1065ee6be959f25b9))
* rip out special handling of my: and as: capabilities ([#109](https://github.com/web3-storage/ucanto/issues/109)) ([3ec8e64](https://github.com/web3-storage/ucanto/commit/3ec8e6434a096221bf72193e074810cc18dd5cd8))
* setup pnpm & release-please ([84ac7f1](https://github.com/web3-storage/ucanto/commit/84ac7f12e5a66ee4919fa7527858dc916850e3e0))
* switch decoder API to zod like schema API ([#108](https://github.com/web3-storage/ucanto/issues/108)) ([e2e03ff](https://github.com/web3-storage/ucanto/commit/e2e03ffeb35f00627335dbfd3e128e2cf9dcfdee))
* **ucanto:** capability create / inovke methods ([#51](https://github.com/web3-storage/ucanto/issues/51)) ([ddf56b1](https://github.com/web3-storage/ucanto/commit/ddf56b1ec80ff6c0698255c531936d8eeab532fd))
* **ucanto:** upstream changes from w3 branch ([#54](https://github.com/web3-storage/ucanto/issues/54)) ([861e997](https://github.com/web3-storage/ucanto/commit/861e997e31c2a51195b8384eff5df656b6ec9efc))
* **ucanto:** URI protocol type retention & capability constructors ([e291544](https://github.com/web3-storage/ucanto/commit/e2915447254990d6e2384ff79a1da38120426ed5))
* update dag-ucan, types and names ([#90](https://github.com/web3-storage/ucanto/issues/90)) ([cd792c9](https://github.com/web3-storage/ucanto/commit/cd792c934fbd358d6ccfa5d02f205b14b5f2e14e))
* update to latest dag-ucan ([#165](https://github.com/web3-storage/ucanto/issues/165)) ([20e50de](https://github.com/web3-storage/ucanto/commit/20e50de5e311781ee8dc10e32de4eb12e8df2080))
* upgrade to ucan 0.9 ([#95](https://github.com/web3-storage/ucanto/issues/95)) ([b752b39](https://github.com/web3-storage/ucanto/commit/b752b398950120d6121badcdbb639f4dc9ce8794))
* upgrades to multiformats@10 ([#117](https://github.com/web3-storage/ucanto/issues/117)) ([61dc4ca](https://github.com/web3-storage/ucanto/commit/61dc4cafece3365bbf60f709265ea71180f226d7))


### Bug Fixes

* build types before publishing ([#71](https://github.com/web3-storage/ucanto/issues/71)) ([04b7958](https://github.com/web3-storage/ucanto/commit/04b79588f77dba234aaf628f62f574b124bd540b))
* optional field validation ([#124](https://github.com/web3-storage/ucanto/issues/124)) ([87b70d2](https://github.com/web3-storage/ucanto/commit/87b70d2d56c07f8257717fa5ef584a21eb0417c8))
* remove non-existing exports from map ([8f1a75c](https://github.com/web3-storage/ucanto/commit/8f1a75cea5a7d63435ec265dbd4bb7ed26c8bb4c))


### Miscellaneous Chores

* release 0.0.1-beta ([d6c7e73](https://github.com/web3-storage/ucanto/commit/d6c7e73de56278e2f2c92c4a0e1a2709c92bcbf9))
* release 4.0.2 ([e9e35df](https://github.com/web3-storage/ucanto/commit/e9e35dffeeb7e5b5e19627f791b66bbdd35d2d11))

## [4.1.0](https://github.com/web3-storage/ucanto/compare/interface-v4.0.2...interface-v4.1.0) (2022-12-14)


### Features

* embedded key resolution ([#168](https://github.com/web3-storage/ucanto/issues/168)) ([5e650f3](https://github.com/web3-storage/ucanto/commit/5e650f376db79c690e4771695d1ff4e6deece40e))

## [4.0.2](https://github.com/web3-storage/ucanto/compare/interface-v4.0.2...interface-v4.0.2) (2022-12-02)


### ⚠ BREAKING CHANGES

* did prinicipal (#149)
* upgrades to multiformats@10 (#117)
* switch decoder API to zod like schema API (#108)
* upgrade to ucan 0.9 (#95)
* update dag-ucan, types and names (#90)

### Features

* alight link API with multiformats ([#36](https://github.com/web3-storage/ucanto/issues/36)) ([0ec460e](https://github.com/web3-storage/ucanto/commit/0ec460e43ddda0bb3a3fea8a7881da1463154f36))
* capability provider API ([#34](https://github.com/web3-storage/ucanto/issues/34)) ([ea89f97](https://github.com/web3-storage/ucanto/commit/ea89f97125bb484a12ce3ca09a7884911a9fd4d6))
* cherry pick changes from uploads-v2 demo ([#43](https://github.com/web3-storage/ucanto/issues/43)) ([4308fd2](https://github.com/web3-storage/ucanto/commit/4308fd2f392b9fcccc52af64432dcb04c8257e0b))
* delgation iterate, more errors and types  ([0606168](https://github.com/web3-storage/ucanto/commit/0606168313d17d66bcc1ad6091440765e1700a4f))
* did prinicipal ([#149](https://github.com/web3-storage/ucanto/issues/149)) ([4c11092](https://github.com/web3-storage/ucanto/commit/4c11092e420292af697bd5bec126112f9b961612))
* Impelment InferInvokedCapability per [#99](https://github.com/web3-storage/ucanto/issues/99) ([#100](https://github.com/web3-storage/ucanto/issues/100)) ([fc5a2ac](https://github.com/web3-storage/ucanto/commit/fc5a2ace33f2a3599a654d8edd1641d111032074))
* implement .delegate on capabilities ([#110](https://github.com/web3-storage/ucanto/issues/110)) ([fd0bb9d](https://github.com/web3-storage/ucanto/commit/fd0bb9da58836c05d6ee9f60cd6b1cb6b747e3b1))
* implement rsa signer / verifier ([#102](https://github.com/web3-storage/ucanto/issues/102)) ([8ed7777](https://github.com/web3-storage/ucanto/commit/8ed77770142259be03c3d6a8108365db1ab796b2))
* rip out special handling of my: and as: capabilities ([#109](https://github.com/web3-storage/ucanto/issues/109)) ([3ec8e64](https://github.com/web3-storage/ucanto/commit/3ec8e6434a096221bf72193e074810cc18dd5cd8))
* setup pnpm & release-please ([84ac7f1](https://github.com/web3-storage/ucanto/commit/84ac7f12e5a66ee4919fa7527858dc916850e3e0))
* switch decoder API to zod like schema API ([#108](https://github.com/web3-storage/ucanto/issues/108)) ([e2e03ff](https://github.com/web3-storage/ucanto/commit/e2e03ffeb35f00627335dbfd3e128e2cf9dcfdee))
* **ucanto:** capability create / inovke methods ([#51](https://github.com/web3-storage/ucanto/issues/51)) ([ddf56b1](https://github.com/web3-storage/ucanto/commit/ddf56b1ec80ff6c0698255c531936d8eeab532fd))
* **ucanto:** upstream changes from w3 branch ([#54](https://github.com/web3-storage/ucanto/issues/54)) ([861e997](https://github.com/web3-storage/ucanto/commit/861e997e31c2a51195b8384eff5df656b6ec9efc))
* **ucanto:** URI protocol type retention & capability constructors ([e291544](https://github.com/web3-storage/ucanto/commit/e2915447254990d6e2384ff79a1da38120426ed5))
* update dag-ucan, types and names ([#90](https://github.com/web3-storage/ucanto/issues/90)) ([cd792c9](https://github.com/web3-storage/ucanto/commit/cd792c934fbd358d6ccfa5d02f205b14b5f2e14e))
* update to latest dag-ucan ([#165](https://github.com/web3-storage/ucanto/issues/165)) ([20e50de](https://github.com/web3-storage/ucanto/commit/20e50de5e311781ee8dc10e32de4eb12e8df2080))
* upgrade to ucan 0.9 ([#95](https://github.com/web3-storage/ucanto/issues/95)) ([b752b39](https://github.com/web3-storage/ucanto/commit/b752b398950120d6121badcdbb639f4dc9ce8794))
* upgrades to multiformats@10 ([#117](https://github.com/web3-storage/ucanto/issues/117)) ([61dc4ca](https://github.com/web3-storage/ucanto/commit/61dc4cafece3365bbf60f709265ea71180f226d7))


### Bug Fixes

* build types before publishing ([#71](https://github.com/web3-storage/ucanto/issues/71)) ([04b7958](https://github.com/web3-storage/ucanto/commit/04b79588f77dba234aaf628f62f574b124bd540b))
* optional field validation ([#124](https://github.com/web3-storage/ucanto/issues/124)) ([87b70d2](https://github.com/web3-storage/ucanto/commit/87b70d2d56c07f8257717fa5ef584a21eb0417c8))
* remove non-existing exports from map ([8f1a75c](https://github.com/web3-storage/ucanto/commit/8f1a75cea5a7d63435ec265dbd4bb7ed26c8bb4c))


### Miscellaneous Chores

* release 4.0.2 ([e9e35df](https://github.com/web3-storage/ucanto/commit/e9e35dffeeb7e5b5e19627f791b66bbdd35d2d11))

## [4.0.2](https://github.com/web3-storage/ucanto/compare/interface-v4.0.0...interface-v4.0.2) (2022-12-02)


### Features

* update to latest dag-ucan ([#165](https://github.com/web3-storage/ucanto/issues/165)) ([20e50de](https://github.com/web3-storage/ucanto/commit/20e50de5e311781ee8dc10e32de4eb12e8df2080))


### Miscellaneous Chores

* release 4.0.2 ([e9e35df](https://github.com/web3-storage/ucanto/commit/e9e35dffeeb7e5b5e19627f791b66bbdd35d2d11))

## [4.0.0](https://www.github.com/web3-storage/ucanto/compare/interface-v3.0.1...interface-v4.0.0) (2022-12-01)


### ⚠ BREAKING CHANGES

* did prinicipal (#149)

### Features

* did prinicipal ([#149](https://www.github.com/web3-storage/ucanto/issues/149)) ([4c11092](https://www.github.com/web3-storage/ucanto/commit/4c11092e420292af697bd5bec126112f9b961612))

### [3.0.1](https://www.github.com/web3-storage/ucanto/compare/interface-v3.0.0...interface-v3.0.1) (2022-11-11)


### Bug Fixes

* optional field validation ([#124](https://www.github.com/web3-storage/ucanto/issues/124)) ([87b70d2](https://www.github.com/web3-storage/ucanto/commit/87b70d2d56c07f8257717fa5ef584a21eb0417c8))

## [3.0.0](https://www.github.com/web3-storage/ucanto/compare/interface-v2.0.0...interface-v3.0.0) (2022-10-20)


### ⚠ BREAKING CHANGES

* upgrades to multiformats@10 (#117)

### Features

* upgrades to multiformats@10 ([#117](https://www.github.com/web3-storage/ucanto/issues/117)) ([61dc4ca](https://www.github.com/web3-storage/ucanto/commit/61dc4cafece3365bbf60f709265ea71180f226d7))

## [2.0.0](https://www.github.com/web3-storage/ucanto/compare/interface-v1.0.0...interface-v2.0.0) (2022-10-16)


### ⚠ BREAKING CHANGES

* switch decoder API to zod like schema API (#108)
* upgrade to ucan 0.9 (#95)

### Features

* Impelment InferInvokedCapability per [#99](https://www.github.com/web3-storage/ucanto/issues/99) ([#100](https://www.github.com/web3-storage/ucanto/issues/100)) ([fc5a2ac](https://www.github.com/web3-storage/ucanto/commit/fc5a2ace33f2a3599a654d8edd1641d111032074))
* implement .delegate on capabilities ([#110](https://www.github.com/web3-storage/ucanto/issues/110)) ([fd0bb9d](https://www.github.com/web3-storage/ucanto/commit/fd0bb9da58836c05d6ee9f60cd6b1cb6b747e3b1))
* implement rsa signer / verifier ([#102](https://www.github.com/web3-storage/ucanto/issues/102)) ([8ed7777](https://www.github.com/web3-storage/ucanto/commit/8ed77770142259be03c3d6a8108365db1ab796b2))
* rip out special handling of my: and as: capabilities ([#109](https://www.github.com/web3-storage/ucanto/issues/109)) ([3ec8e64](https://www.github.com/web3-storage/ucanto/commit/3ec8e6434a096221bf72193e074810cc18dd5cd8))
* switch decoder API to zod like schema API ([#108](https://www.github.com/web3-storage/ucanto/issues/108)) ([e2e03ff](https://www.github.com/web3-storage/ucanto/commit/e2e03ffeb35f00627335dbfd3e128e2cf9dcfdee))
* upgrade to ucan 0.9 ([#95](https://www.github.com/web3-storage/ucanto/issues/95)) ([b752b39](https://www.github.com/web3-storage/ucanto/commit/b752b398950120d6121badcdbb639f4dc9ce8794))

## [1.0.0](https://www.github.com/web3-storage/ucanto/compare/interface-v0.7.0...interface-v1.0.0) (2022-09-14)


### ⚠ BREAKING CHANGES

* update dag-ucan, types and names (#90)

### Features

* update dag-ucan, types and names ([#90](https://www.github.com/web3-storage/ucanto/issues/90)) ([cd792c9](https://www.github.com/web3-storage/ucanto/commit/cd792c934fbd358d6ccfa5d02f205b14b5f2e14e))

## [0.7.0](https://www.github.com/web3-storage/ucanto/compare/interface-v0.6.2...interface-v0.7.0) (2022-07-28)


### Features

* delgation iterate, more errors and types  ([0606168](https://www.github.com/web3-storage/ucanto/commit/0606168313d17d66bcc1ad6091440765e1700a4f))

### [0.6.2](https://www.github.com/web3-storage/ucanto/compare/interface-v0.6.1...interface-v0.6.2) (2022-07-01)


### Bug Fixes

* remove non-existing exports from map ([8f1a75c](https://www.github.com/web3-storage/ucanto/commit/8f1a75cea5a7d63435ec265dbd4bb7ed26c8bb4c))

### [0.6.1](https://www.github.com/web3-storage/ucanto/compare/interface-v0.6.0...interface-v0.6.1) (2022-06-30)


### Bug Fixes

* build types before publishing ([#71](https://www.github.com/web3-storage/ucanto/issues/71)) ([04b7958](https://www.github.com/web3-storage/ucanto/commit/04b79588f77dba234aaf628f62f574b124bd540b))

## [0.6.0](https://www.github.com/web3-storage/ucanto/compare/interface-v0.5.0...interface-v0.6.0) (2022-06-24)


### Features

* **ucanto:** upstream changes from w3 branch ([#54](https://www.github.com/web3-storage/ucanto/issues/54)) ([861e997](https://www.github.com/web3-storage/ucanto/commit/861e997e31c2a51195b8384eff5df656b6ec9efc))

## [0.5.0](https://www.github.com/web3-storage/ucanto/compare/interface-v0.4.0...interface-v0.5.0) (2022-06-23)


### Features

* **ucanto:** capability create / inovke methods ([#51](https://www.github.com/web3-storage/ucanto/issues/51)) ([ddf56b1](https://www.github.com/web3-storage/ucanto/commit/ddf56b1ec80ff6c0698255c531936d8eeab532fd))
* **ucanto:** URI protocol type retention & capability constructors ([e291544](https://www.github.com/web3-storage/ucanto/commit/e2915447254990d6e2384ff79a1da38120426ed5))

## [0.4.0](https://www.github.com/web3-storage/ucanto/compare/interface-v0.3.0...interface-v0.4.0) (2022-06-20)


### Features

* alight link API with multiformats ([#36](https://www.github.com/web3-storage/ucanto/issues/36)) ([0ec460e](https://www.github.com/web3-storage/ucanto/commit/0ec460e43ddda0bb3a3fea8a7881da1463154f36))
* cherry pick changes from uploads-v2 demo ([#43](https://www.github.com/web3-storage/ucanto/issues/43)) ([4308fd2](https://www.github.com/web3-storage/ucanto/commit/4308fd2f392b9fcccc52af64432dcb04c8257e0b))

## [0.3.0](https://www.github.com/web3-storage/ucanto/compare/interface-v0.2.0...interface-v0.3.0) (2022-06-15)


### Features

* capability provider API ([#34](https://www.github.com/web3-storage/ucanto/issues/34)) ([ea89f97](https://www.github.com/web3-storage/ucanto/commit/ea89f97125bb484a12ce3ca09a7884911a9fd4d6))

## [0.2.0](https://www.github.com/web3-storage/ucanto/compare/interface-v0.1.0...interface-v0.2.0) (2022-06-10)


### Features

* setup pnpm & release-please ([84ac7f1](https://www.github.com/web3-storage/ucanto/commit/84ac7f12e5a66ee4919fa7527858dc916850e3e0))
