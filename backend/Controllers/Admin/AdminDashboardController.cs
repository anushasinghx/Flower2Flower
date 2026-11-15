using backend.Data;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers.Admin;

[Authorize(Roles = Roles.Admin)]
[Route("api/v1/admin/dashboard")]
public sealed class AdminDashboardController : ApiControllerBase
{
    private readonly AppDbContext _dbContext;

    public AdminDashboardController(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] string? range, CancellationToken cancellationToken)
    {
        var normalizedRange = range is "7" or "all" ? range : "30";
        var today = AppClock.LocalToday;
        DateTime? since = normalizedRange switch
        {
            "7" => AppClock.LocalDayStartUtc(today.AddDays(-6)),
            "30" => AppClock.LocalDayStartUtc(today.AddDays(-29)),
            _ => null
        };

        var devotees = _dbContext.Users.Where(x => x.UserType == UserType.Devotee);
        var weekAgo = DateTime.UtcNow.AddDays(-7);
        var deposits = _dbContext.Deposits.AsQueryable();
        if (since.HasValue)
        {
            deposits = deposits.Where(x => x.CapturedAtUtc >= since.Value);
        }

        var kg = await deposits.Where(x => x.Status != DepositStatus.Rejected).SumAsync(x => (decimal?)x.Kg, cancellationToken) ?? 0;
        var perDevotee = await deposits.GroupBy(x => x.DevoteeUserId).Select(g => g.Count()).ToListAsync(cancellationToken);
        var retention = perDevotee.Count == 0 ? 0 : (int)Math.Round(perDevotee.Count(x => x >= 2) * 100m / perDevotee.Count);

        var weekStart = AppClock.LocalDayStartUtc(today.AddDays(-6));
        var lastWeek = await _dbContext.Deposits.AsNoTracking()
            .Where(x => x.CapturedAtUtc >= weekStart && x.Status != DepositStatus.Rejected)
            .Select(x => new { x.CapturedAtUtc, x.Kg })
            .ToListAsync(cancellationToken);
        var collectionByDay = Enumerable.Range(0, 7)
            .Select(offset => today.AddDays(offset - 6))
            .Select(date => new
            {
                date,
                day = date.DayOfWeek.ToString()[..3],
                kg = Math.Round(lastWeek.Where(x => AppClock.LocalDate(x.CapturedAtUtc) == date).Sum(x => x.Kg), 2)
            })
            .ToList();
        var busiest = collectionByDay.OrderByDescending(x => x.kg).FirstOrDefault();

        return Ok(new
        {
            range = normalizedRange,
            kpis = new
            {
                devotees = await devotees.CountAsync(cancellationToken),
                devoteesDelta = await devotees.CountAsync(x => x.CreatedAtUtc >= weekAgo, cancellationToken),
                kg = Math.Round(kg, 1),
                deposits = await deposits.CountAsync(cancellationToken),
                carbonTonnes = Math.Round(kg * PointsService.Co2PerKg / 1000m, 1),
                retention
            },
            collectionByDay,
            busiestDay = busiest is null || busiest.kg == 0 ? null : busiest,
            retentionCohorts = await CohortsAsync(today, cancellationToken),
            queues = new
            {
                kycPending = await _dbContext.KycSubmissions.CountAsync(x => x.Status == KycStatus.InReview, cancellationToken),
                openAlerts = await _dbContext.Alerts.CountAsync(x => x.Status == AlertStatus.Open, cancellationToken),
                activeBatches = await _dbContext.Batches.CountAsync(x => x.Status != BatchStatus.Closed, cancellationToken),
                ordersToFulfil = await _dbContext.Orders.CountAsync(x => x.Status != OrderStatus.Completed && x.Status != OrderStatus.Cancelled, cancellationToken),
                templesPending = await _dbContext.Temples.CountAsync(x => x.Status == TempleStatus.Pending, cancellationToken)
            }
        });
    }

    private async Task<List<object>> CohortsAsync(DateOnly today, CancellationToken cancellationToken)
    {
        var firstWeekStart = today.AddDays(-27);
        var firstWeekStartUtc = AppClock.LocalDayStartUtc(firstWeekStart);

        var firstDeposits = await _dbContext.Deposits
            .GroupBy(x => x.DevoteeUserId)
            .Select(g => new { DevoteeUserId = g.Key, First = g.Min(x => x.CapturedAtUtc) })
            .Where(x => x.First >= firstWeekStartUtc)
            .ToListAsync(cancellationToken);
        var cohortUsers = firstDeposits.Select(x => x.DevoteeUserId).ToList();
        var activity = await _dbContext.Deposits
            .Where(x => cohortUsers.Contains(x.DevoteeUserId))
            .Select(x => new { x.DevoteeUserId, x.CapturedAtUtc })
            .ToListAsync(cancellationToken);

        var result = new List<object>();
        for (var week = 0; week < 4; week++)
        {
            var start = firstWeekStart.AddDays(week * 7);
            var end = start.AddDays(7);
            var members = firstDeposits
                .Where(x => AppClock.LocalDate(x.First) >= start && AppClock.LocalDate(x.First) < end)
                .Select(x => x.DevoteeUserId)
                .ToHashSet();

            var values = new List<int?>();
            for (var offset = 0; offset < 4; offset++)
            {
                var targetStart = start.AddDays(offset * 7);
                var targetEnd = targetStart.AddDays(7);
                if (targetStart > today)
                {
                    values.Add(null);
                    continue;
                }

                if (members.Count == 0)
                {
                    values.Add(0);
                    continue;
                }

                var active = activity
                    .Where(x => members.Contains(x.DevoteeUserId) && AppClock.LocalDate(x.CapturedAtUtc) >= targetStart && AppClock.LocalDate(x.CapturedAtUtc) < targetEnd)
                    .Select(x => x.DevoteeUserId)
                    .Distinct()
                    .Count();
                values.Add((int)Math.Round(active * 100m / members.Count));
            }

            result.Add(new { cohort = $"Week {week + 1}", weekStart = start, size = members.Count, values });
        }

        return result;
    }
}
