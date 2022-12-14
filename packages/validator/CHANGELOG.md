# Changelog

## [4.1.0](https://github.com/web3-storage/ucanto/compare/validator-v4.0.2...validator-v4.1.0) (2022-12-14)


### Features

* embedded key resolution ([#168](https://github.com/web3-storage/ucanto/issues/168)) ([5e650f3](https://github.com/web3-storage/ucanto/commit/5e650f376db79c690e4771695d1ff4e6deece40e))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @ucanto/core bumped from ^4.0.2 to ^4.0.3
    * @ucanto/interface bumped from ^4.0.2 to ^4.1.0
  * devDependencies
    * @ucanto/client bumped from ^4.0.2 to ^4.0.3
    * @ucanto/principal bumped from ^4.0.2 to ^4.1.0

## [4.0.2](https://github.com/web3-storage/ucanto/compare/validator-v4.1.0...validator-v4.0.2) (2022-12-14)


### ⚠ BREAKING CHANGES

* upgrades to multiformats@10 ([#117](https://github.com/web3-storage/ucanto/issues/117))
* switch decoder API to zod like schema API ([#108](https://github.com/web3-storage/ucanto/issues/108))
* upgrade to ucan 0.9 ([#95](https://github.com/web3-storage/ucanto/issues/95))
* update dag-ucan, types and names ([#90](https://github.com/web3-storage/ucanto/issues/90))

### Features

* alight link API with multiformats ([#36](https://github.com/web3-storage/ucanto/issues/36)) ([0ec460e](https://github.com/web3-storage/ucanto/commit/0ec460e43ddda0bb3a3fea8a7881da1463154f36))
* capability provider API ([#34](https://github.com/web3-storage/ucanto/issues/34)) ([ea89f97](https://github.com/web3-storage/ucanto/commit/ea89f97125bb484a12ce3ca09a7884911a9fd4d6))
* cherry pick changes from uploads-v2 demo ([#43](https://github.com/web3-storage/ucanto/issues/43)) ([4308fd2](https://github.com/web3-storage/ucanto/commit/4308fd2f392b9fcccc52af64432dcb04c8257e0b))
* delgation iterate, more errors and types  ([0606168](https://github.com/web3-storage/ucanto/commit/0606168313d17d66bcc1ad6091440765e1700a4f))
* embedded key resolution ([#168](https://github.com/web3-storage/ucanto/issues/168)) ([5e650f3](https://github.com/web3-storage/ucanto/commit/5e650f376db79c690e4771695d1ff4e6deece40e))
* Impelment InferInvokedCapability per [#99](https://github.com/web3-storage/ucanto/issues/99) ([#100](https://github.com/web3-storage/ucanto/issues/100)) ([fc5a2ac](https://github.com/web3-storage/ucanto/commit/fc5a2ace33f2a3599a654d8edd1641d111032074))
* implement .delegate on capabilities ([#110](https://github.com/web3-storage/ucanto/issues/110)) ([fd0bb9d](https://github.com/web3-storage/ucanto/commit/fd0bb9da58836c05d6ee9f60cd6b1cb6b747e3b1))
* refactor into monorepo ([#13](https://github.com/web3-storage/ucanto/issues/13)) ([1f99506](https://github.com/web3-storage/ucanto/commit/1f995064ec6e5953118c2dd1065ee6be959f25b9))
* rip out special handling of my: and as: capabilities ([#109](https://github.com/web3-storage/ucanto/issues/109)) ([3ec8e64](https://github.com/web3-storage/ucanto/commit/3ec8e6434a096221bf72193e074810cc18dd5cd8))
* setup pnpm & release-please ([84ac7f1](https://github.com/web3-storage/ucanto/commit/84ac7f12e5a66ee4919fa7527858dc916850e3e0))
* switch decoder API to zod like schema API ([#108](https://github.com/web3-storage/ucanto/issues/108)) ([e2e03ff](https://github.com/web3-storage/ucanto/commit/e2e03ffeb35f00627335dbfd3e128e2cf9dcfdee))
* **ucanto:** capability create / inovke methods ([#51](https://github.com/web3-storage/ucanto/issues/51)) ([ddf56b1](https://github.com/web3-storage/ucanto/commit/ddf56b1ec80ff6c0698255c531936d8eeab532fd))
* **ucanto:** URI protocol type retention & capability constructors ([e291544](https://github.com/web3-storage/ucanto/commit/e2915447254990d6e2384ff79a1da38120426ed5))
* update dag-ucan, types and names ([#90](https://github.com/web3-storage/ucanto/issues/90)) ([cd792c9](https://github.com/web3-storage/ucanto/commit/cd792c934fbd358d6ccfa5d02f205b14b5f2e14e))
* upgrade to ucan 0.9 ([#95](https://github.com/web3-storage/ucanto/issues/95)) ([b752b39](https://github.com/web3-storage/ucanto/commit/b752b398950120d6121badcdbb639f4dc9ce8794))
* upgrades to multiformats@10 ([#117](https://github.com/web3-storage/ucanto/issues/117)) ([61dc4ca](https://github.com/web3-storage/ucanto/commit/61dc4cafece3365bbf60f709265ea71180f226d7))


### Bug Fixes

* add return type to URI.uri() schema ([#127](https://github.com/web3-storage/ucanto/issues/127)) ([c302866](https://github.com/web3-storage/ucanto/commit/c3028667bc1094e6f6b16c43b3a396ef6207f75c))
* build types before publishing ([#71](https://github.com/web3-storage/ucanto/issues/71)) ([04b7958](https://github.com/web3-storage/ucanto/commit/04b79588f77dba234aaf628f62f574b124bd540b))
* downgrade versions ([#158](https://github.com/web3-storage/ucanto/issues/158)) ([f814e75](https://github.com/web3-storage/ucanto/commit/f814e75a89d3ed7c3488a8cb7af8d94f0cfba440))
* intermittent test failures ([#166](https://github.com/web3-storage/ucanto/issues/166)) ([6cb0348](https://github.com/web3-storage/ucanto/commit/6cb03482bd257d2ea62b6558e1f6ee1a693b68fb))
* optional caveats ([#106](https://github.com/web3-storage/ucanto/issues/106)) ([537a4c8](https://github.com/web3-storage/ucanto/commit/537a4c86fdd02c26c1442d6a205e8977afbad603))
* optional field validation ([#124](https://github.com/web3-storage/ucanto/issues/124)) ([87b70d2](https://github.com/web3-storage/ucanto/commit/87b70d2d56c07f8257717fa5ef584a21eb0417c8))
* package scripts to build types ([#84](https://github.com/web3-storage/ucanto/issues/84)) ([4d21132](https://github.com/web3-storage/ucanto/commit/4d2113246abdda215dd3fa882730ba71e68b5695))
* update @ipld/car and @ipld/dag-cbor deps ([#120](https://github.com/web3-storage/ucanto/issues/120)) ([5dcd7a5](https://github.com/web3-storage/ucanto/commit/5dcd7a5788dfd126f332b126f7ad1215972f29c4))
* versions ([#131](https://github.com/web3-storage/ucanto/issues/131)) ([88b87a7](https://github.com/web3-storage/ucanto/commit/88b87a7f3a32c02a22ddffcb8f38199445097133))


### Miscellaneous Chores

* release 0.0.1-beta ([d6c7e73](https://github.com/web3-storage/ucanto/commit/d6c7e73de56278e2f2c92c4a0e1a2709c92bcbf9))
* release 4.0.2 ([e9e35df](https://github.com/web3-storage/ucanto/commit/e9e35dffeeb7e5b5e19627f791b66bbdd35d2d11))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @ucanto/core bumped from ^4.0.3 to ^4.0.2
    * @ucanto/interface bumped from ^4.1.0 to ^4.0.2
  * devDependencies
    * @ucanto/client bumped from ^4.0.3 to ^4.0.2
    * @ucanto/principal bumped from ^4.1.0 to ^4.0.2

## [4.1.0](https://github.com/web3-storage/ucanto/compare/validator-v4.0.2...validator-v4.1.0) (2022-12-14)


### Features

* embedded key resolution ([#168](https://github.com/web3-storage/ucanto/issues/168)) ([5e650f3](https://github.com/web3-storage/ucanto/commit/5e650f376db79c690e4771695d1ff4e6deece40e))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @ucanto/core bumped from ^4.0.2 to ^4.0.3
    * @ucanto/interface bumped from ^4.0.2 to ^4.1.0
  * devDependencies
    * @ucanto/client bumped from ^4.0.2 to ^4.0.3
    * @ucanto/principal bumped from ^4.0.2 to ^4.1.0

## [4.0.2](https://github.com/web3-storage/ucanto/compare/validator-v4.0.2...validator-v4.0.2) (2022-12-02)


### ⚠ BREAKING CHANGES

* upgrades to multiformats@10 (#117)
* switch decoder API to zod like schema API (#108)
* upgrade to ucan 0.9 (#95)
* update dag-ucan, types and names (#90)

### Features

* alight link API with multiformats ([#36](https://github.com/web3-storage/ucanto/issues/36)) ([0ec460e](https://github.com/web3-storage/ucanto/commit/0ec460e43ddda0bb3a3fea8a7881da1463154f36))
* capability provider API ([#34](https://github.com/web3-storage/ucanto/issues/34)) ([ea89f97](https://github.com/web3-storage/ucanto/commit/ea89f97125bb484a12ce3ca09a7884911a9fd4d6))
* cherry pick changes from uploads-v2 demo ([#43](https://github.com/web3-storage/ucanto/issues/43)) ([4308fd2](https://github.com/web3-storage/ucanto/commit/4308fd2f392b9fcccc52af64432dcb04c8257e0b))
* delgation iterate, more errors and types  ([0606168](https://github.com/web3-storage/ucanto/commit/0606168313d17d66bcc1ad6091440765e1700a4f))
* Impelment InferInvokedCapability per [#99](https://github.com/web3-storage/ucanto/issues/99) ([#100](https://github.com/web3-storage/ucanto/issues/100)) ([fc5a2ac](https://github.com/web3-storage/ucanto/commit/fc5a2ace33f2a3599a654d8edd1641d111032074))
* implement .delegate on capabilities ([#110](https://github.com/web3-storage/ucanto/issues/110)) ([fd0bb9d](https://github.com/web3-storage/ucanto/commit/fd0bb9da58836c05d6ee9f60cd6b1cb6b747e3b1))
* rip out special handling of my: and as: capabilities ([#109](https://github.com/web3-storage/ucanto/issues/109)) ([3ec8e64](https://github.com/web3-storage/ucanto/commit/3ec8e6434a096221bf72193e074810cc18dd5cd8))
* setup pnpm & release-please ([84ac7f1](https://github.com/web3-storage/ucanto/commit/84ac7f12e5a66ee4919fa7527858dc916850e3e0))
* switch decoder API to zod like schema API ([#108](https://github.com/web3-storage/ucanto/issues/108)) ([e2e03ff](https://github.com/web3-storage/ucanto/commit/e2e03ffeb35f00627335dbfd3e128e2cf9dcfdee))
* **ucanto:** capability create / inovke methods ([#51](https://github.com/web3-storage/ucanto/issues/51)) ([ddf56b1](https://github.com/web3-storage/ucanto/commit/ddf56b1ec80ff6c0698255c531936d8eeab532fd))
* **ucanto:** URI protocol type retention & capability constructors ([e291544](https://github.com/web3-storage/ucanto/commit/e2915447254990d6e2384ff79a1da38120426ed5))
* update dag-ucan, types and names ([#90](https://github.com/web3-storage/ucanto/issues/90)) ([cd792c9](https://github.com/web3-storage/ucanto/commit/cd792c934fbd358d6ccfa5d02f205b14b5f2e14e))
* upgrade to ucan 0.9 ([#95](https://github.com/web3-storage/ucanto/issues/95)) ([b752b39](https://github.com/web3-storage/ucanto/commit/b752b398950120d6121badcdbb639f4dc9ce8794))
* upgrades to multiformats@10 ([#117](https://github.com/web3-storage/ucanto/issues/117)) ([61dc4ca](https://github.com/web3-storage/ucanto/commit/61dc4cafece3365bbf60f709265ea71180f226d7))


### Bug Fixes

* add return type to URI.uri() schema ([#127](https://github.com/web3-storage/ucanto/issues/127)) ([c302866](https://github.com/web3-storage/ucanto/commit/c3028667bc1094e6f6b16c43b3a396ef6207f75c))
* build types before publishing ([#71](https://github.com/web3-storage/ucanto/issues/71)) ([04b7958](https://github.com/web3-storage/ucanto/commit/04b79588f77dba234aaf628f62f574b124bd540b))
* downgrade versions ([#158](https://github.com/web3-storage/ucanto/issues/158)) ([f814e75](https://github.com/web3-storage/ucanto/commit/f814e75a89d3ed7c3488a8cb7af8d94f0cfba440))
* intermittent test failures ([#166](https://github.com/web3-storage/ucanto/issues/166)) ([6cb0348](https://github.com/web3-storage/ucanto/commit/6cb03482bd257d2ea62b6558e1f6ee1a693b68fb))
* optional caveats ([#106](https://github.com/web3-storage/ucanto/issues/106)) ([537a4c8](https://github.com/web3-storage/ucanto/commit/537a4c86fdd02c26c1442d6a205e8977afbad603))
* optional field validation ([#124](https://github.com/web3-storage/ucanto/issues/124)) ([87b70d2](https://github.com/web3-storage/ucanto/commit/87b70d2d56c07f8257717fa5ef584a21eb0417c8))
* package scripts to build types ([#84](https://github.com/web3-storage/ucanto/issues/84)) ([4d21132](https://github.com/web3-storage/ucanto/commit/4d2113246abdda215dd3fa882730ba71e68b5695))
* update @ipld/car and @ipld/dag-cbor deps ([#120](https://github.com/web3-storage/ucanto/issues/120)) ([5dcd7a5](https://github.com/web3-storage/ucanto/commit/5dcd7a5788dfd126f332b126f7ad1215972f29c4))
* versions ([#131](https://github.com/web3-storage/ucanto/issues/131)) ([88b87a7](https://github.com/web3-storage/ucanto/commit/88b87a7f3a32c02a22ddffcb8f38199445097133))


### Miscellaneous Chores

* release 4.0.2 ([e9e35df](https://github.com/web3-storage/ucanto/commit/e9e35dffeeb7e5b5e19627f791b66bbdd35d2d11))

## [4.0.2](https://github.com/web3-storage/ucanto/compare/validator-v3.0.7...validator-v4.0.2) (2022-12-02)


### Bug Fixes

* intermittent test failures ([#166](https://github.com/web3-storage/ucanto/issues/166)) ([6cb0348](https://github.com/web3-storage/ucanto/commit/6cb03482bd257d2ea62b6558e1f6ee1a693b68fb))


### Miscellaneous Chores

* release 4.0.2 ([e9e35df](https://github.com/web3-storage/ucanto/commit/e9e35dffeeb7e5b5e19627f791b66bbdd35d2d11))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @ucanto/core bumped from ^4.0.0 to ^4.0.2
    * @ucanto/interface bumped from ^4.0.0 to ^4.0.2
  * devDependencies
    * @ucanto/client bumped from ^4.0.0 to ^4.0.2
    * @ucanto/principal bumped from ^4.0.1 to ^4.0.2

### [3.0.7](https://www.github.com/web3-storage/ucanto/compare/validator-v3.0.6...validator-v3.0.7) (2022-12-02)


### Bug Fixes

* downgrade versions ([#158](https://www.github.com/web3-storage/ucanto/issues/158)) ([f814e75](https://www.github.com/web3-storage/ucanto/commit/f814e75a89d3ed7c3488a8cb7af8d94f0cfba440))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @ucanto/core bumped from ^3.0.4 to ^3.0.5
  * devDependencies
    * @ucanto/client bumped from ^3.0.4 to ^3.0.5

### [3.0.6](https://www.github.com/web3-storage/ucanto/compare/validator-v3.0.5...validator-v3.0.6) (2022-12-02)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @ucanto/core bumped from ^3.0.3 to ^3.0.4
  * devDependencies
    * @ucanto/client bumped from ^3.0.3 to ^3.0.4
    * @ucanto/principal bumped from ^4.0.0 to ^4.0.1

### [3.0.5](https://www.github.com/web3-storage/ucanto/compare/validator-v3.0.4...validator-v3.0.5) (2022-12-01)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @ucanto/core bumped from ^3.0.2 to ^3.0.3
    * @ucanto/interface bumped from ^3.0.1 to ^4.0.0
  * devDependencies
    * @ucanto/client bumped from ^3.0.2 to ^3.0.3
    * @ucanto/principal bumped from ^3.0.1 to ^4.0.0

### [3.0.4](https://www.github.com/web3-storage/ucanto/compare/validator-v3.0.3...validator-v3.0.4) (2022-11-12)


### Bug Fixes

* versions ([#131](https://www.github.com/web3-storage/ucanto/issues/131)) ([88b87a7](https://www.github.com/web3-storage/ucanto/commit/88b87a7f3a32c02a22ddffcb8f38199445097133))

### [3.0.3](https://www.github.com/web3-storage/ucanto/compare/validator-v3.0.2...validator-v3.0.3) (2022-11-12)


### Bug Fixes

* add return type to URI.uri() schema ([#127](https://www.github.com/web3-storage/ucanto/issues/127)) ([c302866](https://www.github.com/web3-storage/ucanto/commit/c3028667bc1094e6f6b16c43b3a396ef6207f75c))

### [3.0.2](https://www.github.com/web3-storage/ucanto/compare/validator-v3.0.1...validator-v3.0.2) (2022-11-11)


### Bug Fixes

* optional field validation ([#124](https://www.github.com/web3-storage/ucanto/issues/124)) ([87b70d2](https://www.github.com/web3-storage/ucanto/commit/87b70d2d56c07f8257717fa5ef584a21eb0417c8))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @ucanto/core bumped from ^3.0.1 to ^3.0.2
    * @ucanto/interface bumped from ^3.0.0 to ^3.0.1
  * devDependencies
    * @ucanto/client bumped from ^3.0.1 to ^3.0.2
    * @ucanto/principal bumped from ^3.0.0 to ^3.0.1

### [3.0.1](https://www.github.com/web3-storage/ucanto/compare/validator-v3.0.0...validator-v3.0.1) (2022-11-02)


### Bug Fixes

* update @ipld/car and @ipld/dag-cbor deps ([#120](https://www.github.com/web3-storage/ucanto/issues/120)) ([5dcd7a5](https://www.github.com/web3-storage/ucanto/commit/5dcd7a5788dfd126f332b126f7ad1215972f29c4))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @ucanto/core bumped from ^3.0.0 to ^3.0.1
  * devDependencies
    * @ucanto/client bumped from ^3.0.0 to ^3.0.1

## [3.0.0](https://www.github.com/web3-storage/ucanto/compare/validator-v2.0.0...validator-v3.0.0) (2022-10-20)


### ⚠ BREAKING CHANGES

* upgrades to multiformats@10 (#117)

### Features

* upgrades to multiformats@10 ([#117](https://www.github.com/web3-storage/ucanto/issues/117)) ([61dc4ca](https://www.github.com/web3-storage/ucanto/commit/61dc4cafece3365bbf60f709265ea71180f226d7))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @ucanto/core bumped from ^2.0.0 to ^3.0.0
    * @ucanto/interface bumped from ^2.0.0 to ^3.0.0
  * devDependencies
    * @ucanto/principal bumped from ^2.0.0 to ^3.0.0
    * @ucanto/client bumped from ^2.0.0 to ^3.0.0

## [2.0.0](https://www.github.com/web3-storage/ucanto/compare/validator-v1.0.1...validator-v2.0.0) (2022-10-16)


### ⚠ BREAKING CHANGES

* switch decoder API to zod like schema API (#108)
* upgrade to ucan 0.9 (#95)

### Features

* Impelment InferInvokedCapability per [#99](https://www.github.com/web3-storage/ucanto/issues/99) ([#100](https://www.github.com/web3-storage/ucanto/issues/100)) ([fc5a2ac](https://www.github.com/web3-storage/ucanto/commit/fc5a2ace33f2a3599a654d8edd1641d111032074))
* implement .delegate on capabilities ([#110](https://www.github.com/web3-storage/ucanto/issues/110)) ([fd0bb9d](https://www.github.com/web3-storage/ucanto/commit/fd0bb9da58836c05d6ee9f60cd6b1cb6b747e3b1))
* rip out special handling of my: and as: capabilities ([#109](https://www.github.com/web3-storage/ucanto/issues/109)) ([3ec8e64](https://www.github.com/web3-storage/ucanto/commit/3ec8e6434a096221bf72193e074810cc18dd5cd8))
* switch decoder API to zod like schema API ([#108](https://www.github.com/web3-storage/ucanto/issues/108)) ([e2e03ff](https://www.github.com/web3-storage/ucanto/commit/e2e03ffeb35f00627335dbfd3e128e2cf9dcfdee))
* upgrade to ucan 0.9 ([#95](https://www.github.com/web3-storage/ucanto/issues/95)) ([b752b39](https://www.github.com/web3-storage/ucanto/commit/b752b398950120d6121badcdbb639f4dc9ce8794))


### Bug Fixes

* optional caveats ([#106](https://www.github.com/web3-storage/ucanto/issues/106)) ([537a4c8](https://www.github.com/web3-storage/ucanto/commit/537a4c86fdd02c26c1442d6a205e8977afbad603))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @ucanto/core bumped from ^1.0.1 to ^2.0.0
    * @ucanto/interface bumped from ^1.0.0 to ^2.0.0
  * devDependencies
    * @ucanto/principal bumped from ^1.0.1 to ^2.0.0
    * @ucanto/client bumped from ^1.0.1 to ^2.0.0

### [1.0.1](https://www.github.com/web3-storage/ucanto/compare/validator-v1.0.0...validator-v1.0.1) (2022-09-21)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @ucanto/core bumped from ^1.0.0 to ^1.0.1
  * devDependencies
    * @ucanto/principal bumped from ^1.0.0 to ^1.0.1
    * @ucanto/client bumped from ^1.0.0 to ^1.0.1

## [1.0.0](https://www.github.com/web3-storage/ucanto/compare/validator-v0.6.0...validator-v1.0.0) (2022-09-14)


### ⚠ BREAKING CHANGES

* update dag-ucan, types and names (#90)

### Features

* update dag-ucan, types and names ([#90](https://www.github.com/web3-storage/ucanto/issues/90)) ([cd792c9](https://www.github.com/web3-storage/ucanto/commit/cd792c934fbd358d6ccfa5d02f205b14b5f2e14e))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @ucanto/core bumped from ^0.6.0 to ^1.0.0
    * @ucanto/interface bumped from ^0.7.0 to ^1.0.0
  * devDependencies
    * @ucanto/principal bumped from ^0.5.0 to ^1.0.0
    * @ucanto/client bumped from ^0.6.0 to ^1.0.0

## [0.6.0](https://www.github.com/web3-storage/ucanto/compare/validator-v0.5.5...validator-v0.6.0) (2022-07-28)


### Features

* delgation iterate, more errors and types  ([0606168](https://www.github.com/web3-storage/ucanto/commit/0606168313d17d66bcc1ad6091440765e1700a4f))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @ucanto/core bumped from ^0.5.4 to ^0.6.0
    * @ucanto/interface bumped from ^0.6.2 to ^0.7.0
  * devDependencies
    * @ucanto/authority bumped from ^0.4.5 to ^0.5.0
    * @ucanto/client bumped from ^0.5.4 to ^0.6.0

### [0.5.5](https://www.github.com/web3-storage/ucanto/compare/validator-v0.5.4...validator-v0.5.5) (2022-07-11)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @ucanto/core bumped from ^0.5.3 to ^0.5.4
  * devDependencies
    * @ucanto/client bumped from ^0.5.3 to ^0.5.4
    * @ucanto/authority bumped from ^0.4.4 to ^0.4.5

### [0.5.4](https://www.github.com/web3-storage/ucanto/compare/validator-v0.5.3...validator-v0.5.4) (2022-07-01)


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @ucanto/client bumped from ^0.5.2 to ^0.5.3

### [0.5.3](https://www.github.com/web3-storage/ucanto/compare/validator-v0.5.2...validator-v0.5.3) (2022-07-01)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @ucanto/core bumped from ^0.5.2 to ^0.5.3
    * @ucanto/interface bumped from ^0.6.1 to ^0.6.2
  * devDependencies
    * @ucanto/client bumped from ^0.5.1 to ^0.5.2
    * @ucanto/authority bumped from ^0.4.3 to ^0.4.4

### [0.5.2](https://www.github.com/web3-storage/ucanto/compare/validator-v0.5.1...validator-v0.5.2) (2022-06-30)


### Bug Fixes

* build types before publishing ([#71](https://www.github.com/web3-storage/ucanto/issues/71)) ([04b7958](https://www.github.com/web3-storage/ucanto/commit/04b79588f77dba234aaf628f62f574b124bd540b))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @ucanto/core bumped from ^0.5.1 to ^0.5.2
    * @ucanto/interface bumped from ^0.6.0 to ^0.6.1
  * devDependencies
    * @ucanto/client bumped from ^0.5.0 to ^0.5.1
    * @ucanto/authority bumped from ^0.4.2 to ^0.4.3

### [0.5.1](https://www.github.com/web3-storage/ucanto/compare/validator-v0.5.0...validator-v0.5.1) (2022-06-24)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @ucanto/core bumped from ^0.5.0 to ^0.5.1
    * @ucanto/interface bumped from ^0.5.0 to ^0.6.0
  * devDependencies
    * @ucanto/client bumped from ^0.4.0 to ^0.5.0
    * @ucanto/authority bumped from ^0.4.1 to ^0.4.2

## [0.5.0](https://www.github.com/web3-storage/ucanto/compare/validator-v0.4.0...validator-v0.5.0) (2022-06-23)


### Features

* **ucanto:** capability create / inovke methods ([#51](https://www.github.com/web3-storage/ucanto/issues/51)) ([ddf56b1](https://www.github.com/web3-storage/ucanto/commit/ddf56b1ec80ff6c0698255c531936d8eeab532fd))
* **ucanto:** URI protocol type retention & capability constructors ([e291544](https://www.github.com/web3-storage/ucanto/commit/e2915447254990d6e2384ff79a1da38120426ed5))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @ucanto/core bumped from ^0.4.0 to ^0.5.0
    * @ucanto/interface bumped from ^0.4.0 to ^0.5.0
  * devDependencies
    * @ucanto/client bumped from ^0.3.0 to ^0.4.0
    * @ucanto/authority bumped from ^0.4.0 to ^0.4.1

## [0.4.0](https://www.github.com/web3-storage/ucanto/compare/validator-v0.3.0...validator-v0.4.0) (2022-06-20)


### Features

* alight link API with multiformats ([#36](https://www.github.com/web3-storage/ucanto/issues/36)) ([0ec460e](https://www.github.com/web3-storage/ucanto/commit/0ec460e43ddda0bb3a3fea8a7881da1463154f36))
* cherry pick changes from uploads-v2 demo ([#43](https://www.github.com/web3-storage/ucanto/issues/43)) ([4308fd2](https://www.github.com/web3-storage/ucanto/commit/4308fd2f392b9fcccc52af64432dcb04c8257e0b))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @ucanto/core bumped from ^0.3.0 to ^0.4.0
    * @ucanto/interface bumped from ^0.3.0 to ^0.4.0
  * devDependencies
    * @ucanto/client bumped from ^0.2.2 to ^0.3.0
    * @ucanto/authority bumped from ^0.3.0 to ^0.4.0

## [0.3.0](https://www.github.com/web3-storage/ucanto/compare/validator-v0.2.0...validator-v0.3.0) (2022-06-15)


### Features

* capability provider API ([#34](https://www.github.com/web3-storage/ucanto/issues/34)) ([ea89f97](https://www.github.com/web3-storage/ucanto/commit/ea89f97125bb484a12ce3ca09a7884911a9fd4d6))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @ucanto/core bumped from ^0.2.0 to ^0.3.0
    * @ucanto/interface bumped from ^0.2.0 to ^0.3.0
  * devDependencies
    * @ucanto/client bumped from ^0.2.0 to ^0.2.2
    * @ucanto/authority bumped from ^0.2.0 to ^0.3.0

## [0.2.0](https://www.github.com/web3-storage/ucanto/compare/validator-v0.1.0...validator-v0.2.0) (2022-06-10)


### Features

* setup pnpm & release-please ([84ac7f1](https://www.github.com/web3-storage/ucanto/commit/84ac7f12e5a66ee4919fa7527858dc916850e3e0))



### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @ucanto/core bumped from ^0.0.1 to ^0.2.0
    * @ucanto/interface bumped from ^0.0.1 to ^0.2.0
  * devDependencies
    * @ucanto/client bumped from ^0.0.1 to ^0.2.0
    * @ucanto/authority bumped from 0.0.1 to ^0.2.0
