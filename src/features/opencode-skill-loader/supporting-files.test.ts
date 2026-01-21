import { describe, it, expect, beforeEach, afterEach } from "bun:test"
import { promises as fs } from "fs"
import { join } from "path"
import { discoverSupportingFiles, formatSize } from "./supporting-files"

describe("supporting-files", () => {
	let tmpDir: string

	beforeEach(async () => {
		tmpDir = join("/tmp", `test-skill-${Date.now()}`)
		await fs.mkdir(tmpDir, { recursive: true })
	})

	afterEach(async () => {
		await fs.rm(tmpDir, { recursive: true, force: true })
	})

	describe("formatSize", () => {
		it("formats bytes correctly", () => {
			expect(formatSize(500)).toBe("500B")
			expect(formatSize(1024)).toBe("1.0KB")
			expect(formatSize(1536)).toBe("1.5KB")
			expect(formatSize(1024 * 1024)).toBe("1.0MB")
			expect(formatSize(1024 * 1024 * 2.5)).toBe("2.5MB")
		})
	})

	describe("discoverSupportingFiles", () => {
		it("discovers non-md files", async () => {
			await fs.writeFile(join(tmpDir, "config.json"), "{}")
			await fs.writeFile(join(tmpDir, "README.md"), "# Readme")
			await fs.writeFile(join(tmpDir, "script.py"), "print('hello')")

			const files = await discoverSupportingFiles(tmpDir)

			expect(files.length).toBe(2)
			expect(files.find((f) => f.relativePath === "config.json")).toBeTruthy()
			expect(files.find((f) => f.relativePath === "script.py")).toBeTruthy()
			expect(files.find((f) => f.relativePath === "README.md")).toBeFalsy()
		})

		it("excludes node_modules and common build dirs", async () => {
			await fs.mkdir(join(tmpDir, "node_modules"), { recursive: true })
			await fs.mkdir(join(tmpDir, "dist"), { recursive: true })
			await fs.writeFile(join(tmpDir, "node_modules", "package.json"), "{}")
			await fs.writeFile(join(tmpDir, "dist", "bundle.js"), "")

			const files = await discoverSupportingFiles(tmpDir)

			expect(files.length).toBe(0)
		})

		it("discovers files in nested directories", async () => {
			await fs.mkdir(join(tmpDir, "src"), { recursive: true })
			await fs.writeFile(join(tmpDir, "src", "index.ts"), "")
			await fs.writeFile(join(tmpDir, "package.json"), "{}")

			const files = await discoverSupportingFiles(tmpDir)

			expect(files.length).toBe(2)
			expect(files.find((f) => f.relativePath === "src/index.ts")).toBeTruthy()
			expect(files.find((f) => f.relativePath === "package.json")).toBeTruthy()
		})

		it("limits to 20 files and filters by size", async () => {
			// Create 25 small files
			for (let i = 0; i < 25; i++) {
				await fs.writeFile(join(tmpDir, `file${i}.txt`), "content")
			}

			const files = await discoverSupportingFiles(tmpDir)

			expect(files.length).toBeLessThanOrEqual(20)
		})

		it("filters out files larger than 1MB", async () => {
			// Create a small file
			await fs.writeFile(join(tmpDir, "small.txt"), "content")
			// Create a large file (>1MB)
			const largeContent = "x".repeat(1024 * 1024 + 1)
			await fs.writeFile(join(tmpDir, "large.bin"), largeContent)

			const files = await discoverSupportingFiles(tmpDir)

			expect(files.find((f) => f.relativePath === "small.txt")).toBeTruthy()
			expect(files.find((f) => f.relativePath === "large.bin")).toBeFalsy()
		})

		it("skips dotfiles and symlinks", async () => {
			await fs.writeFile(join(tmpDir, ".hidden"), "secret")
			await fs.writeFile(join(tmpDir, "visible.txt"), "content")

			const files = await discoverSupportingFiles(tmpDir)

			expect(files.find((f) => f.relativePath === ".hidden")).toBeFalsy()
			expect(files.find((f) => f.relativePath === "visible.txt")).toBeTruthy()
		})

		it("includes file metadata", async () => {
			await fs.writeFile(join(tmpDir, "config.json"), '{"key":"value"}')

			const files = await discoverSupportingFiles(tmpDir)

			const file = files[0]
			expect(file.relativePath).toBe("config.json")
			expect(file.absolutePath).toBe(join(tmpDir, "config.json"))
			expect(file.extension).toBe(".json")
			expect(file.sizeBytes).toBeGreaterThan(0)
		})
	})
})
