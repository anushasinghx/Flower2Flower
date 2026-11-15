using backend.Data;
using backend.DTOs;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Services;

public sealed record DepositQuote(
    string Waste,
    bool Eligible,
    int LevelNumber,
    decimal Multiplier,
    decimal EligibleKg,
    int BasePoints,
    int Points,
    decimal Charge,
    bool OverMax,
    bool WillHold,
    bool Flagged,
    int RejectionsThisWeek,
    int RejectionLimit);

public sealed record DepositOutcome(Deposit? Deposit, string? Error, int StatusCode, bool Duplicate);

public sealed class DepositService
{
    public const int RapidDepositCount = 6;

    private readonly AppDbContext _dbContext;
    private readonly PointsService _pointsService;

    public DepositService(AppDbContext dbContext, PointsService pointsService)
    {
        _dbContext = dbContext;
        _pointsService = pointsService;
    }

    public async Task<User?> ResolveDevoteeAsync(Guid? devoteeUserId, string? mobileNumber, CancellationToken cancellationToken = default)
    {
        if (devoteeUserId.HasValue)
        {
            return await _dbContext.Users.FirstOrDefaultAsync(x => x.Id == devoteeUserId.Value && x.UserType == UserType.Devotee, cancellationToken);
        }

        var normalized = Mobile.Normalize(mobileNumber);
        if (!Mobile.IsValid(normalized))
        {
            return null;
        }

        return await _dbContext.Users.FirstOrDefaultAsync(x => x.NormalizedMobileNumber == normalized && x.UserType == UserType.Devotee, cancellationToken);
    }

    public async Task<int> RejectionsThisWeekAsync(Guid devoteeUserId, DateTime atUtc, CancellationToken cancellationToken = default)
    {
        var since = atUtc.AddDays(-7);
        return await _dbContext.Deposits.CountAsync(x => x.DevoteeUserId == devoteeUserId && x.Status == DepositStatus.Rejected && x.CapturedAtUtc > since, cancellationToken);
    }

    public async Task<DepositQuote> QuoteAsync(User devotee, string waste, decimal kg, DateTime capturedAtUtc, RulesSnapshot rules, CancellationToken cancellationToken = default)
    {
        var rule = rules.RuleFor(waste);
        var balances = await _pointsService.GetBalancesAsync(devotee.Id, cancellationToken);
        var level = rules.LevelFor(balances.Lifetime);
        var eligibleKg = kg;

        if (rule is not null && rule.Charge is null && rule.MaxPerDay > 0)
        {
            var dayStart = AppClock.LocalDayStartUtc(AppClock.LocalDate(capturedAtUtc));
            var dayEnd = dayStart.AddDays(1);
            var already = await _dbContext.Deposits
                .Where(x => x.DevoteeUserId == devotee.Id && x.Waste == rule.Waste && x.Status != DepositStatus.Rejected && x.CapturedAtUtc >= dayStart && x.CapturedAtUtc < dayEnd)
                .SumAsync(x => (decimal?)x.Kg, cancellationToken) ?? 0;
            eligibleKg = Math.Clamp(rule.MaxPerDay - already, 0, kg);
        }

        var basePoints = rule is not null && rule.Charge is null ? eligibleKg * rule.PtsPerKg : 0;
        var charge = rule?.Charge is > 0 ? Math.Round(kg * rule.Charge.Value, MidpointRounding.AwayFromZero) : 0;
        var overMax = kg > rules.Settings.MaxDepositKg;
        var flagged = await _pointsService.IsFlaggedAsync(devotee.Id, cancellationToken);
        var rejections = await RejectionsThisWeekAsync(devotee.Id, capturedAtUtc, cancellationToken);

        return new DepositQuote(
            rule?.Waste ?? waste,
            rule is not null,
            level.Number,
            level.Multiplier,
            Math.Round(eligibleKg, 3),
            (int)Math.Round(basePoints, MidpointRounding.AwayFromZero),
            (int)Math.Round(basePoints * level.Multiplier, MidpointRounding.AwayFromZero),
            charge,
            overMax,
            overMax && rules.Settings.HoldOnFlag,
            flagged,
            rejections,
            rules.Settings.RejectionLimit);
    }

