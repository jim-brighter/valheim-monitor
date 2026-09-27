using System.Collections.Generic;
using HarmonyLib;
using UnityEngine;

namespace BukeperryMod
{
  public class BukeperryController : MonoBehaviour
  {
    public Humanoid Humanoid { get; private set; }
    public MonsterAI MonsterAI { get; private set; }

    private readonly HashSet<long> m_hostilePlayerIDs = [];

    private void Awake()
    {
      Humanoid = GetComponent<Humanoid>();
      MonsterAI = GetComponent<MonsterAI>();
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
          Traverse.Create(MonsterAI).Field<Character>("m_targetCreature").Value = null;
          Traverse.Create(MonsterAI).Field<bool>("m_alerted").Value = false;
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
        BukeperryPlugin.Log.LogInfo($"Bukeperry attached by {player.GetPlayerName()}! Entering rage mode.");
      }

      Traverse.Create(MonsterAI).Method("SetTarget", player).GetValue();
      MonsterAI.Alert();
    }

    public bool IsHostileTo(Player player)
    {
      if (player == null) return false;
      return m_hostilePlayerIDs.Contains(player.GetPlayerID());
    }
  }
}
