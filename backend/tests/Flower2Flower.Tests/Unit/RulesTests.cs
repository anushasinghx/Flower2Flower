using backend.Models;
using backend.Services;
using Flower2Flower.Tests.Support;

namespace Flower2Flower.Tests.Unit;

public sealed class RulesTests
{
    private static RulesSnapshot Snapshot() => new()
    {
        Settings = new PointsSettings(),
        Earning = new[]
        {
            new EarningRule { Id = Guid.NewGuid(), Waste = "Flowers", PtsPerKg = 100, MaxPerDay = 10, Active = true },
            new EarningRule { Id = Guid.NewGuid(), Waste = "Plastic", PtsPerKg = 5, MaxPerDay = 1, Active = false }
        },
        Levels = new[]
        {
            new Level { Id = Guid.NewGuid(), Name = "Novice", MinPoints = 0, Multiplier = 1 },
            new Level { Id = Guid.NewGuid(), Name = "Regular", MinPoints = 1000, Multiplier = 1 },
            new Level { Id = Guid.NewGuid(), Name = "Evangelist", MinPoints = 5000, Multiplier = 1.2m }
        }
    };

    [Theory]
    [InlineData("Flowers")]
    [InlineData("flowers")]
    [InlineData("  FLOWERS ")]
    public void RuleFor_matches_case_insensitive_and_trimmed(string waste)
    {
        Assert.Equal("Flowers", Snapshot().RuleFor(waste)?.Waste);
    }

    [Fact]
    public void RuleFor_ignores_inactive_and_unknown_rules()
    {
        Assert.Null(Snapshot().RuleFor("Plastic"));
        Assert.Null(Snapshot().RuleFor("Stones"));
    }

    [Fact]
    public void LevelFor_without_levels_returns_novice_default()
    {
        var level = new RulesSnapshot().LevelFor(500);

        Assert.Equal(1, level.Number);
        Assert.Equal("Novice", level.Name);
        Assert.Equal(1m, level.Multiplier);
        Assert.Null(level.NextName);
        Assert.Equal(100m, level.Progress);
    }

    [Fact]
    public void LevelFor_zero_points_is_first_level()
    {
        var level = Snapshot().LevelFor(0);

        Assert.Equal(1, level.Number);
        Assert.Equal("Novice", level.Name);
        Assert.Equal(2, level.NextNumber);
        Assert.Equal("Regular", level.NextName);
        Assert.Equal(1000, level.NextMinPoints);
        Assert.Equal(1000, level.ToNext);
        Assert.Equal(0m, level.Progress);
    }

    [Fact]
    public void LevelFor_reports_progress_to_next_level()
    {
        var level = Snapshot().LevelFor(500);

        Assert.Equal(50m, level.Progress);
        Assert.Equal(500, level.ToNext);
    }

    [Fact]
    public void LevelFor_exact_threshold_moves_up()
    {
        var level = Snapshot().LevelFor(1000);

        Assert.Equal(2, level.Number);
        Assert.Equal("Regular", level.Name);
        Assert.Equal("Evangelist", level.NextName);
        Assert.Equal(4000, level.ToNext);
        Assert.Equal(20m, level.Progress);
    }

    [Fact]
    public void LevelFor_top_level_has_no_next()
    {
        var level = Snapshot().LevelFor(6000);

        Assert.Equal(3, level.Number);
        Assert.Equal(1.2m, level.Multiplier);
        Assert.Null(level.NextNumber);
        Assert.Null(level.NextMinPoints);
        Assert.Equal(0, level.ToNext);
        Assert.Equal(100m, level.Progress);
    }

    [Fact]
    public async Task RulesService_loads_defaults_when_database_is_empty()
    {
        await using var db = TestDb.Create();

        var rules = await new RulesService(db).LoadAsync();

        Assert.Equal(10, rules.Settings.PointsPerRupee);
        Assert.Empty(rules.Earning);
        Assert.Empty(rules.Levels);
    }

    [Fact]
    public async Task RulesService_orders_rules_and_levels()
    {
        await using var db = TestDb.Create();
        db.PointsSettings.Add(new PointsSettings { Id = 1, PointsPerRupee = 20, Version = 4 });
        db.EarningRules.AddRange(
            new EarningRule { Id = Guid.NewGuid(), Waste = "Leaves", SortOrder = 2 },
            new EarningRule { Id = Guid.NewGuid(), Waste = "Flowers", SortOrder = 1 },
            new EarningRule { Id = Guid.NewGuid(), Waste = "Coconut", SortOrder = 2 });
        db.Levels.AddRange(
            new Level { Id = Guid.NewGuid(), Name = "Top", MinPoints = 5000 },
            new Level { Id = Guid.NewGuid(), Name = "Start", MinPoints = 0 });
        await db.SaveChangesAsync();

        var rules = await new RulesService(db).LoadAsync();

        Assert.Equal(20, rules.Settings.PointsPerRupee);
        Assert.Equal(4, rules.Settings.Version);
        Assert.Equal(new[] { "Flowers", "Coconut", "Leaves" }, rules.Earning.Select(x => x.Waste));
        Assert.Equal(new[] { "Start", "Top" }, rules.Levels.Select(x => x.Name));
    }
}
