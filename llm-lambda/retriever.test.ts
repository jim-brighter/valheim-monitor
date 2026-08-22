import { describe, it, expect } from 'vitest';
import { retrieveValheimFacts } from './retriever.js';

describe('retriever', () => {
  it('retrieves expert Black Forest home facts from troll perspective', () => {
    const facts = retrieveValheimFacts('Tell me about the black forest, copper, and stump');
    expect(facts).toContain('EXPERT KNOWLEDGE');
    expect(facts).toContain('black forest is home sweet home');
    expect(facts).toContain('stump is best buddy');
    expect(facts).toContain('pine trees make best swinging logs');
  });

  it('retrieves deep respect for The Elder as forest master', () => {
    const facts = retrieveValheimFacts('What do you think of the Elder?');
    expect(facts).toContain('EXPERT KNOWLEDGE');
    expect(facts).toContain('The Elder (Black Forest Boss #2 / Forest Master)');
    expect(facts).toContain('bukeperry have huge respect for the elder');
    expect(facts).toContain('troll bow head to elder');
  });

  it('retrieves Meadows as an easy playground where creatures are like pets/snacks', () => {
    const facts = retrieveValheimFacts('Tell me about the meadows, boars, and necks');
    expect(facts).toContain('EXPERT KNOWLEDGE');
    expect(facts).toContain('Meadows (Easy Playground)');
    expect(facts).toContain('pets or crunchy snacks');
  });

  it('retrieves full 7-boss progression in troll lore terms', () => {
    const facts = retrieveValheimFacts('What is the progression and who is the final boss?');
    expect(facts).toContain('World Biome & Boss Progression (1 to 7)');
    expect(facts).toContain('seven big lands in valheim in order');
    expect(facts).toContain('1 is meadows with eikthyr');
    expect(facts).toContain('2 is black forest with the elder');
    expect(facts).toContain('5 is plains with yagluth');
    expect(facts).toContain('6 is mistlands with the queen');
    expect(facts).toContain('7 is ashlands with fader');
    expect(facts).toContain('fader is current final beast');
  });

  it('retrieves accurate Plains boss info for Yagluth with skeleton disdain', () => {
    const facts = retrieveValheimFacts('Where do I fight Yagluth?');
    expect(facts).toContain('Yagluth (Plains Boss #5');
    expect(facts).toContain('yagluth is in plains not mistlands');
    expect(facts).toContain('fifth big beast in plains');
    expect(facts).toContain('bukeperry has big disdain for skeleton king');
    expect(facts).toContain('fragile rattling pests that snap like dry twigs');
  });

  it('retrieves Skeletons and Burnt Bone Men facts as fragile pests', () => {
    const facts = retrieveValheimFacts('What do you think of skeletons and burnt bone men?');
    expect(facts).toContain('Skeletons & Burnt Bone Men (Fragile Rattling Pests)');
    expect(facts).toContain('troll hate skeletons with big disdain');
    expect(facts).toContain('bones snap super easy like little twigs');
  });

  it('retrieves Ashlands rumors with swaggering attitude', () => {
    const facts = retrieveValheimFacts('Tell me about the Ashlands and lava');
    expect(facts).toContain('Ashlands (Swaggering Rumors of Fire Land)');
    expect(facts).toContain('bukeperry is big and fearless');
    expect(facts).toContain('surely cannot be that hot');
    expect(facts).toContain('burnt bone men fight all day, but bone men are just fragile clicky skeletons');
  });

  it('retrieves Fader rumors as final boss dragon to smash', () => {
    const facts = retrieveValheimFacts('Who is Fader the emerald dragon?');
    expect(facts).toContain('Fader (Ashlands Boss #7 / Final Boss)');
    expect(facts).toContain('giant emerald green dragon with fire swords stuck in back');
    expect(facts).toContain('fader is just an angry fire lizard for troll to smash');
  });

  it('retrieves vague mountain facts explaining bare feet freezing refusal', () => {
    const facts = retrieveValheimFacts('Why are there no trolls on the snowy mountain?');
    expect(facts).toContain('VAGUE KNOWLEDGE');
    expect(facts).toContain('snow freezes bare troll toes instantly');
    expect(facts).toContain('strictly refuse to go up');
  });

  it('retrieves swamp facts as a soggy gross nuisance', () => {
    const facts = retrieveValheimFacts('What is in the swamp?');
    expect(facts).toContain('MODERATE KNOWLEDGE');
    expect(facts).toContain('Swamps (Smelly Soggy Nuisance)');
    expect(facts).toContain('mud gets between troll toes');
  });

  it('retrieves Haldor merchant info with protective bubble and lox Halstein', () => {
    const facts = retrieveValheimFacts('How do I find Haldor the merchant?');
    expect(facts).toContain('Haldor the Merchant & Halstein');
    expect(facts).toContain('magic glowing blue bubble shield');
    expect(facts).toContain('halstein');
  });

  it('retrieves troll perspective on vikings and their huts', () => {
    const facts = retrieveValheimFacts('What do you think of vikings and their base?');
    expect(facts).toContain('Vikings, Weapons & Huts');
    expect(facts).toContain('tiny, loud, annoying creatures');
    expect(facts).toContain('smash viking huts with log');
  });

  it('retrieves Mistlands rumors with unafraid troll swagger', () => {
    const facts = retrieveValheimFacts('Tell me about mistlands and seeker bugs');
    expect(facts).toContain('Mistlands (Amused Rumors of Bug Fog)');
    expect(facts).toContain('purple fog land');
    expect(facts).toContain('bugs still crunch good under log');
  });

  it('retrieves The Queen rumors with unafraid troll swagger', () => {
    const facts = retrieveValheimFacts('Who is the Queen in mistlands?');
    expect(facts).toContain('The Queen (Mistlands Boss #6)');
    expect(facts).toContain('giant screeching overgrown bug');
    expect(facts).toContain('hides in box so troll log not crack bug shell');
  });

  it('returns empty string if no keywords match', () => {
    const facts = retrieveValheimFacts('What is quantum mechanics?');
    expect(facts).toBe('');
  });
});
