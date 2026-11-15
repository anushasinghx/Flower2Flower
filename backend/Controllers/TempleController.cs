using backend.Data;
using backend.DTOs;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[Authorize]
[Route("api/v1/temple")]
public sealed class TempleController : ApiControllerBase
{
    private readonly AppDbContext _dbContext;

    public TempleController(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet("me")]
    public async Task<ActionResult<TempleView>> GetMine(CancellationToken cancellationToken)
    {
        var me = await GetCurrentUserAsync(_dbContext);
        if (me is null)
        {
            return NotSignedIn();
        }

        var temple = await FindMineAsync(me, cancellationToken);
        if (temple is null)
        {
            return Error("No temple is linked to this account yet. Register your temple.", StatusCodes.Status404NotFound);
        }

        return Ok(Views.Temple(temple, false));
    }

    [HttpPut("me")]
    public async Task<ActionResult<TempleView>> SaveDetails([FromBody] TempleDetailsRequest request, CancellationToken cancellationToken)
    {
        var me = await GetCurrentUserAsync(_dbContext);
        if (me is null)
        {
            return NotSignedIn();
        }

        if (!request.Authorised)
        {
            return Error("Confirm that you are authorised to register this temple.");
        }

        var mobile = Mobile.Normalize(request.MobileNumber);
        if (!Mobile.IsValid(mobile))
        {
            return Error("Enter a valid 10 digit mobile number.");
        }

        if (request.Type == TempleType.Registered && string.IsNullOrWhiteSpace(request.RegNo))
        {
            return Error("Enter the registration number.");
        }

        var temple = await FindMineAsync(me, cancellationToken);
        var created = temple is null;
        if (temple is null)
        {
            temple = new Temple
            {
                Id = Guid.NewGuid(),
                Status = TempleStatus.Draft,
                AdminUserId = me.Id,
                CreatedAtUtc = DateTime.UtcNow
            };
            _dbContext.Temples.Add(temple);
        }
        else if (temple.Status == TempleStatus.Verified)
        {
            return Error("A verified temple can only be changed by the admin team.", StatusCodes.Status409Conflict);
        }

        temple.Type = request.Type;
        temple.Name = request.Name.Trim();
        temple.RegNo = request.Type == TempleType.Registered ? (request.RegNo ?? string.Empty).Trim() : string.Empty;
        temple.Address = request.Address.Trim();
        temple.Contact = request.Contact.Trim();
        temple.MobileNumber = mobile;
        temple.UpdatedAtUtc = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync(cancellationToken);

        return StatusCode(created ? StatusCodes.Status201Created : StatusCodes.Status200OK, Views.Temple(temple, false));
    }

    [HttpPost("me/submit")]
    public async Task<ActionResult<TempleView>> Submit([FromBody] SubmitTempleRequest request, CancellationToken cancellationToken)
    {
        var me = await GetCurrentUserAsync(_dbContext);
        if (me is null)
        {
            return NotSignedIn();
        }

        var temple = await FindMineAsync(me, cancellationToken);
        if (temple is null)
        {
            return Error("Register your temple first.", StatusCodes.Status404NotFound);
        }

        if (temple.Status is TempleStatus.Verified or TempleStatus.Pending)
        {
            return Error(temple.Status == TempleStatus.Verified ? "This temple is already verified." : "Documents are already waiting for review.", StatusCodes.Status409Conflict);
        }

        var required = Views.RequiredTempleDocuments(temple.Type);
        var provided = request.Documents
            .GroupBy(x => x.DocType.Trim(), StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.Last().FileId, StringComparer.OrdinalIgnoreCase);
        var missing = required.Where(x => !provided.ContainsKey(x)).ToList();
        if (missing.Count > 0)
        {
            return Error($"Upload these documents: {string.Join(", ", missing)}.");
        }

        var fileIds = provided.Values.ToList();
        if (request.PhotoFileId.HasValue)
        {
            fileIds.Add(request.PhotoFileId.Value);
        }

        var files = await _dbContext.StoredFiles.Where(x => fileIds.Contains(x.Id) && x.OwnerUserId == me.Id).ToDictionaryAsync(x => x.Id, cancellationToken);
        if (required.Any(doc => !files.TryGetValue(provided[doc], out var file) || file.Purpose != FilePurpose.TempleDocument))
        {
            return Error("One of the document uploads was not found. Upload it again.");
        }

        if (request.PhotoFileId.HasValue && (!files.TryGetValue(request.PhotoFileId.Value, out var photo) || photo.Purpose != FilePurpose.TemplePhoto))
        {
            return Error("The temple photo upload was not found.");
        }

        var existingDocs = await _dbContext.TempleDocuments.Where(x => x.TempleId == temple.Id).ToListAsync(cancellationToken);
        _dbContext.TempleDocuments.RemoveRange(existingDocs);
        foreach (var doc in required)
        {
            _dbContext.TempleDocuments.Add(new TempleDocument { Id = Guid.NewGuid(), TempleId = temple.Id, DocType = doc, FileId = provided[doc], CreatedAtUtc = DateTime.UtcNow });
        }

        var submittedBefore = temple.SubmittedAtUtc.HasValue;
        _dbContext.TempleEvents.Add(new TempleEvent { Id = Guid.NewGuid(), TempleId = temple.Id, Text = submittedBefore ? "Submitted again" : "Submitted", CreatedAtUtc = DateTime.UtcNow });

        temple.Deity = (request.Deity ?? string.Empty).Trim();
        temple.PhotoFileId = request.PhotoFileId ?? temple.PhotoFileId;
        temple.Status = TempleStatus.Pending;
        temple.Note = string.Empty;
        temple.SubmittedAtUtc = DateTime.UtcNow;
        temple.UpdatedAtUtc = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync(cancellationToken);

        var reloaded = await FindMineAsync(me, cancellationToken);
        return Ok(Views.Temple(reloaded!, false));
    }

