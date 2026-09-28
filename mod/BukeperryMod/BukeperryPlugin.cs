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
        public const string PluginVersion = "0.1.0";

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
        }
    }
}
