using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.IO.Pipes;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Win32;

[assembly: System.Reflection.AssemblyTitle("Neon Survivor")]
[assembly: System.Reflection.AssemblyProduct("Neon Survivor")]

class Launcher
{
    static string GetAppPath(string exeName)
    {
        try
        {
            using (var key = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\" + exeName))
            {
                if (key != null)
                {
                    var val = key.GetValue("") as string;
                    if (!string.IsNullOrEmpty(val) && File.Exists(val)) return val;
                }
            }
            using (var key = Registry.CurrentUser.OpenSubKey(@"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\" + exeName))
            {
                if (key != null)
                {
                    var val = key.GetValue("") as string;
                    if (!string.IsNullOrEmpty(val) && File.Exists(val)) return val;
                }
            }
        }
        catch { }
        return null;
    }

    static string LoadClientId(string baseDir)
    {
        try
        {
            string cfgPath = Path.Combine(baseDir, "data", "discord_config.json");
            if (File.Exists(cfgPath))
            {
                string text = File.ReadAllText(cfgPath);
                int idx = text.IndexOf("\"client_id\":");
                if (idx >= 0)
                {
                    int start = text.IndexOf('"', idx + 12);
                    if (start >= 0)
                    {
                        int end = text.IndexOf('"', start + 1);
                        if (end > start)
                        {
                            string id = text.Substring(start + 1, end - start - 1).Trim();
                            if (DiscordRpcBridge.IsValidDiscordId(id)) return id;
                        }
                    }
                }
            }
        }
        catch { }
        return "1570824779005689919";
    }

    static void SaveClientId(string baseDir, string clientId)
    {
        try
        {
            string cfgPath = Path.Combine(baseDir, "data", "discord_config.json");
            string content = "{\r\n  \"client_id\": \"" + clientId + "\"\r\n}\r\n";
            File.WriteAllText(cfgPath, content, Encoding.UTF8);
        }
        catch { }
    }

    [STAThread]
    static void Main()
    {
        string dir = AppDomain.CurrentDomain.BaseDirectory;
        string html = Path.Combine(dir, "data", "neon_survivor.html");
        if (!File.Exists(html))
        {
            MessageBox.Show("Spieldatei nicht gefunden:\n" + html, "Neon Survivor", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return;
        }
        string url = new Uri(html).AbsoluteUri;

        // Start Discord RPC Server in Background
        string clientId = LoadClientId(dir);
        var rpcBridge = new DiscordRpcBridge(clientId, 39182, dir);
        rpcBridge.Start();

        var candidates = new List<string>();

        // 1. Registry paths (Chrome, Edge, Brave)
        string regChrome = GetAppPath("chrome.exe");
        if (!string.IsNullOrEmpty(regChrome)) candidates.Add(regChrome);
        string regEdge = GetAppPath("msedge.exe");
        if (!string.IsNullOrEmpty(regEdge)) candidates.Add(regEdge);
        string regBrave = GetAppPath("brave.exe");
        if (!string.IsNullOrEmpty(regBrave)) candidates.Add(regBrave);

        // 2. Standard directories (supporting 64-bit and 32-bit WOW64)
        string pw64 = Environment.GetEnvironmentVariable("ProgramW6432");
        string pf = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
        string pf86 = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86);
        string local = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);

        string[] prefixes = { pw64, pf, pf86, local };
        foreach (var p in prefixes)
        {
            if (string.IsNullOrEmpty(p)) continue;
            candidates.Add(Path.Combine(p, @"Google\Chrome\Application\chrome.exe"));
            candidates.Add(Path.Combine(p, @"Microsoft\Edge\Application\msedge.exe"));
            candidates.Add(Path.Combine(p, @"BraveSoftware\Brave-Browser\Application\brave.exe"));
        }

        string profile = Path.Combine(local, "NeonSurvivor");

        var tried = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        bool launched = false;

        foreach (string b in candidates)
        {
            if (string.IsNullOrEmpty(b) || tried.Contains(b) || !File.Exists(b)) continue;
            tried.Add(b);
            try
            {
                var psi = new ProcessStartInfo
                {
                    FileName = b,
                    Arguments = "--app=\"" + url + "\" --user-data-dir=\"" + profile + "\" --window-size=1280,800 --autoplay-policy=no-user-gesture-required --no-first-run --no-default-browser-check --disable-features=Translate",
                    UseShellExecute = true
                };
                Process.Start(psi);
                launched = true;
                break;
            }
            catch { }
        }

        // 3. Fallback: Default browser via ShellExecute
        if (!launched)
        {
            try
            {
                var psi = new ProcessStartInfo
                {
                    FileName = url,
                    UseShellExecute = true
                };
                Process.Start(psi);
                launched = true;
            }
            catch (Exception ex)
            {
                MessageBox.Show("Konnte das Spiel nicht starten:\n" + ex.Message, "Neon Survivor", MessageBoxButtons.OK, MessageBoxIcon.Error);
                rpcBridge.Stop();
                return;
            }
        }

        // Heartbeat monitor loop: stays alive as long as game window sends presence updates
        DateTime lastSeen = DateTime.UtcNow;
        rpcBridge.OnActivityReceived = () => { lastSeen = DateTime.UtcNow; };

        // Grace period of 15 seconds to allow browser to open and send first heartbeat
        Thread.Sleep(6000);

        while (true)
        {
            Thread.Sleep(3000);
            if ((DateTime.UtcNow - lastSeen).TotalSeconds > 20)
            {
                // Game window was closed (no activity for 20s)
                break;
            }
        }

        rpcBridge.Stop();
    }
}

class DiscordRpcBridge
{
    public Action OnActivityReceived;
    private string clientId;
    private int port;
    private string baseDir;
    private TcpListener listener;
    private NamedPipeClientStream pipe;
    private readonly object pipeLock = new object();
    private bool running = true;
    private bool isConnected = false;
    private string discordStatus = "discord_offline";
    private string lastActivityJson = null;

    public DiscordRpcBridge(string clientId, int port, string baseDir)
    {
        this.clientId = clientId;
        this.port = port;
        this.baseDir = baseDir;
    }

    public void Start()
    {
        try
        {
            listener = new TcpListener(IPAddress.Loopback, port);
            listener.Start();
            new Thread(ListenLoop) { IsBackground = true }.Start();
        }
        catch { }

        new Thread(ReconnectLoop) { IsBackground = true }.Start();
    }

    private void ReconnectLoop()
    {
        while (running)
        {
            if (!isConnected)
            {
                ConnectDiscordOnce();
            }
            Thread.Sleep(isConnected ? 2000 : 4000);
        }
    }

    private void ConnectDiscordOnce()
    {
        lock (pipeLock)
        {
            if (isConnected && pipe != null && pipe.IsConnected) return;

            bool foundPipe = false;
            for (int i = 0; i < 10; i++)
            {
                NamedPipeClientStream candidate = null;
                try
                {
                    candidate = new NamedPipeClientStream(".", "discord-ipc-" + i, PipeDirection.InOut, PipeOptions.Asynchronous);
                    candidate.Connect(300);
                    foundPipe = true;

                    // Send Handshake
                    string handshake = "{\"v\":1,\"client_id\":\"" + clientId + "\"}";
                    WritePacket(candidate, 0, handshake);

                    int op;
                    string resp = ReadPacket(candidate, 1200, out op);
                    if (resp != null && (resp.IndexOf("Invalid Client ID", StringComparison.OrdinalIgnoreCase) >= 0 || resp.IndexOf("4000") >= 0))
                    {
                        discordStatus = "invalid_client_id";
                        isConnected = false;
                        try { candidate.Dispose(); } catch { }
                        break;
                    }

                    pipe = candidate;
                    isConnected = true;
                    discordStatus = "connected";

                    if (!string.IsNullOrEmpty(lastActivityJson))
                    {
                        SendActivityPacket(lastActivityJson);
                    }
                    break;
                }
                catch
                {
                    if (candidate != null) { try { candidate.Dispose(); } catch { } }
                }
            }

            if (!foundPipe && !isConnected)
            {
                discordStatus = "discord_offline";
            }
        }
    }

    private void WritePacket(NamedPipeClientStream p, int opcode, string json)
    {
        if (p == null || !p.IsConnected) return;
        byte[] payload = Encoding.UTF8.GetBytes(json);
        byte[] header = new byte[8];
        BitConverter.GetBytes(opcode).CopyTo(header, 0);
        BitConverter.GetBytes(payload.Length).CopyTo(header, 4);
        p.Write(header, 0, 8);
        p.Write(payload, 0, payload.Length);
        p.Flush();
    }

    private string ReadPacket(NamedPipeClientStream p, int timeoutMs, out int opcode)
    {
        opcode = -1;
        try
        {
            byte[] header = new byte[8];
            if (!ReadExact(p, header, 8, timeoutMs)) return null;
            opcode = BitConverter.ToInt32(header, 0);
            int len = BitConverter.ToInt32(header, 4);
            if (len <= 0 || len > 65536) return null;
            byte[] payload = new byte[len];
            if (!ReadExact(p, payload, len, timeoutMs)) return null;
            return Encoding.UTF8.GetString(payload);
        }
        catch
        {
            return null;
        }
    }

    private bool ReadExact(NamedPipeClientStream p, byte[] buf, int count, int timeoutMs)
    {
        int offset = 0;
        while (offset < count)
        {
            IAsyncResult ar = p.BeginRead(buf, offset, count - offset, null, null);
            if (!ar.AsyncWaitHandle.WaitOne(timeoutMs)) return false;
            int read = p.EndRead(ar);
            if (read <= 0) return false;
            offset += read;
        }
        return true;
    }

    private void SendActivityPacket(string activityJson)
    {
        string packet = "{\"cmd\":\"SET_ACTIVITY\",\"args\":{\"pid\":" + Process.GetCurrentProcess().Id + ",\"activity\":" + activityJson + "},\"nonce\":\"" + Guid.NewGuid() + "\"}";
        try
        {
            WritePacket(pipe, 1, packet);
        }
        catch
        {
            isConnected = false;
            discordStatus = "discord_offline";
            try { if (pipe != null) pipe.Dispose(); } catch { }
            pipe = null;
        }
    }

    private static string ExtractJsonString(string json, string key)
    {
        string token = "\"" + key + "\"";
        int idx = json.IndexOf(token, StringComparison.Ordinal);
        if (idx < 0) return null;
        int colon = json.IndexOf(':', idx + token.Length);
        if (colon < 0) return null;
        int q1 = json.IndexOf('"', colon + 1);
        if (q1 < 0) return null;
        int q2 = json.IndexOf('"', q1 + 1);
        if (q2 <= q1) return null;
        return json.Substring(q1 + 1, q2 - q1 - 1).Trim();
    }

    private static string ExtractJsonObject(string json, string key)
    {
        string token = "\"" + key + "\"";
        int idx = json.IndexOf(token, StringComparison.Ordinal);
        if (idx < 0) return null;
        int colon = json.IndexOf(':', idx + token.Length);
        if (colon < 0) return null;
        int start = json.IndexOf('{', colon + 1);
        if (start < 0) return null;

        int depth = 0;
        bool inStr = false;
        bool esc = false;
        for (int i = start; i < json.Length; i++)
        {
            char c = json[i];
            if (esc) { esc = false; continue; }
            if (c == '\\') { esc = true; continue; }
            if (c == '"') { inStr = !inStr; continue; }
            if (inStr) continue;
            if (c == '{') depth++;
            else if (c == '}')
            {
                depth--;
                if (depth == 0) return json.Substring(start, i - start + 1);
            }
        }
        return null;
    }

    public static bool IsValidDiscordId(string id)
    {
        if (string.IsNullOrEmpty(id) || id.Length < 10 || id.Length > 25) return false;
        if (id == "1306300000000000000") return false;
        for (int i = 0; i < id.Length; i++)
        {
            if (id[i] < '0' || id[i] > '9') return false;
        }
        return true;
    }

    public void UpdateActivity(string rawBody)
    {
        if (OnActivityReceived != null) OnActivityReceived();

        string newClientId = ExtractJsonString(rawBody, "client_id");
        if (IsValidDiscordId(newClientId) && newClientId != this.clientId)
        {
            lock (pipeLock)
            {
                this.clientId = newClientId;
                this.isConnected = false;
                try { if (pipe != null) pipe.Dispose(); } catch { }
                pipe = null;
            }
            try
            {
                string cfgPath = Path.Combine(baseDir, "data", "discord_config.json");
                File.WriteAllText(cfgPath, "{\r\n  \"client_id\": \"" + newClientId + "\"\r\n}\r\n", Encoding.UTF8);
            }
            catch { }
            ConnectDiscordOnce();
        }

        string activityJson = ExtractJsonObject(rawBody, "activity");
        if (activityJson == null)
        {
            if (rawBody.IndexOf("\"heartbeat\":true", StringComparison.Ordinal) >= 0) return;
            activityJson = rawBody;
        }

        lastActivityJson = activityJson;

        lock (pipeLock)
        {
            if (!isConnected || pipe == null || !pipe.IsConnected)
            {
                ConnectDiscordOnce();
                if (!isConnected) return;
            }
            SendActivityPacket(activityJson);
        }
    }

    private void ListenLoop()
    {
        while (running)
        {
            try
            {
                TcpClient client = listener.AcceptTcpClient();
                ThreadPool.QueueUserWorkItem(HandleClient, client);
            }
            catch { break; }
        }
    }

    private void HandleClient(object obj)
    {
        TcpClient client = (TcpClient)obj;
        try
        {
            using (var stream = client.GetStream())
            {
                stream.ReadTimeout = 2000;
                byte[] buf = new byte[16384];
                int read = stream.Read(buf, 0, buf.Length);
                if (read > 0)
                {
                    string req = Encoding.UTF8.GetString(buf, 0, read);

                    if (req.StartsWith("OPTIONS"))
                    {
                        byte[] resp = Encoding.UTF8.GetBytes(
                            "HTTP/1.1 200 OK\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: POST, OPTIONS\r\nAccess-Control-Allow-Headers: *\r\nContent-Length: 0\r\n\r\n");
                        stream.Write(resp, 0, resp.Length);
                    }
                    else if (req.StartsWith("POST"))
                    {
                        int bodyIdx = req.IndexOf("\r\n\r\n");
                        if (bodyIdx >= 0)
                        {
                            string body = req.Substring(bodyIdx + 4).Trim();
                            if (!string.IsNullOrEmpty(body))
                            {
                                UpdateActivity(body);
                            }
                        }

                        string jsonBody = "{\"status\":\"ok\",\"discord\":\"" + discordStatus + "\",\"clientId\":\"" + clientId + "\"}";
                        byte[] bodyBytes = Encoding.UTF8.GetBytes(jsonBody);
                        byte[] headerBytes = Encoding.UTF8.GetBytes(
                            "HTTP/1.1 200 OK\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: POST, OPTIONS\r\nAccess-Control-Allow-Headers: *\r\nContent-Type: application/json\r\nContent-Length: " + bodyBytes.Length + "\r\n\r\n");
                        stream.Write(headerBytes, 0, headerBytes.Length);
                        stream.Write(bodyBytes, 0, bodyBytes.Length);
                    }
                }
            }
        }
        catch { }
        finally { client.Close(); }
    }

    public void Stop()
    {
        running = false;
        try { if (pipe != null) pipe.Dispose(); } catch { }
        try { if (listener != null) listener.Stop(); } catch { }
    }
}
