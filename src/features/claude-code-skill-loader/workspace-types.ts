export interface CategoryConfig {
  read?: string[]
  list?: string[]
  max_size?: number
}

export interface ManifestDefaults {
  max_size?: number
}

export interface SkillWorkspaceManifest {
  defaults?: ManifestDefaults
  ignore?: string[]
  [category: string]: CategoryConfig | string[] | { max_size?: number } | undefined
}

export interface ScannedFile {
  path: string
  absolutePath: string
  size: number
  category: string
  action: 'read' | 'list'
}

export interface WorkspaceContext {
  files: ScannedFile[]
  contents: Map<string, string>
  manifest: SkillWorkspaceManifest | null
}
