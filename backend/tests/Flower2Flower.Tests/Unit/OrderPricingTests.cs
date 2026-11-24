using backend.Models;
using backend.Services;

namespace Flower2Flower.Tests.Unit;

public sealed class OrderPricingTests
{
    private static readonly Product Manure = new() { Id = Guid.NewGuid(), Name = "Organic manure", Pack = "500 g", Price = 35, Points = 350, Stock = 50 };
    private static readonly Product Kit = new() { Id = Guid.NewGuid(), Name = "Home garden kit", Pack = "1 kit", Price = 180, Points = 1800, Stock = 10 };

    private static PointsSettings Settings(int pointsPerRupee = 10, int maxPct = 100) => new() { PointsPerRupee = pointsPerRupee, MaxPctInPoints = maxPct };

    private static List<PricedLine> TwoManure() => new() { new PricedLine(Manure, 2) };

    [Fact]
    public void Inr_pickup_charges_subtotal_without_delivery_fee()
    {
        var totals = OrderPricing.Compute(TwoManure(), Fulfilment.Pickup, PayWith.Inr, 0, 1000, Settings());

        Assert.Equal(2, totals.Count);
        Assert.Equal(70m, totals.Subtotal);
        Assert.Equal(700, totals.SubtotalPoints);
        Assert.Equal(0m, totals.DeliveryFee);
        Assert.Equal(0, totals.PointsUsed);
        Assert.Equal(70m, totals.ToPay);
    }

    [Fact]
    public void Delivery_adds_fixed_fee()
    {
        var totals = OrderPricing.Compute(TwoManure(), Fulfilment.Delivery, PayWith.Inr, 0, 0, Settings());

        Assert.Equal(OrderPricing.DeliveryFee, totals.DeliveryFee);
        Assert.Equal(80m, totals.ToPay);
    }

    [Fact]
    public void Delivery_fee_is_zero_for_empty_cart()
    {
        var totals = OrderPricing.Compute(new List<PricedLine>(), Fulfilment.Delivery, PayWith.Inr, 0, 0, Settings());

        Assert.Equal(0m, totals.DeliveryFee);
        Assert.Equal(0m, totals.ToPay);
        Assert.Equal(0, totals.Count);
    }

    [Fact]
    public void Points_payment_uses_full_points_and_leaves_only_delivery_fee()
    {
        var totals = OrderPricing.Compute(TwoManure(), Fulfilment.Delivery, PayWith.Points, 0, 5000, Settings());

        Assert.Equal(700, totals.PointsUsed);
        Assert.Equal(10m, totals.ToPay);
        Assert.Equal(70m, totals.PointsValue);
        Assert.Equal(0, totals.PointsShort);
    }

    [Fact]
    public void Mixed_payment_reduces_rupees_by_points_value()
    {
        var totals = OrderPricing.Compute(TwoManure(), Fulfilment.Pickup, PayWith.Mixed, 300, 1000, Settings());

        Assert.Equal(700, totals.MaxApplicable);
        Assert.Equal(300, totals.PointsUsed);
        Assert.Equal(30m, totals.PointsValue);
        Assert.Equal(40m, totals.ToPay);
    }

    [Fact]
    public void Mixed_payment_is_capped_by_available_points()
    {
        var totals = OrderPricing.Compute(TwoManure(), Fulfilment.Pickup, PayWith.Mixed, 5000, 200, Settings());

        Assert.Equal(200, totals.MaxApplicable);
        Assert.Equal(200, totals.PointsUsed);
        Assert.Equal(50m, totals.ToPay);
    }

    [Fact]
    public void Mixed_payment_is_capped_by_max_percent_rule()
    {
        var totals = OrderPricing.Compute(TwoManure(), Fulfilment.Pickup, PayWith.Mixed, 600, 1000, Settings(maxPct: 50));

        Assert.Equal(350, totals.MaxApplicable);
        Assert.Equal(350, totals.PointsUsed);
        Assert.Equal(35m, totals.ToPay);
    }

    [Fact]
    public void Mixed_payment_ignores_negative_points()
    {
        var totals = OrderPricing.Compute(TwoManure(), Fulfilment.Pickup, PayWith.Mixed, -50, 1000, Settings());

        Assert.Equal(0, totals.PointsUsed);
        Assert.Equal(70m, totals.ToPay);
    }

    [Fact]
    public void Inr_payment_ignores_points_applied()
    {
        var totals = OrderPricing.Compute(TwoManure(), Fulfilment.Pickup, PayWith.Inr, 300, 1000, Settings());

        Assert.Equal(0, totals.PointsUsed);
        Assert.Equal(70m, totals.ToPay);
    }

    [Fact]
    public void Points_short_reports_missing_points()
    {
        var totals = OrderPricing.Compute(TwoManure(), Fulfilment.Pickup, PayWith.Points, 0, 100, Settings());

        Assert.Equal(600, totals.PointsShort);
        Assert.Equal(100, totals.Available);
    }

    [Fact]
    public void Zero_points_per_rupee_is_treated_as_one()
    {
        var totals = OrderPricing.Compute(TwoManure(), Fulfilment.Pickup, PayWith.Mixed, 20, 1000, Settings(pointsPerRupee: 0));

        Assert.Equal(20, totals.PointsUsed);
        Assert.Equal(20m, totals.PointsValue);
        Assert.Equal(50m, totals.ToPay);
    }

    [Fact]
    public void Multiple_lines_are_summed()
    {
        var lines = new List<PricedLine> { new(Manure, 1), new(Kit, 2) };
        var totals = OrderPricing.Compute(lines, Fulfilment.Delivery, PayWith.Inr, 0, 0, Settings());

        Assert.Equal(3, totals.Count);
        Assert.Equal(395m, totals.Subtotal);
        Assert.Equal(3950, totals.SubtotalPoints);
        Assert.Equal(405m, totals.ToPay);
    }

    [Fact]
    public void Rupees_never_go_below_zero()
    {
        var totals = OrderPricing.Compute(TwoManure(), Fulfilment.Pickup, PayWith.Mixed, 700, 700, Settings(pointsPerRupee: 1));

        Assert.Equal(700, totals.PointsUsed);
        Assert.Equal(0m, totals.ToPay);
    }
}
