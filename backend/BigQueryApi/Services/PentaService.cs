using System.Diagnostics;
using System.IO.Compression;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Xml.Linq;
using BigQueryApi.Models;

namespace BigQueryApi.Services;

public record PentaDocPart(string FileName, string MimeType, string Base64Data);

public class PentaService
{
    private const string RelayServer = "https://powerdash.systems";
    private const string ApiKey = "269dhdm7abph5dq65scfnw";

    // Schema loaded once at startup from the CSV file
    private static readonly Dictionary<string, List<string>> _columnNames;
    private static readonly List<PentaTableSchema> _schema;

    // Documentation files loaded at startup
    private static readonly IReadOnlyList<PentaDocPart> _docParts;

    static PentaService()
    {
        (_columnNames, _schema) = LoadSchema();
        _docParts = LoadDocParts();
    }

    private static IReadOnlyList<PentaDocPart> LoadDocParts()
    {
        var docsDir = Path.Combine(AppContext.BaseDirectory, "Penta Docs");
        if (!Directory.Exists(docsDir)) return Array.Empty<PentaDocPart>();

        var parts = new List<PentaDocPart>();
        foreach (var file in Directory.GetFiles(docsDir, "*.docx").OrderBy(f => f))
        {
            try
            {
                var text = ExtractDocxText(file);
                if (string.IsNullOrWhiteSpace(text)) continue;
                var base64 = Convert.ToBase64String(Encoding.UTF8.GetBytes(text));
                parts.Add(new PentaDocPart(Path.GetFileName(file), "text/plain", base64));
            }
            catch { /* skip unreadable files */ }
        }
        return parts;
    }

    private static string ExtractDocxText(string path)
    {
        using var zip = ZipFile.OpenRead(path);
        var entry = zip.GetEntry("word/document.xml");
        if (entry == null) return "";

        using var stream = entry.Open();
        var doc = XDocument.Load(stream);
        XNamespace w = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

        var sb = new StringBuilder();
        foreach (var para in doc.Descendants(w + "p"))
        {
            foreach (var t in para.Descendants(w + "t"))
                sb.Append(t.Value);
            sb.AppendLine();
        }
        return sb.ToString();
    }

    public IReadOnlyList<PentaDocPart> GetDocParts() => _docParts;

    private static (Dictionary<string, List<string>>, List<PentaTableSchema>) LoadSchema()
    {
        var columnNames = new Dictionary<string, List<string>>(StringComparer.OrdinalIgnoreCase);
        var schemaList = new List<PentaTableSchema>();

        var csvPath = Path.Combine(AppContext.BaseDirectory, "PENTA-TABLES-AND-COLUMNS.csv");
        if (!File.Exists(csvPath))
            return (columnNames, schemaList);

        // Read with BOM detection
        var lines = File.ReadAllLines(csvPath, Encoding.UTF8);
        bool firstLine = true;

        foreach (var rawLine in lines)
        {
            if (firstLine) { firstLine = false; continue; } // skip header

            var line = rawLine.Trim();
            if (string.IsNullOrEmpty(line)) continue;

            var parts = line.Split(',');
            if (parts.Length < 3) continue;

            var tableName = parts[0].Trim().TrimStart('\uFEFF');
            var colName = parts[1].Trim();
            var dataType = parts[2].Trim();

            if (!columnNames.ContainsKey(tableName))
            {
                columnNames[tableName] = new List<string>();
                schemaList.Add(new PentaTableSchema { TableName = tableName, Columns = new List<PentaColumnSchema>() });
            }

            columnNames[tableName].Add(colName);
            schemaList.First(t => t.TableName.Equals(tableName, StringComparison.OrdinalIgnoreCase))
                      .Columns.Add(new PentaColumnSchema { Name = colName, Type = dataType });
        }

        return (columnNames, schemaList);
    }

    public List<PentaTableSchema> GetSchema() => _schema;

    public async Task<ExecuteQueryResponse> ExecuteQuery(string sql)
    {
        var sw = Stopwatch.StartNew();
        try
        {
            // Clean SQL per relay server requirements
            sql = sql.Replace("\r\n", " ").Replace("\n", " ").Replace("\r", " ").TrimEnd(';').Trim();

            // Expand SELECT * into explicit column names
            sql = ExpandAsterisk(sql);

            var requestBody = new
            {
                type = "SELECT",
                text = sql,
                target = "PRODUCTION",
                returnType = "DATATABLE"
            };

            var json = JsonSerializer.Serialize(requestBody);

            // Bypass expired SSL certificate as documented
            using var handler = new HttpClientHandler
            {
                ServerCertificateCustomValidationCallback = (_, _, _, _) => true
            };
            using var client = new HttpClient(handler);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await client.PostAsync($"{RelayServer}/api/sql?key={ApiKey}", content);

            sw.Stop();

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync();
                return new ExecuteQueryResponse
                {
                    Success = false,
                    Error = $"Relay server error ({(int)response.StatusCode}): {errorBody}",
                    ExecutionTimeMs = sw.ElapsedMilliseconds
                };
            }

            var result = await response.Content.ReadAsStringAsync();

            JsonElement[] jsonArray;
            try
            {
                jsonArray = JsonSerializer.Deserialize<JsonElement[]>(result) ?? [];
            }
            catch
            {
                var preview = result.Length > 300 ? result[..300] + "..." : result;
                return new ExecuteQueryResponse
                {
                    Success = false,
                    Error = $"Unexpected response from relay server: {preview}",
                    ExecutionTimeMs = sw.ElapsedMilliseconds
                };
            }

            if (jsonArray.Length == 0)
            {
                return new ExecuteQueryResponse
                {
                    Success = true,
                    Columns = [],
                    Rows = [],
                    TotalRows = 0,
                    ExecutionTimeMs = sw.ElapsedMilliseconds
                };
            }

            var columns = jsonArray[0].EnumerateObject().Select(p => p.Name).ToList();
            var rows = jsonArray.Select(item =>
            {
                var dict = new Dictionary<string, object?>();
                foreach (var prop in item.EnumerateObject())
                    dict[prop.Name] = prop.Value.ToString();
                return dict;
            }).ToList();

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

    private string ExpandAsterisk(string sql)
    {
        // Match: SELECT * FROM <tablename> [optional rest]
        var match = Regex.Match(sql,
            @"^(\s*SELECT\s+)\*(\s+FROM\s+)(\w+)([\s\S]*)$",
            RegexOptions.IgnoreCase);

        if (!match.Success) return sql;

        var tableName = match.Groups[3].Value;
        if (!_columnNames.TryGetValue(tableName, out var columns)) return sql;

        var colList = string.Join(", ", columns);
        return $"{match.Groups[1].Value}{colList}{match.Groups[2].Value}{tableName}{match.Groups[4].Value}";
    }
}
