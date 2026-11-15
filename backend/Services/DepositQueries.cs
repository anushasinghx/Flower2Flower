using backend.Data;
using backend.DTOs;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Services;

public static class DepositQueries
{
    public static IQueryable<Deposit> Filter(IQueryable<Deposit> query, string? period, string? status, string? search, Guid? templeId)
    {
        var since = AppClock.PeriodStartUtc(period);
        if (since.HasValue)
        {
            query = query.Where(x => x.CapturedAtUtc >= since.Value);
        }

        if (templeId.HasValue)
        {
            query = query.Where(x => x.TempleId == templeId.Value);
        }

        if (!string.IsNullOrWhiteSpace(status) && !string.Equals(status, "all", StringComparison.OrdinalIgnoreCase) && Enum.TryParse<DepositStatus>(status, true, out var parsedStatus))
        {
            query = query.Where(x => x.Status == parsedStatus);
        }

        var term = (search ?? string.Empty).Trim();
        if (term.Length > 0)
        {
            var digits = new string(term.Where(char.IsDigit).ToArray());
            var codeMatch = (term.StartsWith("D", StringComparison.OrdinalIgnoreCase) || term.All(char.IsDigit)) && long.TryParse(digits, out var code) ? code : (long?)null;
            var pattern = $"%{term}%";
            query = query.Where(x =>
                EF.Functions.ILike(x.DevoteeName, pattern) ||
                (digits.Length >= 3 && x.MobileNumber.Contains(digits)) ||
                (codeMatch.HasValue && x.Id == codeMatch.Value));
        }

        return query;
    }

    public static async Task<DepositListView> PageAsync(AppDbContext dbContext, IQueryable<Deposit> query, int page, int pageSize, bool maskMobile, CancellationToken cancellationToken = default)
    {
        var total = await query.CountAsync(cancellationToken);
        var kg = await query.Where(x => x.Status != DepositStatus.Rejected).SumAsync(x => (decimal?)x.Kg, cancellationToken) ?? 0;
        var points = await query.SumAsync(x => (int?)x.Points, cancellationToken) ?? 0;

        var items = await query
            .OrderByDescending(x => x.CapturedAtUtc)
            .ThenByDescending(x => x.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var names = await TempleNamesAsync(dbContext, items.Select(x => x.TempleId), cancellationToken);
        var views = items.Select(x => Views.Deposit(x, names.GetValueOrDefault(x.TempleId, string.Empty), maskMobile)).ToList();

        return new DepositListView(views, total, page, pageSize, new DepositTotals(total, Math.Round(kg, 3), points));
    }

    public static async Task<Dictionary<Guid, string>> TempleNamesAsync(AppDbContext dbContext, IEnumerable<Guid> templeIds, CancellationToken cancellationToken = default)
    {
        var ids = templeIds.Distinct().ToList();
        return await dbContext.Temples.Where(x => ids.Contains(x.Id)).ToDictionaryAsync(x => x.Id, x => x.Name, cancellationToken);
    }
}
