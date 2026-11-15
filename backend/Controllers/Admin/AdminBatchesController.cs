using backend.Data;
using backend.DTOs;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers.Admin;

[Authorize(Roles = Roles.Admin)]
[Route("api/v1/admin")]
public sealed class AdminBatchesController : ApiControllerBase
{
    private static readonly BatchStatus[] Stages =
    {
        BatchStatus.Created,
        BatchStatus.Composting,
        BatchStatus.Curing,
        BatchStatus.Ready,
        BatchStatus.Closed
    };

    private readonly AppDbContext _dbContext;
    private readonly AuditService _audit;

    public AdminBatchesController(AppDbContext dbContext, AuditService audit)
    {
        _dbContext = dbContext;
        _audit = audit;
    }

    [HttpGet("collections")]
    public async Task<ActionResult<List<ClosedCollectionView>>> GetCollections([FromQuery] bool? used, CancellationToken cancellationToken)
    {
        var query = _dbContext.ClosedCollections.AsNoTracking().AsQueryable();
        if (used.HasValue)
        {
            query = query.Where(x => x.Used == used.Value);
        }

        var items = await query.OrderByDescending(x => x.Date).ThenBy(x => x.Source).Take(500).ToListAsync(cancellationToken);
        return Ok(items.Select(Views.Collection).ToList());
    }

    [HttpGet("batches")]
    public async Task<IActionResult> GetBatches([FromQuery] BatchStatus? status, CancellationToken cancellationToken)
    {
        var query = Load().AsNoTracking();
        if (status.HasValue)
        {
            query = query.Where(x => x.Status == status.Value);
        }

        var batches = await query.OrderByDescending(x => x.Id).Take(500).ToListAsync(cancellationToken);
        var products = await ProductsAsync(batches, cancellationToken);
        var counts = await _dbContext.Batches.GroupBy(x => x.Status).Select(g => new { Status = g.Key, Count = g.Count() }).ToListAsync(cancellationToken);

        return Ok(new
        {
            items = batches.Select(x => Views.Batch(x, products)).ToList(),
            counts = Stages.ToDictionary(s => s.ToString(), s => counts.FirstOrDefault(c => c.Status == s)?.Count ?? 0)
        });
    }

    [HttpGet("batches/{id:int}")]
    public async Task<ActionResult<BatchView>> GetBatch(int id, CancellationToken cancellationToken)
    {
        var batch = await Load().AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (batch is null)
        {
            return Error("Batch not found.", StatusCodes.Status404NotFound);
        }

        return Ok(Views.Batch(batch, await ProductsAsync(new[] { batch }, cancellationToken)));
    }

    [HttpPost("batches")]
    public async Task<ActionResult<BatchView>> CreateBatch([FromBody] CreateBatchRequest request, CancellationToken cancellationToken)
    {
        var me = await GetCurrentUserAsync(_dbContext);
        if (me is null)
        {
            return NotSignedIn();
        }

        var ids = request.CollectionIds.Distinct().ToList();
        var collections = await _dbContext.ClosedCollections.Where(x => ids.Contains(x.Id)).ToListAsync(cancellationToken);
        if (collections.Count != ids.Count)
        {
            return Error("One of the collections was not found.", StatusCodes.Status404NotFound);
        }

        if (collections.Any(x => x.Used))
        {
            return Error("One of the collections is already in a batch.", StatusCodes.Status409Conflict);
        }

        var autoTotal = collections.Sum(x => x.Kg);
        var overridden = request.TotalOverrideKg.HasValue && request.TotalOverrideKg.Value != autoTotal;
        var overrideReason = (request.OverrideReason ?? string.Empty).Trim();
        if (overridden && overrideReason.Length == 0)
        {
            return Error("Give a reason when the total weight is changed.");
        }

        var batch = new Batch
        {
            Status = BatchStatus.Created,
            CreatedByUserId = me.Id,
            CreatedAtUtc = DateTime.UtcNow,
            Inputs = collections.OrderBy(x => x.Date).Select(x => new BatchInput
            {
                Id = Guid.NewGuid(),
                Source = x.Source,
                Date = x.Date,
                Kg = x.Kg,
                ClosedCollectionId = x.Id
            }).ToList()
        };

        if (overridden)
        {
            batch.Inputs.Add(new BatchInput
            {
                Id = Guid.NewGuid(),
                Source = $"Weight correction: {overrideReason}",
                Date = collections.Min(x => x.Date),
                Kg = request.TotalOverrideKg!.Value - autoTotal
            });
        }

        batch.Events.Add(new BatchEvent { Id = Guid.NewGuid(), Text = $"Created by {me.FullName ?? "Admin"}", CreatedAtUtc = DateTime.UtcNow });

        await using var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);
        _dbContext.Batches.Add(batch);
        await _dbContext.SaveChangesAsync(cancellationToken);

