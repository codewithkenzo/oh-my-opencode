import { describe, expect, test } from "bun:test"
import { getCategorySkills } from "./tools"
import { CATEGORY_SKILLS } from "./constants"

describe("skill injection", () => {
  describe("getCategorySkills", () => {
    test("category WITH skills returns skills array", () => {
      //#given
      const category = "visual-engineering"
      const userCategorySkills = undefined

      //#when
      const result = getCategorySkills(category, userCategorySkills)

      //#then
      expect(result).toBeArray()
      expect(result.length).toBeGreaterThan(0)
      expect(result).toContain("frontend-ui-ux")
    })

    test("category WITHOUT skills returns empty array", () => {
      //#given
      const category = "quick"
      const userCategorySkills = undefined

      //#when
      const result = getCategorySkills(category, userCategorySkills)

      //#then
      expect(result).toBeArray()
      expect(result.length).toBeGreaterThan(0)
      expect(result).toContain("git-master")
    })

    test("general category returns linearis skill", () => {
      //#given
      const category = "general"
      const userCategorySkills = undefined

      //#when
      const result = getCategorySkills(category, userCategorySkills)

      //#then
      expect(result).toBeArray()
      expect(result.length).toBeGreaterThan(0)
      expect(result).toContain("linearis")
    })

    test("user category skills override builtin category skills", () => {
      //#given
      const category = "visual-engineering"
      const userCategorySkills = {
        "visual-engineering": ["custom-ui-skill", "custom-design-skill"]
      }

      //#when
      const result = getCategorySkills(category, userCategorySkills)

      //#then
      expect(result).toBeArray()
      expect(result.length).toBe(2)
      expect(result).toContain("custom-ui-skill")
      expect(result).toContain("custom-design-skill")
      expect(result).not.toContain("frontend-ui-ux")
    })

    test("unknown category returns empty array", () => {
      //#given
      const category = "nonexistent-category"
      const userCategorySkills = undefined

      //#when
      const result = getCategorySkills(category, userCategorySkills)

      //#then
      expect(result).toBeArray()
      expect(result.length).toBe(0)
    })

    test("user category skills for unknown category returns user skills", () => {
      //#given
      const category = "custom-category"
      const userCategorySkills = {
        "custom-category": ["custom-skill-1", "custom-skill-2"]
      }

      //#when
      const result = getCategorySkills(category, userCategorySkills)

      //#then
      expect(result).toBeArray()
      expect(result.length).toBe(2)
      expect(result).toContain("custom-skill-1")
      expect(result).toContain("custom-skill-2")
    })
  })

  describe("CATEGORY_SKILLS constant", () => {
    test("visual-engineering has frontend-ui-ux skill", () => {
      //#given
      const category = "visual-engineering"

      //#when
      const skills = CATEGORY_SKILLS[category]

      //#then
      expect(skills).toBeArray()
      expect(skills.length).toBeGreaterThan(0)
      expect(skills).toContain("frontend-ui-ux")
    })

    test("quick has git-master skill", () => {
      //#given
      const category = "quick"

      //#when
      const skills = CATEGORY_SKILLS[category]

      //#then
      expect(skills).toBeArray()
      expect(skills.length).toBeGreaterThan(0)
      expect(skills).toContain("git-master")
    })

    test("general has linearis skill", () => {
      //#given
      const category = "general"

      //#when
      const skills = CATEGORY_SKILLS[category]

      //#then
      expect(skills).toBeArray()
      expect(skills.length).toBeGreaterThan(0)
      expect(skills).toContain("linearis")
    })

    test("all builtin categories have skill arrays defined", () => {
      //#given
      const builtinCategories = [
        "visual-engineering",
        "ultrabrain",
        "artistry",
        "quick",
        "most-capable",
        "writing",
        "general"
      ]

      //#when / #then
      for (const category of builtinCategories) {
        expect(CATEGORY_SKILLS[category]).toBeArray()
      }
    })
  })
})
