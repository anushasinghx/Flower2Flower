namespace backend.Models;

public sealed class Product
{
    public Guid Id { get; set; }
    public string Group { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string NameHi { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Pack { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int Points { get; set; }
    public int Stock { get; set; }
    public bool Listed { get; set; } = true;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}

public sealed class Order
{
    public int Id { get; set; }
    public Guid UserId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string MobileNumber { get; set; } = string.Empty;
    public Fulfilment Fulfilment { get; set; }
    public Guid? PickupTempleId { get; set; }
    public string TempleName { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public PayWith PayWith { get; set; }
    public decimal Subtotal { get; set; }
    public int PointsUsed { get; set; }
    public decimal InrPaid { get; set; }
    public decimal DeliveryFee { get; set; }
    public OrderStatus Status { get; set; } = OrderStatus.New;
    public string PickupCode { get; set; } = string.Empty;
    public string TrackingNote { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
    public List<OrderLine> Lines { get; set; } = new();
}

public sealed class OrderLine
{
    public Guid Id { get; set; }
    public int OrderId { get; set; }
    public Guid ProductId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Pack { get; set; } = string.Empty;
    public int Qty { get; set; }
    public decimal Price { get; set; }
    public int Points { get; set; }
}
