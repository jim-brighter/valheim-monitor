using BepInEx;
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

        private void Awake()
        {
            Log = Logger;
            Logger.LogInfo($"{PluginName} v{PluginVersion} loaded! Bukeperry waking up.");

            BukeperryPrefab.Init();

            Harmony.CreateAndPatchAll(typeof(BukeperryPlugin).Assembly, PluginGUID);
        }
    }
}
