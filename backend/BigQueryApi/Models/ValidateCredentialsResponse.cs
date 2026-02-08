namespace BigQueryApi.Models;

public class ValidateCredentialsResponse
{
    public bool Success { get; set; }
    public string? Error { get; set; }
    public string? ProjectId { get; set; }
    public List<DatasetInfo> Datasets { get; set; } = new();
}

public class DatasetInfo
{
    public string DatasetId { get; set; } = string.Empty;
    public List<string> Tables { get; set; } = new();
}
