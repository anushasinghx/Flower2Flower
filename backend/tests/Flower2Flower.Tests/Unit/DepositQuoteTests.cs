using backend.Data;
using backend.Models;
using backend.Services;
using Flower2Flower.Tests.Support;

namespace Flower2Flower.Tests.Unit;

public sealed class DepositQuoteTests
{
    private static RulesSnapshot Rules(decimal maxKg = 10, bool holdOnFlag = true) => new()
    {
        Settings = new PointsSettings { MaxDepositKg = maxKg, HoldOnFlag = holdOnFlag, RejectionLimit = 3 },
        Earning = new[]
        {
            new EarningRule { Id = Guid.NewGuid(), Waste = "Flowers", PtsPerKg = 100, MaxPerDay = 10, Active = true },
            new EarningRule { Id = Guid.NewGuid(), Waste = "Coconut shells", PtsPerKg = 20, MaxPerDay = 5, Active = true },
            new EarningRule { Id = Guid.NewGuid(), Waste = "Broken idols", PtsPerKg = 0, MaxPerDay = 0, Active = true, Charge = 10 }
        },
        Levels = new[]
        {
            new Level { Id = Guid.NewGuid(), Name = "Novice", MinPoints = 0, Multiplier = 1 },
            new Level { Id = Guid.NewGuid(), Name = "Evangelist", MinPoints = 5000, Multiplier = 1.2m }
        }
    };

    private static (AppDbContext Db, DepositService Service, User Devotee) Setup()
    {
        var db = TestDb.Create();
        var devotee = new User { Id = Guid.NewGuid(), FullName = "Sunita", MobileNumber = "9876541234", NormalizedMobileNumber = "9876541234", UserType = UserType.Devotee };
        db.Users.Add(devotee);
        db.SaveChanges();
        return (db, new DepositService(db, new PointsService(db)), devotee);
    }

    [Fact]
    public async Task Eligible_waste_earns_points_per_kg()
    {
        var (db, service, devotee) = Setup();
        await using var _ = db;

        var quote = await service.QuoteAsync(devotee, "Flowers", 2.5m, DateTime.UtcNow, Rules());

        Assert.True(quote.Eligible);
        Assert.Equal(250, quote.BasePoints);
        Assert.Equal(250, quote.Points);
        Assert.Equal(0m, quote.Charge);
        Assert.False(quote.OverMax);
        Assert.False(quote.WillHold);
        Assert.Equal(1, quote.LevelNumber);
    }

    [Fact]
    public async Task Unknown_waste_is_not_eligible()
    {
        var (db, service, devotee) = Setup();
        await using var _ = db;

        var quote = await service.QuoteAsync(devotee, "Plastic", 1m, DateTime.UtcNow, Rules());

        Assert.False(quote.Eligible);
        Assert.Equal(0, quote.Points);
        Assert.Equal("Plastic", quote.Waste);
    }

    [Fact]
    public async Task Charged_waste_earns_nothing_and_rounds_charge()
    {
        var (db, service, devotee) = Setup();
        await using var _ = db;

        var quote = await service.QuoteAsync(devotee, "Broken idols", 2.55m, DateTime.UtcNow, Rules());

        Assert.True(quote.Eligible);
        Assert.Equal(0, quote.Points);
        Assert.Equal(26m, quote.Charge);
    }

    [Fact]
    public async Task Daily_cap_limits_eligible_kg()
    {
        var (db, service, devotee) = Setup();
        await using var _ = db;
        db.Deposits.Add(new Deposit { Id = 1, DevoteeUserId = devotee.Id, Waste = "Coconut shells", Kg = 4m, Status = DepositStatus.Accepted, CapturedAtUtc = DateTime.UtcNow });
        db.Deposits.Add(new Deposit { Id = 2, DevoteeUserId = devotee.Id, Waste = "Coconut shells", Kg = 3m, Status = DepositStatus.Rejected, CapturedAtUtc = DateTime.UtcNow });
        await db.SaveChangesAsync();

        var quote = await service.QuoteAsync(devotee, "Coconut shells", 3m, DateTime.UtcNow, Rules());

        Assert.Equal(1m, quote.EligibleKg);
        Assert.Equal(20, quote.Points);
    }

