using backend.Data;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Services;

public sealed class RulesSnapshot
{
    public PointsSettings Settings { get; init; } = new();
    public IReadOnlyList<EarningRule> Earning { get; init; } = Array.Empty<EarningRule>();
    public IReadOnlyList<Level> Levels { get; init; } = Array.Empty<Level>();

    public EarningRule? RuleFor(string waste)
    {
        return Earning.FirstOrDefault(x => x.Active && string.Equals(x.Waste, waste.Trim(), StringComparison.OrdinalIgnoreCase));
    }

    public LevelInfo LevelFor(int lifetimePoints)
    {
        if (Levels.Count == 0)
        {
            return new LevelInfo(1, "Novice", 1, null, null, null, 0, 100);
        }

        var index = 0;
        for (var position = 0; position < Levels.Count; position++)
        {
            if (lifetimePoints >= Levels[position].MinPoints)
            {
                index = position;
            }
        }

        var current = Levels[index];
        var next = index + 1 < Levels.Count ? Levels[index + 1] : null;
        var progress = next is null || next.MinPoints <= 0 ? 100 : Math.Min(100, Math.Round(lifetimePoints * 100m / next.MinPoints, 1));

        return new LevelInfo(
            index + 1,
            current.Name,
            current.Multiplier,
            next is null ? null : index + 2,
            next?.Name,
            next?.MinPoints,
            next is null ? 0 : Math.Max(0, next.MinPoints - lifetimePoints),
            progress);
    }
}

public sealed record LevelInfo(
    int Number,
    string Name,
    decimal Multiplier,
    int? NextNumber,
    string? NextName,
    int? NextMinPoints,
    int ToNext,
    decimal Progress);

public sealed class RulesService
{
    private readonly AppDbContext _dbContext;

    public RulesService(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<RulesSnapshot> LoadAsync(CancellationToken cancellationToken = default)
    {
        var settings = await _dbContext.PointsSettings.AsNoTracking().FirstOrDefaultAsync(x => x.Id == 1, cancellationToken) ?? new PointsSettings();
        var earning = await _dbContext.EarningRules.AsNoTracking().OrderBy(x => x.SortOrder).ThenBy(x => x.Waste).ToListAsync(cancellationToken);
        var levels = await _dbContext.Levels.AsNoTracking().OrderBy(x => x.MinPoints).ToListAsync(cancellationToken);

        return new RulesSnapshot
        {
            Settings = settings,
            Earning = earning,
            Levels = levels
        };
    }
}
