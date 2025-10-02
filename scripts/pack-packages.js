#!/usr/bin/env node

/**
 * Pack individual packages for external consumption
 * Resolves workspace dependencies to actual versions
 */

import fs from 'fs/promises'
import path from 'path'
import { execSync } from 'child_process'

const PACKAGES_DIR = 'packages'
const OUTPUT_DIR = 'packed'

async function getPackages() {
  const packages = []
  const packagesDir = await fs.readdir(PACKAGES_DIR)
  
  for (const dir of packagesDir) {
    const packagePath = path.join(PACKAGES_DIR, dir)
    const packageJsonPath = path.join(packagePath, 'package.json')
    
    try {
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'))
      packages.push({
        name: packageJson.name,
        version: packageJson.version,
        path: packagePath,
        packageJson
      })
    } catch (err) {
      console.warn(`Skipping ${dir}: ${err.message}`)
    }
  }
  
  return packages
}

function createVersionMap(packages) {
  const versionMap = new Map()
  for (const pkg of packages) {
    versionMap.set(pkg.name, pkg.version)
  }
  return versionMap
}

function resolveWorkspaceDependencies(dependencies, versionMap) {
  if (!dependencies) return dependencies
  
  const resolved = { ...dependencies }
  for (const [name, version] of Object.entries(resolved)) {
    if (version.startsWith('workspace:')) {
      const actualVersion = versionMap.get(name)
      if (actualVersion) {
        resolved[name] = `^${actualVersion}`
        console.log(`  Resolved ${name}: ${version} -> ^${actualVersion}`)
      }
    }
  }
  return resolved
}

async function packPackage(pkg, versionMap, outputDir) {
  console.log(`\n📦 Packing ${pkg.name}@${pkg.version}`)
  
  // Create a temporary package.json with resolved dependencies
  const originalPath = path.join(pkg.path, 'package.json')
  const backupPath = path.join(pkg.path, 'package.json.backup')
  
  // Backup original
  await fs.copyFile(originalPath, backupPath)
  
  try {
    // Resolve workspace dependencies
    const resolvedPackageJson = {
      ...pkg.packageJson,
      dependencies: resolveWorkspaceDependencies(pkg.packageJson.dependencies, versionMap),
      devDependencies: resolveWorkspaceDependencies(pkg.packageJson.devDependencies, versionMap),
      peerDependencies: resolveWorkspaceDependencies(pkg.packageJson.peerDependencies, versionMap)
    }
    
    // Write resolved package.json
    await fs.writeFile(originalPath, JSON.stringify(resolvedPackageJson, null, 2))
    
    // Pack the package (use absolute path for output)
    const absoluteOutputDir = path.resolve(outputDir)
    const result = execSync(`npm pack --pack-destination ${absoluteOutputDir}`, {
      cwd: pkg.path,
      encoding: 'utf8'
    })
    
    console.log(`✅ Created: ${result.trim()}`)
    
  } finally {
    // Restore original package.json
    await fs.copyFile(backupPath, originalPath)
    await fs.unlink(backupPath)
  }
}

async function main() {
  console.log('🔧 Packing ucanto packages for external use\n')
  
  // Ensure output directory exists
  try {
    await fs.mkdir(OUTPUT_DIR, { recursive: true })
  } catch (err) {
    // Directory might already exist
  }
  
  // Get all packages and create version map
  const packages = await getPackages()
  const versionMap = createVersionMap(packages)
  
  console.log(`Found ${packages.length} packages:`)
  packages.forEach(pkg => console.log(`  - ${pkg.name}@${pkg.version}`))
  
  // Pack each package
  for (const pkg of packages) {
    await packPackage(pkg, versionMap, OUTPUT_DIR)
  }
  
  console.log(`\n🎉 All packages packed successfully!`)
  console.log(`📁 Output directory: ${OUTPUT_DIR}/`)
  console.log('\nTo install in another project:')
  console.log(`  npm install /path/to/ucanto/${OUTPUT_DIR}/package-name.tgz`)
}

main().catch(console.error)