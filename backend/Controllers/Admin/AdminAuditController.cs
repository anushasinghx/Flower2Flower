using backend.Data;
using backend.DTOs;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers.Admin;

[Authorize(Roles = Roles.Admin)]
[Route("api/v1/admin")]
public sealed class AdminAuditController : ApiControllerBase
{
    public static readonly string[] Datasets = { "Deposits", "Users", "Orders", "Points ledger", "Pilot KPIs" };

    private readonly AppDbContext _dbContext;
    private readonly AuditService _audit;

    public AdminAuditController(AppDbContext dbContext, AuditService audit)
    {
        _dbContext = dbContext;
        _audit = audit;
    }

    [HttpGet("audit")]
    public async Task<IActionResult> GetAudit([FromQuery] DateOnly? from, [FromQuery] DateOnly? to, [FromQuery] string? actor, [FromQuery] string? action, [FromQuery] string? q, [FromQuery] int? page, [FromQuery] int? pageSize, CancellationToken cancellationToken)
    {
        var (safePage, safeSize) = Paging(page, pageSize, 50);
        var query = _dbContext.AuditEntries.AsNoTracking().AsQueryable();
        if (from.HasValue)
        {
            var start = AppClock.LocalDayStartUtc(from.Value);
            query = query.Where(x => x.CreatedAtUtc >= start);
        }

        if (to.HasValue)
        {
            var end = AppClock.LocalDayStartUtc(to.Value.AddDays(1));
            query = query.Where(x => x.CreatedAtUtc < end);
        }

        if (!string.IsNullOrWhiteSpace(actor))
        {
            query = query.Where(x => x.ActorName == actor);
        }

        if (!string.IsNullOrWhiteSpace(action))
        {
            query = query.Where(x => x.Action == action);
        }

        var term = (q ?? string.Empty).Trim();
        if (term.Length > 0)
        {
            var pattern = $"%{term}%";
            query = query.Where(x => EF.Functions.ILike(x.Record, pattern));
        }

        var total = await query.CountAsync(cancellationToken);
        var items = await query.OrderByDescending(x => x.CreatedAtUtc).Skip((safePage - 1) * safeSize).Take(safeSize)
            .Select(x => new { x.Id, time = x.CreatedAtUtc, actor = x.ActorName, x.Role, x.Action, x.Record, x.OldValue, x.NewValue, x.Reason })
            .ToListAsync(cancellationToken);

        return Ok(new { items, total, page = safePage, pageSize = safeSize });
    }

    [HttpGet("audit/filters")]
    public async Task<IActionResult> GetAuditFilters(CancellationToken cancellationToken)
    {
        var actors = await _dbContext.AuditEntries.Select(x => x.ActorName).Distinct().OrderBy(x => x).ToListAsync(cancellationToken);
        var actions = await _dbContext.AuditEntries.Select(x => x.Action).Distinct().OrderBy(x => x).ToListAsync(cancellationToken);
        return Ok(new { actors, actions, datasets = Datasets });
    }

    [HttpGet("exports")]
    public async Task<IActionResult> GetExports(CancellationToken cancellationToken)
    {
        var exports = await _dbContext.ExportEntries.AsNoTracking().OrderByDescending(x => x.CreatedAtUtc).Take(100)
            .Select(x => new { x.Id, x.Dataset, by = x.ByName, time = x.CreatedAtUtc, x.Masked, x.Reason, from = x.FromDate, to = x.ToDate })
            .ToListAsync(cancellationToken);
        return Ok(exports);
    }

