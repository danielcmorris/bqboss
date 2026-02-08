namespace BigQueryApi.Models;

public class ExecuteQueryResponse
{
    public bool Success { get; set; }
    public string? Error { get; set; }
    public List<string> Columns { get; set; } = new();
    public List<Dictionary<string, object?>> Rows { get; set; } = new();
    public long TotalRows { get; set; }
    public long ExecutionTimeMs { get; set; }
}
