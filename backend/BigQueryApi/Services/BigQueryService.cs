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
    public Task<ValidateCredentialsResponse> ValidateCredentials(string credentialsJson)
    {
        try
        {
            var projectId = ExtractProjectId(credentialsJson);
            var client = CreateClient(credentialsJson, projectId);

            var datasets = new List<DatasetInfo>();
            var datasetList = client.ListDatasets(projectId);

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
                ProjectId = projectId,
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

    public async Task<ExecuteQueryResponse> ExecuteQuery(string credentialsJson, string sql)
    {
        var sw = Stopwatch.StartNew();
        try
        {
            var projectId = ExtractProjectId(credentialsJson);
            var client = CreateClient(credentialsJson, projectId);

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

    public async Task<CheckGeminiAccessResponse> CheckGeminiAccess(string credentialsJson)
    {
        const string location = "us-central1";
        const string model = "gemini-2.0-flash";

        try
        {
            var projectId = ExtractProjectId(credentialsJson);
            var credential = GoogleCredential.FromJson(credentialsJson)
                .CreateScoped("https://www.googleapis.com/auth/cloud-platform");

            var endpoint = $"{location}-aiplatform.googleapis.com";
            var clientBuilder = new PredictionServiceClientBuilder
            {
                Endpoint = endpoint,
                GoogleCredential = credential
            };
            var client = await clientBuilder.BuildAsync();

            var modelName = $"projects/{projectId}/locations/{location}/publishers/google/models/{model}";
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
                ProjectId = projectId,
                Location = location
            };
        }
        catch (Exception ex)
        {
            var projectId = TryExtractProjectId(credentialsJson);
            return new CheckGeminiAccessResponse
            {
                HasAccess = false,
                Error = ex.Message,
                ProjectId = projectId,
                Location = location
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
}
