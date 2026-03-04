using System.IO.Compression;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Text.Json;
using System.Xml.Linq;

namespace BigQueryApi.Services;

public record PentaFileRef(string DisplayName, string MimeType, string FileUri);

public class PentaFileSyncService
{
    private readonly string _bucket;
    private readonly PentaService _pentaService;
    private IReadOnlyList<PentaFileRef>? _cached;
    private readonly SemaphoreSlim _lock = new(1, 1);

    public PentaFileSyncService(IConfiguration config, PentaService pentaService)
    {
        _bucket = config["Penta:DocsBucket"] ?? "penta-docs";
        _pentaService = pentaService;
    }

    public IReadOnlyList<PentaFileRef> GetFileRefs() => _cached ?? [];

    public async Task<(int Registered, string[] Files)> SyncAsync(string accessToken)
    {
        // List files already in the bucket
        var existing = await ListGcsBucket(accessToken);

        // Upload text extracts only if neither .docx nor .txt version is already in bucket
        foreach (var doc in _pentaService.GetDocParts())
        {
            var docxName = doc.FileName;
            var txtName = Path.GetFileNameWithoutExtension(doc.FileName) + ".txt";
            var alreadyPresent = existing.Contains(docxName, StringComparer.OrdinalIgnoreCase)
                              || existing.Contains(txtName, StringComparer.OrdinalIgnoreCase);
            if (!alreadyPresent)
            {
                var bytes = Convert.FromBase64String(doc.Base64Data);
                await UploadGcsObject(accessToken, txtName, "text/plain", bytes);
                existing.Add(txtName);
            }
        }

        // Build refs from all supported files in bucket
        var refs = existing
            .Where(n => n.EndsWith(".txt") || n.EndsWith(".pdf") || n.EndsWith(".md") || n.EndsWith(".docx"))
            .OrderBy(n => n)
            .Select(n => new PentaFileRef(n, GetMimeType(n), $"gs://{_bucket}/{n}"))
            .ToList();

        await _lock.WaitAsync();
        try { _cached = refs; }
        finally { _lock.Release(); }

        return (refs.Count, refs.Select(r => r.DisplayName).ToArray());
    }

    private async Task<List<string>> ListGcsBucket(string accessToken)
    {
        var url = $"https://storage.googleapis.com/storage/v1/b/{Uri.EscapeDataString(_bucket)}/o";
        using var http = CreateHttpClient(TimeSpan.FromSeconds(15));
        var req = new HttpRequestMessage(HttpMethod.Get, url);
        req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
        var resp = await http.SendAsync(req);

        if (!resp.IsSuccessStatusCode) return [];

        var body = await resp.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        var names = new List<string>();
        if (doc.RootElement.TryGetProperty("items", out var items))
            foreach (var item in items.EnumerateArray())
                if (item.TryGetProperty("name", out var name))
                    names.Add(name.GetString()!);
        return names;
    }

    private async Task UploadGcsObject(string accessToken, string name, string contentType, byte[] content)
    {
        var url = $"https://storage.googleapis.com/upload/storage/v1/b/{Uri.EscapeDataString(_bucket)}/o?uploadType=media&name={Uri.EscapeDataString(name)}";
        using var http = CreateHttpClient(TimeSpan.FromSeconds(30));
        var req = new HttpRequestMessage(HttpMethod.Post, url);
        req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
        req.Content = new ByteArrayContent(content);
        req.Content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(contentType);
        var resp = await http.SendAsync(req);
        resp.EnsureSuccessStatusCode();
    }

    private static string GetMimeType(string name) =>
        name.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase) ? "application/pdf" :
        name.EndsWith(".docx", StringComparison.OrdinalIgnoreCase) ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" :
        "text/plain";

    private static HttpClient CreateHttpClient(TimeSpan timeout)
    {
        var handler = new SocketsHttpHandler
        {
            ConnectCallback = async (ctx, ct) =>
            {
                var entries = await Dns.GetHostAddressesAsync(ctx.DnsEndPoint.Host, AddressFamily.InterNetwork, ct);
                var socket = new Socket(AddressFamily.InterNetwork, SocketType.Stream, ProtocolType.Tcp) { NoDelay = true };
                await socket.ConnectAsync(new IPEndPoint(entries[0], ctx.DnsEndPoint.Port), ct);
                return new NetworkStream(socket, ownsSocket: true);
            }
        };
        var client = new HttpClient(handler) { Timeout = timeout };
        client.DefaultRequestVersion = new Version(1, 1);
        client.DefaultVersionPolicy = HttpVersionPolicy.RequestVersionExact;
        return client;
    }
}
