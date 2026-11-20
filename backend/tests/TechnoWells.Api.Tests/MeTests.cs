using System.Net.Http.Json;
using TechnoWells.Api.Models.Me;

namespace TechnoWells.Api.Tests;

public sealed class MeTests
{
    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task Me_returns_the_user_the_server_signed_in(bool supervisor)
    {
        await using var factory = ApiFactory.DevMode("test.user", supervisor);
        using var client = factory.CreateClient();

        var me = await client.GetFromJsonAsync<MeResponse>("/api/me");

        Assert.Equal(new MeResponse("test.user", supervisor), me);
    }
}
