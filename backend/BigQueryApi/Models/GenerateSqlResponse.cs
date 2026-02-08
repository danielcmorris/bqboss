namespace BigQueryApi.Models;

public class GenerateSqlResponse
{
    public bool Success { get; set; }
    public string Sql { get; set; } = string.Empty;
    public string? Error { get; set; }
}
