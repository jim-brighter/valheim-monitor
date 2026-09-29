using UnityEngine;

namespace BukeperryMod
{
  public static class BukeperrySpawner
  {
    public const string GlobalKeyName = "BukeperrySpawned";

    public static void CheckAndSpawn()
    {
      // Only host should spawn entities
      if (ZNet.instance == null || !ZNet.instance.IsServer())
      {
        return;
      }

      if (ZoneSystem.instance == null)
      {
        return;
      }

      // Check if Bukeperry already spawned
      if (ZoneSystem.instance.GetGlobalKey(GlobalKeyName))
      {
        BukeperryPlugin.Log.LogInfo("Bukeperry already spawned in this world. Skipping spawner.");
        return;
      }

      if (WorldGenerator.instance == null)
      {
        return;
      }

      // Find the closest Black Forest location to (0, 0, 0)
      Vector3? spawnPos = FindNearestBlackForest();
      if (!spawnPos.HasValue)
      {
        BukeperryPlugin.Log.LogError("Could not find a valid Black Forest location near spawn for Bukeperry.");
        return;
      }

      // Spawn Bukeperry
      GameObject prefab = Jotunn.Managers.PrefabManager.Instance.GetPrefab(BukeperryPrefab.PrefabName);
      if (prefab == null)
      {
        BukeperryPlugin.Log.LogError($"Prefab '{BukeperryPrefab.PrefabName}' not found in PrefabManager.");
        return;
      }

      Vector3 pos = spawnPos.Value;
      GameObject bukeperry = Object.Instantiate(prefab, pos, Quaternion.identity);

      ZoneSystem.instance.SetGlobalKey(GlobalKeyName);

      float distance = Vector3.Distance(Vector3.zero, pos);
      BukeperryPlugin.Log.LogInfo($"Bukeperry spawned in Black Forest at {pos} ({distance:F0}m from world spawn).");
      BukeperryPlugin.Log.LogInfo($"Teleport command for testing: goto {pos.x:F0} {pos.z:F0}");
    }

    private static Vector3? FindNearestBlackForest()
    {
      if (WorldGenerator.instance == null) return null;

      float waterLevel = ZoneSystem.instance != null ? ZoneSystem.instance.m_waterLevel : 30f;

      for (float r = 100f; r <= 5000f; r += 50f)
      {
        for (float angle = 0f; angle < 360f; angle += 10f)
        {
          float rad = angle * Mathf.Deg2Rad;
          float x = r * Mathf.Cos(rad);
          float z = r * Mathf.Sin(rad);
          Vector3 testPoint = new(x, 0f, z);

          Heightmap.Biome biome = WorldGenerator.instance.GetBiome(testPoint);
          if (biome == Heightmap.Biome.BlackForest)
          {
            float height = WorldGenerator.instance.GetHeight(x, z);

            if (height > waterLevel + 5f)
            {
              return new Vector3(x, height, z);
            }
          }
        }
      }

      return null;
    }
  }
}
