using TechnoWells.Core.HoleIds;
using TechnoWells.Core.Model;
using TechnoWells.Core.Validation;
using TechnoWells.Core.Workflow;

namespace TechnoWells.Core.Services;

/// <summary>Everything the validation engine needs, provided by dependency injection.</summary>
public sealed class ValidationDependencies(ILookupRepository lookups, IHoleDirectory directory, ISpatialChecker spatial,
    ValidationSettings settings, HoleIdParser parser)
{
    public HoleIdParser Parser => parser;
    public ILookupRepository Lookups => lookups;

    public ValidationEngine Engine(IReadOnlyCollection<string>? batch = null) => new(new ValidationContext
    {
        Lookups = lookups, Directory = directory, Spatial = spatial, Settings = settings, Parser = parser,
        BatchHoleIds = batch ?? Array.Empty<string>()
    });
}

public sealed record StagedHole(Hole Hole, IReadOnlyList<Issue> Issues);
