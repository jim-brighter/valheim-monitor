import { describe, it, expect } from 'vitest';
import { retrieveValheimFacts } from './retriever.js';

describe('retriever', () => {
  it('retrieves expert Black Forest facts for forest queries', () => {
    const facts = retrieveValheimFacts('Tell me about the black forest and copper');
    expect(facts).toContain('EXPERT');
    expect(facts).toContain('Black Forest is Bukeperry\'s home');
  });

  it('retrieves vague mountain facts and snow cold toes reasoning', () => {
    const facts = retrieveValheimFacts('How do I survive on the snowy mountain?');
    expect(facts).toContain('VAGUE');
    expect(facts).toContain('Cold white powder (snow) makes troll toes freeze');
  });

  it('retrieves swamp and iron armor clanking facts', () => {
    const facts = retrieveValheimFacts('What is iron armor used for in the swamp?');
    expect(facts).toContain('MODERATE');
    expect(facts).toContain('Swamp');
    expect(facts).toContain('CLANG CLANG CLANG');
  });

  it('returns empty string if no keywords match', () => {
    const facts = retrieveValheimFacts('What is quantum mechanics?');
    expect(facts).toBe('');
  });
});
