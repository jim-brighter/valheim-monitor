# Bukeperry Mod
We are going to create an in-game version of the Bukeperry troll, in the form of a Valheim mod.

## Instructions for the AI Agent
For the purpose of this work, I want you to act as a guide. Do not implement anything or write any code unless explicitly asked to. Your main role will be to help me understand how to create a Valheim mod, and I will do the work.

You may maintain a .md file in this directory to function as an Epic with Stories to track my progress, in the event this work spans multiple sessions.

## Requirements for the Mod

### Base Requirements
1. The mod should be compatible with Valheim 1.0+ and should work on preexisting worlds and new worlds.
2. The mod should work on dedicated servers hosted on Linux, plus client machines on any platform

### Phase 1: Base Troll Character and Behavior
1. Bukeperry is a "friendly" troll in the Black Forest. "Friendly" here is similar in meaning to the Dvergrs in the game: he is non-hostile unless he's attacked.
  a. If he is attacked, he turns hostile only until the viking(s) that attacked him dies, then he returns to non-hostile
  b. He is exceptionally strong, dealing 1000 damage per hit; he should generally one-shot any viking regardless of their progression in the game
  c. He is not invincible, but has a health pool comparable to the strongest boss in the game
2. Bukeperry always spawns as the variation of troll with a log in his hand.
3. He should spawn in a Black Forest as close to the world spawn (the "circle") as possible, so he's always pretty easy to find.
4. He is otherwise friendly or hostile to other creatures in the game the same as any other troll would be

### Phase 2: The (useless) Merchant
1. Bukeperry is a merchant that can be interacted with. He sells 2 items: stone for very cheap, and wood for very expensive, let's say 10,000 gold per 1 piece of wood.
2. If the player does have 10,000 gold and can buy the wood, he should say he actually doesn't have any right now, come back later (in his dumb troll speak)

### Phase 3: The Conversationalist
This is a bit of a moonshot and I'm not even sure if it's possible, but assume that the machine that the Valheim dedicated server is running on has access to AWS credentials.
1. If a player types a message in the in-game chat within earshot of Bukeperry, he should operate similar to the llm-lambda project: send the prompt to Bedrock as the Bukeperry character, and have Bukeperry respond in-game
  a. allow me to configure the mod such that I can provide a Discord channel id, so that conversations with Bukeperry can seamlessly carry between a Discord channel and the game
