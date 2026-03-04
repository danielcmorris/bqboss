using System.Diagnostics;
using System.Net;
using System.Net.Http;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using BigQueryApi.Models;
using Google.Apis.Auth.OAuth2;
using Google.Cloud.BigQuery.V2;

namespace BigQueryApi.Services;

public class BigQueryService
{
    private async Task<string> CallGeminiRest(
        string token, string projectId, string location, string model, string prompt,
        IReadOnlyList<PentaFileRef>? gcsFiles = null,
        IReadOnlyList<PentaDocPart>? inlineFiles = null)
    {
        var url = $"https://{location}-aiplatform.googleapis.com/v1/projects/{projectId}/locations/{location}/publishers/google/models/{model}:generateContent";

        var parts = new List<object>();
        // Prefer gs:// fileData refs; fall back to inlineData if no GCS sync yet
        if (gcsFiles?.Count > 0)
            foreach (var f in gcsFiles)
                parts.Add(new { fileData = new { mimeType = f.MimeType, fileUri = f.FileUri } });
        else if (inlineFiles?.Count > 0)
            foreach (var f in inlineFiles)
                parts.Add(new { inlineData = new { mimeType = f.MimeType, data = f.Base64Data } });
        parts.Add(new { text = prompt });

        var body = JsonSerializer.Serialize(new
        {
            contents = new[] { new { role = "user", parts } }
        });

        using var http = CreateHttpClient(TimeSpan.FromSeconds(60));
        var req = new HttpRequestMessage(HttpMethod.Post, url);
        req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        req.Content = new StringContent(body, Encoding.UTF8, "application/json");

        var resp = await http.SendAsync(req);
        var responseBody = await resp.Content.ReadAsStringAsync();

        if (!resp.IsSuccessStatusCode)
            throw new InvalidOperationException($"Gemini API error ({(int)resp.StatusCode}): {responseBody}");

        using var doc = JsonDocument.Parse(responseBody);
        return doc.RootElement
            .GetProperty("candidates")[0]
            .GetProperty("content")
            .GetProperty("parts")[0]
            .GetProperty("text")
            .GetString()!;
    }

    public async Task<ValidateCredentialsResponse> ValidateCredentials(string credentialsJson, string? accessToken = null, string? projectId = null)
    {
        try
        {
            string token;
            string resolvedProjectId;

            if (!string.IsNullOrEmpty(accessToken) && !string.IsNullOrEmpty(projectId))
            {
                token = accessToken;
                resolvedProjectId = projectId;
            }
            else
            {
                resolvedProjectId = ExtractProjectId(credentialsJson);
                token = await GetServiceAccountToken(credentialsJson, "https://www.googleapis.com/auth/bigquery.readonly");
            }

            using var http = CreateHttpClient(TimeSpan.FromSeconds(15));

            var datasets = new List<DatasetInfo>();
            string? pageToken = null;

            do
            {
                var url = $"https://bigquery.googleapis.com/bigquery/v2/projects/{resolvedProjectId}/datasets?maxResults=100";
                if (pageToken != null) url += $"&pageToken={pageToken}";

                var req = new HttpRequestMessage(HttpMethod.Get, url);
                req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
                var resp = await http.SendAsync(req);
                var body = await resp.Content.ReadAsStringAsync();

                if (!resp.IsSuccessStatusCode)
                    return new ValidateCredentialsResponse { Success = false, Error = $"BigQuery API error ({(int)resp.StatusCode}): {body}" };

                using var doc = JsonDocument.Parse(body);
                var root = doc.RootElement;
                pageToken = root.TryGetProperty("nextPageToken", out var npt) ? npt.GetString() : null;

                if (!root.TryGetProperty("datasets", out var dsArray)) break;

                foreach (var ds in dsArray.EnumerateArray())
                {
                    var dsId = ds.GetProperty("datasetReference").GetProperty("datasetId").GetString()!;
                    var tables = await ListTablesRest(http, token, resolvedProjectId, dsId);
                    datasets.Add(new DatasetInfo { DatasetId = dsId, Tables = tables });
                }
            } while (pageToken != null);

            return new ValidateCredentialsResponse { Success = true, ProjectId = resolvedProjectId, Datasets = datasets };
        }
        catch (Exception ex)
        {
            return new ValidateCredentialsResponse { Success = false, Error = ex.Message };
        }
    }

