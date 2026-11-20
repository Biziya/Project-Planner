using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using TechnoWells.Core.Configuration;
using TechnoWells.Core.Validation;
using TechnoWells.Infrastructure.Repositories;
using TechnoWells.Infrastructure.Services;

namespace TechnoWells.Infrastructure;

public static class DependencyInjection
{
    /// <summary>Registers the staging database, acQuire access and Excel template service (Storage:Mode = Sql).</summary>
    public static IServiceCollection AddSqlInfrastructure(IServiceCollection services, IConfiguration config)
    {
        services.Configure<AcquireSqlOptions>(config.GetSection("AcquireSql"));
        services.PostConfigure<AcquireSqlOptions>(o =>
        {
            if (string.IsNullOrWhiteSpace(o.QueriesFile)) return;
            var path = Path.IsPathRooted(o.QueriesFile) ? o.QueriesFile : Path.Combine(AppContext.BaseDirectory, o.QueriesFile);
            if (!File.Exists(path)) path = Path.Combine(Directory.GetCurrentDirectory(), o.QueriesFile);
            if (!File.Exists(path)) throw new FileNotFoundException($"AcquireSql:QueriesFile not found: {o.QueriesFile}");
            SqlQueryFile.ApplyTo(o, SqlQueryFile.Parse(File.ReadAllText(path)), Path.GetFileName(path));
        });
        services.Configure<ExcelTemplateOptions>(config.GetSection("ExcelTemplate"));

        services.AddSingleton<SqlConnections>();
        services.AddSingleton<ILookupRepository, LookupRepository>();
        services.AddScoped<IStagingRepository, StagingRepository>();
        services.AddScoped<AcquireReadRepository>();
        services.AddScoped<IAcquireReadRepository>(sp => sp.GetRequiredService<AcquireReadRepository>());
        services.AddScoped<IAcquireWriteRepository, AcquireWriteRepository>();
        services.AddScoped<IHoleDirectory, HoleDirectoryRepository>();
        services.AddScoped<IAuditRepository, AuditRepository>();
        services.AddSingleton<ISpatialChecker, NoSpatialChecker>(); // replace when grid / prospect polygons are available (V-05)
        services.AddScoped<IExcelTemplateService, ExcelTemplateService>();
        return services;
    }
}
