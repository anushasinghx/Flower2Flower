using backend.Models;

namespace backend.Services;

public sealed record PricedLine(Product Product, int Qty);

public sealed record OrderTotals(
    IReadOnlyList<PricedLine> Lines,
    int Count,
    decimal Subtotal,
    int SubtotalPoints,
    decimal DeliveryFee,
    int PointsUsed,
    decimal PointsValue,
    decimal ToPay,
    int Available,
    int MaxApplicable,
    int PointsShort);

public static class OrderPricing
{
    public const decimal DeliveryFee = 10;

    public static OrderTotals Compute(IReadOnlyList<PricedLine> lines, Fulfilment fulfilment, PayWith payWith, int pointsApplied, int available, PointsSettings settings)
    {
        var count = lines.Sum(x => x.Qty);
        var subtotal = lines.Sum(x => x.Product.Price * x.Qty);
        var subtotalPoints = lines.Sum(x => x.Product.Points * x.Qty);
        var deliveryFee = fulfilment == Fulfilment.Delivery && lines.Count > 0 ? DeliveryFee : 0;
        var rate = Math.Max(1, settings.PointsPerRupee);
        var maxByRule = (int)Math.Floor(subtotalPoints * settings.MaxPctInPoints / 100m);
        var maxApplicable = Math.Max(0, Math.Min(available, maxByRule));

        var pointsUsed = 0;
        var toPay = subtotal + deliveryFee;

        if (payWith == PayWith.Points)
        {
            pointsUsed = subtotalPoints;
            toPay = deliveryFee;
        }
        else if (payWith == PayWith.Mixed)
        {
            pointsUsed = Math.Max(0, Math.Min(pointsApplied, maxApplicable));
            toPay = Math.Max(0, subtotal - (decimal)pointsUsed / rate) + deliveryFee;
        }

        return new OrderTotals(
            lines,
            count,
            subtotal,
            subtotalPoints,
            deliveryFee,
            pointsUsed,
            Math.Round((decimal)pointsUsed / rate, 2),
            Math.Round(toPay, 2),
            available,
            maxApplicable,
            Math.Max(0, subtotalPoints - available));
    }
}
