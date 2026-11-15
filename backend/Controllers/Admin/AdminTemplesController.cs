using backend.Data;
using backend.DTOs;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers.Admin;

[Authorize(Roles = Roles.Admin)]
[Route("api/v1/admin/temples")]
public sealed class AdminTemplesController : ApiControllerBase
{
    private readonly AppDbContext _dbContext;
    private readonly AuditService _audit;

    public AdminTemplesController(AppDbContext dbContext, AuditService audit)
    {
        _dbContext = dbContext;
        _audit = audit;
    }

    [HttpGet]
    public async Task<IActionResult> GetList([FromQuery] TempleStatus? status, [FromQuery] string? q, CancellationToken cancellationToken)
    {
        var query = _dbContext.Temples.AsNoTracking().Include(x => x.Documents).Include(x => x.Events).AsQueryable();
        if (status.HasValue)
        {
            query = query.Where(x => x.Status == status.Value);
        }

        var term = (q ?? string.Empty).Trim();
        if (term.Length > 0)
        {
            var pattern = $"%{term}%";
            query = query.Where(x => EF.Functions.ILike(x.Name, pattern) || EF.Functions.ILike(x.Address, pattern) || EF.Functions.ILike(x.Contact, pattern));
        }

        var temples = await query.OrderBy(x => x.Status == TempleStatus.Pending ? 0 : 1).ThenByDescending(x => x.SubmittedAtUtc ?? x.CreatedAtUtc).ToListAsync(cancellationToken);
        var counts = await _dbContext.Temples.GroupBy(x => x.Status).Select(g => new { Status = g.Key, Count = g.Count() }).ToListAsync(cancellationToken);

        return Ok(new
        {
            items = temples.Select(x => Views.Temple(x, false)).ToList(),
            counts = Enum.GetValues<TempleStatus>().ToDictionary(s => s.ToString(), s => counts.FirstOrDefault(c => c.Status == s)?.Count ?? 0)
        });
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<TempleView>> GetOne(Guid id, CancellationToken cancellationToken)
    {
        var temple = await LoadAsync(id, cancellationToken);
        if (temple is null)
        {
            return Error("Temple not found.", StatusCodes.Status404NotFound);
        }

        return Ok(Views.Temple(temple, false));
    }

    [HttpPost]
    public async Task<ActionResult<TempleView>> Add([FromBody] AddTempleRequest request, CancellationToken cancellationToken)
    {
        var me = await GetCurrentUserAsync(_dbContext);
        if (me is null)
        {
            return NotSignedIn();
        }

        var mobile = Mobile.Normalize(request.MobileNumber);
        if (!Mobile.IsValid(mobile))
        {
            return Error("Enter a valid 10 digit mobile number.");
        }

        var contactUserId = await _dbContext.Users.Where(x => x.NormalizedMobileNumber == mobile).Select(x => (Guid?)x.Id).FirstOrDefaultAsync(cancellationToken);
        var alreadyLinked = contactUserId.HasValue && await _dbContext.Temples.AnyAsync(x => x.AdminUserId == contactUserId, cancellationToken);
        var temple = new Temple
        {
            Id = Guid.NewGuid(),
            Name = request.Name.Trim(),
            Type = request.Type,
            Status = TempleStatus.Pending,
            Address = request.Address.Trim(),
            Contact = request.Contact.Trim(),
            MobileNumber = mobile,
            AdminUserId = alreadyLinked ? null : contactUserId,
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        };
        temple.Events.Add(new TempleEvent { Id = Guid.NewGuid(), TempleId = temple.Id, Text = $"Added by {me.FullName ?? "Admin"}", CreatedAtUtc = DateTime.UtcNow });
        _dbContext.Temples.Add(temple);
        _audit.Add(me, "Temple added", temple.Name, "None", "Pending", "Added from the temple registry");
        await _dbContext.SaveChangesAsync(cancellationToken);

        return StatusCode(StatusCodes.Status201Created, Views.Temple(temple, false));
    }

    [HttpPost("{id:guid}/verify")]
    public async Task<ActionResult<TempleView>> Verify(Guid id, [FromBody] VerifyTempleRequest request, CancellationToken cancellationToken)
    {
        var me = await GetCurrentUserAsync(_dbContext);
        if (me is null)
        {
            return NotSignedIn();
        }

        var temple = await LoadAsync(id, cancellationToken);
        if (temple is null)
        {
            return Error("Temple not found.", StatusCodes.Status404NotFound);
        }

        if (temple.Status != TempleStatus.Pending)
        {
            return Error("Only temples waiting for review can be verified.", StatusCodes.Status409Conflict);
        }

        temple.Status = TempleStatus.Verified;
        temple.Badge = request.Badge.Trim();
        temple.Note = string.Empty;
        temple.UpdatedAtUtc = DateTime.UtcNow;
        _dbContext.TempleEvents.Add(new TempleEvent { Id = Guid.NewGuid(), TempleId = temple.Id, Text = $"Verified by {me.FullName ?? "Admin"}", CreatedAtUtc = DateTime.UtcNow });
        _audit.Add(me, "Temple verified", temple.Name, "Pending", temple.Badge, "Checklist complete");
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(Views.Temple((await LoadAsync(id, cancellationToken))!, false));
    }

    [HttpPost("{id:guid}/request-changes")]
    public async Task<ActionResult<TempleView>> RequestChanges(Guid id, [FromBody] RequestTempleChangesRequest request, CancellationToken cancellationToken)
    {
        var me = await GetCurrentUserAsync(_dbContext);
        if (me is null)
        {
            return NotSignedIn();
        }

        var temple = await LoadAsync(id, cancellationToken);
        if (temple is null)
        {
            return Error("Temple not found.", StatusCodes.Status404NotFound);
        }

        if (temple.Status != TempleStatus.Pending)
        {
            return Error("Only temples waiting for review can be sent back.", StatusCodes.Status409Conflict);
        }

        temple.Status = TempleStatus.NeedsChanges;
        temple.Badge = string.Empty;
        temple.Note = request.Note.Trim();
        temple.UpdatedAtUtc = DateTime.UtcNow;
        _dbContext.TempleEvents.Add(new TempleEvent { Id = Guid.NewGuid(), TempleId = temple.Id, Text = $"Changes requested by {me.FullName ?? "Admin"}", CreatedAtUtc = DateTime.UtcNow });
        _audit.Add(me, "Temple changes asked", temple.Name, "Pending", "Needs changes", temple.Note);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(Views.Temple((await LoadAsync(id, cancellationToken))!, false));
    }

    private Task<Temple?> LoadAsync(Guid id, CancellationToken cancellationToken)
    {
        return _dbContext.Temples.Include(x => x.Documents).Include(x => x.Events).FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
    }
}