    public async Task<DepositOutcome> RecordAsync(User operatorUser, DepositRequest request, RulesSnapshot rules, bool offlineSync, CancellationToken cancellationToken = default)
    {
        var clientId = string.IsNullOrWhiteSpace(request.ClientId) ? null : request.ClientId.Trim();
        if (clientId is not null)
        {
            var existing = await _dbContext.Deposits.FirstOrDefaultAsync(x => x.ClientId == clientId, cancellationToken);
            if (existing is not null)
            {
                return new DepositOutcome(existing, null, StatusCodes.Status200OK, true);
            }
        }

        if (request.Kg <= 0 || request.Kg > 1000)
        {
            return Fail("Enter a weight greater than zero.");
        }

        var devotee = await ResolveDevoteeAsync(request.DevoteeUserId, request.MobileNumber, cancellationToken);
        if (devotee is null)
        {
            return Fail("Devotee not found. Register the devotee first.", StatusCodes.Status404NotFound);
        }

        if (devotee.AccountStatus != "Active")
        {
            return Fail("This devotee account is not active.", StatusCodes.Status409Conflict);
        }

        var temple = await _dbContext.Temples.AsNoTracking().FirstOrDefaultAsync(x => x.Id == request.TempleId, cancellationToken);
        if (temple is null || temple.Status != TempleStatus.Verified)
        {
            return Fail("Choose a verified temple counter.");
        }

        if (request.PhotoFileId.HasValue)
        {
            var photoExists = await _dbContext.StoredFiles.AnyAsync(x => x.Id == request.PhotoFileId.Value && x.Purpose == FilePurpose.PurityPhoto, cancellationToken);
            if (!photoExists)
            {
                return Fail("Purity photo was not found. Upload it again.");
            }
        }
        else if (!request.Rejected)
        {
            return Fail("A purity photo is needed to accept a deposit.");
        }

        var reason = (request.Reason ?? string.Empty).Trim();
        if (request.Rejected && reason.Length == 0)
        {
            return Fail("Choose a reason to reject.");
        }

        var capturedAt = request.CapturedAtUtc.HasValue ? AppClock.EnsureUtc(request.CapturedAtUtc.Value) : DateTime.UtcNow;
        if (capturedAt > DateTime.UtcNow.AddMinutes(5))
        {
            capturedAt = DateTime.UtcNow;
        }

        var quote = await QuoteAsync(devotee, request.Waste, request.Kg, capturedAt, rules, cancellationToken);
        if (!request.Rejected)
        {
            if (!quote.Eligible)
            {
                return Fail("This waste type is not eligible. Reject it with a reason instead.");
            }

            if (quote.Charge > 0 && !request.ChargeCollected)
            {
                return Fail("Collect the handling charge before accepting.");
            }
        }

        var conflict = offlineSync && quote.Flagged && !request.Rejected;
        var status = request.Rejected
            ? DepositStatus.Rejected
            : quote.WillHold || conflict
                ? DepositStatus.Held
                : DepositStatus.Accepted;

        var deposit = new Deposit
        {
            ClientId = clientId,
            DevoteeUserId = devotee.Id,
            DevoteeName = devotee.FullName ?? "Devotee",
            MobileNumber = devotee.MobileNumber,
            TempleId = temple.Id,
            OperatorUserId = operatorUser.Id,
            Waste = quote.Waste,
            Kg = Math.Round(request.Kg, 3),
            Points = request.Rejected ? 0 : quote.Points,
            Charge = quote.Charge,
            ChargeCollected = request.ChargeCollected,
            Status = status,
            Reason = request.Rejected ? reason : string.Empty,
            Note = (request.Note ?? string.Empty).Trim(),
            PhotoFileId = request.PhotoFileId,
            Checks = string.Join("|", (request.Checks ?? new List<string>()).Select(x => x.Trim()).Where(x => x.Length > 0)),
            Conflict = conflict,
            CapturedAtUtc = capturedAt,
            SyncedAtUtc = DateTime.UtcNow
        };

        await using var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);
        _dbContext.Deposits.Add(deposit);
        await _dbContext.SaveChangesAsync(cancellationToken);

        await ApplyEffectsAsync(deposit, temple.Name, devotee, rules, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return new DepositOutcome(deposit, null, StatusCodes.Status201Created, false);
    }

