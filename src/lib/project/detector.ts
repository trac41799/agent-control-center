import { readTextFile, exists } from '@tauri-apps/plugin-fs'
import type { ProjectProfile } from '../types'

interface PackageJson {
  name?: string
  version?: string
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  scripts?: Record<string, string>
}

function joinPath(base: string, ...parts: string[]): string {
  return base.replace(/\/$/, '') + '/' + parts.join('/').replace(/^\//, '')
}

async function fileExists(path: string): Promise<boolean> {
  try {
    return await exists(path)
  } catch {
    return false
  }
}

async function readJsonFile<T>(path: string): Promise<T | null> {
  try {
    const content = await readTextFile(path)
    return JSON.parse(content) as T
  } catch {
    return null
  }
}

async function readTomlFile(path: string): Promise<string> {
  try {
    return await readTextFile(path)
  } catch {
    return ''
  }
}

async function detectStack(projectPath: string): Promise<Partial<ProjectProfile>> {
  const stack: string[] = []
  let testFramework: string | undefined
  let packageManager: string | undefined

  const hasPackageJson = await fileExists(joinPath(projectPath, 'package.json'))
  if (hasPackageJson) {
    const pkg = await readJsonFile<PackageJson>(joinPath(projectPath, 'package.json'))
    if (pkg) {
      stack.push('Node.js')
      if (pkg.dependencies?.react || pkg.devDependencies?.react) {
        stack.push('React')
      }
      if (pkg.dependencies?.next || pkg.devDependencies?.next) {
        stack.push('Next.js')
      }
      if (pkg.dependencies?.express || pkg.devDependencies?.express) {
        stack.push('Express')
      }
      if (pkg.dependencies?.typescript || pkg.devDependencies?.typescript) {
        stack.push('TypeScript')
      }
      if (pkg.dependencies?.vue || pkg.devDependencies?.vue) {
        stack.push('Vue')
      }
      if (pkg.dependencies?.svelte || pkg.devDependencies?.svelte) {
        stack.push('Svelte')
      }
      if (pkg.dependencies?.tailwindcss || pkg.devDependencies?.tailwindcss) {
        stack.push('Tailwind')
      }
      if (pkg.devDependencies?.vitest || pkg.dependencies?.vitest) {
        testFramework = 'Vitest'
      } else if (pkg.devDependencies?.jest || pkg.dependencies?.jest) {
        testFramework = 'Jest'
      }
      if (pkg.scripts?.test?.includes('vitest')) {
        testFramework = 'Vitest'
      } else if (pkg.scripts?.test?.includes('jest')) {
        testFramework = 'Jest'
      }
      const hasYarn = await fileExists(joinPath(projectPath, 'yarn.lock'))
      const hasPnpm = await fileExists(joinPath(projectPath, 'pnpm-lock.yaml'))
      const hasNpm = await fileExists(joinPath(projectPath, 'package-lock.json'))
      if (hasPnpm) {
        packageManager = 'pnpm'
      } else if (hasYarn) {
        packageManager = 'yarn'
      } else if (hasNpm) {
        packageManager = 'npm'
      }
    }
  }

  const hasPyproject = await fileExists(joinPath(projectPath, 'pyproject.toml'))
  if (hasPyproject) {
    const content = await readTomlFile(joinPath(projectPath, 'pyproject.toml'))
    stack.push('Python')
    if (content.includes('fastapi')) {
      stack.push('FastAPI')
    }
    if (content.includes('django')) {
      stack.push('Django')
    }
    if (content.includes('flask')) {
      stack.push('Flask')
    }
    if (content.includes('pytest')) {
      testFramework = 'pytest'
    }
    if (content.includes('poetry')) {
      packageManager = 'poetry'
    } else if (await fileExists(joinPath(projectPath, 'requirements.txt'))) {
      packageManager = 'pip'
    }
  }

  const hasRequirements = await fileExists(joinPath(projectPath, 'requirements.txt'))
  if (hasRequirements && !hasPyproject) {
    stack.push('Python')
    const reqContent = await readTomlFile(joinPath(projectPath, 'requirements.txt'))
    if (reqContent.includes('fastapi')) stack.push('FastAPI')
    if (reqContent.includes('django')) stack.push('Django')
    if (reqContent.includes('flask')) stack.push('Flask')
    if (reqContent.includes('pytest')) testFramework = 'pytest'
    packageManager = 'pip'
  }

  const hasCargo = await fileExists(joinPath(projectPath, 'Cargo.toml'))
  if (hasCargo) {
    const content = await readTomlFile(joinPath(projectPath, 'Cargo.toml'))
    stack.push('Rust')
    if (content.includes('[dev-dependencies]')) {
      testFramework = 'cargo test'
    }
    packageManager = 'cargo'
  }

  const hasGoMod = await fileExists(joinPath(projectPath, 'go.mod'))
  if (hasGoMod) {
    const content = await readTomlFile(joinPath(projectPath, 'go.mod'))
    stack.push('Go')
    if (content.includes('testing')) {
      testFramework = 'go test'
    }
    packageManager = 'go mod'
  }

  const hasComposer = await fileExists(joinPath(projectPath, 'composer.json'))
  if (hasComposer) {
    stack.push('PHP')
    const composer = await readJsonFile<{ require?: Record<string, string> }>(joinPath(projectPath, 'composer.json'))
    if (composer?.require) {
      if (composer.require.laravel) stack.push('Laravel')
    }
  }

  const hasGithubWorkflows = await fileExists(joinPath(projectPath, '.github', 'workflows'))
  if (hasGithubWorkflows) {
    stack.push('GitHub Actions')
  }

  const hasSupabaseDir = await fileExists(joinPath(projectPath, 'supabase'))
  if (hasSupabaseDir) {
    stack.push('Supabase')
  }

  return {
    stack,
    test_framework: testFramework,
    package_manager: packageManager,
  }
}

export { detectStack }