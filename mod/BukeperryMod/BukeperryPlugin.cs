using BepInEx;
using BepInEx.Configuration;
using BepInEx.Logging;
using HarmonyLib;
using Jotunn.Utils;

namespace BukeperryMod
{
    [BepInPlugin(PluginGUID, PluginName, PluginVersion)]
    [BepInDependency(Jotunn.Main.ModGuid)]
    [NetworkCompatibility(CompatibilityLevel.EveryoneMustHaveMod, VersionStrictness.Minor)]
    public class BukeperryPlugin : BaseUnityPlugin
    {
        public const string PluginGUID = "com.jimbrighter.bukeperrymod";
        public const string PluginName = "BukeperryMod";
        public const string PluginVersion = "0.2.0";

        internal static ManualLogSource Log;

        // Config entries
        internal static ConfigEntry<string> ApiEndpointConfig;
        internal static ConfigEntry<string> ApiKeyConfig;
        internal static ConfigEntry<string> ChannelIdConfig;
        internal static ConfigEntry<float> ProximityRadiusConfig;

        private void Awake()
        {
            Log = Logger;
            Logger.LogInfo($"{PluginName} v{PluginVersion} loaded! Bukeperry waking up.");

            // Bind config settings
            ApiEndpointConfig = Config.Bind(
                "ChatApi",
                "ApiEndpoint",
                "",
                "AWS API Gateway endpoint URL for Bukeperry chat."
            );

            ApiKeyConfig = Config.Bind(
                "ChatApi",
                "ApiKey",
                "",
                "API Key to authenticate with the Bukeperry chat endpoint."
            );

            ChannelIdConfig = Config.Bind(
                "ChatApi",
                "ChannelId",
                "",
                "Optional channel ID for persistent conversation state. Can be a Discord channel ID for continuity between game and Discord. If blank, conversation is stateless."
            );

            ProximityRadiusConfig = Config.Bind(
                "ChatApi",
                "ProximityRadius",
                20.0f,
                "Maximum distance between player and Bukeperry for chat listening."
            );

            BukeperryPrefab.Init();

            Harmony.CreateAndPatchAll(typeof(BukeperryPlugin).Assembly, PluginGUID);
        }

        private static bool _spawnCheckDone = false;
        private static float _spawnTimer = 0f;

        private void Update()
        {
            while (BukeperryChatClient.MainThreadQueue.TryDequeue(out var action))
            {
                try
                {
                    action?.Invoke();
                }
                catch (System.Exception ex)
                {
                    Log.LogError($"Error in main thread dispatcher: {ex}");
                }
            }

            // Lazy proximity spawner check: polls until a player approaches Bukeperry's grove
            if (!_spawnCheckDone && ZNet.instance != null && ZNet.instance.IsServer() && ZoneSystem.instance != null && WorldGenerator.instance != null)
            {
                _spawnTimer += UnityEngine.Time.deltaTime;
                if (_spawnTimer >= 2.0f)
                {
                    _spawnTimer = 0f;
                    if (ZoneSystem.instance.GetGlobalKey(BukeperrySpawner.GlobalKeyName))
                    {
                        _spawnCheckDone = true;
                        Log.LogInfo("Bukeperry already active in world. Proximity spawner polling complete.");
                    }
                    else
                    {
                        BukeperrySpawner.CheckAndSpawn();
                        if (ZoneSystem.instance.GetGlobalKey(BukeperrySpawner.GlobalKeyName))
                        {
                            _spawnCheckDone = true;
                        }
                    }
                }
            }
        }
    }
}
