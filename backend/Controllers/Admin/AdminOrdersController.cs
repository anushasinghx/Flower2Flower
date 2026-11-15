using backend.Data;
using backend.DTOs;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers.Admin;

[Authorize(Roles = Roles.Admin)]
[Route("api/v1/admin/orders")]
public sealed class AdminOrdersController : ApiControllerBase
{
    private static readonly Dictionary<OrderStatus, OrderStatus[]> Allowed = new()
    {
        [OrderStatus.New] = new[] { OrderStatus.Confirmed, OrderStatus.Cancelled },
        [OrderStatus.Confirmed] = new[] { OrderStatus.Ready, OrderStatus.Cancelled },
        [OrderStatus.Ready] = new[] { OrderStatus.Completed, OrderStatus.Cancelled },
        [OrderStatus.Completed] = Array.Empty<OrderStatus>(),
        [OrderStatus.Cancelled] = Array.Empty<OrderStatus>()
    };

    private readonly AppDbContext _dbContext;
    private readonly AuditService _audit;

    public AdminOrdersController(AppDbContext dbContext, AuditService audit)
    {
        _dbContext = dbContext;
        _audit = audit;
    }

    [HttpGet]
    public async Task<IActionResult> GetList([FromQuery] OrderStatus? status, [FromQuery] Fulfilment? fulfilment, [FromQuery] string? q, [FromQuery] int? page, [FromQuery] int? pageSize, CancellationToken cancellationToken)
    {
        var (safePage, safeSize) = Paging(page, pageSize);
        var query = _dbContext.Orders.AsNoTracking().Include(x => x.Lines).AsQueryable();
        if (status.HasValue)
        {
            query = query.Where(x => x.Status == status.Value);
        }

        if (fulfilment.HasValue)
        {
            query = query.Where(x => x.Fulfilment == fulfilment.Value);
        }

        var term = (q ?? string.Empty).Trim().TrimStart('#');
        if (term.Length > 0)
        {
            var pattern = $"%{term}%";
            var orderId = int.TryParse(term, out var parsed) ? parsed : (int?)null;
            query = query.Where(x => EF.Functions.ILike(x.CustomerName, pattern) || (orderId.HasValue && x.Id == orderId.Value));
        }

        var total = await query.CountAsync(cancellationToken);
        var orders = await query.OrderByDescending(x => x.CreatedAtUtc).Skip((safePage - 1) * safeSize).Take(safeSize).ToListAsync(cancellationToken);
        var counts = await _dbContext.Orders.GroupBy(x => x.Status).Select(g => new { Status = g.Key, Count = g.Count() }).ToListAsync(cancellationToken);

        return Ok(new
        {
            items = orders.Select(x => Views.Order(x, false, true)).ToList(),
            total,
            page = safePage,
            pageSize = safeSize,
            counts = Enum.GetValues<OrderStatus>().ToDictionary(s => s.ToString(), s => counts.FirstOrDefault(c => c.Status == s)?.Count ?? 0)
        });
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<OrderView>> GetOne(int id, CancellationToken cancellationToken)
    {
        var order = await _dbContext.Orders.AsNoTracking().Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (order is null)
        {
            return Error("Order not found.", StatusCodes.Status404NotFound);
        }

        return Ok(Views.Order(order, false, true));
    }

    [HttpPost("{id:int}/status")]
    public async Task<ActionResult<OrderView>> SetStatus(int id, [FromBody] OrderStatusRequest request, CancellationToken cancellationToken)
    {
        var me = await GetCurrentUserAsync(_dbContext);
        if (me is null)
        {
            return NotSignedIn();
        }

        var order = await _dbContext.Orders.Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (order is null)
        {
            return Error("Order not found.", StatusCodes.Status404NotFound);
        }

        var note = (request.TrackingNote ?? string.Empty).Trim();
        if (request.Status == order.Status)
        {
            if (note.Length == 0)
            {
                return Error("Nothing to change.");
            }

            order.TrackingNote = note;
            order.UpdatedAtUtc = DateTime.UtcNow;
            _audit.Add(me, "Tracking note changed", $"Order #{order.Id}", order.Status.ToString(), order.Status.ToString(), note);
            await _dbContext.SaveChangesAsync(cancellationToken);
            return Ok(Views.Order(order, false, true));
        }

        if (!Allowed[order.Status].Contains(request.Status))
        {
            return Error($"An order that is {order.Status} cannot move to {request.Status}.", StatusCodes.Status409Conflict);
        }

        if (request.Status == OrderStatus.Completed && order.Fulfilment == Fulfilment.Pickup && (request.PickupCode ?? string.Empty).Trim() != order.PickupCode)
        {
            return Error("That code does not match this order.");
        }

        await using var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);
        var oldStatus = order.Status;
        order.Status = request.Status;
        order.TrackingNote = note.Length > 0 ? note : order.TrackingNote;
        order.UpdatedAtUtc = DateTime.UtcNow;

        if (request.Status == OrderStatus.Cancelled)
        {
            foreach (var line in order.Lines)
            {
                await _dbContext.Products
                    .Where(x => x.Id == line.ProductId)
                    .ExecuteUpdateAsync(s => s.SetProperty(x => x.Stock, x => x.Stock + line.Qty).SetProperty(x => x.UpdatedAtUtc, DateTime.UtcNow), cancellationToken);
            }

            if (order.PointsUsed > 0)
            {
                _dbContext.LedgerEntries.Add(new LedgerEntry
                {
                    Id = Guid.NewGuid(),
                    UserId = order.UserId,
                    Kind = LedgerKind.Refund,
                    Points = order.PointsUsed,
                    Title = $"Order #{order.Id}",
                    Detail = "Cancelled, points refunded",
                    OrderId = order.Id,
                    CreatedAtUtc = DateTime.UtcNow
                });
            }
        }

        _audit.Add(me, "Order status changed", $"Order #{order.Id}", oldStatus.ToString(), request.Status.ToString(), note.Length > 0 ? note : "Order update");
        await _dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return Ok(Views.Order(order, false, true));
    }
}
