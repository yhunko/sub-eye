import { Client, type WorkflowContext } from "@upstash/workflow";
import { serve } from "@upstash/workflow/hono";

export type { WorkflowContext };
/**
 * QStash / Upstash Workflow adapter.
 *
 * `serve` and `WorkflowContext` are re-exported unchanged so the workflow
 * replay semantics (step sequence indexing, deterministic resume) are
 * identical to importing them directly from `@upstash/workflow`. Only the
 * client construction and the trigger/cancel calls — previously duplicated in
 * every subscription workflow — are centralized here.
 */
export { serve };

/**
 * Construct a workflow client from the runtime environment.
 *
 * Reads `process.env` at call time (request scope), never at module load, so it
 * is safe under the Cloudflare Worker runtime.
 */
function createWorkflowClient(): Client {
  const token = process.env.QSTASH_TOKEN ?? process.env.UPSTASH_WORKFLOW_TOKEN;

  if (!token) {
    throw new Error("QSTASH_TOKEN is not set");
  }

  return new Client({ token });
}

/**
 * Resolve an absolute workflow endpoint URL from the runtime `BASE_URL`.
 *
 * Reads `process.env.BASE_URL` at call time (request scope), never at module
 * load, so it is safe under the Cloudflare Worker runtime. Pass the route path
 * (e.g. `/api/subscriptions/notifications/workflow`); the per-workflow suffix
 * stays local to each workflow.
 */
export function resolveWorkflowUrl(path: string): string {
  const baseUrl = process.env.BASE_URL;

  if (!baseUrl) {
    throw new Error("Base URL is not set");
  }

  return `${baseUrl}${path}`;
}

/** Trigger a workflow run at the given URL with a JSON body. */
export async function triggerWorkflow<TBody>(options: {
  url: string;
  body: TBody;
}): Promise<{ workflowRunId: string }> {
  const client = createWorkflowClient();
  const result = await client.trigger({
    url: options.url,
    body: options.body,
  });

  return { workflowRunId: result.workflowRunId };
}

/** Cancel a previously scheduled workflow run by its run id. */
export async function cancelWorkflow(workflowRunId: string): Promise<void> {
  const client = createWorkflowClient();
  await client.cancel({ ids: workflowRunId });
}