    private async Task ApplyEffectsAsync(Deposit deposit, string templeName, User devotee, RulesSnapshot rules, CancellationToken cancellationToken)
    {
        var name = deposit.DevoteeName;

        if (deposit.Kg > rules.Settings.MaxDepositKg)
        {
            AddAlert(AlertSeverity.Medium, name, devotee.Id, "Weight above max", AlertRuleKind.Weight,
                $"A {deposit.Kg:0.###} kg deposit was entered at {templeName}",
                deposit.Status == DepositStatus.Held && !deposit.Conflict ? deposit.Points : 0, deposit.Id);
        }

        if (deposit.Status == DepositStatus.Rejected)
        {
            var rejections = await RejectionsThisWeekAsync(devotee.Id, deposit.CapturedAtUtc.AddSeconds(1), cancellationToken);
            var alreadyOpen = await _dbContext.Alerts.AnyAsync(x => x.SubjectUserId == devotee.Id && x.RuleKind == AlertRuleKind.Rejection && x.Status == AlertStatus.Open, cancellationToken);
            if (rejections >= rules.Settings.RejectionLimit && !alreadyOpen)
            {
                AddAlert(AlertSeverity.High, name, devotee.Id, $"{rules.Settings.RejectionLimit} rejections in 7 days", AlertRuleKind.Rejection,
                    $"{rejections} rejections in 7 days at {templeName}", 0, deposit.Id);
            }
        }

        var hourAgo = deposit.CapturedAtUtc.AddHours(-1);
        var recent = await _dbContext.Deposits.CountAsync(x => x.DevoteeUserId == devotee.Id && x.CapturedAtUtc > hourAgo && x.CapturedAtUtc <= deposit.CapturedAtUtc, cancellationToken);
        if (recent >= RapidDepositCount)
        {
            var rapidOpen = await _dbContext.Alerts.AnyAsync(x => x.SubjectUserId == devotee.Id && x.RuleKind == AlertRuleKind.Rapid && x.Status == AlertStatus.Open, cancellationToken);
            if (!rapidOpen)
            {
                AddAlert(AlertSeverity.Medium, name, devotee.Id, $"{recent} deposits in 1 hour", AlertRuleKind.Rapid,
                    $"{recent} deposits within 1 hour at {templeName}", 0, deposit.Id);
            }
        }

        if (deposit.Conflict)
        {
            AddAlert(AlertSeverity.Medium, name, devotee.Id, "Sync conflict", AlertRuleKind.Other,
                $"Deposit D{deposit.Id} synced after the devotee was flagged", deposit.Points, deposit.Id);
        }

        var kind = deposit.Status switch
        {
            DepositStatus.Accepted => LedgerKind.Earned,
            DepositStatus.Held => LedgerKind.Held,
            _ => LedgerKind.Rejected
        };

        _dbContext.LedgerEntries.Add(new LedgerEntry
        {
            Id = Guid.NewGuid(),
            UserId = devotee.Id,
            Kind = kind,
            Points = deposit.Status == DepositStatus.Rejected ? 0 : deposit.Points,
            Title = $"{deposit.Kg:0.##} kg",
            Detail = deposit.Status switch
            {
                DepositStatus.Rejected => "Contaminated, rejected",
                DepositStatus.Held => "Held, under review",
                _ => deposit.Waste
            },
            DepositId = deposit.Id,
            CreatedAtUtc = deposit.CapturedAtUtc
        });

        _dbContext.Notices.Add(new Notice
        {
            Id = Guid.NewGuid(),
            UserId = devotee.Id,
            DepositId = deposit.Id,
            Kind = deposit.Status,
            Kg = deposit.Kg,
            Waste = deposit.Waste,
            Points = deposit.Points,
            TempleName = templeName,
            Reason = deposit.Reason,
            CreatedAtUtc = DateTime.UtcNow
        });
    }

    private void AddAlert(AlertSeverity severity, string subject, Guid subjectUserId, string rule, AlertRuleKind kind, string detail, int heldPoints, long depositId)
    {
        _dbContext.Alerts.Add(new Alert
        {
            Id = Guid.NewGuid(),
            Severity = severity,
            Subject = subject,
            SubjectUserId = subjectUserId,
            Rule = rule,
            RuleKind = kind,
            Detail = detail,
            HeldPoints = heldPoints,
            DepositId = depositId,
            Status = AlertStatus.Open,
            CreatedAtUtc = DateTime.UtcNow
        });
    }

    private static DepositOutcome Fail(string message, int statusCode = StatusCodes.Status400BadRequest)
    {
        return new DepositOutcome(null, message, statusCode, false);
    }
}
