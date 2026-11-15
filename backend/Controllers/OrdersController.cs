using System.Security.Cryptography;
using backend.Data;
using backend.DTOs;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[Authorize]
[Route("api/v1/orders")]
public sealed class OrdersController : ApiControllerBase
{
    private readonly AppDbContext _dbContext;
    private readonly PointsService _pointsService;
    private readonly RulesService _rulesService;

    public OrdersController(AppDbContext dbContext, PointsService pointsService, RulesService rulesService)
    {
        _dbContext = dbContext;
        _pointsService = pointsService;
        _rulesService = rulesService;
    }

    [HttpPost("quote")]
    public async Task<ActionResult<OrderQuoteView>> Quote([FromBody] OrderQuoteRequest request, CancellationToken cancellationToken)
    {
        var me = await GetCurrentUserAsync(_dbContext);
        if (me is null)
        {
            return NotSignedIn();
        }

        var priced = await PriceAsync(me, request, cancellationToken);
        if (priced.Error is not null)
        {
            return Error(priced.Error);
        }

        return Ok(ToQuoteView(priced.Totals!, priced.Locked));
    }

    [HttpPost]
    public async Task<ActionResult<OrderView>> Place([FromBody] PlaceOrderRequest request, CancellationToken cancellationToken)
    {
        var me = await GetCurrentUserAsync(_dbContext);
        if (me is null)
        {
            return NotSignedIn();
        }

        Temple? temple = null;
        var address = string.Empty;
        if (request.Fulfilment == Fulfilment.Pickup)
        {
            if (!request.PickupTempleId.HasValue)
            {
                return Error("Choose a temple for pickup.");
            }

            temple = await _dbContext.Temples.AsNoTracking().FirstOrDefaultAsync(x => x.Id == request.PickupTempleId.Value && x.Status == TempleStatus.Verified, cancellationToken);
            if (temple is null)
            {
                return Error("Choose a verified temple for pickup.");
            }
        }
        else
        {
            var street = (request.Address ?? string.Empty).Trim();
            var pin = (request.Pin ?? string.Empty).Trim();
            if (street.Length < 3)
            {
                return Error("Enter the delivery address.");
            }

            if (pin.Length != 6 || !pin.All(char.IsDigit))
            {
                return Error("Enter a valid 6 digit PIN code.");
            }

            var phone = Mobile.Normalize(request.ContactPhone ?? me.MobileNumber);
            if (!Mobile.IsValid(phone))
            {
                return Error("Enter a valid 10 digit phone number.");
            }

            address = $"{street}, {pin}";
        }

        await using var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);
        await _dbContext.Database.ExecuteSqlInterpolatedAsync($"SELECT 1 FROM \"Users\" WHERE \"Id\" = {me.Id} FOR UPDATE", cancellationToken);

        var priced = await PriceAsync(me, request, cancellationToken);
        if (priced.Error is not null)
        {
            return Error(priced.Error);
        }

        var totals = priced.Totals!;
        if (totals.PointsUsed > 0 && priced.Locked)
        {
            return Error("Points can be used after your KYC is verified.", StatusCodes.Status403Forbidden);
        }

        if (request.PayWith == PayWith.Points && totals.PointsShort > 0)
        {
            return Error($"You need {totals.PointsShort} more points to pay fully with points.");
        }

        foreach (var line in totals.Lines)
        {
            var updated = await _dbContext.Products
                .Where(x => x.Id == line.Product.Id && x.Listed && x.Stock >= line.Qty)
                .ExecuteUpdateAsync(s => s.SetProperty(x => x.Stock, x => x.Stock - line.Qty).SetProperty(x => x.UpdatedAtUtc, DateTime.UtcNow), cancellationToken);
            if (updated == 0)
            {
                await transaction.RollbackAsync(cancellationToken);
                return Error($"{line.Product.Name} {line.Product.Pack} does not have enough stock.", StatusCodes.Status409Conflict);
            }
        }

        var customer = string.IsNullOrWhiteSpace(request.ContactName) ? me.FullName ?? "Devotee" : request.ContactName.Trim();
        var order = new Order
        {
            UserId = me.Id,
            CustomerName = customer,
            MobileNumber = request.Fulfilment == Fulfilment.Delivery ? Mobile.Normalize(request.ContactPhone ?? me.MobileNumber) : me.MobileNumber,
            Fulfilment = request.Fulfilment,
            PickupTempleId = temple?.Id,
            TempleName = temple?.Name ?? string.Empty,
            Address = address,
            PayWith = request.PayWith == PayWith.Mixed && totals.PointsUsed == 0 ? PayWith.Inr : request.PayWith,
            Subtotal = totals.Subtotal,
            PointsUsed = totals.PointsUsed,
            InrPaid = totals.ToPay,
            DeliveryFee = totals.DeliveryFee,
            Status = OrderStatus.New,
            PickupCode = request.Fulfilment == Fulfilment.Pickup ? RandomNumberGenerator.GetInt32(1000, 10000).ToString() : string.Empty,
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow,
            Lines = totals.Lines.Select(x => new OrderLine
            {
                Id = Guid.NewGuid(),
                ProductId = x.Product.Id,
                Name = x.Product.Name,
                Pack = x.Product.Pack,
                Qty = x.Qty,
                Price = x.Product.Price,
                Points = x.Product.Points
            }).ToList()
        };
        _dbContext.Orders.Add(order);
        await _dbContext.SaveChangesAsync(cancellationToken);