    [HttpPost("exports")]
    [Produces("text/csv", "application/json")]
    public async Task<IActionResult> Export([FromBody] ExportRequest request, CancellationToken cancellationToken)
    {
        var me = await GetCurrentUserAsync(_dbContext);
        if (me is null)
        {
            return NotSignedIn();
        }

        var dataset = Datasets.FirstOrDefault(x => string.Equals(x, request.Dataset.Trim(), StringComparison.OrdinalIgnoreCase));
        if (dataset is null)
        {
            return Error($"Choose one of: {string.Join(", ", Datasets)}.");
        }

        if (request.From.HasValue && request.To.HasValue && request.From > request.To)
        {
            return Error("The start date must be before the end date.");
        }

        var start = request.From.HasValue ? AppClock.LocalDayStartUtc(request.From.Value) : new DateTime(2000, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var end = request.To.HasValue ? AppClock.LocalDayStartUtc(request.To.Value.AddDays(1)) : new DateTime(2200, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var masked = request.Masked;
        string Phone(string value) => masked ? Mobile.Mask(value) : value;

        byte[] content;
        switch (dataset)
        {
            case "Deposits":
            {
                var rows = await _dbContext.Deposits.AsNoTracking().Where(x => x.CapturedAtUtc >= start && x.CapturedAtUtc < end).OrderByDescending(x => x.CapturedAtUtc).ToListAsync(cancellationToken);
                var temples = await DepositQueries.TempleNamesAsync(_dbContext, rows.Select(x => x.TempleId), cancellationToken);
                content = Csv.Build(
                    new[] { "Deposit", "Date", "Devotee", "Mobile", "Temple", "Waste", "Kg", "Points", "Charge", "Status", "Reason", "Conflict" },
                    rows.Select(x => new object?[] { Views.DepositCode(x.Id), x.CapturedAtUtc, x.DevoteeName, Phone(x.MobileNumber), temples.GetValueOrDefault(x.TempleId, string.Empty), x.Waste, x.Kg, x.Points, x.Charge, x.Status.ToString(), x.Reason, x.Conflict ? "Yes" : "No" }));
                break;
            }
            case "Users":
            {
                var rows = await _dbContext.Users.AsNoTracking().Where(x => x.CreatedAtUtc >= start && x.CreatedAtUtc < end).OrderBy(x => x.CreatedAtUtc).ToListAsync(cancellationToken);
                content = Csv.Build(
                    new[] { "User", "Name", "Mobile", "Type", "KYC", "Status", "City", "Pool", "Joined" },
                    rows.Select(x => new object?[] { x.Id, x.FullName, Phone(x.MobileNumber), x.UserType.ToString(), x.KycStatus.ToString(), x.AccountStatus, x.City, x.PoolOn ? "Yes" : "No", x.CreatedAtUtc }));
                break;
            }
            case "Orders":
            {
                var rows = await _dbContext.Orders.AsNoTracking().Include(x => x.Lines).Where(x => x.CreatedAtUtc >= start && x.CreatedAtUtc < end).OrderByDescending(x => x.CreatedAtUtc).ToListAsync(cancellationToken);
                content = Csv.Build(
                    new[] { "Order", "Date", "Customer", "Mobile", "Items", "Fulfilment", "Pay with", "Points used", "INR paid", "Delivery fee", "Status" },
                    rows.Select(x => new object?[] { x.Id, x.CreatedAtUtc, x.CustomerName, Phone(x.MobileNumber), string.Join("; ", x.Lines.Select(l => $"{l.Name} {l.Pack} x {l.Qty}")), x.Fulfilment.ToString(), x.PayWith.ToString(), x.PointsUsed, x.InrPaid, x.DeliveryFee, x.Status.ToString() }));
                break;
            }
            case "Points ledger":
            {
                var rows = await _dbContext.LedgerEntries.AsNoTracking()
                    .Where(x => x.CreatedAtUtc >= start && x.CreatedAtUtc < end)
                    .Join(_dbContext.Users, l => l.UserId, u => u.Id, (l, u) => new { Entry = l, u.FullName, u.MobileNumber })
                    .OrderByDescending(x => x.Entry.CreatedAtUtc)
                    .ToListAsync(cancellationToken);
                content = Csv.Build(
                    new[] { "Entry", "Date", "Devotee", "Mobile", "Kind", "Points", "Title", "Detail" },
                    rows.Select(x => new object?[] { x.Entry.Id, x.Entry.CreatedAtUtc, x.FullName, Phone(x.MobileNumber), x.Entry.Kind.ToString(), x.Entry.Points, x.Entry.Title, x.Entry.Detail }));
                break;
            }
            default:
            {
                var deposits = _dbContext.Deposits.Where(x => x.CapturedAtUtc >= start && x.CapturedAtUtc < end);
                var kg = await deposits.Where(x => x.Status != DepositStatus.Rejected).SumAsync(x => (decimal?)x.Kg, cancellationToken) ?? 0;
                content = Csv.Build(
                    new[] { "Metric", "Value" },
                    new[]
                    {
                        new object?[] { "Registered devotees", await _dbContext.Users.CountAsync(x => x.UserType == UserType.Devotee, cancellationToken) },
                        new object?[] { "Deposits", await deposits.CountAsync(cancellationToken) },
                        new object?[] { "Nirmalya collected kg", Math.Round(kg, 2) },
                        new object?[] { "Carbon offset t CO2e", Math.Round(kg * PointsService.Co2PerKg / 1000m, 2) },
                        new object?[] { "Active depositors", await deposits.Select(x => x.DevoteeUserId).Distinct().CountAsync(cancellationToken) },
                        new object?[] { "Orders", await _dbContext.Orders.CountAsync(x => x.CreatedAtUtc >= start && x.CreatedAtUtc < end, cancellationToken) }
                    });
                break;
            }
        }

        _dbContext.ExportEntries.Add(new ExportEntry
        {
            Id = Guid.NewGuid(),
            Dataset = dataset,
            ByUserId = me.Id,
            ByName = me.FullName ?? "Admin",
            Masked = masked,
            Reason = request.Reason.Trim(),
            FromDate = request.From,
            ToDate = request.To,
            CreatedAtUtc = DateTime.UtcNow
        });
        _audit.Add(me, "Data export", $"{dataset} CSV", "None", masked ? "Exported, masked" : "Exported, unmasked", request.Reason.Trim());
        await _dbContext.SaveChangesAsync(cancellationToken);

        var fileName = $"{dataset.Replace(' ', '_').ToLowerInvariant()}_{AppClock.LocalToday:yyyyMMdd}.csv";
        return File(content, "text/csv", fileName);
    }

    [HttpGet("deposits")]
    public async Task<ActionResult<DepositListView>> GetDeposits([FromQuery] Guid? templeId, [FromQuery] string? period, [FromQuery] string? status, [FromQuery] string? q, [FromQuery] int? page, [FromQuery] int? pageSize, CancellationToken cancellationToken)
    {
        var (safePage, safeSize) = Paging(page, pageSize);
        var query = DepositQueries.Filter(_dbContext.Deposits, period, status, q, templeId);
        return Ok(await DepositQueries.PageAsync(_dbContext, query, safePage, safeSize, true, cancellationToken));
    }

    [HttpGet("deposits/{id:long}")]
    public async Task<ActionResult<DepositView>> GetDeposit(long id, CancellationToken cancellationToken)
    {
        var deposit = await _dbContext.Deposits.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (deposit is null)
        {
            return Error("Deposit not found.", StatusCodes.Status404NotFound);
        }

        var templeName = await _dbContext.Temples.Where(x => x.Id == deposit.TempleId).Select(x => x.Name).FirstOrDefaultAsync(cancellationToken);
        return Ok(Views.Deposit(deposit, templeName ?? string.Empty, true));
    }

    [HttpGet("messages")]
    public async Task<IActionResult> GetMessages([FromQuery] string? topic, [FromQuery] int? page, [FromQuery] int? pageSize, CancellationToken cancellationToken)
    {
        var (safePage, safeSize) = Paging(page, pageSize);
        var query = _dbContext.ContactMessages.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(topic))
        {
            query = query.Where(x => x.Topic == topic);
        }

        var total = await query.CountAsync(cancellationToken);
        var items = await query.OrderByDescending(x => x.CreatedAtUtc).Skip((safePage - 1) * safeSize).Take(safeSize).ToListAsync(cancellationToken);
        return Ok(new { items, total, page = safePage, pageSize = safeSize });
    }
}
