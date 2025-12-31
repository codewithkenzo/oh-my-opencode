import { spawn } from "node:child_process";

const TIMEOUT_MS = 30000;
let bdAvailable: boolean | null = null;

function isValidIssueId(id: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(id);
}

async function isBdAvailable(): Promise<boolean> {
  if (bdAvailable !== null) return bdAvailable;
  
  try {
    const result = await execBd(["--version"]);
    bdAvailable = result.exitCode === 0;
    return bdAvailable;
  } catch {
    bdAvailable = false;
    return false;
  }
}

interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

function execBd(args: string[]): Promise<ExecResult> {
  return new Promise((resolve, reject) => {
    const proc = spawn("bd", args, {
      stdio: ["ignore", "pipe", "pipe"],
      timeout: TIMEOUT_MS,
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => { stdout += data.toString(); });
    proc.stderr.on("data", (data) => { stderr += data.toString(); });

    const timer = setTimeout(() => {
      proc.kill("SIGTERM");
      reject(new Error(`Command timed out after ${TIMEOUT_MS}ms`));
    }, TIMEOUT_MS);

    proc.on("close", (code) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode: code ?? 0 });
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

function parseBdJson<T>(output: string): T | null {
  try {
    return JSON.parse(output) as T;
  } catch {
    return null;
  }
}

export async function getReadyIssues(): Promise<BeadsIssue[]> {
  if (!(await isBdAvailable())) {
    throw new Error("Beads (bd) is not installed or not in PATH");
  }
  const { stdout, exitCode } = await execBd(["ready", "--json"]);
  if (exitCode !== 0) throw new Error(`bd ready failed with exit code ${exitCode}`);
  const result = parseBdJson<BeadsIssue[]>(stdout);
  return result ?? [];
}

export async function listIssues(options: ListOptions = {}): Promise<BeadsIssue[]> {
  if (!(await isBdAvailable())) {
    throw new Error("Beads (bd) is not installed or not in PATH");
  }
  
  const args = ["list", "--json"];
  if (options.status) args.push("--status", options.status);
  if (options.priority !== undefined) args.push("-p", String(options.priority));
  if (options.type) args.push("-t", options.type);
  if (options.search) args.push("--search", options.search);
  
  const { stdout, exitCode } = await execBd(args);
  if (exitCode !== 0) throw new Error(`bd list failed with exit code ${exitCode}`);
  const result = parseBdJson<BeadsIssue[]>(stdout);
  return result ?? [];
}

export async function showIssue(id: string): Promise<BeadsIssue | null> {
  if (!(await isBdAvailable())) {
    throw new Error("Beads (bd) is not installed or not in PATH");
  }
  if (!isValidIssueId(id)) {
    throw new Error(`Invalid issue ID format: ${id}`);
  }
  
  const { stdout, exitCode } = await execBd(["show", id, "--json"]);
  if (exitCode !== 0) return null;
  const result = parseBdJson<BeadsIssue[]>(stdout);
  return result?.[0] ?? null;
}

export async function createIssue(title: string, options: IssueOptions): Promise<BeadsIssue | null> {
  if (!(await isBdAvailable())) {
    throw new Error("Beads (bd) is not installed or not in PATH");
  }
  
  const args = ["create", title, "--json"];
  if (options.type) args.push("-t", options.type);
  if (options.priority !== undefined) args.push("-p", String(options.priority));
  if (options.status) args.push("--status", options.status);
  if (options.description) args.push("--description", options.description);

  const { stdout, exitCode } = await execBd(args);
  if (exitCode !== 0) throw new Error(`bd create failed with exit code ${exitCode}`);
  const result = parseBdJson<BeadsIssue>(stdout);
  return result ?? null;
}

export async function updateIssue(id: string, options: UpdateOptions): Promise<BeadsIssue | null> {
  if (!(await isBdAvailable())) {
    throw new Error("Beads (bd) is not installed or not in PATH");
  }
  if (!isValidIssueId(id)) {
    throw new Error(`Invalid issue ID format: ${id}`);
  }
  
  const args = ["update", id, "--json"];
  if (options.status) args.push("--status", options.status);
  if (options.title) args.push("--title", options.title);
  if (options.description) args.push("--description", options.description);
  if (options.priority !== undefined) args.push("-p", String(options.priority));

  const { stdout, exitCode } = await execBd(args);
  if (exitCode !== 0) throw new Error(`bd update failed with exit code ${exitCode}`);
  const result = parseBdJson<BeadsIssue[]>(stdout);
  return result?.[0] ?? null;
}

export async function closeIssue(id: string, reason: string): Promise<boolean> {
  if (!(await isBdAvailable())) {
    throw new Error("Beads (bd) is not installed or not in PATH");
  }
  if (!isValidIssueId(id)) {
    throw new Error(`Invalid issue ID format: ${id}`);
  }
  
  try {
    const { exitCode } = await execBd(["close", id, "--reason", reason]);
    return exitCode === 0;
  } catch {
    return false;
  }
}

export async function addDependency(from: string, to: string): Promise<boolean> {
  if (!(await isBdAvailable())) {
    throw new Error("Beads (bd) is not installed or not in PATH");
  }
  if (!isValidIssueId(from) || !isValidIssueId(to)) {
    throw new Error("Invalid issue ID format");
  }
  
  try {
    const { exitCode } = await execBd(["dep", "add", from, to]);
    return exitCode === 0;
  } catch {
    return false;
  }
}

export async function removeDependency(from: string, to: string): Promise<boolean> {
  if (!(await isBdAvailable())) {
    throw new Error("Beads (bd) is not installed or not in PATH");
  }
  if (!isValidIssueId(from) || !isValidIssueId(to)) {
    throw new Error("Invalid issue ID format");
  }
  
  try {
    const { exitCode } = await execBd(["dep", "remove", from, to]);
    return exitCode === 0;
  } catch {
    return false;
  }
}

export async function syncBeads(): Promise<string> {
  if (!(await isBdAvailable())) {
    throw new Error("Beads (bd) is not installed or not in PATH");
  }
  const { stdout } = await execBd(["sync"]);
  return stdout;
}

export async function getBeadsStatus(): Promise<BeadsStatus | null> {
  if (!(await isBdAvailable())) {
    throw new Error("Beads (bd) is not installed or not in PATH");
  }
  const { stdout, exitCode } = await execBd(["status", "--json"]);
  if (exitCode !== 0) return null;
  const result = parseBdJson<BdStatusJson>(stdout);
  if (!result) return null;
  return {
    total: result.summary.total_issues,
    byStatus: {
      open: result.summary.open_issues,
      in_progress: result.summary.in_progress_issues,
      closed: result.summary.closed_issues,
      blocked: result.summary.blocked_issues,
      ready: result.summary.ready_issues,
    },
    byPriority: {},
  };
}

interface BdStatusJson {
  summary: {
    total_issues: number;
    open_issues: number;
    in_progress_issues: number;
    closed_issues: number;
    blocked_issues: number;
    ready_issues: number;
  };
}

export interface ListOptions {
  status?: string;
  priority?: number;
  type?: string;
  search?: string;
}

export interface BeadsIssue {
  id: string;
  title: string;
  status: string;
  priority?: string;
  description?: string;
  type?: string;
  blockers?: string[];
  dependencies?: string[];
}

export interface IssueOptions {
  type?: string;
  priority?: number;
  status?: string;
  description?: string;
}

export interface UpdateOptions {
  status?: string;
  title?: string;
  description?: string;
  priority?: number;
}

export interface BeadsStatus {
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
}
