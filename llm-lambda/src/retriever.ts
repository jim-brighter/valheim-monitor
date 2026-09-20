import knowledgeData from './data/valheim_knowledge.json' with { type: 'json' };

export interface KnowledgeEntry {
  id: string;
  tier: 'expert' | 'moderate' | 'vague' | 'rumors';
  topic: string;
  keywords: string[];
  troll_mental_model: string;
}

const knowledgeMap: Record<string, KnowledgeEntry> = knowledgeData as Record<string, KnowledgeEntry>;

const tierDescriptions: Record<KnowledgeEntry['tier'], string> = {
  expert: 'EXPERT KNOWLEDGE - You know this intimately as a master of the woods and meadows',
  moderate: 'MODERATE KNOWLEDGE - You know this well',
  vague: 'VAGUE KNOWLEDGE - You know this from mountain border, but refuse to go up due to bare feet freezing',
  rumors: 'RUMORS - Far away gossip; know facts accurately but speak with amused troll swagger'
};

export function retrieveValheimFacts(prompt: string, maxResults: number = 4): string {
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
        // Multi-word phrase exact match gets higher weight
        const isMultiWord = kw.includes(' ');
        const wordRegex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (wordRegex.test(cleanPrompt)) {
          score += isMultiWord ? 6 : 3;
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
    const tierDesc = tierDescriptions[e.tier] || e.tier.toUpperCase();
    return `- [${tierDesc}] ${e.topic}: ${e.troll_mental_model}`;
  });

  return `BUKEPERRY'S MEMORIES & KNOWLEDGE:\n${lines.join('\n')}`;
}
