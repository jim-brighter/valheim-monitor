import knowledgeData from './data/valheim_knowledge.json' with { type: 'json' };

export interface KnowledgeEntry {
  id: string;
  tier: 'expert' | 'moderate' | 'vague' | 'rumors';
  topic: string;
  keywords: string[];
  troll_mental_model: string;
}

const knowledgeMap: Record<string, KnowledgeEntry> = knowledgeData as Record<string, KnowledgeEntry>;

export function retrieveValheimFacts(prompt: string, maxResults: number = 3): string {
  if (!prompt || typeof prompt !== 'string') {
    return '';
  }

  const cleanPrompt = prompt.toLowerCase();

  const scoredEntries: { entry: KnowledgeEntry; score: number }[] = [];

  for (const entry of Object.values(knowledgeMap)) {
    let score = 0;
    for (const keyword of entry.keywords) {
      const kw = keyword.toLowerCase();
      if (cleanPrompt.includes(kw)) {
        // Higher weight for exact word matches vs partial substrings
        const wordRegex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (wordRegex.test(cleanPrompt)) {
          score += 3;
        } else {
          score += 1;
        }
      }
    }

    if (score > 0) {
      scoredEntries.push({ entry, score });
    }
  }

  if (scoredEntries.length === 0) {
    return '';
  }

  // Sort descending by score
  scoredEntries.sort((a, b) => b.score - a.score);

  const topEntries = scoredEntries.slice(0, maxResults).map(e => e.entry);

  const lines = topEntries.map(e => {
    return `- [Troll Knowledge Level: ${e.tier.toUpperCase()}] ${e.topic}: ${e.troll_mental_model}`;
  });

  return `BUKEPERRY'S MEMORIES & KNOWLEDGE:\n${lines.join('\n')}`;
}