        if (order.PointsUsed > 0)
        {
            _dbContext.LedgerEntries.Add(new LedgerEntry
            {
                Id = Guid.NewGuid(),
                UserId = me.Id,
                Kind = LedgerKind.Redeemed,
                Points = -order.PointsUsed,
                Title = $"Order #{order.Id}",
                Detail = "Redeemed",
                OrderId = order.Id,
                CreatedAtUtc = DateTime.UtcNow
            });
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        await transaction.CommitAsync(cancellationToken);
        return StatusCode(StatusCodes.Status201Created, Views.Order(order, true, false));
    }

    [HttpGet]
    public async Task<ActionResult<List<OrderView>>> GetMine([FromQuery] string? tab, CancellationToken cancellationToken)
    {
        var me = await GetCurrentUserAsync(_dbContext);
        if (me is null)
        {
            return NotSignedIn();
        }

        var query = _dbContext.Orders.AsNoTracking().Include(x => x.Lines).Where(x => x.UserId == me.Id);
        if (string.Equals(tab, "active", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(x => x.Status != OrderStatus.Completed && x.Status != OrderStatus.Cancelled);
        }
        else if (string.Equals(tab, "past", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(x => x.Status == OrderStatus.Completed || x.Status == OrderStatus.Cancelled);
        }

        var orders = await query.OrderByDescending(x => x.CreatedAtUtc).Take(100).ToListAsync(cancellationToken);
        return Ok(orders.Select(x => Views.Order(x, true, false)).ToList());
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<OrderView>> GetOne(int id, CancellationToken cancellationToken)
    {
        var me = await GetCurrentUserAsync(_dbContext);
        if (me is null)
        {
            return NotSignedIn();
        }

        var order = await _dbContext.Orders.AsNoTracking().Include(x => x.Lines).FirstOrDefaultAsync(x => x.Id == id && x.UserId == me.Id, cancellationToken);
        if (order is null)
        {
            return Error("Order not found.", StatusCodes.Status404NotFound);
        }

        return Ok(Views.Order(order, true, false));
    }

    private async Task<(OrderTotals? Totals, bool Locked, string? Error)> PriceAsync(User me, OrderQuoteRequest request, CancellationToken cancellationToken)
    {
        if (request.Lines.Count == 0)
        {
            return (null, false, "Your cart is empty.");
        }

        var grouped = request.Lines.GroupBy(x => x.ProductId).Select(g => new { ProductId = g.Key, Qty = g.Sum(x => x.Qty) }).ToList();
        var ids = grouped.Select(x => x.ProductId).ToList();
        var products = await _dbContext.Products.AsNoTracking().Where(x => ids.Contains(x.Id)).ToDictionaryAsync(x => x.Id, cancellationToken);

        var lines = new List<PricedLine>();
        foreach (var item in grouped)
        {
            if (!products.TryGetValue(item.ProductId, out var product) || !product.Listed)
            {
                return (null, false, "One of the products is no longer available.");
            }

            if (item.Qty <= 0)
            {
                return (null, false, "Quantity must be at least 1.");
            }

            if (product.Stock < item.Qty)
            {
                return (null, false, $"Only {product.Stock} left of {product.Name} {product.Pack}.");
            }

            lines.Add(new PricedLine(product, item.Qty));
        }

        var rules = await _rulesService.LoadAsync(cancellationToken);
        var balances = await _pointsService.GetBalancesAsync(me.Id, cancellationToken);
        var locked = rules.Settings.RequiresKyc && me.KycStatus != KycStatus.Verified;
        var available = locked ? 0 : balances.Available;
        var totals = OrderPricing.Compute(lines, request.Fulfilment, request.PayWith, request.PointsApplied, available, rules.Settings);

        return (totals, locked, null);
    }

    private static OrderQuoteView ToQuoteView(OrderTotals totals, bool locked)
    {
        return new OrderQuoteView(
            totals.Lines.Select(x => new OrderLineView(x.Product.Id, x.Product.Name, x.Product.Pack, x.Qty, x.Product.Price, x.Product.Points)).ToList(),
            totals.Count,
            totals.Subtotal,
            totals.SubtotalPoints,
            totals.DeliveryFee,
            totals.PointsUsed,
            totals.PointsValue,
            totals.ToPay,
            totals.Available,
            totals.MaxApplicable,
            totals.PointsShort,
            locked);
    }
}
