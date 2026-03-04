using BigQueryApi.Models;
using BigQueryApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace BigQueryApi.Controllers;

[ApiController]
[Route("api/penta")]
public class PentaController : ControllerBase
{
    private readonly PentaService _pentaService;
    private readonly PentaFileSyncService _fileSync;
    private readonly BigQueryService _bigQueryService;

    public PentaController(PentaService pentaService, PentaFileSyncService fileSync, BigQueryService bigQueryService)
    {
        _pentaService = pentaService;
        _fileSync = fileSync;
        _bigQueryService = bigQueryService;
    }

    [HttpPost("execute")]
    public async Task<ActionResult<ExecuteQueryResponse>> Execute(
        [FromBody] PentaExecuteRequest request)
    {
        var result = await _pentaService.ExecuteQuery(request.Sql);
        return Ok(result);
    }

    [HttpGet("schema")]
    public ActionResult<PentaSchemaResponse> GetSchema()
    {
        return Ok(new PentaSchemaResponse { Tables = _pentaService.GetSchema() });
    }

    [HttpPost("sync")]
    public async Task<ActionResult<PentaSyncResponse>> Sync([FromBody] PentaSyncRequest request)
    {
        string? token;
        if (!string.IsNullOrEmpty(request.AccessToken))
            token = request.AccessToken;
        else if (!string.IsNullOrEmpty(request.CredentialsJson))
            token = await GetTokenFromCredentials(request.CredentialsJson);
        else
            return BadRequest("Credentials or access token required");

        try
        {
            var (registered, files) = await _fileSync.SyncAsync(token!);
            return Ok(new PentaSyncResponse { Registered = registered, Files = files });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpGet("sync/status")]
    public ActionResult<PentaSyncResponse> SyncStatus()
    {
        var refs = _fileSync.GetFileRefs();
        return Ok(new PentaSyncResponse
        {
            Registered = refs.Count,
            Files = refs.Select(r => r.DisplayName).ToArray()
        });
    }

    [HttpPost("generate-sql")]
    public async Task<ActionResult<GenerateSqlResponse>> GenerateSql(
        [FromBody] PentaGenerateSqlRequest request)
    {
        var gcsFiles = _fileSync.GetFileRefs();
        var result = await _bigQueryService.GenerateSql(
            request.CredentialsJson ?? "",
            request.Schema,
            request.Prompt,
            request.AccessToken,
            request.ProjectId,
            isOracle: true,
            gcsFiles: gcsFiles.Count > 0 ? gcsFiles : null,
            inlineFiles: gcsFiles.Count == 0 ? _pentaService.GetDocParts() : null);
        return Ok(result);
    }

    private static async Task<string> GetTokenFromCredentials(string credentialsJson)
    {
        using var doc = System.Text.Json.JsonDocument.Parse(credentialsJson);
        var root = doc.RootElement;
        var clientEmail = root.GetProperty("client_email").GetString()!;
        var privateKeyPem = root.GetProperty("private_key").GetString()!;
        var tokenUri = root.GetProperty("token_uri").GetString()!;

        var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var header = Base64UrlEncode("{\"alg\":\"RS256\",\"typ\":\"JWT\"}");
        var payload = Base64UrlEncode(System.Text.Json.JsonSerializer.Serialize(new
        {
            iss = clientEmail,
            scope = "https://www.googleapis.com/auth/cloud-platform",
            aud = tokenUri,
            iat = now,
            exp = now + 3600
        }));

        var message = $"{header}.{payload}";
        var pem = privateKeyPem
            .Replace("-----BEGIN PRIVATE KEY-----", "")
            .Replace("-----END PRIVATE KEY-----", "")
            .Replace("\n", "").Replace("\r", "").Trim();
        var keyBytes = Convert.FromBase64String(pem);
        using var rsa = System.Security.Cryptography.RSA.Create();
        rsa.ImportPkcs8PrivateKey(keyBytes, out _);
        var sig = Base64UrlEncode(rsa.SignData(
            System.Text.Encoding.UTF8.GetBytes(message),
            System.Security.Cryptography.HashAlgorithmName.SHA256,
            System.Security.Cryptography.RSASignaturePadding.Pkcs1));
        var jwt = $"{message}.{sig}";

        using var handler = new System.Net.Http.SocketsHttpHandler
        {
            ConnectCallback = async (ctx, ct) =>
            {
                var entries = await System.Net.Dns.GetHostAddressesAsync(ctx.DnsEndPoint.Host, System.Net.Sockets.AddressFamily.InterNetwork, ct);
                var socket = new System.Net.Sockets.Socket(System.Net.Sockets.AddressFamily.InterNetwork, System.Net.Sockets.SocketType.Stream, System.Net.Sockets.ProtocolType.Tcp) { NoDelay = true };
                await socket.ConnectAsync(new System.Net.IPEndPoint(entries[0], ctx.DnsEndPoint.Port), ct);
                return new System.Net.Sockets.NetworkStream(socket, ownsSocket: true);
            }
        };
        using var http = new System.Net.Http.HttpClient(handler) { Timeout = TimeSpan.FromSeconds(10) };
        var resp = await http.PostAsync(tokenUri, new System.Net.Http.FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["grant_type"] = "urn:ietf:params:oauth:grant-type:jwt-bearer",
            ["assertion"] = jwt
        }));
        var body = await resp.Content.ReadAsStringAsync();
        using var tokenDoc = System.Text.Json.JsonDocument.Parse(body);
        return tokenDoc.RootElement.GetProperty("access_token").GetString()!;
    }

    private static string Base64UrlEncode(string input) =>
        Base64UrlEncode(System.Text.Encoding.UTF8.GetBytes(input));
    private static string Base64UrlEncode(byte[] input) =>
        Convert.ToBase64String(input).TrimEnd('=').Replace('+', '-').Replace('/', '_');
}
