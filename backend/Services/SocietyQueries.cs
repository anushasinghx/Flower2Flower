using backend.Data;
using backend.DTOs;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Services;

public static class SocietyQueries
{
    public static async Task<List<SocietyView>> ListAsync(AppDbContext dbContext, IQueryable<Society> societies, CancellationToken cancellationToken = default)
    {
        var list = await societies.AsNoTracking().OrderBy(x => x.Name).ToListAsync(cancellationToken);
        var ids = list.Select(x => x.Id).ToList();

        var members = await dbContext.Users
            .Where(x => x.SocietyId != null && ids.Contains(x.SocietyId.Value))
            .GroupBy(x => x.SocietyId!.Value)
            .Select(g => new { SocietyId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.SocietyId, x => x.Count, cancellationToken);

        var pool = await dbContext.LedgerEntries
            .Where(x => PointsService.LifetimeKinds.Contains(x.Kind))
            .Join(dbContext.Users.Where(x => x.PoolOn && x.SocietyId != null && ids.Contains(x.SocietyId.Value)), l => l.UserId, u => u.Id, (l, u) => new { SocietyId = u.SocietyId!.Value, l.Points })
            .GroupBy(x => x.SocietyId)
            .Select(g => new { SocietyId = g.Key, Total = g.Sum(x => x.Points) })
            .ToDictionaryAsync(x => x.SocietyId, x => x.Total, cancellationToken);

        return list.Select(x =>
        {
            var poolPoints = pool.GetValueOrDefault(x.Id);
            var progress = x.PoolTargetPoints <= 0 ? 0 : Math.Min(100, Math.Round(poolPoints * 100m / x.PoolTargetPoints, 1));
            return new SocietyView(x.Id, x.Name, x.Area, members.GetValueOrDefault(x.Id), poolPoints, x.PoolTargetPoints, progress);
        }).ToList();
    }
}
