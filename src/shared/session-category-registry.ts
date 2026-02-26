/**
 * Session Category Registry
 *
 * Maintains a mapping of session IDs to their assigned categories.
 * Used by runtime-fallback hook to lookup category-specific fallback_models.
 */

const sessionCategoryMap = new Map<string, string>()

export const SessionCategoryRegistry = {
  register: (sessionID: string, category: string): void => {
    sessionCategoryMap.set(sessionID, category)
  },
  get: (sessionID: string): string | undefined => {
    return sessionCategoryMap.get(sessionID)
  },
  remove: (sessionID: string): void => {
    sessionCategoryMap.delete(sessionID)
  },
  has: (sessionID: string): boolean => {
    return sessionCategoryMap.has(sessionID)
  },
  size: (): number => {
    return sessionCategoryMap.size
  },
  clear: (): void => {
    sessionCategoryMap.clear()
  },
}
