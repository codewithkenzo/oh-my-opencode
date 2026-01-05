export type OutputFormat = "markdown" | "json" | "compact";

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

export interface ListOptions {
  status?: string;
  priority?: number;
  type?: string;
  search?: string;
}
