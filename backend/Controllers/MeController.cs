using backend.Data;
using backend.DTOs;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[Authorize]
[Route("api/v1/me")]
public sealed class MeController : ApiControllerBase
{
    private static readonly Dictionary<string, string> ConsentLabels = new()
    {
        ["rules"] = "Nirmalya deposit and points rules",
        ["data"] = "Data and KYC processing"
    };

    private static readonly string[] KycDocTypes = { "Aadhaar", "Voter ID", "Driving licence" };

    private readonly AppDbContext _dbContext;
    private readonly PointsService _pointsService;
    private readonly RulesService _rulesService;
    private readonly JwtService _jwtService;

    public MeController(AppDbContext dbContext, PointsService pointsService, RulesService rulesService, JwtService jwtService)
    {
        _dbContext = dbContext;
        _pointsService = pointsService;
        _rulesService = rulesService;
        _jwtService = jwtService;
    }

    [HttpGet]
    public async Task<IActionResult> GetProfile(CancellationToken cancellationToken)
    {
        var me = await GetCurrentUserAsync(_dbContext);
        if (me is null)
        {
            return NotSignedIn();
        }

        return Ok(await BuildProfileAsync(me, cancellationToken));
    }

    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request, CancellationToken cancellationToken)
    {
        var me = await GetCurrentUserAsync(_dbContext);
        if (me is null)
        {
            return NotSignedIn();
        }

        var dob = request.DateOfBirth ?? me.DateOfBirth;
        if (dob.HasValue)
        {
            var today = AppClock.LocalToday;
            if (dob.Value > today)
            {
                return Error("Date of birth cannot be in the future.");
            }

            if (Mobile.AgeOn(dob.Value, today) < 18)
            {
                return Error("Accounts are for adults 18 and above.");
            }
        }

        me.FullName = request.FullName.Trim();
        me.DateOfBirth = dob;
        me.Address = request.Address?.Trim() ?? me.Address;
        me.State = request.State?.Trim() ?? me.State;
        me.City = request.City?.Trim() ?? me.City;
        me.Pin = request.Pin ?? me.Pin;
        me.UpdatedAtUtc = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(await BuildProfileAsync(me, cancellationToken));
    }

    [HttpPut("preferences")]
    public async Task<IActionResult> UpdatePreferences([FromBody] UpdatePreferencesRequest request, CancellationToken cancellationToken)
    {
        var me = await GetCurrentUserAsync(_dbContext);
        if (me is null)
        {
            return NotSignedIn();
        }

        me.Language = request.Language ?? me.Language;
        me.TextSize = request.TextSize ?? me.TextSize;
        me.UpdatedAtUtc = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new { language = me.Language, textSize = me.TextSize });
    }

    [HttpGet("consents")]
    public async Task<IActionResult> GetConsents(CancellationToken cancellationToken)
    {
        var me = await GetCurrentUserAsync(_dbContext);
        if (me is null)
        {
            return NotSignedIn();
        }

        return Ok(await ConsentsAsync(me.Id, cancellationToken));
    }

    [HttpPut("consents/{key}")]
    public async Task<IActionResult> SetConsent(string key, [FromBody] SetConsentRequest request, CancellationToken cancellationToken)
    {
        var me = await GetCurrentUserAsync(_dbContext);
        if (me is null)
        {
            return NotSignedIn();
        }

        var normalizedKey = key.Trim().ToLowerInvariant();
        if (!ConsentLabels.TryGetValue(normalizedKey, out var label))
        {
            return Error("Unknown consent. Use rules or data.", StatusCodes.Status404NotFound);
        }

        var consent = await _dbContext.Consents.FirstOrDefaultAsync(x => x.UserId == me.Id && x.Key == normalizedKey, cancellationToken);
        if (consent is null)
        {
            consent = new Consent { Id = Guid.NewGuid(), UserId = me.Id, Key = normalizedKey, Label = label, Version = "v1" };
            _dbContext.Consents.Add(consent);
        }

        consent.Active = request.Active;
        consent.UpdatedAtUtc = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(await ConsentsAsync(me.Id, cancellationToken));
    }

    [HttpGet("kyc")]
    public async Task<IActionResult> GetKyc(CancellationToken cancellationToken)
    {
        var me = await GetCurrentUserAsync(_dbContext);
        if (me is null)
        {
            return NotSignedIn();
        }

        var latest = await _dbContext.KycSubmissions.AsNoTracking().Where(x => x.UserId == me.Id).OrderByDescending(x => x.SubmittedAtUtc).FirstOrDefaultAsync(cancellationToken);
        return Ok(new
        {
            status = me.KycStatus,
            docTypes = KycDocTypes,
            submission = latest is null ? null : new
            {
                latest.Id,
                latest.DocType,
                docNumber = Mobile.MaskDocument(latest.DocNumber),
                latest.Status,
                latest.Reason,
                latest.SubmittedAtUtc,
                latest.ReviewedAtUtc
            }
        });
    }

    [HttpPost("kyc")]
    public async Task<IActionResult> SubmitKyc([FromBody] SubmitKycRequest request, CancellationToken cancellationToken)
    {
        var me = await GetCurrentUserAsync(_dbContext);
        if (me is null)
        {
            return NotSignedIn();
        }

        if (me.KycStatus is KycStatus.Verified or KycStatus.InReview)
        {
            return Error(me.KycStatus == KycStatus.Verified ? "Your KYC is already verified." : "Your KYC is already in review.", StatusCodes.Status409Conflict);
        }

        var docType = KycDocTypes.FirstOrDefault(x => string.Equals(x, request.DocType.Trim(), StringComparison.OrdinalIgnoreCase));
        if (docType is null)
        {
            return Error("Choose Aadhaar, Voter ID or Driving licence.");
        }

        var fileIds = new List<Guid> { request.FrontFileId };
        if (request.BackFileId.HasValue)
        {
            fileIds.Add(request.BackFileId.Value);
        }

        var files = await _dbContext.StoredFiles.Where(x => fileIds.Contains(x.Id) && x.OwnerUserId == me.Id).ToListAsync(cancellationToken);
        if (files.All(x => x.Id != request.FrontFileId || x.Purpose != FilePurpose.KycFront))
        {
            return Error("Upload the front of the document first.");
        }

        if (request.BackFileId.HasValue && files.All(x => x.Id != request.BackFileId.Value || x.Purpose != FilePurpose.KycBack))
        {
            return Error("The back side upload was not found.");
        }

        var submission = new KycSubmission
        {
            Id = Guid.NewGuid(),
            UserId = me.Id,
            DocType = docType,
            DocNumber = request.DocNumber.Trim(),
            FrontFileId = request.FrontFileId,
            BackFileId = request.BackFileId,
            Status = KycStatus.InReview,
            SubmittedAtUtc = DateTime.UtcNow
        };
        _dbContext.KycSubmissions.Add(submission);
        me.KycStatus = KycStatus.InReview;
        me.UpdatedAtUtc = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync(cancellationToken);

        return StatusCode(StatusCodes.Status201Created, new { submission.Id, status = submission.Status, submission.DocType, docNumber = Mobile.MaskDocument(submission.DocNumber), submission.SubmittedAtUtc });
    }

    [HttpGet("society")]
    public async Task<IActionResult> GetSociety(CancellationToken cancellationToken)
    {
        var me = await GetCurrentUserAsync(_dbContext);
        if (me is null)
        {
            return NotSignedIn();
        }

        var society = me.SocietyId.HasValue
            ? (await SocietyQueries.ListAsync(_dbContext, _dbContext.Societies.Where(x => x.Id == me.SocietyId.Value), cancellationToken)).FirstOrDefault()
            : null;
        var balances = await _pointsService.GetBalancesAsync(me.Id, cancellationToken);

        return Ok(new { society, poolOn = me.PoolOn, myContribution = me.PoolOn ? balances.Lifetime : 0 });
    }

    [HttpPut("society")]
    public async Task<IActionResult> SetSociety([FromBody] SetSocietyRequest request, CancellationToken cancellationToken)
    {
        var me = await GetCurrentUserAsync(_dbContext);
        if (me is null)
        {
            return NotSignedIn();
        }

        if (request.SocietyId.HasValue && !await _dbContext.Societies.AnyAsync(x => x.Id == request.SocietyId.Value, cancellationToken))
        {
            return Error("Society not found.", StatusCodes.Status404NotFound);
        }

        me.SocietyId = request.SocietyId;
        me.PoolOn = request.SocietyId.HasValue && request.PoolOn;
        me.UpdatedAtUtc = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync(cancellationToken);

        return await GetSociety(cancellationToken);
    }

    [HttpGet("points")]
    public async Task<IActionResult> GetPoints(CancellationToken cancellationToken)
    {
        var me = await GetCurrentUserAsync(_dbContext);
        if (me is null)
        {
            return NotSignedIn();
        }

        var rules = await _rulesService.LoadAsync(cancellationToken);
        var balances = await _pointsService.GetBalancesAsync(me.Id, cancellationToken);
        var impact = await _pointsService.GetImpactAsync(me.Id, cancellationToken);
        var level = rules.LevelFor(balances.Lifetime);
        var locked = rules.Settings.RequiresKyc && me.KycStatus != KycStatus.Verified;

        return Ok(new
        {
            available = balances.Available,
            held = balances.Held,
            lifetime = balances.Lifetime,
            level,
            kgOffered = impact.Kg,
            co2Avoided = impact.Co2,
            pointsPerRupee = rules.Settings.PointsPerRupee,
            rupeeValue = Math.Round((decimal)Math.Max(0, balances.Available) / Math.Max(1, rules.Settings.PointsPerRupee), 2),
            redeemLocked = locked,
            flagged = await _pointsService.IsFlaggedAsync(me.Id, cancellationToken)
        });
    }

    [HttpGet("ledger")]
    public async Task<ActionResult<PagedResult<LedgerView>>> GetLedger([FromQuery] string? kinds, [FromQuery] int? page, [FromQuery] int? pageSize, CancellationToken cancellationToken)
    {
        var me = await GetCurrentUserAsync(_dbContext);
        if (me is null)
        {
            return NotSignedIn();
        }

        var (safePage, safeSize) = Paging(page, pageSize, 30);
        var query = _dbContext.LedgerEntries.AsNoTracking().Where(x => x.UserId == me.Id);
        var parsedKinds = (kinds ?? string.Empty)
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(x => Enum.TryParse<LedgerKind>(x, true, out var kind) ? kind : (LedgerKind?)null)
            .Where(x => x.HasValue)
            .Select(x => x!.Value)
            .ToList();
        if (parsedKinds.Count > 0)
        {
            query = query.Where(x => parsedKinds.Contains(x.Kind));
        }

        var total = await query.CountAsync(cancellationToken);
        var items = await query.OrderByDescending(x => x.CreatedAtUtc).Skip((safePage - 1) * safeSize).Take(safeSize).ToListAsync(cancellationToken);

        return Ok(new PagedResult<LedgerView>(items.Select(Views.Ledger).ToList(), total, safePage, safeSize));
    }

    [HttpGet("deposits")]
    public async Task<ActionResult<DepositListView>> GetDeposits([FromQuery] string? period, [FromQuery] string? status, [FromQuery] int? page, [FromQuery] int? pageSize, CancellationToken cancellationToken)
    {
        var me = await GetCurrentUserAsync(_dbContext);
        if (me is null)
        {
            return NotSignedIn();
        }

        var (safePage, safeSize) = Paging(page, pageSize);
        var query = DepositQueries.Filter(_dbContext.Deposits.Where(x => x.DevoteeUserId == me.Id), period, status, null, null);
        return Ok(await DepositQueries.PageAsync(_dbContext, query, safePage, safeSize, false, cancellationToken));
    }

    [HttpGet("deposits/{id:long}")]
    public async Task<ActionResult<DepositView>> GetDeposit(long id, CancellationToken cancellationToken)
    {
        var me = await GetCurrentUserAsync(_dbContext);
        if (me is null)
        {
            return NotSignedIn();
        }

        var deposit = await _dbContext.Deposits.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && x.DevoteeUserId == me.Id, cancellationToken);
        if (deposit is null)
        {
            return Error("Deposit not found.", StatusCodes.Status404NotFound);
        }

        var temple = await _dbContext.Temples.Where(x => x.Id == deposit.TempleId).Select(x => x.Name).FirstOrDefaultAsync(cancellationToken);
        return Ok(Views.Deposit(deposit, temple ?? string.Empty, false));
    }

    [HttpGet("notices")]
    public async Task<IActionResult> GetNotices(CancellationToken cancellationToken)
    {
        var me = await GetCurrentUserAsync(_dbContext);
        if (me is null)
        {
            return NotSignedIn();
        }

        var notices = await _dbContext.Notices.AsNoTracking()
            .Where(x => x.UserId == me.Id && x.DismissedAtUtc == null)
            .OrderByDescending(x => x.CreatedAtUtc)
            .Take(20)
            .Select(x => new { x.Id, x.Kind, x.Kg, x.Waste, x.Points, temple = x.TempleName, x.Reason, x.DepositId, x.CreatedAtUtc })
            .ToListAsync(cancellationToken);

        return Ok(notices);
    }

    [HttpPost("notices/{id:guid}/dismiss")]
    public async Task<IActionResult> DismissNotice(Guid id, CancellationToken cancellationToken)
    {
        var me = await GetCurrentUserAsync(_dbContext);
        if (me is null)
        {
            return NotSignedIn();
        }

        var notice = await _dbContext.Notices.FirstOrDefaultAsync(x => x.Id == id && x.UserId == me.Id, cancellationToken);
        if (notice is null)
        {
            return Error("Notice not found.", StatusCodes.Status404NotFound);
        }

        notice.DismissedAtUtc = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpGet("qr")]
    public async Task<IActionResult> GetQr()
    {
        var me = await GetCurrentUserAsync(_dbContext);
        if (me is null)
        {
            return NotSignedIn();
        }

        var (token, expiresAtUtc) = _jwtService.CreateQrToken(me);
        return Ok(new { qrToken = token, expiresAtUtc, maskedMobile = Mobile.Mask(me.MobileNumber) });
    }

    private async Task<object> BuildProfileAsync(User me, CancellationToken cancellationToken)
    {
        var society = me.SocietyId.HasValue
            ? await _dbContext.Societies.AsNoTracking().Where(x => x.Id == me.SocietyId.Value).Select(x => new { x.Id, x.Name, x.Area }).FirstOrDefaultAsync(cancellationToken)
            : null;
        var latestKyc = await _dbContext.KycSubmissions.AsNoTracking().Where(x => x.UserId == me.Id).OrderByDescending(x => x.SubmittedAtUtc).FirstOrDefaultAsync(cancellationToken);
        var rules = await _rulesService.LoadAsync(cancellationToken);
        var balances = await _pointsService.GetBalancesAsync(me.Id, cancellationToken);
        var temple = await _dbContext.Temples.AsNoTracking().Where(x => x.AdminUserId == me.Id).Select(x => new { x.Id, x.Name, x.Status }).FirstOrDefaultAsync(cancellationToken);

        return new
        {
            userId = me.Id,
            mobileNumber = me.MobileNumber,
            maskedMobile = Mobile.Mask(me.MobileNumber),
            fullName = me.FullName,
            dateOfBirth = me.DateOfBirth,
            address = me.Address,
            state = me.State,
            city = me.City,
            pin = me.Pin,
            userType = me.UserType,
            staffRole = Roles.ToStaffRole(me.UserType),
            accountStatus = me.AccountStatus,
            profileComplete = !string.IsNullOrWhiteSpace(me.FullName) && me.DateOfBirth.HasValue,
            kyc = new { status = me.KycStatus, docType = latestKyc?.DocType ?? string.Empty, reason = latestKyc?.Reason ?? string.Empty },
            level = rules.LevelFor(balances.Lifetime),
            society,
            poolOn = me.PoolOn,
            language = me.Language,
            textSize = me.TextSize,
            consents = await ConsentsAsync(me.Id, cancellationToken),
            temple,
            createdAtUtc = me.CreatedAtUtc
        };
    }

    private async Task<List<object>> ConsentsAsync(Guid userId, CancellationToken cancellationToken)
    {
        var consents = await _dbContext.Consents.AsNoTracking().Where(x => x.UserId == userId).OrderBy(x => x.Key).ToListAsync(cancellationToken);
        return consents.Select(x => (object)new { id = x.Key, x.Label, x.Version, x.Active, at = x.UpdatedAtUtc }).ToList();
    }
}
