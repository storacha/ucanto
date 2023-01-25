import * as The from './type.js'

/**
 * @template {[The.Task, ...The.Task[]]} Tasks
 * @param {Tasks} tasks
 * @returns {The.Protocol<The.InferAbilities<Tasks>>}
 */
export const protocol = tasks => new Protocol(build(tasks))

/**
 * @template {[The.Task, ...The.Task[]]} Tasks
 * @param {Tasks} tasks
 * @returns {The.InferAbilities<Tasks>}
 */
const build = tasks => {
  const abilities = /** @type {The.InferAbilities<Tasks>} */ ({})

  for (const task of tasks) {
    const path = task.can.split('/')
    const name = path.pop()
    if (!name) {
      throw new RangeError(
        `Expected task that has a valid 'can' field instead got '${task.can}'`
      )
    }
    const namespace = buildNamespace(abilities, path)
    if (namespace[name] && namespace[name] !== task) {
      throw new RangeError(
        `All tasks must have unique 'can' fields, but multiple tasks with "can: '${task.can}'" had been provided`
      )
    }
    namespace[name] = task
  }

  return abilities
}

/**
 * @template {Record<string, unknown>} T
 * @param {T} source
 * @param {string[]} path
 */
const buildNamespace = (source, path) => {
  /** @type {Record<string, unknown>} */
  let target = source
  for (const name of path) {
    if (target[name] == null) {
      target[name] = {}
    }
    target = /** @type {Record<string, unknown>} */ (target[name])
  }
  return target
}

/**
 * @template {The.TaskGroup} Abilities
 * @implements {The.Protocol<Abilities>}
 */
class Protocol {
  /**
   * @param {Abilities} abilities
   */
  constructor(abilities) {
    this.abilities = abilities
  }
}
