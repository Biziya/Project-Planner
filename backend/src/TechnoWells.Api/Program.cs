using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Server.IISIntegration;
using TechnoWells.Api.Auth;
using TechnoWells.Api.Repositories.InMemory;
using TechnoWells.Core.HoleIds;
using TechnoWells.Core.Services;
using TechnoWells.Core.Validation;

var builder = WebApplication.CreateBuilder(args);
var config = builder.Configuration;
var services = builder.Services;

// ---- Controllers; JSON: enums as text (PROJECT, Core…), camelCase
services.AddControllers().AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));

// ---- Settings (N-07: rules and thresholds are configuration)
services.Configure<AuthOptions>(config.GetSection("Auth"));
var holeIdOptions = config.GetSection("HoleId").Get<HoleIdOptions>() ?? new HoleIdOptions();
var validationSettings = config.GetSection("Validation").Get<ValidationSettings>() ?? new ValidationSettings();
services.AddSingleton(holeIdOptions);
services.AddSingleton(new HoleIdParser(holeIdOptions));
services.AddSingleton(validationSettings);

// ---- Authentication: Windows (IIS, Orano account) or Dev
var authMode = config["Auth:Mode"] ?? "Dev";
if (string.Equals(authMode, "Windows", StringComparison.OrdinalIgnoreCase))
    services.AddAuthentication(IISDefaults.AuthenticationScheme);
else
    services.AddAuthentication(DevAuthHandler.SchemeName).AddScheme<AuthenticationSchemeOptions, DevAuthHandler>(DevAuthHandler.SchemeName, null);
services.AddAuthorization();
services.AddHttpContextAccessor();
services.AddScoped<ICurrentUser, HttpCurrentUser>();

// ---- Storage: InMemory (development) or Sql (staging DB + acQuire)
var storage = config["Storage:Mode"] ?? "InMemory";
if (string.Equals(storage, "Sql", StringComparison.OrdinalIgnoreCase))
{
#if SQL_INFRA
    TechnoWells.Infrastructure.DependencyInjection.AddSqlInfrastructure(services, config);
#else
    throw new InvalidOperationException("This build has no SQL layer (built with OfflineBuild=true). Use Storage:Mode = InMemory.");
#endif
}
else
{
    services.AddSingleton<InMemoryData>();
    services.AddSingleton<InMemoryLookupRepository>();
    services.AddSingleton<ILookupRepository>(sp => sp.GetRequiredService<InMemoryLookupRepository>());
    services.AddSingleton<IStagingRepository, InMemoryStagingRepository>();
    services.AddSingleton<InMemoryAcquireRepository>();
    services.AddSingleton<IAcquireReadRepository>(sp => sp.GetRequiredService<InMemoryAcquireRepository>());
    services.AddSingleton<IAcquireWriteRepository>(sp => sp.GetRequiredService<InMemoryAcquireRepository>());
    services.AddSingleton<IHoleDirectory, InMemoryHoleDirectory>();
    services.AddSingleton<IAuditRepository, InMemoryAuditRepository>();
    services.AddSingleton<ISpatialChecker, NoSpatialChecker>();
}

// ---- Application services
services.AddScoped<ValidationDependencies>();
services.AddScoped<StagingService>();
services.AddScoped<SendService>();
services.AddScoped<ProgramService>();
services.AddScoped<KeySuggestionService>();
if (string.Equals(storage, "Sql", StringComparison.OrdinalIgnoreCase))
    services.AddScoped<ImportService>();

// ---- CORS: front ends allowed to call this API from another address (Vite dev server, other hosts)
var origins = config.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? new[] { "http://localhost:5173" };
services.AddCors(o => o.AddPolicy("front", p => p.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod().AllowCredentials()));

var app = builder.Build();

app.UseCors("front");
app.UseDefaultFiles();   // serves the built React app from wwwroot
app.UseStaticFiles();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapFallbackToFile("index.html");

app.Run();

public partial class Program;
