import type { ResolvedMode, TutorPayload, UserLevel } from './types';

export interface SSECallbacks {
  onMeta?: (data: { mode: ResolvedMode; level: UserLevel; messageId: string }) => void;
  onDelta?: (data: { text: string; accumulated: string }) => void;
  onCompleted?: (data: { payload: TutorPayload }) => void;
  onError?: (data: { detail: string; status?: number }) => void;
}

export async function consumeChatSSE(
  response: Response,
  callbacks: SSECallbacks,
  signal?: AbortSignal
): Promise<void> {
  if (!response.body) {
    throw new Error('Response stream is empty.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let accumulated = '';

  while (true) {
    if (signal?.aborted) {
      await reader.cancel();
      break;
    }

    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split('\n\n');
    buffer = frames.pop() ?? '';

    for (const frame of frames) {
      const lines = frame.split('\n');
      let eventType = 'message';
      const dataLines: string[] = [];

      for (const line of lines) {
        if (line.startsWith('event:')) {
          eventType = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          dataLines.push(line.slice(5).trim());
        }
      }

      if (dataLines.length === 0) continue;
      const rawData = dataLines.join('\n');

      try {
        const parsed = JSON.parse(rawData);
        if (eventType === 'meta') {
          callbacks.onMeta?.(parsed);
        } else if (eventType === 'delta') {
          accumulated += parsed.text ?? '';
          callbacks.onDelta?.({ text: parsed.text ?? '', accumulated });
        } else if (eventType === 'completed') {
          callbacks.onCompleted?.(parsed);
        } else if (eventType === 'error') {
          callbacks.onError?.(parsed);
        }
      } catch {
        // Ignore malformed partial frame
      }
    }
  }
}

function unescapeJsonString(raw: string): string {
  return raw
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}

function extractPartialField(jsonText: string, field: string): string | null {
  const regex = new RegExp(`"${field}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)`);
  const match = jsonText.match(regex);
  if (!match) return null;
  return unescapeJsonString(match[1]);
}

export interface StreamingPreview {
  title: string | null;
  summary: string | null;
  approach: string | null;
  code: string | null;
}

export function extractStreamingPreview(accumulatedJson: string): StreamingPreview {
  return {
    title: extractPartialField(accumulatedJson, 'title'),
    summary: extractPartialField(accumulatedJson, 'summary'),
    approach: extractPartialField(accumulatedJson, 'approach'),
    code: extractPartialField(accumulatedJson, 'code'),
  };
}