    private static async Task<List<string>> ListTablesRest(HttpClient http, string token, string projectId, string datasetId)
    {
        var tables = new List<string>();
        string? pageToken = null;
        do
        {
            var url = $"https://bigquery.googleapis.com/bigquery/v2/projects/{projectId}/datasets/{datasetId}/tables?maxResults=200";
            if (pageToken != null) url += $"&pageToken={pageToken}";
            var req = new HttpRequestMessage(HttpMethod.Get, url);
            req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
            var resp = await http.SendAsync(req);
            if (!resp.IsSuccessStatusCode) break;
            var body = await resp.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(body);
            var root = doc.RootElement;
            pageToken = root.TryGetProperty("nextPageToken", out var npt) ? npt.GetString() : null;
            if (!root.TryGetProperty("tables", out var arr)) break;
            foreach (var t in arr.EnumerateArray())
                tables.Add(t.GetProperty("tableReference").GetProperty("tableId").GetString()!);
        } while (pageToken != null);
        return tables;
    }

    private static async Task<string> GetServiceAccountToken(string credentialsJson, string scope)
    {
        using var doc = JsonDocument.Parse(credentialsJson);
        var root = doc.RootElement;
        var clientEmail = root.GetProperty("client_email").GetString()!;
        var privateKeyPem = root.GetProperty("private_key").GetString()!;
        var tokenUri = root.GetProperty("token_uri").GetString()!;

        var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var header = Base64UrlEncode("""{"alg":"RS256","typ":"JWT"}""");
        var payload = Base64UrlEncode(JsonSerializer.Serialize(new
        {
            iss = clientEmail,
            scope,
            aud = tokenUri,
            iat = now,
            exp = now + 3600
        }));

        var message = $"{header}.{payload}";
        var pemContent = privateKeyPem
            .Replace("-----BEGIN PRIVATE KEY-----", "")
            .Replace("-----END PRIVATE KEY-----", "")
            .Replace("\n", "").Replace("\r", "").Trim();
        var keyBytes = Convert.FromBase64String(pemContent);
        using var rsa = RSA.Create();
        rsa.ImportPkcs8PrivateKey(keyBytes, out _);
        var sig = Base64UrlEncode(rsa.SignData(Encoding.UTF8.GetBytes(message), HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1));
        var jwt = $"{message}.{sig}";

        using var http = CreateHttpClient(TimeSpan.FromSeconds(10));
        var resp = await http.PostAsync(tokenUri, new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["grant_type"] = "urn:ietf:params:oauth:grant-type:jwt-bearer",
            ["assertion"] = jwt
        }));
        var body = await resp.Content.ReadAsStringAsync();
        using var tokenDoc = JsonDocument.Parse(body);
        return tokenDoc.RootElement.GetProperty("access_token").GetString()!;
    }

    private static string Base64UrlEncode(string input) => Base64UrlEncode(Encoding.UTF8.GetBytes(input));
    private static string Base64UrlEncode(byte[] input) =>
        Convert.ToBase64String(input).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    // Force IPv4 to avoid WSL2 IPv6 hang issues with Google APIs
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

    public async Task<ExecuteQueryResponse> ExecuteQuery(string credentialsJson, string sql, string? accessToken = null, string? projectId = null)
    {
        var sw = Stopwatch.StartNew();
        try
        {
            BigQueryClient client;

            if (!string.IsNullOrEmpty(accessToken) && !string.IsNullOrEmpty(projectId))
            {
                client = CreateClientFromToken(accessToken, projectId);
            }
            else
            {
                var extractedProjectId = ExtractProjectId(credentialsJson);
                client = CreateClient(credentialsJson, extractedProjectId);
            }

            var results = await client.ExecuteQueryAsync(sql, parameters: null);
            sw.Stop();

            var columns = results.Schema.Fields.Select(f => f.Name).ToList();
            var rows = new List<Dictionary<string, object?>>();

            foreach (var row in results)
            {
                var dict = new Dictionary<string, object?>();
                for (int i = 0; i < columns.Count; i++)
                {
                    dict[columns[i]] = row[columns[i]]?.ToString();
                }
                rows.Add(dict);
            }

            return new ExecuteQueryResponse
            {
                Success = true,
                Columns = columns,
                Rows = rows,
                TotalRows = rows.Count,
                ExecutionTimeMs = sw.ElapsedMilliseconds
            };
        }
        catch (Exception ex)
        {
            sw.Stop();
            return new ExecuteQueryResponse
            {
                Success = false,
                Error = ex.Message,
                ExecutionTimeMs = sw.ElapsedMilliseconds
            };
        }
    }

    public async Task<CheckGeminiAccessResponse> CheckGeminiAccess(string credentialsJson, string? accessToken = null, string? projectId = null)
    {
        const string location = "us-central1";
        const string model = "gemini-2.0-flash";

        try
        {
            string token;
            string resolvedProjectId;

            if (!string.IsNullOrEmpty(accessToken) && !string.IsNullOrEmpty(projectId))
            {
                token = accessToken;
                resolvedProjectId = projectId;
            }
            else
            {
                resolvedProjectId = ExtractProjectId(credentialsJson);
                token = await GetServiceAccountToken(credentialsJson, "https://www.googleapis.com/auth/cloud-platform");
            }

            await CallGeminiRest(token, resolvedProjectId, location, model, "Say OK");

            return new CheckGeminiAccessResponse
            {
                HasAccess = true,
                ProjectId = resolvedProjectId,
                Location = location
            };
        }
        catch (Exception ex)
        {
            string? fallbackProjectId;
            if (!string.IsNullOrEmpty(projectId))
                fallbackProjectId = projectId;
            else
                fallbackProjectId = TryExtractProjectId(credentialsJson);

            return new CheckGeminiAccessResponse
            {
                HasAccess = false,
                Error = ex.Message,
                ProjectId = fallbackProjectId,
                Location = location
            };
        }
    }

    public async Task<GenerateSqlResponse> GenerateSql(string credentialsJson, string schema, string prompt, string? accessToken = null, string? projectId = null, bool isOracle = false, IReadOnlyList<PentaFileRef>? gcsFiles = null, IReadOnlyList<PentaDocPart>? inlineFiles = null)
    {
        const string location = "us-central1";
        const string model = "gemini-2.0-flash";

        try
        {
            string token;
            string resolvedProjectId;

            if (!string.IsNullOrEmpty(accessToken) && !string.IsNullOrEmpty(projectId))
            {
                token = accessToken;
                resolvedProjectId = projectId;
            }
            else
            {
                resolvedProjectId = ExtractProjectId(credentialsJson);
                token = await GetServiceAccountToken(credentialsJson, "https://www.googleapis.com/auth/cloud-platform");
            }

            var systemText = isOracle
                ? $"You are an Oracle SQL assistant. Given the database schema below (Oracle database), convert the user's request into an Oracle SQL query. Use plain table names with no schema prefix. Do NOT use SELECT * - always list column names explicitly. Use ROWNUM for row limits instead of LIMIT. Return ONLY the SQL, no explanation or markdown.\n\nSchema:\n{schema}"
                : $"You are a BigQuery SQL assistant. Given the database schema below, convert the user's request into a BigQuery SQL query. Return ONLY the SQL, no explanation or markdown.\n\nSchema:\n{schema}";

            var fullPrompt = $"{systemText}\n\nUser request: {prompt}";
            var sql = (await CallGeminiRest(token, resolvedProjectId, location, model, fullPrompt, gcsFiles, inlineFiles)).Trim();

            if (sql.StartsWith("```"))
            {
                var firstNewline = sql.IndexOf('\n');
                if (firstNewline >= 0)
                    sql = sql[(firstNewline + 1)..];
                if (sql.EndsWith("```"))
                    sql = sql[..^3];
                sql = sql.Trim();
            }

            return new GenerateSqlResponse
            {
                Success = true,
                Sql = sql
            };
        }
        catch (Exception ex)
        {
            return new GenerateSqlResponse
            {
                Success = false,
                Error = ex.Message
            };
        }
    }

    private static string? TryExtractProjectId(string credentialsJson)
    {
        try { return ExtractProjectId(credentialsJson); }
        catch { return null; }
    }

    private static string ExtractProjectId(string credentialsJson)
    {
        using var doc = JsonDocument.Parse(credentialsJson);
        return doc.RootElement.GetProperty("project_id").GetString()
            ?? throw new InvalidOperationException("project_id not found in credentials JSON");
    }

    private static BigQueryClient CreateClient(string credentialsJson, string projectId)
    {
        var credential = GoogleCredential.FromJson(credentialsJson);
        return BigQueryClient.Create(projectId, credential);
    }

    private static BigQueryClient CreateClientFromToken(string accessToken, string projectId)
    {
        var credential = GoogleCredential.FromAccessToken(accessToken);
        return BigQueryClient.Create(projectId, credential);
    }
}
