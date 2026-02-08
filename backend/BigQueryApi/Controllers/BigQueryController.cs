using BigQueryApi.Models;
using BigQueryApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace BigQueryApi.Controllers;

[ApiController]
[Route("api/bigquery")]
public class BigQueryController : ControllerBase
{
    private readonly BigQueryService _bigQueryService;

    public BigQueryController(BigQueryService bigQueryService)
    {
        _bigQueryService = bigQueryService;
    }

    [HttpPost("validate-credentials")]
    public async Task<ActionResult<ValidateCredentialsResponse>> ValidateCredentials(
        [FromBody] ValidateCredentialsRequest request)
    {
        var result = await _bigQueryService.ValidateCredentials(request.CredentialsJson);
        return Ok(result);
    }

    [HttpPost("execute")]
    public async Task<ActionResult<ExecuteQueryResponse>> Execute(
        [FromBody] ExecuteQueryRequest request)
    {
        var result = await _bigQueryService.ExecuteQuery(request.CredentialsJson, request.Sql);
        return Ok(result);
    }

    [HttpPost("check-gemini-access")]
    public async Task<ActionResult<CheckGeminiAccessResponse>> CheckGeminiAccess(
        [FromBody] CheckGeminiAccessRequest request)
    {
        var result = await _bigQueryService.CheckGeminiAccess(request.CredentialsJson);
        return Ok(result);
    }

    [HttpPost("generate-sql")]
    public async Task<ActionResult<GenerateSqlResponse>> GenerateSql(
        [FromBody] GenerateSqlRequest request)
    {
        var result = await _bigQueryService.GenerateSql(request.CredentialsJson, request.Schema, request.Prompt);
        return Ok(result);
    }
}
