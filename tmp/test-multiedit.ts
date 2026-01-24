import { multiedit } from "../src/tools/multiedit"

async function test() {
  console.log("=== Testing multiedit tool ===\n")
  
  // Test 1: Multiple sequential edits
  console.log("Test 1: Multiple sequential edits")
  const result1 = await multiedit.execute({
    filePath: "/home/kenzo/dev/oh-my-opencode-v3/tmp/multiedit-test.txt",
    edits: [
      { oldString: "Hello World!", newString: "Greetings Earth!" },
      { oldString: "line two", newString: "line TWO" },
      { oldString: "lazy dog", newString: "energetic dog" },
    ]
  })
  console.log(result1)
  console.log()
  
  // Show file after first test
  const fs = await import("fs")
  console.log("File contents after Test 1:")
  console.log(fs.readFileSync("/home/kenzo/dev/oh-my-opencode-v3/tmp/multiedit-test.txt", "utf-8"))
  
  // Test 2: Replace all occurrences
  console.log("\nTest 2: Replace all occurrences of 'foo'")
  const result2 = await multiedit.execute({
    filePath: "/home/kenzo/dev/oh-my-opencode-v3/tmp/multiedit-test.txt",
    edits: [
      { oldString: "foo", newString: "FOO", replaceAll: true },
    ]
  })
  console.log(result2)
  console.log()
  
  console.log("File contents after Test 2:")
  console.log(fs.readFileSync("/home/kenzo/dev/oh-my-opencode-v3/tmp/multiedit-test.txt", "utf-8"))
  
  // Test 3: Expected failure - oldString not found
  console.log("\nTest 3: Expected failure - oldString not found")
  const result3 = await multiedit.execute({
    filePath: "/home/kenzo/dev/oh-my-opencode-v3/tmp/multiedit-test.txt",
    edits: [
      { oldString: "nonexistent text", newString: "replacement" },
    ]
  })
  console.log(result3)
  
  // Test 4: Expected failure - multiple occurrences without replaceAll
  console.log("\nTest 4: Expected failure - multiple occurrences without replaceAll")
  // Reset file first
  fs.writeFileSync("/home/kenzo/dev/oh-my-opencode-v3/tmp/multiedit-test.txt", "dup dup dup\n")
  const result4 = await multiedit.execute({
    filePath: "/home/kenzo/dev/oh-my-opencode-v3/tmp/multiedit-test.txt",
    edits: [
      { oldString: "dup", newString: "unique" },
    ]
  })
  console.log(result4)
}

test().catch(console.error)