        foreach (var collection in collections)
        {
            collection.Used = true;
            collection.BatchId = batch.Id;
        }

        _audit.Add(me, "Batch created", Views.BatchCode(batch.Id), "None", "Created", overridden ? $"Total changed: {overrideReason}" : "Waste arrived at processing unit");
        await _dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return StatusCode(StatusCodes.Status201Created, Views.Batch(batch, new Dictionary<Guid, Product>()));
    }

    [HttpPost("batches/{id:int}/move")]
    public async Task<ActionResult<BatchView>> MoveBatch(int id, [FromBody] MoveBatchRequest request, CancellationToken cancellationToken)
    {
        var me = await GetCurrentUserAsync(_dbContext);
        if (me is null)
        {
            return NotSignedIn();
        }

        var batch = await Load().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (batch is null)
        {
            return Error("Batch not found.", StatusCodes.Status404NotFound);
        }

        var from = Array.IndexOf(Stages, batch.Status);
        var to = Array.IndexOf(Stages, request.To);
        var reason = (request.Reason ?? string.Empty).Trim();
        if (to < 0 || (to != from + 1 && to != from - 1))
        {
            return Error("A batch can only move one stage forward or back.");
        }

        if (to == from - 1 && reason.Length == 0)
        {
            return Error("Give a reason to move the batch back.");
        }

        var oldStatus = batch.Status;
        batch.Status = request.To;
        _dbContext.BatchEvents.Add(new BatchEvent
        {
            Id = Guid.NewGuid(),
            BatchId = batch.Id,
            Text = $"Moved to {request.To}{(reason.Length > 0 ? $" ({reason})" : string.Empty)}",
            CreatedAtUtc = DateTime.UtcNow
        });
        _audit.Add(me, "Batch status changed", Views.BatchCode(batch.Id), oldStatus.ToString(), request.To.ToString(), reason.Length > 0 ? reason : "Next stage");
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(Views.Batch(batch, await ProductsAsync(new[] { batch }, cancellationToken)));
    }

    [HttpPost("batches/{id:int}/stock")]
    public async Task<ActionResult<BatchView>> UpdateStock(int id, [FromBody] UpdateStockRequest request, CancellationToken cancellationToken)
    {
        var me = await GetCurrentUserAsync(_dbContext);
        if (me is null)
        {
            return NotSignedIn();
        }

        var batch = await Load().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (batch is null)
        {
            return Error("Batch not found.", StatusCodes.Status404NotFound);
        }

        if (batch.Status is not (BatchStatus.Ready or BatchStatus.Closed))
        {
            return Error("Record output once the batch is Ready.", StatusCodes.Status409Conflict);
        }

        var lines = request.Lines.GroupBy(x => x.ProductId).Select(g => new { ProductId = g.Key, Units = g.Sum(x => x.Units) }).ToList();
        var productIds = lines.Select(x => x.ProductId).ToList();
        var products = await _dbContext.Products.Where(x => productIds.Contains(x.Id)).ToDictionaryAsync(x => x.Id, cancellationToken);
        if (products.Count != productIds.Count)
        {
            return Error("One of the products was not found.", StatusCodes.Status404NotFound);
        }

        var oldOutput = batch.OutputKg;
        batch.OutputKg = request.OutputKg;
        foreach (var line in lines)
        {
            products[line.ProductId].Stock += line.Units;
            products[line.ProductId].UpdatedAtUtc = DateTime.UtcNow;
            _dbContext.BatchStockLines.Add(new BatchStockLine { Id = Guid.NewGuid(), BatchId = batch.Id, ProductId = line.ProductId, Units = line.Units, CreatedAtUtc = DateTime.UtcNow });
        }

        _dbContext.BatchEvents.Add(new BatchEvent { Id = Guid.NewGuid(), BatchId = batch.Id, Text = "Stock updated", CreatedAtUtc = DateTime.UtcNow });
        _audit.Add(me, "Sellable stock updated", Views.BatchCode(batch.Id), oldOutput.HasValue ? $"{oldOutput} kg" : "Output not recorded", $"{request.OutputKg} kg", "Batch output");
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(Views.Batch(batch, await ProductsAsync(new[] { batch }, cancellationToken)));
    }

    private IQueryable<Batch> Load()
    {
        return _dbContext.Batches.Include(x => x.Inputs).Include(x => x.StockLines).Include(x => x.Events).AsSplitQuery();
    }

    private async Task<Dictionary<Guid, Product>> ProductsAsync(IEnumerable<Batch> batches, CancellationToken cancellationToken)
    {
        var ids = batches.SelectMany(x => x.StockLines).Select(x => x.ProductId).Distinct().ToList();
        return await _dbContext.Products.AsNoTracking().Where(x => ids.Contains(x.Id)).ToDictionaryAsync(x => x.Id, cancellationToken);
    }
}
