using backend.Data;
using backend.DTOs;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers.Admin;

[Authorize(Roles = Roles.Admin)]
[Route("api/v1/admin/products")]
public sealed class AdminProductsController : ApiControllerBase
{
    private readonly AppDbContext _dbContext;
    private readonly AuditService _audit;

    public AdminProductsController(AppDbContext dbContext, AuditService audit)
    {
        _dbContext = dbContext;
        _audit = audit;
    }

    [HttpGet]
    public async Task<ActionResult<List<ProductView>>> GetList([FromQuery] string? q, [FromQuery] string? category, [FromQuery] bool? listed, CancellationToken cancellationToken)
    {
        var query = _dbContext.Products.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(category) && !string.Equals(category, "All", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(x => x.Category == category);
        }

        if (listed.HasValue)
        {
            query = query.Where(x => x.Listed == listed.Value);
        }

        var term = (q ?? string.Empty).Trim();
        if (term.Length > 0)
        {
            var pattern = $"%{term}%";
            query = query.Where(x => EF.Functions.ILike(x.Name, pattern) || EF.Functions.ILike(x.Category, pattern) || EF.Functions.ILike(x.Pack, pattern));
        }

        var products = await query.OrderBy(x => x.Category).ThenBy(x => x.Name).ThenBy(x => x.Price).ToListAsync(cancellationToken);
        return Ok(products.Select(Views.Product).ToList());
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ProductView>> GetOne(Guid id, CancellationToken cancellationToken)
    {
        var product = await _dbContext.Products.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (product is null)
        {
            return Error("Product not found.", StatusCodes.Status404NotFound);
        }

        return Ok(Views.Product(product));
    }

    [HttpPost]
    public async Task<ActionResult<ProductView>> Create([FromBody] ProductRequest request, CancellationToken cancellationToken)
    {
        var me = await GetCurrentUserAsync(_dbContext);
        if (me is null)
        {
            return NotSignedIn();
        }

        var product = new Product { Id = Guid.NewGuid(), CreatedAtUtc = DateTime.UtcNow };
        Apply(product, request);
        _dbContext.Products.Add(product);
        _audit.Add(me, "Product added", $"{product.Name} {product.Pack}", "None", product.Listed ? "Listed" : "Hidden", "Catalogue edit");
        await _dbContext.SaveChangesAsync(cancellationToken);

        return StatusCode(StatusCodes.Status201Created, Views.Product(product));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ProductView>> Update(Guid id, [FromBody] ProductRequest request, CancellationToken cancellationToken)
    {
        var me = await GetCurrentUserAsync(_dbContext);
        if (me is null)
        {
            return NotSignedIn();
        }

        var product = await _dbContext.Products.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (product is null)
        {
            return Error("Product not found.", StatusCodes.Status404NotFound);
        }

        var before = $"{product.Price} INR, {product.Points} pts, stock {product.Stock}, {(product.Listed ? "Listed" : "Hidden")}";
        Apply(product, request);
        var after = $"{product.Price} INR, {product.Points} pts, stock {product.Stock}, {(product.Listed ? "Listed" : "Hidden")}";
        _audit.Add(me, "Product changed", $"{product.Name} {product.Pack}", before, after, "Catalogue edit");
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(Views.Product(product));
    }

    private static void Apply(Product product, ProductRequest request)
    {
        product.Group = request.Group.Trim();
        product.Name = request.Name.Trim();
        product.NameHi = (request.NameHi ?? string.Empty).Trim();
        product.Category = request.Category.Trim();
        product.Pack = request.Pack.Trim();
        product.Price = request.Price;
        product.Points = request.Points;
        product.Stock = request.Stock;
        product.Listed = request.Listed;
        product.UpdatedAtUtc = DateTime.UtcNow;
    }
}
