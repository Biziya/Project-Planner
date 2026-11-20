using TechnoWells.Core.Model;
using TechnoWells.Core.Validation;

namespace TechnoWells.Core.Repositories.Interfaces;

public interface IAuditRepository
{
    Task WriteAsync(IEnumerable<AuditEntry> entries, CancellationToken ct = default);
}
