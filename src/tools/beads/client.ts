import { exec } from "node:child_process";

const promisifiedExec = (command: string): Promise<{ stdout: string; stderr: string }> =>
  new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve({ stdout, stderr });
    });
  });

function parseBdJson<T>(output: string): T | null {
  try {
    return JSON.parse(output) as T;
  } catch {
    return null;
  }
}



export async function getReadyIssues(): Promise<BeadsIssue[]> {
  const { stdout } = await promisifiedExec("bd ready --json");
  const result = parseBdJson<BeadsIssue[]>(stdout);
  return result ?? [];
}

export async function listIssues(args: string = ""): Promise<BeadsIssue[]> {
  const { stdout } = await promisifiedExec(`bd list --json ${args}`);
  const result = parseBdJson<BeadsIssue[]>(stdout);
  return result ?? [];
}

export async function showIssue(id: string): Promise<BeadsIssue | null> {
  const { stdout } = await promisifiedExec(`bd show ${id} --json`);
  const result = parseBdJson<BeadsIssue[]>(stdout);
  return result?.[0] ?? null;
}

export async function createIssue(title: string, options: IssueOptions): Promise<BeadsIssue | null> {
  let cmd = `bd create "${title}" --json`;
  if (options.type) cmd += ` -t ${options.type}`;
  if (options.priority !== undefined) cmd += ` -p ${options.priority}`;
  if (options.status) cmd += ` --status ${options.status}`;
  if (options.description) cmd += ` --description "${options.description}"`;

  const { stdout } = await promisifiedExec(cmd);
  // bd create --json returns single object, not array
  const result = parseBdJson<BeadsIssue>(stdout);
  return result ?? null;
}

export async function updateIssue(id: string, options: UpdateOptions): Promise<BeadsIssue | null> {
  let cmd = `bd update ${id} --json`;
  if (options.status) cmd += ` --status ${options.status}`;
  if (options.title) cmd += ` --title "${options.title}"`;
  if (options.description) cmd += ` --description "${options.description}"`;
  if (options.priority !== undefined) cmd += ` -p ${options.priority}`;

  const { stdout } = await promisifiedExec(cmd);
  // bd update --json returns array
  const result = parseBdJson<BeadsIssue[]>(stdout);
  return result?.[0] ?? null;
}

export async function closeIssue(id: string, reason: string): Promise<boolean> {
  try {
    await promisifiedExec(`bd close ${id} --reason "${reason}"`);
    return true;
  } catch {
    return false;
  }
}

export async function addDependency(from: string, to: string): Promise<boolean> {
  try {
    await promisifiedExec(`bd dep add ${from} ${to}`);
    return true;
  } catch {
    return false;
  }
}

export async function removeDependency(from: string, to: string): Promise<boolean> {
  try {
    await promisifiedExec(`bd dep remove ${from} ${to}`);
    return true;
  } catch {
    return false;
  }
}

export async function syncBeads(): Promise<string> {
  const { stdout } = await promisifiedExec("bd sync");
  return stdout;
}

export async function getBeadsStatus(): Promise<BeadsStatus | null> {
  const { stdout } = await promisifiedExec("bd status --json");
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
