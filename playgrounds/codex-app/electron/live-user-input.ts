export interface LiveInputQuestion {
  id: string;
  header: string;
  question: string;
  isOther?: boolean;
  isSecret?: boolean;
  options?: Array<{ label: string; description: string }> | null;
}
export interface LiveInputRequest {
  threadId: string;
  turnId: string;
  itemId: string;
  isBlocking: boolean;
  questions: LiveInputQuestion[];
}
export interface LiveInputResponse {
  answers: Record<string, { answers: string[] }>;
}
type RequestId = string | number;
const key = (id: RequestId) => `${typeof id}:${id}`;

/** Owns only pending server requests. Answers are never retained after delivery. */
export class LiveUserInputGate {
  private pending = new Map<string, {
    request: LiveInputRequest;
    finish: (response: LiveInputResponse) => void;
  }>();

  request(id: RequestId, request: LiveInputRequest): Promise<LiveInputResponse> {
    this.cancel(id);
    return new Promise((finish) => {
      this.pending.set(key(id), { request, finish });
    });
  }

  respond(id: RequestId, threadId: string, input: unknown): boolean {
    const pending = this.pending.get(key(id));
    if (!pending) return false;
    if (pending.request.threadId !== threadId) throw new Error("The question belongs to another thread.");
    if (typeof input !== "object" || input === null || Array.isArray(input)) {
      throw new TypeError("Answers must be keyed by question ID.");
    }
    const raw = input as Record<string, unknown>;
    const ids = new Set(pending.request.questions.map(({ id }) => id));
    if (Object.keys(raw).some((id) => !ids.has(id))) throw new TypeError("Unknown question ID.");
    const answers: LiveInputResponse["answers"] = Object.create(null);
    for (const question of pending.request.questions) {
      const value = Object.hasOwn(raw, question.id) ? raw[question.id] : undefined;
      if (!Array.isArray(value) || value.length === 0 ||
          value.some((answer) => typeof answer !== "string" || !answer.trim())) {
        throw new TypeError("Every question needs a non-empty answer.");
      }
      if (question.options?.length && !question.isOther && !question.isSecret &&
          value.some((answer) => !question.options!.some(({ label }) => label === answer))) {
        throw new TypeError("Choose an offered answer.");
      }
      answers[question.id] = { answers: [...value] };
    }
    this.pending.delete(key(id));
    pending.finish({ answers });
    return true;
  }

  cancel(id: RequestId, threadId?: string): boolean {
    const pending = this.pending.get(key(id));
    if (!pending || (threadId !== undefined && pending.request.threadId !== threadId)) return false;
    this.pending.delete(key(id));
    pending.finish({ answers: {} });
    return true;
  }

  clear(threadId?: string) {
    for (const [id, pending] of this.pending) {
      if (threadId !== undefined && pending.request.threadId !== threadId) continue;
      this.pending.delete(id);
      pending.finish({ answers: {} });
    }
  }

  clearTurn(threadId: string, turnId: string) {
    for (const [id, pending] of this.pending) {
      if (pending.request.threadId !== threadId || pending.request.turnId !== turnId) continue;
      this.pending.delete(id);
      pending.finish({ answers: {} });
    }
  }
}
