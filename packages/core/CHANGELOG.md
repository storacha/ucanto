# Changelog

## [4.3.0](https://github.com/web3-storage/ucanto/compare/core-v4.2.3...core-v4.3.0) (2023-02-28)


### ⚠ BREAKING CHANGES

* update session API ([#227](https://github.com/web3-storage/ucanto/issues/227))

### Features

* update session API ([#227](https://github.com/web3-storage/ucanto/issues/227)) ([9bbb2f7](https://github.com/web3-storage/ucanto/commit/9bbb2f796fd57ebe1ecd2112de1927b23a1577bd))


### Bug Fixes

* reconfigure release-please ([#230](https://github.com/web3-storage/ucanto/issues/230)) ([c16e100](https://github.com/web3-storage/ucanto/commit/c16e10004a5d9f3071f9bfe833e3888851fe4202))


### Miscellaneous Chores

* release 4.3.0 ([b53bf3d](https://github.com/web3-storage/ucanto/commit/b53bf3d9fb582006598aa02ae4c534dfcc68c189))

### [4.2.3](https://www.github.com/web3-storage/ucanto/compare/core-v4.1.0...core-v4.2.3) (2023-02-08)


### Bug Fixes

* do not call exports import or export ([#217](https://www.github.com/web3-storage/ucanto/issues/217)) ([3c1ab06](https://www.github.com/web3-storage/ucanto/commit/3c1ab0601445398f8660de652a954e53d1c9f7aa))


### Miscellaneous Chores

* release 4.2.3 ([5dc8158](https://www.github.com/web3-storage/ucanto/commit/5dc8158341cd668304c94a4b83e1d9b9affae410))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @ucanto/interface bumped from ^4.1.0 to ^4.2.3
  * devDependencies
    * @ucanto/principal bumped from ^4.1.0 to ^4.2.3

## [4.1.0](https://www.github.com/web3-storage/ucanto/compare/core-v4.0.3...core-v4.1.0) (2023-01-24)


### Features

* delegation.toJSON ([#186](https://www.github.com/web3-storage/ucanto/issues/186)) ([f8ffa74](https://www.github.com/web3-storage/ucanto/commit/f8ffa74bcbb1376b54633003a7c2609f70135c70))
* support execution of materialized invocations ([#199](https://www.github.com/web3-storage/ucanto/issues/199)) ([275bc24](https://www.github.com/web3-storage/ucanto/commit/275bc2439d81d0822c03ac62ba56f63d965d2622))
* update multiformats ([#197](https://www.github.com/web3-storage/ucanto/issues/197)) ([b92a6c6](https://www.github.com/web3-storage/ucanto/commit/b92a6c6f5c066890a25e62205ff9848b1fb8dde1))


### Bug Fixes

* toJSON behavior on the ucan.data ([#185](https://www.github.com/web3-storage/ucanto/issues/185)) ([d1ee6b6](https://www.github.com/web3-storage/ucanto/commit/d1ee6b6a0044d53359f0e20f631e3b86e4b94ab3))

## [4.1.0](https://www.github.com/web3-storage/ucanto/compare/core-v4.0.3...core-v4.1.0) (2023-01-18)


### Features

* delegation.toJSON ([#186](https://www.github.com/web3-storage/ucanto/issues/186)) ([f8ffa74](https://www.github.com/web3-storage/ucanto/commit/f8ffa74bcbb1376b54633003a7c2609f70135c70))
* update multiformats ([#197](https://www.github.com/web3-storage/ucanto/issues/197)) ([b92a6c6](https://www.github.com/web3-storage/ucanto/commit/b92a6c6f5c066890a25e62205ff9848b1fb8dde1))


### Bug Fixes

* toJSON behavior on the ucan.data ([#185](https://www.github.com/web3-storage/ucanto/issues/185)) ([d1ee6b6](https://www.github.com/web3-storage/ucanto/commit/d1ee6b6a0044d53359f0e20f631e3b86e4b94ab3))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @ucanto/interface bumped from ^4.0.3 to ^4.1.0
  * devDependencies
    * @ucanto/principal bumped from ^4.0.3 to ^4.1.0

### [4.0.3](https://www.github.com/web3-storage/ucanto/compare/core-v4.0.2...core-v4.0.3) (2022-12-14)


### Bug Fixes

* trigger releases ([a0d9291](https://www.github.com/web3-storage/ucanto/commit/a0d9291f9e20456e115fa6c7890cafe937fa511e))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @ucanto/interface bumped from ^4.0.2 to ^4.0.3
  * devDependencies
    * @ucanto/principal bumped from ^4.0.2 to ^4.0.3

## [4.0.2](https://github.com/web3-storage/ucanto/compare/core-v4.0.3...core-v4.0.2) (2022-12-14)

### ⚠ BREAKING CHANGES

* upgrades to multiformats@10 ([#117](https://github.com/web3-storage/ucanto/issues/117))
* upgrade to ucan 0.9 ([#95](https://github.com/web3-storage/ucanto/issues/95))
* update dag-ucan, types and names ([#90](https://github.com/web3-storage/ucanto/issues/90))

### Features

* alight link API with multiformats ([#36](https://github.com/web3-storage/ucanto/issues/36)) ([0ec460e](https://github.com/web3-storage/ucanto/commit/0ec460e43ddda0bb3a3fea8a7881da1463154f36))
* capability provider API ([#34](https://github.com/web3-storage/ucanto/issues/34)) ([ea89f97](https://github.com/web3-storage/ucanto/commit/ea89f97125bb484a12ce3ca09a7884911a9fd4d6))
* cherry pick changes from uploads-v2 demo ([#43](https://github.com/web3-storage/ucanto/issues/43)) ([4308fd2](https://github.com/web3-storage/ucanto/commit/4308fd2f392b9fcccc52af64432dcb04c8257e0b))
* delgation iterate, more errors and types  ([0606168](https://github.com/web3-storage/ucanto/commit/0606168313d17d66bcc1ad6091440765e1700a4f))
* refactor into monorepo ([#13](https://github.com/web3-storage/ucanto/issues/13)) ([1f99506](https://github.com/web3-storage/ucanto/commit/1f995064ec6e5953118c2dd1065ee6be959f25b9))
* setup pnpm & release-please ([84ac7f1](https://github.com/web3-storage/ucanto/commit/84ac7f12e5a66ee4919fa7527858dc916850e3e0))
* **ucanto:** capability create / inovke methods ([#51](https://github.com/web3-storage/ucanto/issues/51)) ([ddf56b1](https://github.com/web3-storage/ucanto/commit/ddf56b1ec80ff6c0698255c531936d8eeab532fd))
* update dag-ucan, types and names ([#90](https://github.com/web3-storage/ucanto/issues/90)) ([cd792c9](https://github.com/web3-storage/ucanto/commit/cd792c934fbd358d6ccfa5d02f205b14b5f2e14e))
* update to latest dag-ucan ([#165](https://github.com/web3-storage/ucanto/issues/165)) ([20e50de](https://github.com/web3-storage/ucanto/commit/20e50de5e311781ee8dc10e32de4eb12e8df2080))
* upgrade to ucan 0.9 ([#95](https://github.com/web3-storage/ucanto/issues/95)) ([b752b39](https://github.com/web3-storage/ucanto/commit/b752b398950120d6121badcdbb639f4dc9ce8794))
* upgrades to multiformats@10 ([#117](https://github.com/web3-storage/ucanto/issues/117)) ([61dc4ca](https://github.com/web3-storage/ucanto/commit/61dc4cafece3365bbf60f709265ea71180f226d7))


### Bug Fixes

* build types before publishing ([#71](https://github.com/web3-storage/ucanto/issues/71)) ([04b7958](https://github.com/web3-storage/ucanto/commit/04b79588f77dba234aaf628f62f574b124bd540b))
* downgrade versions ([#158](https://github.com/web3-storage/ucanto/issues/158)) ([f814e75](https://github.com/web3-storage/ucanto/commit/f814e75a89d3ed7c3488a8cb7af8d94f0cfba440))
* optional field validation ([#124](https://github.com/web3-storage/ucanto/issues/124)) ([87b70d2](https://github.com/web3-storage/ucanto/commit/87b70d2d56c07f8257717fa5ef584a21eb0417c8))
* package scripts to build types ([#84](https://github.com/web3-storage/ucanto/issues/84)) ([4d21132](https://github.com/web3-storage/ucanto/commit/4d2113246abdda215dd3fa882730ba71e68b5695))
* typo ([#145](https://github.com/web3-storage/ucanto/issues/145)) ([18b3fd1](https://github.com/web3-storage/ucanto/commit/18b3fd17e8d7671dc76a238723cb8d524b29cba3))
* update @ipld/car and @ipld/dag-cbor deps ([#120](https://github.com/web3-storage/ucanto/issues/120)) ([5dcd7a5](https://github.com/web3-storage/ucanto/commit/5dcd7a5788dfd126f332b126f7ad1215972f29c4))


### Miscellaneous Chores

* release 0.0.1-beta ([d6c7e73](https://github.com/web3-storage/ucanto/commit/d6c7e73de56278e2f2c92c4a0e1a2709c92bcbf9))
* release 4.0.2 ([e9e35df](https://github.com/web3-storage/ucanto/commit/e9e35dffeeb7e5b5e19627f791b66bbdd35d2d11))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @ucanto/interface bumped from ^4.1.0 to ^4.0.2
  * devDependencies
    * @ucanto/principal bumped from ^4.1.0 to ^4.0.2

## [4.0.2](https://github.com/web3-storage/ucanto/compare/core-v4.0.3...core-v4.0.2) (2022-12-14)


### ⚠ BREAKING CHANGES

* upgrades to multiformats@10 ([#117](https://github.com/web3-storage/ucanto/issues/117))
* upgrade to ucan 0.9 ([#95](https://github.com/web3-storage/ucanto/issues/95))
* update dag-ucan, types and names ([#90](https://github.com/web3-storage/ucanto/issues/90))

### Features

* alight link API with multiformats ([#36](https://github.com/web3-storage/ucanto/issues/36)) ([0ec460e](https://github.com/web3-storage/ucanto/commit/0ec460e43ddda0bb3a3fea8a7881da1463154f36))
* capability provider API ([#34](https://github.com/web3-storage/ucanto/issues/34)) ([ea89f97](https://github.com/web3-storage/ucanto/commit/ea89f97125bb484a12ce3ca09a7884911a9fd4d6))
* cherry pick changes from uploads-v2 demo ([#43](https://github.com/web3-storage/ucanto/issues/43)) ([4308fd2](https://github.com/web3-storage/ucanto/commit/4308fd2f392b9fcccc52af64432dcb04c8257e0b))
* delgation iterate, more errors and types  ([0606168](https://github.com/web3-storage/ucanto/commit/0606168313d17d66bcc1ad6091440765e1700a4f))
* refactor into monorepo ([#13](https://github.com/web3-storage/ucanto/issues/13)) ([1f99506](https://github.com/web3-storage/ucanto/commit/1f995064ec6e5953118c2dd1065ee6be959f25b9))
* setup pnpm & release-please ([84ac7f1](https://github.com/web3-storage/ucanto/commit/84ac7f12e5a66ee4919fa7527858dc916850e3e0))
* **ucanto:** capability create / inovke methods ([#51](https://github.com/web3-storage/ucanto/issues/51)) ([ddf56b1](https://github.com/web3-storage/ucanto/commit/ddf56b1ec80ff6c0698255c531936d8eeab532fd))
* update dag-ucan, types and names ([#90](https://github.com/web3-storage/ucanto/issues/90)) ([cd792c9](https://github.com/web3-storage/ucanto/commit/cd792c934fbd358d6ccfa5d02f205b14b5f2e14e))
* update to latest dag-ucan ([#165](https://github.com/web3-storage/ucanto/issues/165)) ([20e50de](https://github.com/web3-storage/ucanto/commit/20e50de5e311781ee8dc10e32de4eb12e8df2080))
* upgrade to ucan 0.9 ([#95](https://github.com/web3-storage/ucanto/issues/95)) ([b752b39](https://github.com/web3-storage/ucanto/commit/b752b398950120d6121badcdbb639f4dc9ce8794))
* upgrades to multiformats@10 ([#117](https://github.com/web3-storage/ucanto/issues/117)) ([61dc4ca](https://github.com/web3-storage/ucanto/commit/61dc4cafece3365bbf60f709265ea71180f226d7))


### Bug Fixes

* build types before publishing ([#71](https://github.com/web3-storage/ucanto/issues/71)) ([04b7958](https://github.com/web3-storage/ucanto/commit/04b79588f77dba234aaf628f62f574b124bd540b))
* downgrade versions ([#158](https://github.com/web3-storage/ucanto/issues/158)) ([f814e75](https://github.com/web3-storage/ucanto/commit/f814e75a89d3ed7c3488a8cb7af8d94f0cfba440))
* optional field validation ([#124](https://github.com/web3-storage/ucanto/issues/124)) ([87b70d2](https://github.com/web3-storage/ucanto/commit/87b70d2d56c07f8257717fa5ef584a21eb0417c8))
* package scripts to build types ([#84](https://github.com/web3-storage/ucanto/issues/84)) ([4d21132](https://github.com/web3-storage/ucanto/commit/4d2113246abdda215dd3fa882730ba71e68b5695))
* typo ([#145](https://github.com/web3-storage/ucanto/issues/145)) ([18b3fd1](https://github.com/web3-storage/ucanto/commit/18b3fd17e8d7671dc76a238723cb8d524b29cba3))
* update @ipld/car and @ipld/dag-cbor deps ([#120](https://github.com/web3-storage/ucanto/issues/120)) ([5dcd7a5](https://github.com/web3-storage/ucanto/commit/5dcd7a5788dfd126f332b126f7ad1215972f29c4))


### Miscellaneous Chores

* release 0.0.1-beta ([d6c7e73](https://github.com/web3-storage/ucanto/commit/d6c7e73de56278e2f2c92c4a0e1a2709c92bcbf9))
* release 4.0.2 ([e9e35df](https://github.com/web3-storage/ucanto/commit/e9e35dffeeb7e5b5e19627f791b66bbdd35d2d11))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @ucanto/interface bumped from ^4.1.0 to ^4.0.2
  * devDependencies
    * @ucanto/principal bumped from ^4.1.0 to ^4.0.2

## [4.0.2](https://github.com/web3-storage/ucanto/compare/core-v4.0.2...core-v4.0.2) (2022-12-02)


### ⚠ BREAKING CHANGES

* upgrades to multiformats@10 (#117)
* upgrade to ucan 0.9 (#95)
* update dag-ucan, types and names (#90)

### Features

* alight link API with multiformats ([#36](https://github.com/web3-storage/ucanto/issues/36)) ([0ec460e](https://github.com/web3-storage/ucanto/commit/0ec460e43ddda0bb3a3fea8a7881da1463154f36))
* capability provider API ([#34](https://github.com/web3-storage/ucanto/issues/34)) ([ea89f97](https://github.com/web3-storage/ucanto/commit/ea89f97125bb484a12ce3ca09a7884911a9fd4d6))
* cherry pick changes from uploads-v2 demo ([#43](https://github.com/web3-storage/ucanto/issues/43)) ([4308fd2](https://github.com/web3-storage/ucanto/commit/4308fd2f392b9fcccc52af64432dcb04c8257e0b))
* delgation iterate, more errors and types  ([0606168](https://github.com/web3-storage/ucanto/commit/0606168313d17d66bcc1ad6091440765e1700a4f))
* setup pnpm & release-please ([84ac7f1](https://github.com/web3-storage/ucanto/commit/84ac7f12e5a66ee4919fa7527858dc916850e3e0))
* **ucanto:** capability create / inovke methods ([#51](https://github.com/web3-storage/ucanto/issues/51)) ([ddf56b1](https://github.com/web3-storage/ucanto/commit/ddf56b1ec80ff6c0698255c531936d8eeab532fd))
* update dag-ucan, types and names ([#90](https://github.com/web3-storage/ucanto/issues/90)) ([cd792c9](https://github.com/web3-storage/ucanto/commit/cd792c934fbd358d6ccfa5d02f205b14b5f2e14e))
* update to latest dag-ucan ([#165](https://github.com/web3-storage/ucanto/issues/165)) ([20e50de](https://github.com/web3-storage/ucanto/commit/20e50de5e311781ee8dc10e32de4eb12e8df2080))
* upgrade to ucan 0.9 ([#95](https://github.com/web3-storage/ucanto/issues/95)) ([b752b39](https://github.com/web3-storage/ucanto/commit/b752b398950120d6121badcdbb639f4dc9ce8794))
* upgrades to multiformats@10 ([#117](https://github.com/web3-storage/ucanto/issues/117)) ([61dc4ca](https://github.com/web3-storage/ucanto/commit/61dc4cafece3365bbf60f709265ea71180f226d7))


### Bug Fixes

* build types before publishing ([#71](https://github.com/web3-storage/ucanto/issues/71)) ([04b7958](https://github.com/web3-storage/ucanto/commit/04b79588f77dba234aaf628f62f574b124bd540b))
* downgrade versions ([#158](https://github.com/web3-storage/ucanto/issues/158)) ([f814e75](https://github.com/web3-storage/ucanto/commit/f814e75a89d3ed7c3488a8cb7af8d94f0cfba440))
* optional field validation ([#124](https://github.com/web3-storage/ucanto/issues/124)) ([87b70d2](https://github.com/web3-storage/ucanto/commit/87b70d2d56c07f8257717fa5ef584a21eb0417c8))
* package scripts to build types ([#84](https://github.com/web3-storage/ucanto/issues/84)) ([4d21132](https://github.com/web3-storage/ucanto/commit/4d2113246abdda215dd3fa882730ba71e68b5695))
* typo ([#145](https://github.com/web3-storage/ucanto/issues/145)) ([18b3fd1](https://github.com/web3-storage/ucanto/commit/18b3fd17e8d7671dc76a238723cb8d524b29cba3))
* update @ipld/car and @ipld/dag-cbor deps ([#120](https://github.com/web3-storage/ucanto/issues/120)) ([5dcd7a5](https://github.com/web3-storage/ucanto/commit/5dcd7a5788dfd126f332b126f7ad1215972f29c4))


### Miscellaneous Chores

* release 4.0.2 ([e9e35df](https://github.com/web3-storage/ucanto/commit/e9e35dffeeb7e5b5e19627f791b66bbdd35d2d11))

## [4.0.2](https://github.com/web3-storage/ucanto/compare/core-v3.0.5...core-v4.0.2) (2022-12-02)


### Features

* update to latest dag-ucan ([#165](https://github.com/web3-storage/ucanto/issues/165)) ([20e50de](https://github.com/web3-storage/ucanto/commit/20e50de5e311781ee8dc10e32de4eb12e8df2080))


### Miscellaneous Chores

* release 4.0.2 ([e9e35df](https://github.com/web3-storage/ucanto/commit/e9e35dffeeb7e5b5e19627f791b66bbdd35d2d11))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @ucanto/interface bumped from ^4.0.0 to ^4.0.2
  * devDependencies
    * @ucanto/principal bumped from ^4.0.1 to ^4.0.2

### [3.0.5](https://www.github.com/web3-storage/ucanto/compare/core-v3.0.4...core-v3.0.5) (2022-12-02)


### Bug Fixes

* downgrade versions ([#158](https://www.github.com/web3-storage/ucanto/issues/158)) ([f814e75](https://www.github.com/web3-storage/ucanto/commit/f814e75a89d3ed7c3488a8cb7af8d94f0cfba440))

### [3.0.4](https://www.github.com/web3-storage/ucanto/compare/core-v3.0.3...core-v3.0.4) (2022-12-02)


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @ucanto/principal bumped from ^4.0.0 to ^4.0.1

### [3.0.3](https://www.github.com/web3-storage/ucanto/compare/core-v3.0.2...core-v3.0.3) (2022-12-01)


### Bug Fixes

* typo ([#145](https://www.github.com/web3-storage/ucanto/issues/145)) ([18b3fd1](https://www.github.com/web3-storage/ucanto/commit/18b3fd17e8d7671dc76a238723cb8d524b29cba3))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @ucanto/interface bumped from ^3.0.1 to ^4.0.0
  * devDependencies
    * @ucanto/principal bumped from ^3.0.1 to ^4.0.0

### [3.0.2](https://www.github.com/web3-storage/ucanto/compare/core-v3.0.1...core-v3.0.2) (2022-11-11)


### Bug Fixes

* optional field validation ([#124](https://www.github.com/web3-storage/ucanto/issues/124)) ([87b70d2](https://www.github.com/web3-storage/ucanto/commit/87b70d2d56c07f8257717fa5ef584a21eb0417c8))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @ucanto/interface bumped from ^3.0.0 to ^3.0.1
  * devDependencies
    * @ucanto/principal bumped from ^3.0.0 to ^3.0.1

### [3.0.1](https://www.github.com/web3-storage/ucanto/compare/core-v3.0.0...core-v3.0.1) (2022-11-02)


### Bug Fixes

* update @ipld/car and @ipld/dag-cbor deps ([#120](https://www.github.com/web3-storage/ucanto/issues/120)) ([5dcd7a5](https://www.github.com/web3-storage/ucanto/commit/5dcd7a5788dfd126f332b126f7ad1215972f29c4))

## [3.0.0](https://www.github.com/web3-storage/ucanto/compare/core-v2.0.0...core-v3.0.0) (2022-10-20)


### ⚠ BREAKING CHANGES

* upgrades to multiformats@10 (#117)

### Features

* upgrades to multiformats@10 ([#117](https://www.github.com/web3-storage/ucanto/issues/117)) ([61dc4ca](https://www.github.com/web3-storage/ucanto/commit/61dc4cafece3365bbf60f709265ea71180f226d7))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @ucanto/interface bumped from ^2.0.0 to ^3.0.0
  * devDependencies
    * @ucanto/principal bumped from ^2.0.0 to ^3.0.0

## [2.0.0](https://www.github.com/web3-storage/ucanto/compare/core-v1.0.1...core-v2.0.0) (2022-10-16)


### ⚠ BREAKING CHANGES

* upgrade to ucan 0.9 (#95)

### Features

* upgrade to ucan 0.9 ([#95](https://www.github.com/web3-storage/ucanto/issues/95)) ([b752b39](https://www.github.com/web3-storage/ucanto/commit/b752b398950120d6121badcdbb639f4dc9ce8794))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @ucanto/interface bumped from ^1.0.0 to ^2.0.0
  * devDependencies
    * @ucanto/principal bumped from ^1.0.1 to ^2.0.0

### [1.0.1](https://www.github.com/web3-storage/ucanto/compare/core-v1.0.0...core-v1.0.1) (2022-09-21)


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @ucanto/principal bumped from ^1.0.0 to ^1.0.1

## [1.0.0](https://www.github.com/web3-storage/ucanto/compare/core-v0.6.0...core-v1.0.0) (2022-09-14)


### ⚠ BREAKING CHANGES

* update dag-ucan, types and names (#90)

### Features

* update dag-ucan, types and names ([#90](https://www.github.com/web3-storage/ucanto/issues/90)) ([cd792c9](https://www.github.com/web3-storage/ucanto/commit/cd792c934fbd358d6ccfa5d02f205b14b5f2e14e))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @ucanto/interface bumped from ^0.7.0 to ^1.0.0
  * devDependencies
    * @ucanto/principal bumped from ^0.5.0 to ^1.0.0

## [0.6.0](https://www.github.com/web3-storage/ucanto/compare/core-v0.5.4...core-v0.6.0) (2022-07-28)


### Features

* delgation iterate, more errors and types  ([0606168](https://www.github.com/web3-storage/ucanto/commit/0606168313d17d66bcc1ad6091440765e1700a4f))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @ucanto/interface bumped from ^0.6.2 to ^0.7.0
  * devDependencies
    * @ucanto/authority bumped from ^0.4.5 to ^0.5.0

### [0.5.4](https://www.github.com/web3-storage/ucanto/compare/core-v0.5.3...core-v0.5.4) (2022-07-11)


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @ucanto/authority bumped from ^0.4.4 to ^0.4.5

### [0.5.3](https://www.github.com/web3-storage/ucanto/compare/core-v0.5.2...core-v0.5.3) (2022-07-01)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @ucanto/interface bumped from ^0.6.1 to ^0.6.2
  * devDependencies
    * @ucanto/authority bumped from ^0.4.3 to ^0.4.4

### [0.5.2](https://www.github.com/web3-storage/ucanto/compare/core-v0.5.1...core-v0.5.2) (2022-06-30)


### Bug Fixes

* build types before publishing ([#71](https://www.github.com/web3-storage/ucanto/issues/71)) ([04b7958](https://www.github.com/web3-storage/ucanto/commit/04b79588f77dba234aaf628f62f574b124bd540b))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @ucanto/interface bumped from ^0.6.0 to ^0.6.1
  * devDependencies
    * @ucanto/authority bumped from ^0.4.2 to ^0.4.3

### [0.5.1](https://www.github.com/web3-storage/ucanto/compare/core-v0.5.0...core-v0.5.1) (2022-06-24)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @ucanto/interface bumped from ^0.5.0 to ^0.6.0
  * devDependencies
    * @ucanto/authority bumped from ^0.4.1 to ^0.4.2

## [0.5.0](https://www.github.com/web3-storage/ucanto/compare/core-v0.4.0...core-v0.5.0) (2022-06-23)


### Features

* **ucanto:** capability create / inovke methods ([#51](https://www.github.com/web3-storage/ucanto/issues/51)) ([ddf56b1](https://www.github.com/web3-storage/ucanto/commit/ddf56b1ec80ff6c0698255c531936d8eeab532fd))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @ucanto/interface bumped from ^0.4.0 to ^0.5.0
  * devDependencies
    * @ucanto/authority bumped from ^0.4.0 to ^0.4.1

## [0.4.0](https://www.github.com/web3-storage/ucanto/compare/core-v0.3.0...core-v0.4.0) (2022-06-20)


### Features

* alight link API with multiformats ([#36](https://www.github.com/web3-storage/ucanto/issues/36)) ([0ec460e](https://www.github.com/web3-storage/ucanto/commit/0ec460e43ddda0bb3a3fea8a7881da1463154f36))
* cherry pick changes from uploads-v2 demo ([#43](https://www.github.com/web3-storage/ucanto/issues/43)) ([4308fd2](https://www.github.com/web3-storage/ucanto/commit/4308fd2f392b9fcccc52af64432dcb04c8257e0b))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @ucanto/interface bumped from ^0.3.0 to ^0.4.0
  * devDependencies
    * @ucanto/authority bumped from ^0.3.0 to ^0.4.0

## [0.3.0](https://www.github.com/web3-storage/ucanto/compare/core-v0.2.0...core-v0.3.0) (2022-06-15)


### Features

* capability provider API ([#34](https://www.github.com/web3-storage/ucanto/issues/34)) ([ea89f97](https://www.github.com/web3-storage/ucanto/commit/ea89f97125bb484a12ce3ca09a7884911a9fd4d6))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @ucanto/interface bumped from ^0.2.0 to ^0.3.0
  * devDependencies
    * @ucanto/authority bumped from ^0.2.0 to ^0.3.0

## [0.2.0](https://www.github.com/web3-storage/ucanto/compare/core-v0.1.0...core-v0.2.0) (2022-06-10)


### Features

* setup pnpm & release-please ([84ac7f1](https://www.github.com/web3-storage/ucanto/commit/84ac7f12e5a66ee4919fa7527858dc916850e3e0))



### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @ucanto/interface bumped from 0.0.1 to ^0.2.0
  * devDependencies
    * @ucanto/authority bumped from 0.0.1 to ^0.2.0