    [HttpPut("me/timings")]
    public async Task<ActionResult<TempleView>> SetTimings([FromBody] TempleTimingsRequest request, CancellationToken cancellationToken)
    {
        var me = await GetCurrentUserAsync(_dbContext);
        if (me is null)
        {
            return NotSignedIn();
        }

        var temple = await FindMineAsync(me, cancellationToken);
        if (temple is null)
        {
            return Error("Register your temple first.", StatusCodes.Status404NotFound);
        }

        temple.Timings = request.Timings.Trim();
        temple.UpdatedAtUtc = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(Views.Temple(temple, false));
    }

    [HttpGet("me/summary")]
    public async Task<IActionResult> GetSummary(CancellationToken cancellationToken)
    {
        var me = await GetCurrentUserAsync(_dbContext);
        if (me is null)
        {
            return NotSignedIn();
        }

        var temple = await FindMineAsync(me, cancellationToken);
        if (temple is null)
        {
            return Error("Register your temple first.", StatusCodes.Status404NotFound);
        }

        var start = AppClock.LocalDayStartUtc(AppClock.LocalToday);
        var deposits = _dbContext.Deposits.Where(x => x.TempleId == temple.Id);
        var counted = deposits.Where(x => x.Status != DepositStatus.Rejected);

        return Ok(new
        {
            templeId = temple.Id,
            status = temple.Status,
            todayKg = Math.Round(await counted.Where(x => x.CapturedAtUtc >= start).SumAsync(x => (decimal?)x.Kg, cancellationToken) ?? 0, 3),
            todayDeposits = await deposits.CountAsync(x => x.CapturedAtUtc >= start, cancellationToken),
            totalKg = Math.Round(await counted.SumAsync(x => (decimal?)x.Kg, cancellationToken) ?? 0, 3),
            totalDeposits = await deposits.CountAsync(cancellationToken),
            devotees = await deposits.Select(x => x.DevoteeUserId).Distinct().CountAsync(cancellationToken)
        });
    }

    [HttpGet("me/deposits")]
    public async Task<ActionResult<DepositListView>> GetDeposits([FromQuery] string? period, [FromQuery] string? status, [FromQuery] string? q, [FromQuery] int? page, [FromQuery] int? pageSize, CancellationToken cancellationToken)
    {
        var me = await GetCurrentUserAsync(_dbContext);
        if (me is null)
        {
            return NotSignedIn();
        }

        var temple = await FindMineAsync(me, cancellationToken);
        if (temple is null)
        {
            return Error("Register your temple first.", StatusCodes.Status404NotFound);
        }

        var (safePage, safeSize) = Paging(page, pageSize);
        var query = DepositQueries.Filter(_dbContext.Deposits, period, status, q, temple.Id);
        return Ok(await DepositQueries.PageAsync(_dbContext, query, safePage, safeSize, true, cancellationToken));
    }

    private async Task<Temple?> FindMineAsync(User me, CancellationToken cancellationToken)
    {
        var temple = await _dbContext.Temples
            .Include(x => x.Documents)
            .Include(x => x.Events)
            .FirstOrDefaultAsync(x => x.AdminUserId == me.Id, cancellationToken);
        if (temple is not null)
        {
            return temple;
        }

        temple = await _dbContext.Temples
            .Include(x => x.Documents)
            .Include(x => x.Events)
            .FirstOrDefaultAsync(x => x.AdminUserId == null && x.MobileNumber == me.NormalizedMobileNumber, cancellationToken);
        if (temple is not null)
        {
            temple.AdminUserId = me.Id;
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        return temple;
    }
}
