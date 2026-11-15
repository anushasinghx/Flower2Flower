using backend.Data;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Services;

public sealed record PointBalances(int Available, int Held, int Lifetime);

public sealed class PointsService
{
    public const int WelcomeBonusPoints = 100;
    public const decimal Co2PerKg = 0.9m;
    public const decimal ManurePerKg = 0.31m;

    public static readonly LedgerKind[] SpendableKinds =
    {
        LedgerKind.Earned,
        LedgerKind.Bonus,
        LedgerKind.Redeemed,
        LedgerKind.Refund,
        LedgerKind.Released
    };

    public static readonly LedgerKind[] LifetimeKinds =
    {
        LedgerKind.Earned,
        LedgerKind.Bonus,
        LedgerKind.Released
    };

    private readonly AppDbContext _dbContext;

    public PointsService(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<PointBalances> GetBalancesAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var sums = await _dbContext.LedgerEntries
            .Where(x => x.UserId == userId)
            .GroupBy(x => x.Kind)
            .Select(g => new { Kind = g.Key, Total = g.Sum(x => x.Points) })
            .ToListAsync(cancellationToken);

        int Sum(LedgerKind kind) => sums.Where(x => x.Kind == kind).Sum(x => x.Total);

        var available = SpendableKinds.Sum(Sum);
        var lifetime = LifetimeKinds.Sum(Sum);
        var held = Math.Max(0, Sum(LedgerKind.Held) - Math.Abs(Sum(LedgerKind.Released)) - Math.Abs(Sum(LedgerKind.Removed)));

        return new PointBalances(available, held, lifetime);
    }

    public async Task<bool> IsFlaggedAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Alerts.AnyAsync(x => x.SubjectUserId == userId && x.Status == AlertStatus.Open, cancellationToken);
    }

    public async Task<(decimal Kg, decimal Co2)> GetImpactAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var kg = await _dbContext.Deposits
            .Where(x => x.DevoteeUserId == userId && x.Status != DepositStatus.Rejected)
            .SumAsync(x => (decimal?)x.Kg, cancellationToken) ?? 0;

        return (Math.Round(kg, 2), Math.Round(kg * Co2PerKg, 1));
    }
}
