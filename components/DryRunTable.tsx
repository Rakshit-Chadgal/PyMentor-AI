'use client';

import React from 'react';
import type { DryRunStep } from '@/lib/types';

interface DryRunTableProps {
  steps: DryRunStep[];
}

export function DryRunTable({ steps }: DryRunTableProps) {
  if (steps.length === 0) return null;

  const variableKeys: string[] = [];
  for (const step of steps) {
    for (const key of Object.keys(step.variables)) {
      if (!variableKeys.includes(key)) {
        variableKeys.push(key);
      }
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--surface)]">
      <div className="border-b border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-2">
        <span className="text-xs font-medium text-[var(--muted)]">
          Dry-Run Variable Trace · Step-by-step memory state
        </span>
      </div>

      {/* Desktop Table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full border-collapse text-left font-mono text-xs tabular-nums">
          <thead>
            <tr className="border-b border-[var(--line)] text-[var(--muted)]">
              <th className="px-4 py-2.5 font-medium">Step</th>
              {variableKeys.map((key) => (
                <th key={key} className="px-4 py-2.5 font-medium">
                  {key}
                </th>
              ))}
              <th className="px-4 py-2.5 font-medium">Output</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {steps.map((step) => (
              <tr key={step.step} className="hover:bg-[var(--surface-subtle)]/50">
                <td className="px-4 py-2 text-[var(--muted)]">{step.step}</td>
                {variableKeys.map((key) => (
                  <td key={key} className="px-4 py-2 text-[var(--ink)]">
                    {step.variables[key] ?? '—'}
                  </td>
                ))}
                <td className="px-4 py-2 text-[var(--accent)]">
                  {step.output ? step.output : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Stacked Cards */}
      <div className="divide-y divide-[var(--line)] sm:hidden">
        {steps.map((step) => (
          <div key={step.step} className="px-4 py-3 font-mono text-xs tabular-nums">
            <div className="mb-1.5 flex items-center justify-between text-[var(--muted)]">
              <span>Step {step.step}</span>
              {step.output && <span className="text-[var(--accent)]">out: {step.output}</span>}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[var(--ink)]">
              {variableKeys.map((key) => (
                <span key={key}>
                  <span className="text-[var(--muted)]">{key}=</span>
                  {step.variables[key] ?? '—'}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
