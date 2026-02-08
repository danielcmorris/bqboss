using System.Diagnostics;
using System.Text.Json;
using BigQueryApi.Models;
using Google.Apis.Auth.OAuth2;
using Google.Cloud.BigQuery.V2;
using Google.Cloud.AIPlatform.V1;
using Google.Api.Gax.Grpc;
using Google.Api.Gax;

namespace BigQueryApi.Services;

public class BigQueryService
{
    private readonly Dictionary<string, PredictionServiceClient> _geminiClients = new();
    private readonly SemaphoreSlim _clientLock = new(1, 1);

    private async Task<PredictionServiceClient> GetOrCreateGeminiClient(string credentialsJson)
    {
        var projectId = ExtractProjectId(credentialsJson);
        const string location = "us-central1";
        var key = $"{projectId}:{location}";

        if (_geminiClients.TryGetValue(key, out var cached))
            return cached;

        await _clientLock.WaitAsync();
        try
        {
            if (_geminiClients.TryGetValue(key, out cached))
                return cached;

            var credential = GoogleCredential.FromJson(credentialsJson)
                .CreateScoped("https://www.googleapis.com/auth/cloud-platform");
            var endpoint = $"{location}-aiplatform.googleapis.com";
            var client = await new PredictionServiceClientBuilder
            {
                Endpoint = endpoint,
                GoogleCredential = credential
            }.BuildAsync();

            _geminiClients[key] = client;
            return client;
        }
        finally
        {
            _clientLock.Release();
        }
    }

    private async Task<PredictionServiceClient> GetOrCreateGeminiClientFromToken(string accessToken, string projectId)
    {
        const string location = "us-central1";
        var credential = GoogleCredential.FromAccessToken(accessToken)
            .CreateScoped("https://www.googleapis.com/auth/cloud-platform");
        var endpoint = $"{location}-aiplatform.googleapis.com";
        return await new PredictionServiceClientBuilder
        {
            Endpoint = endpoint,
            GoogleCredential = credential
        }.BuildAsync();
    }

    public Task<ValidateCredentialsResponse> ValidateCredentials(string credentialsJson, string? accessToken = null, string? projectId = null)
    {
        try
        {
            BigQueryClient client;
            string resolvedProjectId;

            if (!string.IsNullOrEmpty(accessToken) && !string.IsNullOrEmpty(projectId))
            {
                client = CreateClientFromToken(accessToken, projectId);
                resolvedProjectId = projectId;
            }
            else
            {
                resolvedProjectId = ExtractProjectId(credentialsJson);
                client = CreateClient(credentialsJson, resolvedProjectId);
            }

            var datasets = new List<DatasetInfo>();
            var datasetList = client.ListDatasets(resolvedProjectId);

            foreach (var dataset in datasetList)
            {
                var tables = new List<string>();
                var tableList = client.ListTables(dataset.Reference);
                foreach (var table in tableList)
                {
                    tables.Add(table.Reference.TableId);
                }
                datasets.Add(new DatasetInfo
                {
                    DatasetId = dataset.Reference.DatasetId,
                    Tables = tables
                });
            }

            return Task.FromResult(new ValidateCredentialsResponse
            {
                Success = true,
                ProjectId = resolvedProjectId,
                Datasets = datasets
            });
        }
        catch (Exception ex)
        {
            return Task.FromResult(new ValidateCredentialsResponse
            {
                Success = false,
                Error = ex.Message
            });
        }
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
            PredictionServiceClient client;
            string resolvedProjectId;

            if (!string.IsNullOrEmpty(accessToken) && !string.IsNullOrEmpty(projectId))
            {
                client = await GetOrCreateGeminiClientFromToken(accessToken, projectId);
                resolvedProjectId = projectId;
            }
            else
            {
                resolvedProjectId = ExtractProjectId(credentialsJson);
                client = await GetOrCreateGeminiClient(credentialsJson);
            }

            var modelName = $"projects/{resolvedProjectId}/locations/{location}/publishers/google/models/{model}";
            var generateRequest = new GenerateContentRequest
            {
                Model = modelName,
                Contents =
                {
                    new Content
                    {
                        Role = "user",
                        Parts = { new Part { Text = "Say OK" } }
                    }
                }
            };

            await client.GenerateContentAsync(generateRequest);

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

    public async Task<GenerateSqlResponse> GenerateSql(string credentialsJson, string schema, string prompt, string? accessToken = null, string? projectId = null)
    {
        const string location = "us-central1";
        const string model = "gemini-2.0-flash";

        try
        {
            PredictionServiceClient client;
            string resolvedProjectId;

            if (!string.IsNullOrEmpty(accessToken) && !string.IsNullOrEmpty(projectId))
            {
                client = await GetOrCreateGeminiClientFromToken(accessToken, projectId);
                resolvedProjectId = projectId;
            }
            else
            {
                resolvedProjectId = ExtractProjectId(credentialsJson);
                client = await GetOrCreateGeminiClient(credentialsJson);
            }

            var modelName = $"projects/{resolvedProjectId}/locations/{location}/publishers/google/models/{model}";
            var systemText = $"You are a BigQuery SQL assistant. Given the database schema below, convert the user's request into a BigQuery SQL query. Return ONLY the SQL, no explanation or markdown.\n\nSchema:\n{schema}";
            var generateRequest = new GenerateContentRequest
            {
                Model = modelName,
                Contents =
                {
                    new Content
                    {
                        Role = "user",
                        Parts = { new Part { Text = $"{systemText}\n\nUser request: {prompt}" } }
                    }
                }
            };

            var response = await client.GenerateContentAsync(generateRequest);
            var sql = response.Candidates[0].Content.Parts[0].Text.Trim();
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
