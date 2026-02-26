import type { CategoryConfig } from "../config/schema"
import { DEFAULT_CATEGORIES } from "../tools/delegate-task/constants"

export function mergeCategories(userCategories?: Record<string, CategoryConfig>): Record<string, CategoryConfig> {
  return { ...DEFAULT_CATEGORIES, ...userCategories }
}
