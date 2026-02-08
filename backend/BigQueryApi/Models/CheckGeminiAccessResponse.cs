namespace BigQueryApi.Models;

public class CheckGeminiAccessResponse
{
    public bool HasAccess { get; set; }
    public string? Error { get; set; }
    public string? ProjectId { get; set; }
    public string? Location { get; set; }
}
