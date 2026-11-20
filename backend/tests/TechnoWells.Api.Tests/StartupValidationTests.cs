namespace TechnoWells.Api.Tests;

/// <summary>Bad settings must stop the API at startup with a clear message.</summary>
public sealed class StartupValidationTests
{
    [Theory]
    [InlineData("Bogus")]
    [InlineData("")]
    [InlineData("7")]
    public void Unknown_auth_mode_stops_startup(string mode)
    {
        AssertStartupFails(new() { ["Auth:Mode"] = mode }, "Auth:Mode");
    }

    [Fact]
    public void Dev_auth_outside_development_stops_startup()
    {
        AssertStartupFails(new() { ["Auth:Mode"] = "Dev" }, "only allowed in the Development environment", environment: "Production");
    }

    [Fact]
    public void Windows_auth_without_supervisor_group_stops_startup()
    {
        AssertStartupFails(new() { ["Auth:Mode"] = "Windows", ["Auth:SupervisorGroup"] = "" }, "Auth:SupervisorGroup");
    }

    [Theory]
    [InlineData("*")]
    [InlineData("localhost:5173")]
    [InlineData("https://*.example.local")]
    public void Invalid_cors_origin_stops_startup(string origin)
    {
        AssertStartupFails(new() { ["Auth:Mode"] = "Dev", ["Cors:AllowedOrigins:0"] = origin }, "Cors:AllowedOrigins");
    }

    private static void AssertStartupFails(Dictionary<string, string?> settings, string expectedMessagePart, string environment = "Development")
    {
        using var factory = new ApiFactory(settings, environment);

        var error = Assert.Throws<InvalidOperationException>(() => factory.CreateClient());

        Assert.Contains(expectedMessagePart, error.Message, StringComparison.Ordinal);
    }
}
