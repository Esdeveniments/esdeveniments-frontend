export type FaqItem = { q: string; a: string };

export type ListPageFaqLabels = {
  q1: string;
  a1: string;
  q2: string;
  a2: string;
  q3: string;
  a3: string;
};

export type DateContextLabels = {
  inline: Record<string, string>;
  capitalized: Record<string, string>;
  fallbackInline: string;
  fallbackCapitalized: string;
};
