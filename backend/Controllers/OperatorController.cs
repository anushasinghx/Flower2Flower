using backend.Data;
using backend.DTOs;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[Authorize(Roles = Roles.OperatorOrAdmin)]
[Route("api/v1/operator")]
public sealed class OperatorController : ApiControllerBase
{
    private readonly AppDbContext _dbContext;
    private readonly RulesService _rulesService;
    private readonly PointsService _pointsService;
    private readonly DepositService _depositService;
    private readonly Fast2SmsOtpService _otpService;
    private readonly JwtService _jwtService;
    private readonly AuditService _audit;

    public OperatorController(AppDbContext dbContext, RulesService rulesService, PointsService pointsService, DepositService depositService, Fast2SmsOtpService otpService, JwtService jwtService, AuditService audit)
    {
        _dbContext = dbContext;
        _rulesService = rulesService;
        _pointsService = pointsService;
        _depositService = depositService;
        _otpService = otpService;
        _jwtService = jwtService;
        _audit = audit;
    }

    [HttpGet("temples")]
    public async Task<ActionResult<List<PublicTempleView>>> GetTemples(CancellationToken cancellationToken)
    {
        var temples = await _dbContext.Temples.AsNoTracking().Where(x => x.Status == TempleStatus.Verified).OrderBy(x => x.Name).ToListAsync(cancellationToken);
        return Ok(temples.Select(Views.PublicTemple).ToList());
    }

    [HttpGet("devotees/lookup")]
    public async Task<IActionResult> Lookup([FromQuery] string? mobile, [FromQuery] string? qr, CancellationToken cancellationToken)
    {
        User? devotee;
        if (!string.IsNullOrWhiteSpace(qr))
        {
            var userId = _jwtService.ReadQrToken(qr.Trim());
            if (userId is null)
            {
                return Error("This QR code is not valid or has expired.");
            }

            devotee = await _dbContext.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Id == userId.Value && x.UserType == UserType.Devotee, cancellationToken);
        }
        else
        {
            var normalized = Mobile.Normalize(mobile);
            if (!Mobile.IsValid(normalized))
            {
                return Error("Enter a valid 10 digit number starting with 6, 7, 8 or 9.");
            }

            devotee = await _dbContext.Users.AsNoTracking().FirstOrDefaultAsync(x => x.NormalizedMobileNumber == normalized && x.UserType == UserType.Devotee, cancellationToken);
        }

        if (devotee is null)
        {
            return Error("No devotee found with this number. Register them at the counter.", StatusCodes.Status404NotFound);
        }

        var rules = await _rulesService.LoadAsync(cancellationToken);
        var balances = await _pointsService.GetBalancesAsync(devotee.Id, cancellationToken);
        var societyName = devotee.SocietyId.HasValue
            ? await _dbContext.Societies.Where(x => x.Id == devotee.SocietyId.Value).Select(x => x.Name).FirstOrDefaultAsync(cancellationToken)
            : null;
        var assistedBy = devotee.AssistedByUserId.HasValue
            ? await _dbContext.Users.Where(x => x.Id == devotee.AssistedByUserId.Value).Select(x => x.FullName).FirstOrDefaultAsync(cancellationToken)
            : null;

