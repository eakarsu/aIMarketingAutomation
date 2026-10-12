import type { ReactElement } from 'react';

export default function AIReport(props: {
  response: unknown;
  title?: string;
  model?: string;
  tokens?: number;
  loading?: boolean;
  error?: string;
}): ReactElement | null;
