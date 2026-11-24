using backend.Models;
using backend.Services;
using Flower2Flower.Tests.Support;

namespace Flower2Flower.Tests.Unit;

public sealed class PointsAndAuditTests
{
    private static LedgerEntry Entry(Guid userId, LedgerKind kind, int points) => new() { Id = Guid.NewGuid(), UserId = userId, Kind = kind, Points = points, Title = kind.ToString() };

    [Fact]
    public async Task Balances_split_available_held_and_lifetime()
    {
        await using var db = TestDb.Create();
        var userId = Guid.NewGuid();
        db.LedgerEntries.AddRange(
            Entry(userId, LedgerKind.Earned, 500),
            Entry(userId, LedgerKind.Bonus, 100),
            Entry(userId, LedgerKind.Redeemed, -200),
            Entry(userId, LedgerKind.Refund, 50),
            Entry(userId, LedgerKind.Held, 300),
            Entry(userId, LedgerKind.Released, 100),
            Entry(userId, LedgerKind.Removed, -50),
            Entry(userId, LedgerKind.Rejected, 0),
            Entry(Guid.NewGuid(), LedgerKind.Earned, 9999));
        await db.SaveChangesAsync();

        var balances = await new PointsService(db).GetBalancesAsync(userId);

        Assert.Equal(550, balances.Available);
        Assert.Equal(150, balances.Held);
        Assert.Equal(700, balances.Lifetime);
    }

    [Fact]
    public async Task Balances_are_zero_for_new_user()
    {
        await using var db = TestDb.Create();

        var balances = await new PointsService(db).GetBalancesAsync(Guid.NewGuid());

        Assert.Equal(new PointBalances(0, 0, 0), balances);
    }

    [Fact]
    public async Task Held_never_goes_negative()
    {
        await using var db = TestDb.Create();
        var userId = Guid.NewGuid();
        db.LedgerEntries.AddRange(Entry(userId, LedgerKind.Held, 100), Entry(userId, LedgerKind.Removed, -300));
        await db.SaveChangesAsync();

        var balances = await new PointsService(db).GetBalancesAsync(userId);

        Assert.Equal(0, balances.Held);
    }

    [Fact]
    public async Task User_is_flagged_only_with_open_alerts()
    {
        await using var db = TestDb.Create();
        var flagged = Guid.NewGuid();
        var cleared = Guid.NewGuid();
        db.Alerts.AddRange(
            new Alert { Id = Guid.NewGuid(), SubjectUserId = flagged, Status = AlertStatus.Open },
            new Alert { Id = Guid.NewGuid(), SubjectUserId = cleared, Status = AlertStatus.Resolved });
        await db.SaveChangesAsync();
        var service = new PointsService(db);

        Assert.True(await service.IsFlaggedAsync(flagged));
        Assert.False(await service.IsFlaggedAsync(cleared));
        Assert.False(await service.IsFlaggedAsync(Guid.NewGuid()));
    }

    [Fact]
    public async Task Impact_excludes_rejected_deposits()
    {
        await using var db = TestDb.Create();
        var userId = Guid.NewGuid();
        db.Deposits.AddRange(
            new Deposit { Id = 1, DevoteeUserId = userId, Kg = 2.5m, Status = DepositStatus.Accepted },
            new Deposit { Id = 2, DevoteeUserId = userId, Kg = 1.5m, Status = DepositStatus.Held },
            new Deposit { Id = 3, DevoteeUserId = userId, Kg = 4m, Status = DepositStatus.Rejected });
        await db.SaveChangesAsync();

        var (kg, co2) = await new PointsService(db).GetImpactAsync(userId);

        Assert.Equal(4m, kg);
        Assert.Equal(3.6m, co2);
    }

    [Fact]
    public void Audit_without_actor_is_recorded_as_system()
    {
        using var db = TestDb.Create();

        new AuditService(db).Add(null, "Seed", "Rules", "None", "v1", "Startup");
        db.SaveChanges();

        var entry = Assert.Single(db.AuditEntries);
        Assert.Equal("System", entry.ActorName);
        Assert.Equal("System", entry.Role);
        Assert.Null(entry.ActorUserId);
        Assert.Equal("Seed", entry.Action);
    }

    [Fact]
    public void Audit_uses_actor_name_and_role_label()
    {
        using var db = TestDb.Create();
        var actor = new User { Id = Guid.NewGuid(), FullName = "Neha Kapoor", UserType = UserType.SuperAdmin, MobileNumber = "9000002222" };

        new AuditService(db).Add(actor, "KYC approved", "User Sunita", "Pending", "Verified", "Document checked");
        db.SaveChanges();

        var entry = Assert.Single(db.AuditEntries);
        Assert.Equal("Neha Kapoor", entry.ActorName);
        Assert.Equal("Admin", entry.Role);
        Assert.Equal(actor.Id, entry.ActorUserId);
        Assert.Equal("Pending", entry.OldValue);
        Assert.Equal("Verified", entry.NewValue);
    }

    [Fact]
    public void Audit_masks_mobile_when_actor_has_no_name()
    {
        using var db = TestDb.Create();
        var actor = new User { Id = Guid.NewGuid(), UserType = UserType.Operator, MobileNumber = "9000004444" };

        new AuditService(db).Add(actor, "Day closed", "Temple", "Open", "5 kg", "Counter");
        db.SaveChanges();

        Assert.Equal("******4444", Assert.Single(db.AuditEntries).ActorName);
    }
}
