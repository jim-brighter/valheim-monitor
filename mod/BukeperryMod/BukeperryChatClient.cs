using System;
using System.Collections.Concurrent;
using System.Net.Http;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace BukeperryMod
{
  public static class BukeperryChatClient
  {
    public static readonly ConcurrentQueue<Action> MainThreadQueue = new();

    private static readonly HttpClient s_httpClient = new()
    {
      Timeout = TimeSpan.FromSeconds(15)
    };

    private static bool s_isPending = false;

    public static void SendPrompt(string prompt, Action<string> onReply)
    {
      string endpoint = BukeperryPlugin.ApiEndpointConfig?.Value;
      string apiKey = BukeperryPlugin.ApiKeyConfig?.Value;
      string channelId = BukeperryPlugin.ChannelIdConfig?.Value;

      if (string.IsNullOrWhiteSpace(endpoint) || string.IsNullOrWhiteSpace(apiKey))
      {
        BukeperryPlugin.Log.LogWarning("Bukeperry chat ApiEndpoint or ApiKey is not configured in config file.");
        return;
      }

      if (s_isPending)
      {
        BukeperryPlugin.Log.LogInfo("Bukeperry is still thinking about the last message. Ignoring new prompt.");
        return;
      }

      s_isPending = true;

      Task.Run(async () =>
      {
        try
        {
          string escapedPrompt = EscapeJson(prompt);
          string jsonBody;

          if (!string.IsNullOrWhiteSpace(channelId))
          {
            string escapedChannel = EscapeJson(channelId);
            jsonBody = $"{{\"prompt\":\"{escapedPrompt}\",\"channelId\":\"{escapedChannel}\"}}";
          }
          else
          {
            jsonBody = $"{{\"prompt\":\"{escapedPrompt}\"}}";
          }

          using var request = new HttpRequestMessage(HttpMethod.Post, endpoint);
          request.Headers.Add("x-api-key", apiKey);
          request.Content = new StringContent(jsonBody, Encoding.UTF8, "application/json");

          var response = await s_httpClient.SendAsync(request);
          string responseBody = await response.Content.ReadAsStringAsync();

          if (!response.IsSuccessStatusCode)
          {
            BukeperryPlugin.Log.LogError($"Chat API failed with HTTP {(int)response.StatusCode}: {responseBody}");
            return;
          }

          string reply = ExtractReply(responseBody);
          if (!string.IsNullOrWhiteSpace(reply))
          {
            MainThreadQueue.Enqueue(() => onReply(reply));
          }
        }
        catch (Exception ex)
        {
          BukeperryPlugin.Log.LogError($"Error calling Bukeperry chat API: {ex.Message}");
        }
        finally
        {
          s_isPending = false;
        }
      });
    }

    private static string EscapeJson(string s)
    {
      if (string.IsNullOrEmpty(s)) return "";
      return s.Replace("\\", "\\\\")
              .Replace("\"", "\\\"")
              .Replace("\n", "\\n")
              .Replace("\r", "\\r")
              .Replace("\t", "\\t");
    }

    private static string ExtractReply(string json)
    {
      if (string.IsNullOrEmpty(json)) return null;
      var match = Regex.Match(json, "\"reply\"\\s*:\\s*\"((?:\\\\.|[^\"\\\\])*)\"");
      if (match.Success)
      {
        return Regex.Unescape(match.Groups[1].Value);
      }
      return null;
    }
  }
}