    [Fact]
    public async Task Cap_already_reached_earns_zero()
    {
        var (db, service, devotee) = Setup();
        await using var _ = db;
        db.Deposits.Add(new Deposit { Id = 1, DevoteeUserId = devotee.Id, Waste = "Coconut shells", Kg = 5m, Status = DepositStatus.Accepted, CapturedAtUtc = DateTime.UtcNow });
        await db.SaveChangesAsync();

        var quote = await service.QuoteAsync(devotee, "Coconut shells", 2m, DateTime.UtcNow, Rules());

        Assert.Equal(0m, quote.EligibleKg);
        Assert.Equal(0, quote.Points);
    }

    [Fact]
    public async Task Over_max_weight_is_held_when_rule_says_so()
    {
        var (db, service, devotee) = Setup();
        await using var _ = db;

        var held = await service.QuoteAsync(devotee, "Flowers", 12m, DateTime.UtcNow, Rules());
        var notHeld = await service.QuoteAsync(devotee, "Flowers", 12m, DateTime.UtcNow, Rules(holdOnFlag: false));

        Assert.True(held.OverMax);
        Assert.True(held.WillHold);
        Assert.Equal(10m, held.EligibleKg);
        Assert.Equal(1000, held.Points);
        Assert.True(notHeld.OverMax);
        Assert.False(notHeld.WillHold);
    }

    [Fact]
    public async Task Level_multiplier_boosts_points()
    {
        var (db, service, devotee) = Setup();
        await using var _ = db;
        db.LedgerEntries.Add(new LedgerEntry { Id = Guid.NewGuid(), UserId = devotee.Id, Kind = LedgerKind.Earned, Points = 6000 });
        await db.SaveChangesAsync();

        var quote = await service.QuoteAsync(devotee, "Flowers", 1m, DateTime.UtcNow, Rules());

        Assert.Equal(2, quote.LevelNumber);
        Assert.Equal(1.2m, quote.Multiplier);
        Assert.Equal(100, quote.BasePoints);
        Assert.Equal(120, quote.Points);
    }

    [Fact]
    public async Task Quote_reports_flag_and_weekly_rejections()
    {
        var (db, service, devotee) = Setup();
        await using var _ = db;
        db.Alerts.Add(new Alert { Id = Guid.NewGuid(), SubjectUserId = devotee.Id, Status = AlertStatus.Open });
        db.Deposits.Add(new Deposit { Id = 1, DevoteeUserId = devotee.Id, Status = DepositStatus.Rejected, CapturedAtUtc = DateTime.UtcNow.AddDays(-2) });
        db.Deposits.Add(new Deposit { Id = 2, DevoteeUserId = devotee.Id, Status = DepositStatus.Rejected, CapturedAtUtc = DateTime.UtcNow.AddDays(-9) });
        await db.SaveChangesAsync();

        var quote = await service.QuoteAsync(devotee, "Flowers", 1m, DateTime.UtcNow, Rules());

        Assert.True(quote.Flagged);
        Assert.Equal(1, quote.RejectionsThisWeek);
        Assert.Equal(3, quote.RejectionLimit);
    }

    [Fact]
    public async Task ResolveDevotee_finds_by_id_or_mobile_and_skips_staff()
    {
        var (db, service, devotee) = Setup();
        await using var _ = db;
        var staff = new User { Id = Guid.NewGuid(), MobileNumber = "9000004444", NormalizedMobileNumber = "9000004444", UserType = UserType.Operator };
        db.Users.Add(staff);
        await db.SaveChangesAsync();

        Assert.Equal(devotee.Id, (await service.ResolveDevoteeAsync(devotee.Id, null))?.Id);
        Assert.Equal(devotee.Id, (await service.ResolveDevoteeAsync(null, "+91 98765 41234"))?.Id);
        Assert.Null(await service.ResolveDevoteeAsync(staff.Id, null));
        Assert.Null(await service.ResolveDevoteeAsync(null, "9000004444"));
        Assert.Null(await service.ResolveDevoteeAsync(null, "123"));
    }
}
