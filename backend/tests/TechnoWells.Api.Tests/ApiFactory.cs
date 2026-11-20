using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace TechnoWells.Api.Tests;

/// <summary>Starts the API in memory with the settings a test gives it.</summary>
public sealed class ApiFactory(IReadOnlyDictionary<string, string?> settings, string environment = "Development")
    : WebApplicationFactory<Program>
{
    public static ApiFactory DevMode(string user = "test.user", bool supervisor = true) => new(new Dictionary<string, string?>
    {
        ["Auth:Mode"] = "Dev",
        ["Auth:DevUser"] = user,
        ["Auth:DevIsSupervisor"] = supervisor ? "true" : "false",
        ["ConnectionStrings:TechnoWells"] = "",
    });

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment(environment);
        foreach (var (key, value) in settings)
        {
            builder.UseSetting(key, value);
        }
    }
}
