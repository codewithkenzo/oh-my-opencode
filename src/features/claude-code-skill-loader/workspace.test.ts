import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { mkdirSync, rmSync, writeFileSync } from 'fs'
import { parseWorkspaceManifest, getDefaultManifest } from './workspace-parser'
import { scanWorkspace } from './workspace-scanner'
import { formatWorkspaceContext } from './workspace-formatter'
import type { SkillWorkspaceManifest, WorkspaceContext } from './workspace-types'

describe('Workspace Parser', () => {
  describe('parseWorkspaceManifest', () => {
    it('returns null for non-existent manifest', () => {
      // #given a directory that does not have manifest.yaml
      const nonExistentDir = '/tmp/non-existent-dir-' + Date.now()

      // #when parsing the manifest
      const result = parseWorkspaceManifest(nonExistentDir)

      // #then it should return null
      expect(result).toBeNull()
    })

    it('parses valid manifest.yaml with categories', () => {
      // #given a skill directory with valid manifest.yaml
      const skillDir = '/tmp/test-skill-parser-valid-' + Date.now()
      mkdirSync(skillDir, { recursive: true })

      writeFileSync(`${skillDir}/manifest.yaml`, `
defaults:
  max_size: 1024

ignore:
  - '*.tmp'
  - 'node_modules'

knowledge:
  read:
    - '*.md'
    - '*.txt'
  max_size: 2048

config:
  read:
    - '*.json'
    - '*.yaml'
  list:
    - '*.yml'
  max_size: 512

scripts:
  list:
    - '**/*.ts'
`)

      // #when parsing the manifest
      const result = parseWorkspaceManifest(skillDir)

      // #then it should parse correctly
      expect(result).not.toBeNull()
      expect(result?.defaults?.max_size).toBe(1024)
      expect(result?.ignore).toEqual(['*.tmp', 'node_modules'])

      const knowledge = result?.knowledge as { read?: string[]; max_size?: number }
      expect(knowledge?.read).toEqual(['*.md', '*.txt'])
      expect(knowledge?.max_size).toBe(2048)

      const config = result?.config as { read?: string[]; list?: string[]; max_size?: number }
      expect(config?.read).toEqual(['*.json', '*.yaml'])
      expect(config?.list).toEqual(['*.yml'])
      expect(config?.max_size).toBe(512)

      const scripts = result?.scripts as { list?: string[] }
      expect(scripts?.list).toEqual(['**/*.ts'])

      // #cleanup
      rmSync(skillDir, { recursive: true, force: true })
    })

    it('returns null for invalid YAML', () => {
      // #given a skill directory with invalid manifest.yaml
      const skillDir = '/tmp/test-skill-parser-invalid-' + Date.now()
      mkdirSync(skillDir, { recursive: true })

      writeFileSync(`${skillDir}/manifest.yaml`, `
invalid: yaml: [
  unclosed
`)

      // #when parsing the manifest
      const result = parseWorkspaceManifest(skillDir)

      // #then it should return null gracefully
      expect(result).toBeNull()

      // #cleanup
      rmSync(skillDir, { recursive: true, force: true })
    })
  })

  describe('getDefaultManifest', () => {
    it('returns default manifest structure', () => {
      // #when getting default manifest
      const result = getDefaultManifest()

      // #then it should have all default categories
      expect(result.defaults?.max_size).toBe(2048)
      expect(result.ignore).toEqual([])

      const knowledge = result.knowledge as { read?: string[]; max_size?: number }
      expect(knowledge?.read).toEqual(['*.md'])
      expect(knowledge?.max_size).toBe(2048)
    })
  })
})

