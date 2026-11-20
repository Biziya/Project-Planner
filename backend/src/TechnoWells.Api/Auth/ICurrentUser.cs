namespace TechnoWells.Api.Auth;

/// <summary>The signed-in user, always taken from server authentication, never from the request body.</summary>
public interface ICurrentUser
{
    string Name { get; }

    bool IsSupervisor { get; }
}
