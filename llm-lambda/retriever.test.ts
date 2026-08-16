import { describe, it, expect } from 'vitest';
import { retrieveValheimFacts } from './retriever.js';

describe('retriever', () => {
  it('retrieves expert Black Forest facts for forest queries', () => {
    const facts = retrieveValheimFacts('Tell me about the black forest and copper');
    expect(facts).toContain('EXPERT');
    expect(facts).toContain('black forest is home');
  });

  it('retrieves vague mountain facts and snow cold toes reasoning', () => {
    const facts = retrieveValheimFacts('How do I survive on the snowy mountain?');
    expect(facts).toContain('VAGUE');
    expect(facts).toContain('white cold powder freeze troll toes');
  });

  it('retrieves swamp and iron armor clanking facts', () => {
    const facts = retrieveValheimFacts('What is iron armor used for in the swamp?');
    expect(facts).toContain('MODERATE');
    expect(facts).toContain('swamp');
    expect(facts).toContain('clang clang');
  });

  it('returns empty string if no keywords match', () => {
    const facts = retrieveValheimFacts('What is quantum mechanics?');
    expect(facts).toBe('');
  });
});
