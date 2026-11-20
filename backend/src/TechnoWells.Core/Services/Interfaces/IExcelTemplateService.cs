using TechnoWells.Core.Model;
using TechnoWells.Core.Validation;

namespace TechnoWells.Core.Services.Interfaces;

/// <summary>Excel template generation and reading (spec 8). Column layout is configuration (template pending).</summary>
public interface IExcelTemplateService
{
    string CurrentVersion { get; }
    byte[] BuildTemplate(IEnumerable<Hole> rows, bool includeHoleSheets, bool includeGtnSheet);
    ExcelHolesRead ReadHoles(Stream file);
    ExcelGtnRead ReadGtn(Stream file);
}
