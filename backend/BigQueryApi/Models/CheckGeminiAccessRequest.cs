namespace BigQueryApi.Models;

public class CheckGeminiAccessRequest
{
    public string CredentialsJson { get; set; } = string.Empty;
    public string? AccessToken { get; set; }
    public string? ProjectId { get; set; }
}
