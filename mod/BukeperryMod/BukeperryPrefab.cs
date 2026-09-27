using Jotunn.Configs;
using Jotunn.Entities;
using Jotunn.Managers;
using UnityEngine;

namespace BukeperryMod
{
  public static class BukeperryPrefab
  {
    public const string PrefabName = "Bukeperry";

    public static void Init()
    {
      PrefabManager.OnVanillaPrefabsAvailable += RegisterPrefab;
    }

    private static void RegisterPrefab()
    {
      if (PrefabManager.Instance.GetPrefab(PrefabName) != null)
      {
        return;
      }
      
      GameObject vanillaTroll = PrefabManager.Instance.GetPrefab("Troll");
      if (vanillaTroll == null)
      {
        BukeperryPlugin.Log.LogError("Failed to find vanilla 'Troll' prefab!");
        return;
      }

      GameObject bukeperry = PrefabManager.Instance.CreateClonedPrefab(PrefabName, "Troll");
      bukeperry.AddComponent<BukeperryController>();

      Humanoid humanoid = bukeperry.GetComponent<Humanoid>();
      humanoid.m_name = "Bukeperry";
      humanoid.m_health = 15000f;

      MonsterAI monsterAI = bukeperry.GetComponent<MonsterAI>();
      if (monsterAI != null)
      {
        monsterAI.m_aggravatable = true;
        monsterAI.m_avoidWater = true;
      }

      GameObject vanillaLogItem = null;
      if (humanoid.m_randomSets != null)
      {
        foreach (var set in humanoid.m_randomSets)
        {
          foreach (var item in set.m_items)
          {
            if (item != null && item.name.ToLower().Contains("log"))
            {
              vanillaLogItem = item;
              break;
            }
          }
          if (vanillaLogItem != null) break;
        }
      }

      if (vanillaLogItem != null)
      {
        GameObject bukeperryLog = PrefabManager.Instance.CreateClonedPrefab("Bukeperry_Log", vanillaLogItem.name);
        ItemDrop itemDrop = bukeperryLog.GetComponent<ItemDrop>();
        if (itemDrop != null)
        {
          itemDrop.m_itemData.m_shared.m_damages.m_blunt = 1000f;
          itemDrop.m_itemData.m_shared.m_damages.m_chop = 1000f;
        }

        ItemManager.Instance.AddItem(new CustomItem(bukeperryLog, fixReference: true));

        humanoid.m_defaultItems = [bukeperryLog];
      }
      else
      {
        BukeperryPlugin.Log.LogWarning("Could not find vanilla log weapon in Troll item sets! Using default items.");
      }

      humanoid.m_randomWeapon = [];
      humanoid.m_randomSets = [];

      CreatureConfig config = new()
      {
        Name = "Bukeperry",
        Faction = Character.Faction.ForestMonsters
      };

      CreatureManager.Instance.AddCreature(new CustomCreature(bukeperry, fixReference: true, config));

      BukeperryPlugin.Log.LogInfo("Bukeperry prefab registered successfully with 15,000 HP and 1,000 DMG.");
    }
  }
}
