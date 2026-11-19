import { api } from "./api";

export async function invokeProjectGraph(projectId, userPrompt) {
  return api(`/projects/${projectId}/graph/invoke`, {
    method: "POST",
    body: JSON.stringify({ user_prompt: userPrompt }),
  });
}

export async function submitClarifyAnswers(projectId, answers) {
  return api(`/projects/${projectId}/graph/clarify/answer`, {
    method: "POST",
    body: JSON.stringify({ answers }),
  });
}

export async function resumeProjectGraph(projectId, confirmed = true) {
  const threadId = `proj_${projectId}`;
  return api(`/projects/${projectId}/graph/resume`, {
    method: "POST",
    body: JSON.stringify({ thread_id: threadId, confirmed }),
  });
}
