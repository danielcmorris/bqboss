namespace BigQueryApi.Models;

public class GenerateSqlRequest
{
    public string CredentialsJson { get; set; } = string.Empty;
    public string Schema { get; set; } = string.Empty;
    public string Prompt { get; set; } = string.Empty;
    public string? AccessToken { get; set; }
    public string? ProjectId { get; set; }
}
