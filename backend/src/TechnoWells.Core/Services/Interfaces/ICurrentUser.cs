using TechnoWells.Core.Model;
using TechnoWells.Core.Validation;

namespace TechnoWells.Core.Services.Interfaces;

/// <summary>User of the request (from Active Directory).</summary>
public interface ICurrentUser
{
    string Name { get; }
    bool IsSupervisor { get; }
}
