using backend.Data;
using backend.DTOs;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[AllowAnonymous]
[Route("api/v1")]
public sealed class PublicController : ApiControllerBase
{
    private readonly AppDbContext _dbContext;
    private readonly RulesService _rulesService;

    public PublicController(AppDbContext dbContext, RulesService rulesService)
    {
        _dbContext = dbContext;
        _rulesService = rulesService;
    }

    [HttpGet("public/stats")]
    public async Task<IActionResult> GetStats(CancellationToken cancellationToken)
    {
        var kg = await _dbContext.Deposits.Where(x => x.Status != DepositStatus.Rejected).SumAsync(x => (decimal?)x.Kg, cancellationToken) ?? 0;
        var devotees = await _dbContext.Users.CountAsync(x => x.UserType == UserType.Devotee && x.AccountStatus == "Active", cancellationToken);
        var temples = await _dbContext.Temples.CountAsync(x => x.Status == TempleStatus.Verified, cancellationToken);

        return Ok(new
        {
            kgOffered = Math.Round(kg),
            co2AvoidedKg = Math.Round(kg * PointsService.Co2PerKg),
            manureKg = Math.Round(kg * PointsService.ManurePerKg),
            devotees,
            verifiedTemples = temples
        });
    }

    [HttpGet("public/temples")]
    public async Task<ActionResult<List<PublicTempleView>>> GetTemples([FromQuery] string? q, CancellationToken cancellationToken)
    {
        var query = _dbContext.Temples.AsNoTracking().Where(x => x.Status == TempleStatus.Verified);
        var term = (q ?? string.Empty).Trim();
        if (term.Length > 0)
        {
            var pattern = $"%{term}%";
            query = query.Where(x => EF.Functions.ILike(x.Name, pattern) || EF.Functions.ILike(x.Address, pattern));
        }

        var temples = await query.OrderBy(x => x.Name).ToListAsync(cancellationToken);
        return Ok(temples.Select(Views.PublicTemple).ToList());
    }

    [HttpPost("public/contact")]
    public async Task<IActionResult> SendContact([FromBody] ContactRequest request, CancellationToken cancellationToken)
    {
        _dbContext.ContactMessages.Add(new ContactMessage
        {
            Id = Guid.NewGuid(),
            Name = (request.Name ?? string.Empty).Trim(),
            Message = request.Message.Trim(),
            Topic = request.Topic ?? "contact",
            UserId = CurrentUserId,
            CreatedAtUtc = DateTime.UtcNow
        });
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new { message = "Thank you. Your message was sent." });
    }

    [HttpGet("rules")]
    public async Task<ActionResult<RulesView>> GetRules(CancellationToken cancellationToken)
    {
        var rules = await _rulesService.LoadAsync(cancellationToken);
        return Ok(Views.Rules(rules));
    }

    [HttpGet("products")]
    public async Task<ActionResult<List<ProductView>>> GetProducts([FromQuery] string? category, [FromQuery] string? group, [FromQuery] string? q, CancellationToken cancellationToken)
    {
        var query = _dbContext.Products.AsNoTracking().Where(x => x.Listed);
        if (!string.IsNullOrWhiteSpace(category) && !string.Equals(category, "All", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(x => x.Category == category);
        }

        if (!string.IsNullOrWhiteSpace(group))
        {
            query = query.Where(x => x.Group == group);
        }

        var term = (q ?? string.Empty).Trim();
        if (term.Length > 0)
        {
            var pattern = $"%{term}%";
            query = query.Where(x => EF.Functions.ILike(x.Name, pattern) || EF.Functions.ILike(x.NameHi, pattern) || EF.Functions.ILike(x.Category, pattern));
        }

        var products = await query.OrderBy(x => x.Category).ThenBy(x => x.Name).ThenBy(x => x.Price).ToListAsync(cancellationToken);
        return Ok(products.Select(Views.Product).ToList());
    }

    [HttpGet("products/categories")]
    public async Task<ActionResult<List<string>>> GetCategories(CancellationToken cancellationToken)
    {
        var categories = await _dbContext.Products.Where(x => x.Listed).Select(x => x.Category).Distinct().OrderBy(x => x).ToListAsync(cancellationToken);
        return Ok(categories);
    }

    [HttpGet("products/{id:guid}")]
    public async Task<ActionResult<ProductView>> GetProduct(Guid id, CancellationToken cancellationToken)
    {
        var product = await _dbContext.Products.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && x.Listed, cancellationToken);
        if (product is null)
        {
            return Error("Product not found.", StatusCodes.Status404NotFound);
        }

        return Ok(Views.Product(product));
    }

    [HttpGet("societies")]
    public async Task<ActionResult<List<SocietyView>>> GetSocieties([FromQuery] string? q, CancellationToken cancellationToken)
    {
        var query = _dbContext.Societies.AsQueryable();
        var term = (q ?? string.Empty).Trim();
        if (term.Length > 0)
        {
            var pattern = $"%{term}%";
            query = query.Where(x => EF.Functions.ILike(x.Name, pattern) || EF.Functions.ILike(x.Area, pattern));
        }

        return Ok(await SocietyQueries.ListAsync(_dbContext, query, cancellationToken));
    }
}
