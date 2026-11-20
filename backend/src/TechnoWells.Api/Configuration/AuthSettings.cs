namespace TechnoWells.Api.Configuration;

public enum AuthMode
{
    /// <summary>Windows sign-in (Negotiate / IIS). The only mode allowed outside Development.</summary>
    Windows,

    /// <summary>Everyone is signed in as a fixed development user. Development environment only.</summary>
    Dev,
}

/// <summary>The "Auth" section of appsettings, checked at startup.</summary>
public sealed record AuthSettings(AuthMode Mode, string SupervisorRole, string DevUser, bool DevIsSupervisor)
{
    public const string SectionName = "Auth";

    /// <summary>Role given to the development user when Auth:DevIsSupervisor is true.</summary>
    public const string DevSupervisorRole = "Supervisor";

    public static AuthSettings Load(IConfiguration configuration, IHostEnvironment environment)
    {
        var section = configuration.GetSection(SectionName);
        var modeText = section["Mode"];

        if (!Enum.TryParse<AuthMode>(modeText, ignoreCase: true, out var mode) || !Enum.IsDefined(mode))
        {
            throw new InvalidOperationException($"Auth:Mode must be 'Windows' or 'Dev' (found '{modeText}').");
        }

        if (mode == AuthMode.Dev)
        {
            if (!environment.IsDevelopment())
            {
                throw new InvalidOperationException(
                    $"Auth:Mode 'Dev' is only allowed in the Development environment (current: '{environment.EnvironmentName}').");
            }

            var devUser = section["DevUser"];
            return new AuthSettings(
                AuthMode.Dev,
                DevSupervisorRole,
                string.IsNullOrWhiteSpace(devUser) ? "dev.user" : devUser,
                section.GetValue<bool>("DevIsSupervisor"));
        }

        var group = section["SupervisorGroup"];
        if (string.IsNullOrWhiteSpace(group))
        {
            throw new InvalidOperationException("Auth:SupervisorGroup is required when Auth:Mode is 'Windows'.");
        }

        return new AuthSettings(AuthMode.Windows, group, DevUser: string.Empty, DevIsSupervisor: false);
    }
}
