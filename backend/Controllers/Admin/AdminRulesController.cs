using backend.Data;
using backend.DTOs;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers.Admin;

[Authorize(Roles = Roles.Admin)]
[Route("api/v1/admin/rules")]
public sealed class AdminRulesController : ApiControllerBase
{
    private readonly AppDbContext _dbContext;
    private readonly RulesService _rulesService;
    private readonly AuditService _audit;

    public AdminRulesController(AppDbContext dbContext, RulesService rulesService, AuditService audit)
    {
        _dbContext = dbContext;
        _rulesService = rulesService;
        _audit = audit;
    }

    [HttpGet]
    public async Task<ActionResult<RulesView>> Get(CancellationToken cancellationToken)
    {
        return Ok(Views.Rules(await _rulesService.LoadAsync(cancellationToken)));
    }

    [HttpPut]
    public async Task<ActionResult<RulesView>> Publish([FromBody] PublishRulesRequest request, CancellationToken cancellationToken)
    {
        var me = await GetCurrentUserAsync(_dbContext);
        if (me is null)
        {
            return NotSignedIn();
        }

        var wastes = request.Earning.Select(x => x.Waste.Trim()).ToList();
        if (wastes.Distinct(StringComparer.OrdinalIgnoreCase).Count() != wastes.Count)
        {
            return Error("Each waste type can appear only once.");
        }

        if (request.Levels.Select(x => x.MinPoints).Distinct().Count() != request.Levels.Count)
        {
            return Error("Each level needs a different minimum points value.");
        }

        if (request.Levels.All(x => x.MinPoints != 0))
        {
            return Error("The first level must start at 0 points.");
        }

        var settings = await _dbContext.PointsSettings.FirstOrDefaultAsync(x => x.Id == 1, cancellationToken);
        if (settings is null)
        {
            settings = new PointsSettings { Id = 1, Version = 0 };
            _dbContext.PointsSettings.Add(settings);
        }

        if (request.BaseVersion.HasValue && request.BaseVersion.Value != settings.Version)
        {
            return Error($"Rules were changed by someone else. Reload version {settings.Version} and try again.", StatusCodes.Status409Conflict);
        }

        var oldVersion = settings.Version;
        await using var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);
        await _dbContext.EarningRules.ExecuteDeleteAsync(cancellationToken);
        await _dbContext.Levels.ExecuteDeleteAsync(cancellationToken);

        _dbContext.EarningRules.AddRange(request.Earning.Select((x, index) => new EarningRule
        {
            Id = Guid.NewGuid(),
            Waste = x.Waste.Trim(),
            PtsPerKg = x.Charge is > 0 ? 0 : x.PtsPerKg,
            MaxPerDay = x.MaxPerDay,
            Active = x.Active,
            Charge = x.Charge is > 0 ? x.Charge : null,
            SortOrder = index + 1
        }));
        _dbContext.Levels.AddRange(request.Levels.OrderBy(x => x.MinPoints).Select(x => new Level
        {
            Id = Guid.NewGuid(),
            Name = x.Name.Trim(),
            MinPoints = x.MinPoints,
            Multiplier = x.Multiplier
        }));

        settings.Version = oldVersion + 1;
        settings.PointsPerRupee = request.PointsPerRupee;
        settings.RequiresKyc = request.RequiresKyc;
        settings.MaxPctInPoints = request.MaxPctInPoints;
        settings.RejectionLimit = request.RejectionLimit;
        settings.MaxDepositKg = request.MaxDepositKg;
        settings.HoldOnFlag = request.HoldOnFlag;
        settings.UpdatedAtUtc = DateTime.UtcNow;

        _audit.Add(me, "Rule changed", "Points rules and levels", $"Version {oldVersion}", $"Version {settings.Version}", "Published from rules screen");
        await _dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return Ok(Views.Rules(await _rulesService.LoadAsync(cancellationToken)));
    }
}