        return Ok(new
        {
            userId = devotee.Id,
            maskedMobile = Mobile.Mask(devotee.MobileNumber),
            name = devotee.FullName ?? "Devotee",
            level = rules.LevelFor(balances.Lifetime).Number,
            kyc = devotee.KycStatus,
            societyId = devotee.SocietyId,
            societyName,
            flagged = await _pointsService.IsFlaggedAsync(devotee.Id, cancellationToken),
            assistedBy,
            accountStatus = devotee.AccountStatus,
            rejectionsThisWeek = await _depositService.RejectionsThisWeekAsync(devotee.Id, DateTime.UtcNow, cancellationToken),
            rejectionLimit = rules.Settings.RejectionLimit
        });
    }

    [HttpPost("devotees/send-otp")]
    public async Task<IActionResult> SendRegistrationOtp([FromBody] OperatorSendOtpRequest request, CancellationToken cancellationToken)
    {
        var normalized = Mobile.Normalize(request.MobileNumber);
        if (!Mobile.IsValid(normalized))
        {
            return Error("Enter a valid mobile number.");
        }

        if (await _dbContext.Users.AnyAsync(x => x.NormalizedMobileNumber == normalized, cancellationToken))
        {
            return Error("This number is already registered.", StatusCodes.Status409Conflict);
        }

        var result = await _otpService.SendOtpAsync(normalized);
        if (!result.IsSuccess)
        {
            return Error(result.Message, StatusCodes.Status503ServiceUnavailable);
        }

        return Ok(new { message = "An OTP was sent to the devotee's mobile." });
    }

    [HttpPost("devotees/register")]
    public async Task<IActionResult> RegisterDevotee([FromBody] AssistedRegisterRequest request, CancellationToken cancellationToken)
    {
        var me = await GetCurrentUserAsync(_dbContext);
        if (me is null)
        {
            return NotSignedIn();
        }

        var normalized = Mobile.Normalize(request.MobileNumber);
        if (!Mobile.IsValid(normalized))
        {
            return Error("Enter a valid mobile number.");
        }

        if (!request.DateOfBirth.HasValue)
        {
            return Error("Enter the date of birth.");
        }

        if (Mobile.AgeOn(request.DateOfBirth.Value, AppClock.LocalToday) < 18)
        {
            return Error("The devotee must be 18 or older.");
        }

        if (!request.RulesConsent || !request.KycConsent)
        {
            return Error("Both consents are needed to register.");
        }

        if (await _dbContext.Users.AnyAsync(x => x.NormalizedMobileNumber == normalized, cancellationToken))
        {
            return Error("This number is already registered.", StatusCodes.Status409Conflict);
        }

        var otp = request.Otp.Trim();
        if (otp.Length != 6 || !otp.All(char.IsDigit))
        {
            return Error("Enter the 6 digit code.");
        }

        var verified = await _otpService.VerifyOtpAsync(normalized, otp);
        if (!verified.IsSuccess)
        {
            return Error("Incorrect code. Try again.");
        }

        var now = DateTime.UtcNow;
        var devotee = new User
        {
            Id = Guid.NewGuid(),
            MobileNumber = normalized,
            NormalizedMobileNumber = normalized,
            FullName = request.FullName.Trim(),
            DateOfBirth = request.DateOfBirth,
            UserType = UserType.Devotee,
            MobileVerified = true,
            AccountStatus = "Active",
            Language = request.Language,
            AssistedByUserId = me.Id,
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };
        _dbContext.Users.Add(devotee);
        _dbContext.Consents.AddRange(
            new Consent { Id = Guid.NewGuid(), UserId = devotee.Id, Key = "rules", Label = "Nirmalya deposit and points rules", Version = "v1", Active = true, UpdatedAtUtc = now },
            new Consent { Id = Guid.NewGuid(), UserId = devotee.Id, Key = "data", Label = "Data and KYC processing", Version = "v1", Active = true, UpdatedAtUtc = now });
        _audit.Add(me, "Assisted registration", devotee.FullName, "None", "Registered", "Registered at the counter");
        await _dbContext.SaveChangesAsync(cancellationToken);

        return StatusCode(StatusCodes.Status201Created, new
        {
            userId = devotee.Id,
            maskedMobile = Mobile.Mask(devotee.MobileNumber),
            name = devotee.FullName,
            level = 1,
            kyc = devotee.KycStatus,
            flagged = false,
            assistedBy = me.FullName
        });
    }

    [HttpPost("deposits/quote")]
    public async Task<IActionResult> Quote([FromBody] DepositQuoteRequest request, CancellationToken cancellationToken)
    {
        var devotee = await _depositService.ResolveDevoteeAsync(request.DevoteeUserId, request.MobileNumber, cancellationToken);
        if (devotee is null)
        {
            return Error("Devotee not found.", StatusCodes.Status404NotFound);
        }

        var rules = await _rulesService.LoadAsync(cancellationToken);
        var quote = await _depositService.QuoteAsync(devotee, request.Waste, request.Kg, DateTime.UtcNow, rules, cancellationToken);
        return Ok(quote);
    }

    [HttpPost("deposits")]
    public async Task<IActionResult> CreateDeposit([FromBody] DepositRequest request, CancellationToken cancellationToken)
    {
        var me = await GetCurrentUserAsync(_dbContext);
        if (me is null)
        {
            return NotSignedIn();
        }

        var rules = await _rulesService.LoadAsync(cancellationToken);
        var outcome = await _depositService.RecordAsync(me, request, rules, false, cancellationToken);
        if (outcome.Deposit is null)
        {
            return Error(outcome.Error ?? "Unable to save the deposit.", outcome.StatusCode);
        }

        var templeName = await _dbContext.Temples.Where(x => x.Id == outcome.Deposit.TempleId).Select(x => x.Name).FirstOrDefaultAsync(cancellationToken);
        return StatusCode(outcome.StatusCode, Views.Deposit(outcome.Deposit, templeName ?? string.Empty, true));
    }

    [HttpPost("deposits/sync")]
    public async Task<IActionResult> SyncDeposits([FromBody] SyncDepositsRequest request, CancellationToken cancellationToken)
    {
        var me = await GetCurrentUserAsync(_dbContext);
        if (me is null)
        {
            return NotSignedIn();
        }

        var missingClientId = request.Deposits.Any(x => string.IsNullOrWhiteSpace(x.ClientId));
        if (missingClientId)
        {
            return Error("Every queued deposit needs a clientId so it is saved only once.");
        }

        var rules = await _rulesService.LoadAsync(cancellationToken);
        var results = new List<object>();
        foreach (var item in request.Deposits.OrderBy(x => x.CapturedAtUtc ?? DateTime.UtcNow))
        {
            var outcome = await _depositService.RecordAsync(me, item, rules, true, cancellationToken);
            _dbContext.ChangeTracker.Clear();
            results.Add(new
            {
                clientId = item.ClientId,
                saved = outcome.Deposit is not null,
                duplicate = outcome.Duplicate,
                depositId = outcome.Deposit?.Id,
                code = outcome.Deposit is null ? null : Views.DepositCode(outcome.Deposit.Id),
                status = outcome.Deposit?.Status,
                conflict = outcome.Deposit?.Conflict ?? false,
                points = outcome.Deposit?.Points ?? 0,
                error = outcome.Error
            });
        }

        return Ok(new { lastSyncAtUtc = DateTime.UtcNow, results });
    }

    [HttpGet("deposits")]
    public async Task<ActionResult<DepositListView>> GetDeposits([FromQuery] Guid? templeId, [FromQuery] string? period, [FromQuery] string? status, [FromQuery] string? q, [FromQuery] int? page, [FromQuery] int? pageSize, CancellationToken cancellationToken)
    {
        var me = await GetCurrentUserAsync(_dbContext);
        if (me is null)
        {
            return NotSignedIn();
        }

        var (safePage, safeSize) = Paging(page, pageSize);
        var source = templeId.HasValue ? _dbContext.Deposits.AsQueryable() : _dbContext.Deposits.Where(x => x.OperatorUserId == me.Id);
        var query = DepositQueries.Filter(source, period, status, q, templeId);
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

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary([FromQuery] Guid templeId, CancellationToken cancellationToken)
    {
        var temple = await _dbContext.Temples.AsNoTracking().FirstOrDefaultAsync(x => x.Id == templeId, cancellationToken);
        if (temple is null)
        {
            return Error("Temple not found.", StatusCodes.Status404NotFound);
        }

        var today = AppClock.LocalToday;
        var start = AppClock.LocalDayStartUtc(today);
        var end = start.AddDays(1);
        var deposits = await _dbContext.Deposits.AsNoTracking()
            .Where(x => x.TempleId == templeId && x.CapturedAtUtc >= start && x.CapturedAtUtc < end)
            .OrderByDescending(x => x.CapturedAtUtc)
            .ToListAsync(cancellationToken);
        var counted = deposits.Where(x => x.Status != DepositStatus.Rejected).ToList();
        var closed = await _dbContext.ClosedCollections.AsNoTracking().FirstOrDefaultAsync(x => x.TempleId == templeId && x.Date == today, cancellationToken);

        return Ok(new
        {
            date = today,
            templeId,
            templeName = temple.Name,
            deposits = deposits.Count,
            totalKg = Math.Round(counted.Sum(x => x.Kg), 3),
            accepted = deposits.Count(x => x.Status == DepositStatus.Accepted),
            held = deposits.Count(x => x.Status == DepositStatus.Held),
            rejected = deposits.Count(x => x.Status == DepositStatus.Rejected),
            points = counted.Sum(x => x.Points),
            chargesCollected = deposits.Where(x => x.ChargeCollected).Sum(x => x.Charge),
            byType = counted.GroupBy(x => x.Waste).Select(g => new { waste = g.Key, kg = Math.Round(g.Sum(x => x.Kg), 3) }).OrderByDescending(x => x.kg).ToList(),
            items = deposits.Select(x => Views.Deposit(x, temple.Name, true)).ToList(),
            closedCollection = closed is null ? null : Views.Collection(closed)
        });
    }

    [HttpPost("close-day")]
    public async Task<IActionResult> CloseDay([FromBody] CloseDayRequest request, CancellationToken cancellationToken)
    {
        var me = await GetCurrentUserAsync(_dbContext);
        if (me is null)
        {
            return NotSignedIn();
        }

        var temple = await _dbContext.Temples.AsNoTracking().FirstOrDefaultAsync(x => x.Id == request.TempleId, cancellationToken);
        if (temple is null)
        {
            return Error("Temple not found.", StatusCodes.Status404NotFound);
        }

        var today = AppClock.LocalToday;
        var start = AppClock.LocalDayStartUtc(today);
        var end = start.AddDays(1);
        var kg = await _dbContext.Deposits
            .Where(x => x.TempleId == temple.Id && x.Status != DepositStatus.Rejected && x.CapturedAtUtc >= start && x.CapturedAtUtc < end)
            .SumAsync(x => (decimal?)x.Kg, cancellationToken) ?? 0;

        var collection = await _dbContext.ClosedCollections.FirstOrDefaultAsync(x => x.TempleId == temple.Id && x.Date == today, cancellationToken);
        if (collection is not null && collection.Used)
        {
            return Error("Today's collection is already in a batch.", StatusCodes.Status409Conflict);
        }

        if (collection is null)
        {
            collection = new ClosedCollection { Id = Guid.NewGuid(), TempleId = temple.Id, Date = today };
            _dbContext.ClosedCollections.Add(collection);
        }

        collection.Source = temple.Name;
        collection.Kg = Math.Round(kg, 2);
        collection.ClosedByUserId = me.Id;
        collection.CreatedAtUtc = DateTime.UtcNow;
        _audit.Add(me, "Day closed", temple.Name, "Open", $"{collection.Kg} kg", "Daily collection closed at the counter");
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(Views.Collection(collection));
    }
}
