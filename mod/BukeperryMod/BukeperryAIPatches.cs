using HarmonyLib;

namespace BukeperryMod
{
  [HarmonyPatch]
  public static class BukeperryAIPatches
  {
    // Intercept faction targeting
    [HarmonyPatch(typeof(BaseAI), nameof(BaseAI.IsEnemy), typeof(Character), typeof(Character))]
    [HarmonyPrefix]
    public static bool IsEnemyPrefix(Character a, Character b, ref bool __result)
    {
      // If Bukeperry checks if a Player is an enemy
      BukeperryController controllerA = a ? a.GetComponent<BukeperryController>() : null;
      if (controllerA != null && b is Player playerB)
      {
        __result = controllerA.IsHostileTo(playerB);
        return false; // Skip vanilla targeting
      }

      // If a Player checks if Bukeperry is an enemy
      BukeperryController controllerB = b ? b.GetComponent<BukeperryController>() : null;
      if (controllerB != null && a is Player)
      {
        __result = true; // Players can always hit Bukeperry
        return false; // Skip vanilla targeting
      }

      // Normal troll hostility to everything else
      return true;
    }

    // Intercept damage to trigger retaliation
    [HarmonyPatch(typeof(Character), nameof(Character.Damage))]
    [HarmonyPrefix]
    public static void OnDamagePrefix(Character __instance, HitData hit)
    {
      BukeperryController controller = __instance.GetComponent<BukeperryController>();
      if (controller == null) return;

      Character attacker = hit.GetAttacker();
      if (attacker is Player player)
      {
        controller.OnAttackedBy(player);
      }
    }
  }
}
