namespace BigQueryApi.Models;

public class PentaExecuteRequest
{
    public string Sql { get; set; } = string.Empty;
}

public class PentaColumnSchema
{
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
}

public class PentaTableSchema
{
    public string TableName { get; set; } = string.Empty;
    public List<PentaColumnSchema> Columns { get; set; } = new();
}

public class PentaSchemaResponse
{
    public List<PentaTableSchema> Tables { get; set; } = new();
}

public class PentaGenerateSqlRequest
{
    public string CredentialsJson { get; set; } = string.Empty;
    public string? AccessToken { get; set; }
    public string? ProjectId { get; set; }
    public string Schema { get; set; } = string.Empty;
    public string Prompt { get; set; } = string.Empty;
}

public class PentaSyncRequest
{
    public string? CredentialsJson { get; set; }
    public string? AccessToken { get; set; }
    public string? ProjectId { get; set; }
}

public class PentaSyncResponse
{
    public int Registered { get; set; }
    public string[] Files { get; set; } = [];
}
