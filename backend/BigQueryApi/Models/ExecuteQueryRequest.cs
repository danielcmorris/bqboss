namespace BigQueryApi.Models;

public class ExecuteQueryRequest
{
    public string CredentialsJson { get; set; } = string.Empty;
    public string Sql { get; set; } = string.Empty;
}