describe('Workspace Scanner', () => {
  let testDir: string

  beforeEach(() => {
    // #given a temporary test directory
    testDir = `/tmp/test-workspace-scan-${Date.now()}`
    mkdirSync(testDir, { recursive: true })
  })

  afterEach(() => {
    // #cleanup: remove test directory
    try {
      rmSync(testDir, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors
    }
  })

  it('scans directory recursively', () => {
    // #given a directory with nested files
    const subdir = `${testDir}/nested`
    mkdirSync(subdir, { recursive: true })
    writeFileSync(`${subdir}/file.md`, 'content')
    writeFileSync(`${testDir}/root.md`, 'root content')

    // #when scanning with null manifest (uses default)
    const result = scanWorkspace(testDir, null)

    // #then it should find all files
    expect(result.files.length).toBeGreaterThan(0)
    const filePaths = result.files.map(f => f.path)
    expect(filePaths).toContain('root.md')
    expect(filePaths).toContain('nested/file.md')
  })

  it('respects ignore patterns', () => {
    // #given a directory with ignored files
    mkdirSync(`${testDir}/.git`, { recursive: true })
    mkdirSync(`${testDir}/node_modules`, { recursive: true })

    writeFileSync(`${testDir}/keep.md`, 'keep')
    writeFileSync(`${testDir}/.git/ignore.txt`, 'ignore')
    writeFileSync(`${testDir}/node_modules/package.json`, '{}')
    writeFileSync(`${testDir}/.hidden`, 'hidden')

    // #when scanning with default manifest
    const result = scanWorkspace(testDir, null)

    // #then it should ignore git, node_modules, and hidden files
    const filePaths = result.files.map(f => f.path)
    expect(filePaths).toContain('keep.md')
    expect(filePaths.some(p => p.includes('.git'))).toBe(false)
    expect(filePaths.some(p => p.includes('node_modules'))).toBe(false)
  })

  it('categorizes files by manifest rules', () => {
    // #given a manifest with multiple categories
    const manifest: SkillWorkspaceManifest = {
      defaults: { max_size: 1024 },
      knowledge: { read: ['*.md'], max_size: 2048 },
      config: { read: ['*.json'], list: ['*.yaml'] },
      scripts: { list: ['**/*.ts'] }
    }

    writeFileSync(`${testDir}/readme.md`, '# Readme')
    writeFileSync(`${testDir}/package.json`, '{"name": "test"}')
    writeFileSync(`${testDir}/config.yaml`, 'key: value')
    writeFileSync(`${testDir}/index.ts`, 'export function main() {}')

    // #when scanning with manifest
    const result = scanWorkspace(testDir, manifest)

    // #then it should categorize files correctly
    const readmeFile = result.files.find(f => f.path === 'readme.md')
    const packageFile = result.files.find(f => f.path === 'package.json')
    const configFile = result.files.find(f => f.path === 'config.yaml')
    const indexFile = result.files.find(f => f.path === 'index.ts')

    expect(readmeFile?.category).toBe('knowledge')
    expect(readmeFile?.action).toBe('read')
    expect(packageFile?.category).toBe('config')
    expect(packageFile?.action).toBe('read')
    expect(configFile?.category).toBe('config')
    expect(configFile?.action).toBe('list')
    expect(indexFile?.category).toBe('scripts')
    expect(indexFile?.action).toBe('list')
  })

  it('reads file contents under size limit', () => {
    // #given a small file to read
    const manifest: SkillWorkspaceManifest = {
      defaults: { max_size: 1024 },
      knowledge: { read: ['*.md'], max_size: 100 }
    }

    const content = 'small content'
    writeFileSync(`${testDir}/small.md`, content)

    // #when scanning workspace
    const result = scanWorkspace(testDir, manifest)

    // #then it should read file contents
    expect(result.contents.has('small.md')).toBe(true)
    expect(result.contents.get('small.md')).toBe(content)
  })

  it('skips files over size limit', () => {
    // #given a large file to read
    const manifest: SkillWorkspaceManifest = {
      defaults: { max_size: 1024 },
      knowledge: { read: ['*.md'], max_size: 10 }
    }

    const content = 'x'.repeat(100)
    writeFileSync(`${testDir}/large.md`, content)

    // #when scanning workspace
    const result = scanWorkspace(testDir, manifest)

    // #then it should not read file contents
    expect(result.contents.has('large.md')).toBe(false)

    // #but file should still be categorized
    const largeFile = result.files.find(f => f.path === 'large.md')
    expect(largeFile).toBeDefined()
    expect(largeFile?.action).toBe('read')
  })

  it('handles empty directory', () => {
    // #given an empty directory
    const result = scanWorkspace(testDir, null)

    // #then it should return empty result
    expect(result.files).toEqual([])
    expect(result.contents.size).toBe(0)
    expect(result.manifest).toBeDefined()
  })
})

describe('Workspace Formatter', () => {
  describe('formatWorkspaceContext', () => {
    it('returns empty string for no files', () => {
      // #given an empty workspace context
      const context: WorkspaceContext = {
        files: [],
        contents: new Map(),
        manifest: {}
      }

      // #when formatting
      const result = formatWorkspaceContext(context)

      // #then it should return empty string
      expect(result).toBe('')
    })

    it('groups files by category', () => {
      // #given files from multiple categories
      const context: WorkspaceContext = {
        files: [
          { path: 'readme.md', absolutePath: '/test/readme.md', size: 100, category: 'knowledge', action: 'read' },
          { path: 'guide.txt', absolutePath: '/test/guide.txt', size: 200, category: 'knowledge', action: 'list' },
          { path: 'config.json', absolutePath: '/test/config.json', size: 50, category: 'config', action: 'read' }
        ],
        contents: new Map([
          ['readme.md', '# Readme content'],
          ['config.json', '{"key": "value"}']
        ]),
        manifest: {}
      }

      // #when formatting
      const result = formatWorkspaceContext(context)

      // #then it should group by category
      expect(result).toContain('## Workspace Resources')
      expect(result).toContain('### Knowledge')
      expect(result).toContain('### Config')
    })

    it('formats read files with content', () => {
      // #given read files with content
      const context: WorkspaceContext = {
        files: [
          { path: 'test.md', absolutePath: '/test/test.md', size: 100, category: 'knowledge', action: 'read' }
        ],
        contents: new Map([
          ['test.md', '# Test Content\n\nHello world']
        ]),
        manifest: {}
      }

      // #when formatting
      const result = formatWorkspaceContext(context)

      // #then it should include file content with XML tags
      expect(result).toContain('<file path="test.md" lang="markdown">')
      expect(result).toContain('# Test Content')
      expect(result).toContain('Hello world')
      expect(result).toContain('</file>')
    })

    it('formats list files with sizes', () => {
      // #given list files
      const context: WorkspaceContext = {
        files: [
          { path: 'large.ts', absolutePath: '/test/large.ts', size: 1024 * 2, category: 'scripts', action: 'list' },
          { path: 'small.ts', absolutePath: '/test/small.ts', size: 512, category: 'scripts', action: 'list' }
        ],
        contents: new Map(),
        manifest: {}
      }

      // #when formatting
      const result = formatWorkspaceContext(context)

      // #then it should format with sizes
      expect(result).toContain('- large.ts (2.0KB)')
      expect(result).toContain('- small.ts (512B)')
    })

    it('includes language hints for known extensions', () => {
      // #given files with different extensions
      const context: WorkspaceContext = {
        files: [
          { path: 'test.ts', absolutePath: '/test/test.ts', size: 100, category: 'scripts', action: 'read' },
          { path: 'test.md', absolutePath: '/test/test.md', size: 100, category: 'knowledge', action: 'read' }
        ],
        contents: new Map([
          ['test.ts', 'const x = 1'],
          ['test.md', '# Test']
        ]),
        manifest: {}
      }

      // #when formatting
      const result = formatWorkspaceContext(context)

      // #then it should include correct language hints
      expect(result).toContain('lang="typescript"')
      expect(result).toContain('lang="markdown"')
    })

    it('handles size formatting for bytes', () => {
      // #given a very small file
      const context: WorkspaceContext = {
        files: [
          { path: 'tiny.md', absolutePath: '/test/tiny.md', size: 100, category: 'knowledge', action: 'list' }
        ],
        contents: new Map(),
        manifest: {}
      }

      // #when formatting
      const result = formatWorkspaceContext(context)

      // #then it should format as bytes
      expect(result).toContain('- tiny.md (100B)')
    })

    it('handles size formatting for megabytes', () => {
      // #given a large file
      const context: WorkspaceContext = {
        files: [
          { path: 'huge.md', absolutePath: '/test/huge.md', size: 1024 * 1024 * 2, category: 'knowledge', action: 'list' }
        ],
        contents: new Map(),
        manifest: {}
      }

      // #when formatting
      const result = formatWorkspaceContext(context)

      // #then it should format as megabytes
      expect(result).toContain('- huge.md (2.0MB)')
    })

    it('capitalizes category names', () => {
      // #given categories with lowercase names
      const context: WorkspaceContext = {
        files: [
          { path: 'file.md', absolutePath: '/test/file.md', size: 100, category: 'knowledge', action: 'read' }
        ],
        contents: new Map([
          ['file.md', 'content']
        ]),
        manifest: {}
      }

      // #when formatting
      const result = formatWorkspaceContext(context)

      // #then it should capitalize category name
      expect(result).toContain('### Knowledge')
      expect(result).not.toContain('### knowledge')
    })
  })
})

describe('Integration: Parser + Scanner + Formatter', () => {
  let testDir: string

  beforeEach(() => {
    testDir = `/tmp/test-workspace-integration-${Date.now()}`
    mkdirSync(testDir, { recursive: true })
  })

  afterEach(() => {
    try {
      rmSync(testDir, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors
    }
  })

  it('complete workflow: manifest, scan, format', () => {
    // #given a skill directory with manifest and files
    writeFileSync(`${testDir}/manifest.yaml`, `
defaults:
  max_size: 1024

ignore:
  - '*.tmp'

knowledge:
  read:
    - '*.md'
  max_size: 10000

config:
  read:
    - '*.json'
  list:
    - '*.yaml'
`)

    writeFileSync(`${testDir}/readme.md`, '# Project Readme\n\nThis is a test project.')
    writeFileSync(`${testDir}/config.json`, '{"name": "test-project"}')
    writeFileSync(`${testDir}/settings.yaml`, 'key: value')
    writeFileSync(`${testDir}/ignore.tmp`, 'should be ignored')
    writeFileSync(`${testDir}/.hidden`, 'hidden file')

    // #when parsing manifest, scanning workspace, and formatting
    const manifest = parseWorkspaceManifest(testDir)
    expect(manifest).not.toBeNull()

    const context = scanWorkspace(testDir, manifest)
    expect(context.files.length).toBeGreaterThan(0)

    const formatted = formatWorkspaceContext(context)

    // #then the complete workflow should work
    expect(formatted).toContain('## Workspace Resources')
    expect(formatted).toContain('### Knowledge')
    expect(formatted).toContain('<file path="readme.md" lang="markdown">')
    expect(formatted).toContain('# Project Readme')
    expect(formatted).not.toContain('ignore.tmp')
    expect(formatted).not.toContain('.hidden')
  })

  it('handles nested directory structure', () => {
    // #given nested directories
    writeFileSync(`${testDir}/manifest.yaml`, `
defaults:
  max_size: 1024

knowledge:
  read:
    - '**/*.md'
  max_size: 10000

scripts:
  list:
    - '**/*.ts'
`)

    const srcDir = `${testDir}/src`
    const utilsDir = `${srcDir}/utils`
    mkdirSync(utilsDir, { recursive: true })

    writeFileSync(`${testDir}/readme.md`, '# Root readme')
    writeFileSync(`${srcDir}/index.md`, '# Src index')
    writeFileSync(`${utilsDir}/helper.md`, '# Helper utils')
    writeFileSync(`${srcDir}/index.ts`, 'export function main() {}')
    writeFileSync(`${utilsDir}/helper.ts`, 'export function helper() {}')

    // #when scanning and formatting
    const manifest = parseWorkspaceManifest(testDir)
    const context = scanWorkspace(testDir, manifest)
    const formatted = formatWorkspaceContext(context)

    // #then it should find all files recursively
    expect(context.files.length).toBe(5)
    expect(formatted).toContain('readme.md')
    expect(formatted).toContain('src/index.md')
    expect(formatted).toContain('src/utils/helper.md')
    expect(formatted).toContain('src/index.ts')
    expect(formatted).toContain('src/utils/helper.ts')
  })
})
