using HarmonyLib;
using UnityEngine;

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

    [HarmonyPatch(typeof(ZoneSystem), "Start")]
    [HarmonyPostfix]
    public static void OnZoneSystemStart(ZoneSystem __instance)
    {
      if (ZNet.instance == null || !ZNet.instance.IsServer()) return;

      BukeperrySpawner.LogMarkedLocation();
    }

    [HarmonyPatch(typeof(Trader), "Update")]
    [HarmonyPrefix]
    public static bool TraderUpdatePrefix(Trader __instance)
    {
      if (__instance.GetComponent<BukeperryController>() != null) return false;
      return true;
    }

    [HarmonyPatch(typeof(Trader), "RandomTalk")]
    [HarmonyPrefix]
    public static bool TraderRandomTalkPrefix(Trader __instance)
    {
      if (__instance.GetComponent<BukeperryController>() != null) return false;
      return true;
    }

    [HarmonyPatch(typeof(Character), nameof(Character.GetHoverText))]
    [HarmonyPrefix]
    public static bool TraderGetHoverTextPrefix(Character __instance, ref string __result)
    {
      Trader trader = __instance.GetComponent<Trader>();
      if (trader == null) return true;

      BukeperryController controller = __instance.GetComponent<BukeperryController>();
      if (controller == null) return true;

      if (Player.m_localPlayer != null && controller.IsHostileTo(Player.m_localPlayer))
      {
        __result = "";
        return false;
      }

      __result = trader.GetHoverText();
      return false;
    }

    [HarmonyPatch(typeof(Trader), nameof(Trader.Interact))]
    [HarmonyPrefix]
    public static bool TraderInteractPrefix(Trader __instance, Humanoid character, bool hold, ref bool __result)
    {
      BukeperryController controller = __instance.GetComponent<BukeperryController>();
      if (controller == null) return true; // not Bukeperry

      if (hold)
      {
        __result = false;
        return false;
      }

      if (character is Player player && controller.IsHostileTo(player))
      {
        __result = false;
        return false; // refuse to interact with grudge target
      }

      if (Chat.instance != null)
      {
        Chat.instance.SetNpcText(__instance.gameObject, Vector3.up * 2.5f, 20f, 4f, "", "bukeperry have goods. trade now.", large: false);
      }

      StoreGui.instance.Show(__instance);

      __result = true;
      return false;
    }

    [HarmonyPatch(typeof(StoreGui), "BuySelectedItem")]
    [HarmonyPrefix]
    public static bool BuySelectedItemPrefix(StoreGui __instance)
    {
      Trader trader = Traverse.Create(__instance).Field<Trader>("m_trader").Value;
      if (trader == null || trader.GetComponent<BukeperryController>() == null) return true; // not Bukeperry

      Trader.TradeItem selectedItem = Traverse.Create(__instance).Field<Trader.TradeItem>("m_selectedItem").Value;
      if (selectedItem != null && selectedItem.m_prefab != null && selectedItem.m_prefab.name == "Wood")
      {
        __instance.Hide();

        if (Chat.instance != null)
        {
          string[] refusals = [
            "bukeperry need wood. no have extra. come back later.",
            "my wood! you no touch tree! go away tiny viking!",
            "10000 gold good, but wood better. troll keep wood"
          ];

          string reply = refusals[UnityEngine.Random.Range(0, refusals.Length)];
          Chat.instance.SetNpcText(trader.gameObject, Vector3.up * 2.5f, 20f, 5f, "", reply, large: false);
        }

        return false;
      }

      return true;
    }

    [HarmonyPatch(typeof(Chat), nameof(Chat.SendText))]
    [HarmonyPrefix]
    public static void SendTextPrefix(Talker.Type type, string text)
    {
      if (string.IsNullOrWhiteSpace(text)) return;
      if (type == Talker.Type.Ping) return;

      if (Player.m_localPlayer != null)
      {
        Vector3 playerPos = Player.m_localPlayer.transform.position;
        string playerName = Player.m_localPlayer.GetPlayerName();

        BukeperryPlugin.Log.LogInfo($"[Chat Sent] {playerName} ({type}): \"{text}\"");

        if (ZNet.instance != null && !ZNet.instance.IsServer() && ZRoutedRpc.instance != null)
        {
          ZNetPeer serverPeer = ZNet.instance.GetServerPeer();
          if (serverPeer != null)
          {
            ZRoutedRpc.instance.InvokeRoutedRPC(serverPeer.m_uid, "BukeperryPlayerChatRPC", playerPos, (int)type, text, playerName);
          }
        }
        else if (ZNet.instance != null && ZNet.instance.IsServer())
        {
          ProcessChatMessage(playerPos, (int)type, playerName, text);
        }
      }
    }

    [HarmonyPatch(typeof(Talker), "RPC_Say")]
    [HarmonyPrefix]
    public static void RPC_SayPrefix(Talker __instance, long sender, int ctype, UserInfo user, string text)
    {
      if (__instance == null) return;
      if (ZNet.instance != null && ZNet.instance.IsServer())
      {
        ProcessChatMessage(__instance.transform.position, ctype, user?.Name ?? "Player", text);
      }
    }

    [HarmonyPatch(typeof(Chat), "RPC_ChatMessage")]
    [HarmonyPrefix]
    public static void RPC_ChatMessagePrefix(long sender, Vector3 position, int type, UserInfo userInfo, string text)
    {
      if (ZNet.instance != null && ZNet.instance.IsServer())
      {
        ProcessChatMessage(position, type, userInfo?.Name ?? "Player", text);
      }
    }

    public static void OnBukeperryPlayerChatRPC(long sender, Vector3 position, int type, string text, string speakerName)
    {
      BukeperryPlugin.Log.LogInfo($"[Server RPC] Received chat from {speakerName} ({position}): \"{text}\"");
      ProcessChatMessage(position, type, speakerName, text);
    }

    private static void ProcessChatMessage(Vector3 position, int type, string speakerName, string text)
    {
      // Ignore non-chat, empty text, slash commands
      if (type == (int)Talker.Type.Ping || string.IsNullOrWhiteSpace(text)) return;

      string trimmed = text.Trim();
      if (trimmed.Equals("!bukeperry", System.StringComparison.OrdinalIgnoreCase) || trimmed.Equals("!spawn_bukeperry", System.StringComparison.OrdinalIgnoreCase))
      {
        BukeperryPlugin.Log.LogInfo($"Manual Bukeperry spawn check requested via chat by {speakerName}");
        BukeperrySpawner.CheckAndSpawn();
        return;
      }

      if (text.StartsWith("/")) return;

      // Distance check: normal chat uses ProximityRadius (default 20m), shout (/s) reaches up to 70m
      float baseRadius = BukeperryPlugin.ProximityRadiusConfig?.Value ?? 20.0f;
      float maxDist = (type == (int)Talker.Type.Shout) ? Mathf.Max(baseRadius, 70.0f) : baseRadius;

      if (BukeperryController.Instances.Count == 0)
      {
        BukeperryPlugin.Log.LogWarning($"[Chat Check] No active Bukeperry instances loaded on server to hear {speakerName}.");
        return;
      }

      foreach (var bukeperry in BukeperryController.Instances)
      {
        if (bukeperry == null || bukeperry.Humanoid == null || bukeperry.Humanoid.IsDead()) continue;

        float distance = Vector3.Distance(position, bukeperry.transform.position);
        if (distance <= maxDist)
        {
          string chatTypeStr = (type == (int)Talker.Type.Shout) ? "shout" : "chat";
          BukeperryPlugin.Log.LogInfo($"Bukeperry overheard {speakerName}'s {chatTypeStr} ({distance:F1}m away, max {maxDist:F0}m): \"{text}\"");

          BukeperryChatClient.SendPrompt(text, reply =>
          {
            BukeperryPlugin.Log.LogInfo($"[Bukeperry Reply - Main Thread]: \"{reply}\"");
            bukeperry.Speak(reply);
          });

          break;
        }
        else
        {
          BukeperryPlugin.Log.LogInfo($"[Chat Check] {speakerName} spoke, but Bukeperry is too far away ({distance:F1}m > {maxDist:F1}m).");
        }
      }
    }

    [HarmonyPatch(typeof(ZNet), "Awake")]
    [HarmonyPostfix]
    public static void ZNetAwakePostfix()
    {
      if (ZRoutedRpc.instance != null)
      {
        ZRoutedRpc.instance.Register<ZDOID, string>("BukeperrySpeechRPC", BukeperryController.OnBukeperrySpeechRPC);
        ZRoutedRpc.instance.Register<Vector3, int, string, string>("BukeperryPlayerChatRPC", OnBukeperryPlayerChatRPC);
      }
    }
  }
}
