using UnityEngine;

namespace BukeperryMod
{
  public static class BukeperrySpawner
  {
    public const string GlobalKeyName = "BukeperrySpawned";
    private static bool s_isSpawning = false;
    private static bool s_locationLogged = false;
    private static Vector3? s_cachedSpawnPos = null;

    public static Vector3? GetSpawnPosition()
    {
      if (!s_cachedSpawnPos.HasValue)
      {
        s_cachedSpawnPos = FindNearestBlackForest();
      }
      return s_cachedSpawnPos;
    }

    public static void LogMarkedLocation()
    {
      if (s_locationLogged) return;
      if (ZNet.instance == null || !ZNet.instance.IsServer()) return;

      Vector3? spawnPos = GetSpawnPosition();
      if (!spawnPos.HasValue)
      {
        BukeperryPlugin.Log.LogError("Could not find a valid Black Forest location for Bukeperry.");
        return;
      }

      s_locationLogged = true;
      Vector3 pos = spawnPos.Value;
      float distance = Vector3.Distance(Vector3.zero, pos);
      BukeperryPlugin.Log.LogInfo($"Bukeperry territory marked in Black Forest at ({pos.x:F1}, {pos.y:F1}, {pos.z:F1}) ({distance:F0}m from world spawn).");
      BukeperryPlugin.Log.LogInfo("He will spawn natively when a player approaches within 80m.");
      BukeperryPlugin.Log.LogInfo($"Teleport command for testing: goto {pos.x:F0} {pos.z:F0}");
    }

    public static void CheckAndSpawn()
    {
      // Only server/host handles spawning
      if (ZNet.instance == null || !ZNet.instance.IsServer()) return;
      if (ZoneSystem.instance == null || WorldGenerator.instance == null) return;
      if (s_isSpawning) return;

      // Check if Bukeperry has already been spawned in this world
      if (ZoneSystem.instance.GetGlobalKey(GlobalKeyName)) return;

      if (BukeperryController.Instances.Count > 0)
      {
        ZoneSystem.instance.SetGlobalKey(GlobalKeyName);
        return;
      }

      Vector3? spawnPos = GetSpawnPosition();
      if (!spawnPos.HasValue) return;

      Vector3 targetPos = spawnPos.Value;

      // Lazy proximity check: only spawn when the chunk is loaded AND a player is nearby
      if (!ZoneSystem.instance.IsZoneLoaded(targetPos)) return;

      Player closestPlayer = Player.GetClosestPlayer(targetPos, 80f);
      if (closestPlayer == null) return;

      s_isSpawning = true;
      try
      {
        GameObject prefab = Jotunn.Managers.PrefabManager.Instance.GetPrefab(BukeperryPrefab.PrefabName);
        if (prefab == null)
        {
          BukeperryPlugin.Log.LogError($"Prefab '{BukeperryPrefab.PrefabName}' not found in PrefabManager.");
          return;
        }

        // Raycast down to the loaded terrain mesh for the exact surface height
        float groundY = targetPos.y;
        if (ZoneSystem.instance.FindFloor(targetPos, out float floorY))
        {
          groundY = floorY;
        }

        Vector3 finalPos = new Vector3(targetPos.x, groundY, targetPos.z);

        // Mark global key FIRST to prevent any re-entrant spawns
        ZoneSystem.instance.SetGlobalKey(GlobalKeyName);

        GameObject bukeperry = Object.Instantiate(prefab, finalPos, Quaternion.identity);

        // Set tether / patrol point to keep him in his grove
        BaseAI ai = bukeperry.GetComponent<BaseAI>();
        if (ai != null)
        {
          ai.SetPatrolPoint();
        }

        float distance = Vector3.Distance(Vector3.zero, finalPos);
        BukeperryPlugin.Log.LogInfo($"Player {closestPlayer.GetPlayerName()} approached Black Forest grove! Bukeperry spawned natively at {finalPos} ({distance:F0}m from world spawn).");
      }
      finally
      {
        s_isSpawning = false;
      }
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
