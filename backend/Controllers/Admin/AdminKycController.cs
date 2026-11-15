using backend.Data;
using backend.DTOs;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers.Admin;

[Authorize(Roles = Roles.Admin)]
[Route("api/v1/admin/kyc")]
public sealed class AdminKycController : ApiControllerBase
{
    private const int ConsentTotal = 2;

    private readonly AppDbContext _dbContext;
    private readonly AuditService _audit;

    public AdminKycController(AppDbContext dbContext, AuditService audit)
    {
        _dbContext = dbContext;
        _audit = audit;
    }

    [HttpGet]
    public async Task<IActionResult> GetList([FromQuery] string? status, [FromQuery] string? q, [FromQuery] int? page, [FromQuery] int? pageSize, CancellationToken cancellationToken)
    {
        var (safePage, safeSize) = Paging(page, pageSize);
        var query = _dbContext.KycSubmissions.AsNoTracking().Include(x => x.User).AsQueryable();

        var parsed = ParseStatus(status);
        if (parsed.HasValue)
        {
            query = query.Where(x => x.Status == parsed.Value);
        }

        var term = (q ?? string.Empty).Trim();
        if (term.Length > 0)
        {
            var pattern = $"%{term}%";
            var digits = new string(term.Where(char.IsDigit).ToArray());
            query = query.Where(x => EF.Functions.ILike(x.User!.FullName ?? string.Empty, pattern) || (digits.Length >= 3 && x.User!.MobileNumber.Contains(digits)));
        }

        var total = await query.CountAsync(cancellationToken);
        var items = await query.OrderBy(x => x.Status == KycStatus.InReview ? 0 : 1).ThenByDescending(x => x.SubmittedAtUtc).Skip((safePage - 1) * safeSize).Take(safeSize).ToListAsync(cancellationToken);
        var consentCounts = await ConsentCountsAsync(items.Select(x => x.UserId), cancellationToken);

        return Ok(new
        {
            items = items.Select(x => Masked(x, consentCounts.GetValueOrDefault(x.UserId))).ToList(),
            total,
            page = safePage,
            pageSize = safeSize,
            counts = new
            {
                pending = await _dbContext.KycSubmissions.CountAsync(x => x.Status == KycStatus.InReview, cancellationToken),
                verified = await _dbContext.KycSubmissions.CountAsync(x => x.Status == KycStatus.Verified, cancellationToken),
                rejected = await _dbContext.KycSubmissions.CountAsync(x => x.Status == KycStatus.Rejected, cancellationToken)
            }
        });
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetOne(Guid id, CancellationToken cancellationToken)
    {
        var submission = await _dbContext.KycSubmissions.AsNoTracking().Include(x => x.User).FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (submission is null)
        {
            return Error("KYC request not found.", StatusCodes.Status404NotFound);
        }

        var consentCounts = await ConsentCountsAsync(new[] { submission.UserId }, cancellationToken);
        return Ok(Masked(submission, consentCounts.GetValueOrDefault(submission.UserId)));
    }

    [HttpPost("{id:guid}/unmask")]
    public async Task<IActionResult> Unmask(Guid id, CancellationToken cancellationToken)
    {
        var me = await GetCurrentUserAsync(_dbContext);
        if (me is null)
        {
            return NotSignedIn();
        }

        var submission = await _dbContext.KycSubmissions.AsNoTracking().Include(x => x.User).FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (submission is null)
        {
            return Error("KYC request not found.", StatusCodes.Status404NotFound);
        }

        _audit.Add(me, "Viewed unmasked data", $"User {submission.User?.FullName ?? submission.UserId.ToString()}", "Masked", "Unmasked", "KYC document check");
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            submission.Id,
            mobileNumber = submission.User?.MobileNumber,
            docNumber = submission.DocNumber,
            dateOfBirth = submission.User?.DateOfBirth,
            submission.FrontFileId,
            submission.BackFileId
        });
    }

    [HttpPost("{id:guid}/decision")]
    public async Task<IActionResult> Decide(Guid id, [FromBody] KycDecisionRequest request, CancellationToken cancellationToken)
    {
        var me = await GetCurrentUserAsync(_dbContext);
        if (me is null)
        {
            return NotSignedIn();
        }

        var reason = (request.Reason ?? string.Empty).Trim();
        if (!request.Approve && reason.Length == 0)
        {
            return Error("Give a reason so the devotee knows what to fix.");
        }

        var submission = await _dbContext.KycSubmissions.Include(x => x.User).FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (submission is null || submission.User is null)
        {
            return Error("KYC request not found.", StatusCodes.Status404NotFound);
        }

        if (submission.Status != KycStatus.InReview)
        {
            return Error("This KYC request was already decided.", StatusCodes.Status409Conflict);
        }

        submission.Status = request.Approve ? KycStatus.Verified : KycStatus.Rejected;
        submission.Reason = reason;
        submission.ReviewedByUserId = me.Id;
        submission.ReviewedAtUtc = DateTime.UtcNow;
        submission.User.KycStatus = submission.Status;
        submission.User.UpdatedAtUtc = DateTime.UtcNow;

        if (request.Approve && !await _dbContext.LedgerEntries.AnyAsync(x => x.UserId == submission.UserId && x.Kind == LedgerKind.Bonus, cancellationToken))
        {
            _dbContext.LedgerEntries.Add(new LedgerEntry
            {
                Id = Guid.NewGuid(),
                UserId = submission.UserId,
                Kind = LedgerKind.Bonus,
                Points = PointsService.WelcomeBonusPoints,
                Title = "Welcome bonus",
                Detail = "KYC verified",
                CreatedAtUtc = DateTime.UtcNow
            });
        }

        _audit.Add(me, request.Approve ? "KYC approved" : "KYC rejected", $"User {submission.User.FullName ?? submission.UserId.ToString()}", "Pending", request.Approve ? "Verified" : "Rejected", reason.Length > 0 ? reason : "Document checked");
        await _dbContext.SaveChangesAsync(cancellationToken);

        var consentCounts = await ConsentCountsAsync(new[] { submission.UserId }, cancellationToken);
        return Ok(Masked(submission, consentCounts.GetValueOrDefault(submission.UserId)));
    }

    private static KycStatus? ParseStatus(string? status)
    {
        return (status ?? string.Empty).Trim().ToLowerInvariant() switch
        {
            "pending" or "inreview" => KycStatus.InReview,
            "verified" => KycStatus.Verified,
            "rejected" => KycStatus.Rejected,
            _ => null
        };
    }

    private async Task<Dictionary<Guid, int>> ConsentCountsAsync(IEnumerable<Guid> userIds, CancellationToken cancellationToken)
    {
        var ids = userIds.Distinct().ToList();
        return await _dbContext.Consents
            .Where(x => ids.Contains(x.UserId) && x.Active)
            .GroupBy(x => x.UserId)
            .Select(g => new { UserId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.UserId, x => x.Count, cancellationToken);
    }

    private static object Masked(KycSubmission submission, int activeConsents)
    {
        return new
        {
            submission.Id,
            submission.UserId,
            name = submission.User?.FullName ?? "Devotee",
            maskedMobile = Mobile.Mask(submission.User?.MobileNumber),
            submission.DocType,
            docNumber = Mobile.MaskDocument(submission.DocNumber),
            dateOfBirth = submission.User?.DateOfBirth,
            consents = $"{activeConsents} of {ConsentTotal}",
            submission.SubmittedAtUtc,
            submission.Status,
            submission.Reason,
            submission.ReviewedAtUtc,
            hasBackImage = submission.BackFileId.HasValue
        };
    }
}
