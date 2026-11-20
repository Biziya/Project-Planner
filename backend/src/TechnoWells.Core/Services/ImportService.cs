using TechnoWells.Core.HoleIds;
using TechnoWells.Core.Model;
using TechnoWells.Core.Validation;
using TechnoWells.Core.Workflow;

namespace TechnoWells.Core.Services;

// =====================================================================
// Excel imports (spec 8.3)
// =====================================================================
public sealed record ImportSummary(int RowsRead, int HolesWritten, IReadOnlyList<ImportRowIssue> Issues);

public sealed class ImportService(IExcelTemplateService excel, IStagingRepository repo, IAcquireReadRepository reader, IAcquireWriteRepository writer,
    ValidationDependencies v, IAuditRepository audit, ICurrentUser user)
{
    public async Task<ImportSummary> ImportHolesAsync(Stream file, CancellationToken ct = default)
    {
        var read = excel.ReadHoles(file);
        var issues = read.Issues.ToList();
        if (read.TemplateVersion != excel.CurrentVersion)
        {
            issues.Add(new ImportRowIssue(0, null, "", "B-02", "error",
                $"This file uses template {read.TemplateVersion ?? "(unknown)"}; download the current template ({excel.CurrentVersion}) and copy your rows into it."));
            return new ImportSummary(0, 0, issues);
        }

        var engine = v.Engine(read.Holes.Select(h => h.Hole.HoleId).ToList());
        var written = 0;
        foreach (var (row, hole) in read.Holes)
        {
            hole.Source = "excel";
            hole.Status = HoleStatus.Preparation;
            v.Parser.ApplyTo(hole);
            if (await reader.GetHoleAsync(hole.HoleId, ct) is not null)
            {
                issues.Add(new ImportRowIssue(row, hole.HoleId, "HoleId", "V-03", "error", $"HOLEID {hole.HoleId} already exists in acQuire: row not imported."));
                continue;
            }
            if (await repo.FindByHoleIdAsync(hole.HoleId, ct) is { } existing)
            {
                hole.StagingId = existing.StagingId;
                hole.RowVersion = existing.RowVersion;
            }
            var rowIssues = engine.Validate(hole);
            issues.AddRange(rowIssues.Select(i => new ImportRowIssue(row, i.HoleId, i.Field, i.Rule, i.Level == IssueLevel.Error ? "error" : "warning", i.Message)));
            await repo.SaveAsync(hole, rowIssues.Count(i => i.Level == IssueLevel.Error), rowIssues.Count(i => i.Level == IssueLevel.Warning), user.Name, ct);
            written++;
        }
        await audit.WriteAsync(new[] { new AuditEntry("IMPORT", null, null, "import-holes", null, null, $"{written} holes", user.Name) }, ct);
        return new ImportSummary(read.Holes.Count, written, issues);
    }

    /// <summary>GTN import (P-04, P-05): replace or add, for holes in staging or in acQuire.</summary>
    public async Task<ImportSummary> ImportGtnAsync(Stream file, bool replace, CancellationToken ct = default)
    {
        var read = excel.ReadGtn(file);
        var issues = read.Issues.ToList();
        var written = 0;
        foreach (var group in read.Rows.GroupBy(r => r.HoleId.Trim().ToUpperInvariant()))
        {
            var rows = group.Select(g => g.Gtn).ToList();
            var firstRow = group.First().Row;
            var staged = await repo.FindByHoleIdAsync(group.Key, ct);
            var hole = staged ?? await reader.GetHoleAsync(group.Key, ct);
            if (hole is null)
            {
                issues.AddRange(group.Select(g => new ImportRowIssue(g.Row, group.Key, "HoleId", "P-05", "error", "HOLEID not found in Preparation or in acQuire.")));
                continue;
            }
            hole.Gtn = replace ? rows : hole.Gtn.Concat(rows).ToList();
            var gtnIssues = v.Engine().Validate(hole).Where(i => i.Field == "Gtn").ToList();
            if (gtnIssues.Any(i => i.Level == IssueLevel.Error))
            {
                issues.AddRange(gtnIssues.Select(i => new ImportRowIssue(firstRow, group.Key, "Gtn", i.Rule, "error", i.Message)));
                continue;
            }
            if (staged is not null)
                await repo.SaveAsync(hole, 0, 0, user.Name, ct);
            else
            {
                var r = await writer.UpdateAsync(hole, hole.AcquireVersion ?? "", user.Name, ct);
                if (r.Outcome != WriteOutcome.Written)
                {
                    issues.Add(new ImportRowIssue(firstRow, group.Key, "Gtn", "X-05", "error", r.Message ?? "Hole changed in acQuire meanwhile; import again."));
                    continue;
                }
            }
            written++;
        }
        await audit.WriteAsync(new[] { new AuditEntry("IMPORT", null, null, replace ? "import-gtn-replace" : "import-gtn-add", null, null, $"{written} holes", user.Name) }, ct);
        return new ImportSummary(read.Rows.Count, written, issues);
    }
}
