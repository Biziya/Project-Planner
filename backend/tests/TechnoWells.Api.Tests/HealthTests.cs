using System.Net;
using System.Net.Http.Json;
using TechnoWells.Api.Models.Health;

namespace TechnoWells.Api.Tests;

public sealed class HealthTests
{
    [Fact]
    public async Task Health_answers_without_a_database()
    {
        await using var factory = ApiFactory.DevMode();
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<HealthResponse>();
        Assert.Equal(new HealthResponse("ok", "notConfigured"), body);
    }
}
