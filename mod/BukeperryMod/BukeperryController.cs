using System.Collections.Generic;
using HarmonyLib;
using UnityEngine;

namespace BukeperryMod
{
  public class BukeperryController : MonoBehaviour
  {
    public static readonly List<BukeperryController> Instances = [];

    public Humanoid Humanoid { get; private set; }
    public MonsterAI MonsterAI { get; private set; }

    private readonly HashSet<long> m_hostilePlayerIDs = [];

    private void Awake()
    {
      if (Instances.Count > 0 && ZNet.instance != null && ZNet.instance.IsServer())
      {
        BukeperryPlugin.Log.LogWarning("Duplicate Bukeperry detected! Destroying extra instance.");
        if (TryGetComponent<ZNetView>(out var nview) && nview.GetZDO() != null)
        {
          nview.ClaimOwnership();
          nview.Destroy();
        }
        else
        {
          Destroy(gameObject);
        }
        return;
      }

      Instances.Add(this);
      Humanoid = GetComponent<Humanoid>();
      MonsterAI = GetComponent<MonsterAI>();

      // Self-heal: If loaded from a glitched save where Y position was falling, snap to terrain
      if (ZoneSystem.instance != null && ZoneSystem.instance.FindFloor(transform.position, out float floorY))
      {
        if (transform.position.y < floorY - 1f || transform.position.y > floorY + 50f)
        {
          transform.position = new Vector3(transform.position.x, floorY, transform.position.z);
        }
      }
    }

    private void OnDestroy()
    {
      Instances.Remove(this);
    }

    private void Update()
    {
      if (m_hostilePlayerIDs.Count == 0) return;

      List<long> deadPlayers = null;
      foreach (long playerID in m_hostilePlayerIDs)
      {
        Player p = Player.GetPlayer(playerID);
        if (p == null || p.IsDead())
        {
          deadPlayers ??= [];
          deadPlayers.Add(playerID);
        }
      }

      if (deadPlayers != null)
      {
        foreach (long id in deadPlayers)
        {
          m_hostilePlayerIDs.Remove(id);
          BukeperryPlugin.Log.LogInfo("Attacking viking died. Grudge resolved.");
        }

        if (m_hostilePlayerIDs.Count == 0)
        {
          if (MonsterAI != null)
          {
            Traverse.Create(MonsterAI).Field<Character>("m_targetCreature").Value = null;
            Traverse.Create(MonsterAI).Field<bool>("m_alerted").Value = false;
          }
          BukeperryPlugin.Log.LogInfo("All attackers dead. Bukeperry is chill again.");
        }
      }
    }

    public void OnAttackedBy(Player player)
    {
      if (player == null || player.IsDead()) return;

      long playerID = player.GetPlayerID();
      if (m_hostilePlayerIDs.Add(playerID))
      {
        BukeperryPlugin.Log.LogInfo($"Bukeperry attacked by {player.GetPlayerName()}! Entering rage mode.");
      }

      if (MonsterAI != null)
      {
        Traverse.Create(MonsterAI).Method("SetTarget", player).GetValue();
        MonsterAI.Alert();
      }
    }

    public bool IsHostileTo(Player player)
    {
      if (player == null) return false;
      return m_hostilePlayerIDs.Contains(player.GetPlayerID());
    }

    public void Speak(string text)
    {
      if (string.IsNullOrWhiteSpace(text)) return;

      ZDOID zdoid = ZDOID.None;
      if (TryGetComponent<ZNetView>(out var nview) && nview.GetZDO() != null)
      {
        zdoid = nview.GetZDO().m_uid;
      }

      if (ZRoutedRpc.instance != null)
      {
        ZRoutedRpc.instance.InvokeRoutedRPC(ZRoutedRpc.Everybody, "BukeperrySpeechRPC", zdoid, text);
      }
      else if (Chat.instance != null)
      {
        Chat.instance.SetNpcText(gameObject, Vector3.up * 2.5f, 25f, 7f, "", text, large: false);
      }
    }

    public static void OnBukeperrySpeechRPC(long sender, ZDOID zdoid, string text)
    {
      GameObject bukeperryGo = null;
      if (ZNetScene.instance != null && zdoid != ZDOID.None)
      {
        bukeperryGo = ZNetScene.instance.FindInstance(zdoid);
      }

      if (bukeperryGo == null && Instances.Count > 0)
      {
        bukeperryGo = Instances[0].gameObject;
      }

      if (bukeperryGo != null && Chat.instance != null)
      {
        Chat.instance.SetNpcText(bukeperryGo, Vector3.up * 2.5f, 25f, 7f, "", text, large: false);
        Chat.instance.AddString($"<color=#5599ff>Bukeperry</color>: {text}");
      }
    }
  }
}
