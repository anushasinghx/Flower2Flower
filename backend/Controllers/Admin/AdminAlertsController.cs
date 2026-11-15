using backend.Data;
using backend.DTOs;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers.Admin;

[Authorize(Roles = Roles.Admin)]
[Route("api/v1/admin/alerts")]
public sealed class AdminAlertsController : ApiControllerBase
{
    private readonly AppDbContext _dbContext;
    private readonly AuditService _audit;

    public AdminAlertsController(AppDbContext dbContext, AuditService audit)
    {
        _dbContext = dbContext;
        _audit = audit;
    }

    [HttpGet]
    public async Task<IActionResult> GetList([FromQuery] AlertStatus? status, [FromQuery] AlertSeverity? severity, CancellationToken cancellationToken)
    {
        var query = _dbContext.Alerts.AsNoTracking().AsQueryable();
        if (status.HasValue)
        {
            query = query.Where(x => x.Status == status.Value);
        }

        if (severity.HasValue)
        {
            query = query.Where(x => x.Severity == severity.Value);
        }

        var alerts = await query.OrderByDescending(x => x.CreatedAtUtc).Take(500).ToListAsync(cancellationToken);
        var severityOrder = new Dictionary<AlertSeverity, int> { [AlertSeverity.High] = 0, [AlertSeverity.Medium] = 1, [AlertSeverity.Low] = 2 };

        return Ok(new
        {
            items = alerts.OrderBy(x => x.Status == AlertStatus.Open ? 0 : 1).ThenBy(x => severityOrder[x.Severity]).ThenByDescending(x => x.CreatedAtUtc).Select(Views.Alert).ToList(),
            counts = new
            {
                open = await _dbContext.Alerts.CountAsync(x => x.Status == AlertStatus.Open, cancellationToken),
                resolved = await _dbContext.Alerts.CountAsync(x => x.Status == AlertStatus.Resolved, cancellationToken)
            }
        });
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<AlertView>> GetOne(Guid id, CancellationToken cancellationToken)
    {
        var alert = await _dbContext.Alerts.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (alert is null)
        {
            return Error("Alert not found.", StatusCodes.Status404NotFound);
        }

        return Ok(Views.Alert(alert));
    }

    [HttpPost("{id:guid}/resolve")]
    public async Task<ActionResult<AlertView>> Resolve(Guid id, [FromBody] ResolveAlertRequest request, CancellationToken cancellationToken)
    {
        var me = await GetCurrentUserAsync(_dbContext);
        if (me is null)
        {
            return NotSignedIn();
        }

        var alert = await _dbContext.Alerts.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (alert is null)
        {
            return Error("Alert not found.", StatusCodes.Status404NotFound);
        }

        if (alert.Status != AlertStatus.Open)
        {
            return Error("This alert is already resolved.", StatusCodes.Status409Conflict);
        }

        var note = request.Note.Trim();
        if (alert.SubjectUserId.HasValue && alert.HeldPoints > 0 && request.Action != AlertAction.Dismiss)
        {
            var release = request.Action == AlertAction.Release;
            _dbContext.LedgerEntries.Add(new LedgerEntry
            {
                Id = Guid.NewGuid(),
                UserId = alert.SubjectUserId.Value,
                Kind = release ? LedgerKind.Released : LedgerKind.Removed,
                Points = release ? alert.HeldPoints : -alert.HeldPoints,
                Title = release ? "Held points released" : "Held points removed",
                Detail = note,
                DepositId = alert.DepositId,
                AlertId = alert.Id,
                CreatedAtUtc = DateTime.UtcNow
            });
        }

        if (request.Action == AlertAction.Release && alert.DepositId.HasValue)
        {
            var deposit = await _dbContext.Deposits.FirstOrDefaultAsync(x => x.Id == alert.DepositId.Value, cancellationToken);
            if (deposit is not null && deposit.Status == DepositStatus.Held)
            {
                deposit.Status = DepositStatus.Accepted;
            }
        }

        alert.Status = AlertStatus.Resolved;
        alert.Resolution = note;
        alert.HeldPoints = request.Action == AlertAction.Dismiss ? alert.HeldPoints : 0;
        alert.ResolvedByUserId = me.Id;
        alert.ResolvedAtUtc = DateTime.UtcNow;

        var label = request.Action switch
        {
            AlertAction.Release => "Points released",
            AlertAction.Remove => "Points removed",
            _ => "Alert dismissed"
        };
        _audit.Add(me, label, $"Alert {alert.Subject}: {alert.Rule}", "Open", "Resolved", note);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(Views.Alert(alert));
    }
}
