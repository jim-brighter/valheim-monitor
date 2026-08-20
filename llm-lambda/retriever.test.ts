import { describe, it, expect } from 'vitest';
import { retrieveValheimFacts } from './retriever.js';

describe('retriever', () => {
  it('retrieves expert Black Forest facts for forest and copper mining queries', () => {
    const facts = retrieveValheimFacts('Tell me about the black forest, copper, and tin');
    expect(facts).toContain('EXPERT KNOWLEDGE');
    expect(facts).toContain('black forest is home');
    expect(facts).toContain('copper is big dome rock');
    expect(facts).toContain('tin is shiny rock on water edge');
  });

  it('retrieves Meadows as an easy playground where creatures are like pets/snacks', () => {
    const facts = retrieveValheimFacts('Tell me about the meadows, boars, and necks');
    expect(facts).toContain('EXPERT KNOWLEDGE');
    expect(facts).toContain('Meadows (Easy Playground)');
    expect(facts).toContain('pets or crunchy snacks');
  });

  it('retrieves full 7-boss progression when asked about boss order or final boss', () => {
    const facts = retrieveValheimFacts('What is the progression and who is the final boss?');
    expect(facts).toContain('World Biome & Boss Progression (1 to 7)');
    expect(facts).toContain('seven lands in valheim in exact order');
    expect(facts).toContain('1 is meadows with eikthyr');
    expect(facts).toContain('5 is plains with yagluth');
    expect(facts).toContain('6 is mistlands with the queen');
    expect(facts).toContain('7 is ashlands with fader');
    expect(facts).toContain('fader is current final boss');
  });

  it('retrieves accurate Plains boss info for Yagluth without mistlands confusion', () => {
    const facts = retrieveValheimFacts('Where do I fight Yagluth?');
    expect(facts).toContain('Yagluth (Plains Boss #5)');
    expect(facts).toContain('yagluth is in plains not mistlands');
    expect(facts).toContain('fifth boss in plains');
  });

  it('retrieves vague mountain facts explaining bare feet freezing refusal', () => {
    const facts = retrieveValheimFacts('Why are there no trolls on the snowy mountain?');
    expect(facts).toContain('VAGUE KNOWLEDGE');
    expect(facts).toContain('freezes bare troll toes');
    expect(facts).toContain('bukeperry strictly refuses to climb up');
  });

  it('retrieves swamp facts as a soggy nuisance', () => {
    const facts = retrieveValheimFacts('What is in the swamp?');
    expect(facts).toContain('MODERATE KNOWLEDGE');
    expect(facts).toContain('Swamps (Smelly Soggy Nuisance)');
    expect(facts).toContain('mud gets between troll toes');
  });

  it('retrieves Haldor merchant info with protective bubble and lox Halstein', () => {
    const facts = retrieveValheimFacts('How do I find Haldor the merchant?');
    expect(facts).toContain('Merchants (Haldor & Hildir)');
    expect(facts).toContain('protective dome rune shield');
    expect(facts).toContain('halstein');
    expect(facts).toContain('megingjord');
  });

  it('returns empty string if no keywords match', () => {
    const facts = retrieveValheimFacts('What is quantum mechanics?');
    expect(facts).toBe('');
  });
});
