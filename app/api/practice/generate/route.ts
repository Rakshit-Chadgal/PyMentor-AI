import { NextRequest, NextResponse } from 'next/server';
import { Type, type Schema } from '@google/genai';
import { z } from 'zod';
import { PYMENTOR_MODEL, getGeminiClient } from '@/lib/gemini';

const GeneratePracticeSchema = z.object({
  topic: z.string().min(1).max(100),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  practiceMode: z.enum(['hint_first', 'quiz']).default('hint_first'),
  previousTitles: z.array(z.string()).max(10).optional().default([]),
});

const PRACTICE_PROBLEM_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    prompt: { type: Type.STRING },
    starter_code: { type: Type.STRING },
    hint: { type: Type.STRING },
    sample_io: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          input: { type: Type.STRING },
          output: { type: Type.STRING },
        },
        required: ['input', 'output'],
      },
    },
    expected_concepts: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    options: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '4 multiple choice options if practiceMode is quiz; empty array if hint_first.',
    },
  },
  required: [
    'title',
    'prompt',
    'starter_code',
    'hint',
    'sample_io',
    'expected_concepts',
    'options',
  ],
};

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json();
    const body = GeneratePracticeSchema.parse(raw);

    const ai = getGeminiClient();
    const avoidClause =
      body.previousTitles.length > 0
        ? `Avoid repeating these recently attempted titles: ${body.previousTitles.join(', ')}.`
        : '';

    const modeInstructions =
      body.practiceMode === 'quiz'
        ? 'Create a conceptual or code-tracing Python multiple-choice quiz question with exactly 4 distinct options (A-D style text without needing A) prefix) and starter_code showing the snippet to analyze if helpful.'
        : 'Create a hands-on Python coding exercise with clean starter_code (a function stub or scaffold with TODO comment) and 2 concrete sample_io examples. Do NOT reveal the solution in prompt, starter_code, or hint.';

    const response = await ai.models.generateContent({
      model: PYMENTOR_MODEL,
      contents: `Generate a ${body.difficulty}-level Python practice exercise on the topic "${body.topic}".\n${modeInstructions}\n${avoidClause}`,
      config: {
        systemInstruction:
          'You are PyMentor, creating Python practice exercises. Keep problems self-contained using Python 3 standard library only, clear wording, and a helpful hint that guides thinking without giving away the answer.',
        responseMimeType: 'application/json',
        responseSchema: PRACTICE_PROBLEM_SCHEMA,
      },
    });

    const data = JSON.parse((response.text ?? '{}').trim());
    return NextResponse.json({
      id: crypto.randomUUID(),
      topic: body.topic,
      difficulty: body.difficulty,
      practiceMode: body.practiceMode,
      title: data.title || `${body.topic} Practice`,
      prompt: data.prompt || '',
      starter_code: data.starter_code || '',
      hint: data.hint || '',
      sample_io: Array.isArray(data.sample_io) ? data.sample_io : [],
      expected_concepts: Array.isArray(data.expected_concepts) ? data.expected_concepts : [],
      options:
        body.practiceMode === 'quiz' && Array.isArray(data.options)
          ? data.options
          : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to generate practice problem.';
    return NextResponse.json(
      {
        type: 'https://pymentor.ai/errors/provider-error',
        title: 'Practice Generation Error',
        status: 502,
        detail: message,
      },
      { status: 502 }
    );
  }
}
