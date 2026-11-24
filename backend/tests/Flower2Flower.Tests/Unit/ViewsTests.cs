using backend.DTOs;
using backend.Models;
using backend.Services;

namespace Flower2Flower.Tests.Unit;

public sealed class ViewsTests
{
    [Theory]
    [InlineData(1L, "D1")]
    [InlineData(2001L, "D2001")]
    public void DepositCode_prefixes_d(long id, string expected)
    {
        Assert.Equal(expected, Views.DepositCode(id));
    }

    [Theory]
    [InlineData(7, "B0007")]
    [InlineData(1234, "B1234")]
    [InlineData(12345, "B12345")]
    public void BatchCode_pads_to_four_digits(int id, string expected)
    {
        Assert.Equal(expected, Views.BatchCode(id));
    }

    [Theory]
    [InlineData(-1, "out")]
    [InlineData(0, "out")]
    [InlineData(1, "low")]
    [InlineData(5, "low")]
    [InlineData(6, "in")]
    public void StockTone_groups_stock_levels(int stock, string expected)
    {
        Assert.Equal(expected, Views.StockTone(stock));
    }

    [Fact]
    public void Required_documents_depend_on_temple_type()
    {
        Assert.Equal(new[] { "Registration certificate", "Admin ID proof" }, Views.RequiredTempleDocuments(TempleType.Registered));
        Assert.Equal(new[] { "Committee letter", "Admin ID proof" }, Views.RequiredTempleDocuments(TempleType.Unregistered));
    }

    [Fact]
    public void Deposit_view_masks_mobile_and_splits_checks()
    {
        var deposit = new Deposit { Id = 2005, MobileNumber = "9876541234", Checks = "No plastic|Photo clear||", Waste = "Flowers", Kg = 1.25m };

        var masked = Views.Deposit(deposit, "Shiv Mandir", true);
        var open = Views.Deposit(deposit, "Shiv Mandir", false);

        Assert.Equal("D2005", masked.Code);
        Assert.Equal("******1234", masked.MobileNumber);
        Assert.Equal("9876541234", open.MobileNumber);
        Assert.Equal(new[] { "No plastic", "Photo clear" }, masked.Checks);
        Assert.Equal("Shiv Mandir", masked.TempleName);
    }

    [Fact]
    public void Order_view_totals_and_pickup_code_visibility()
    {
        var order = new Order
        {
            Id = 1001,
            Fulfilment = Fulfilment.Pickup,
            Subtotal = 70,
            DeliveryFee = 0,
            PickupCode = "4821",
            MobileNumber = "9876541234",
            Lines = new List<OrderLine> { new() { ProductId = Guid.NewGuid(), Name = "Organic manure", Pack = "500 g", Qty = 2, Price = 35, Points = 350 } }
        };

        var mine = Views.Order(order, true, false);
        var admin = Views.Order(order, false, true);

        Assert.Equal(70m, mine.Total);
        Assert.Equal("4821", mine.PickupCode);
        Assert.Null(admin.PickupCode);
        Assert.Equal("******1234", admin.MobileNumber);
        Assert.Single(mine.Lines);
    }

    [Fact]
    public void Order_view_never_shows_code_for_delivery()
    {
        var order = new Order { Fulfilment = Fulfilment.Delivery, Subtotal = 70, DeliveryFee = 10, PickupCode = "9999" };

        var view = Views.Order(order, true, false);

        Assert.Null(view.PickupCode);
        Assert.Equal(80m, view.Total);
    }

    [Fact]
    public void Temple_view_fills_missing_timings_and_orders_history()
    {
        var temple = new Temple { Id = Guid.NewGuid(), Name = "Shiv Mandir", Type = TempleType.Registered, Timings = " ", MobileNumber = "9000006666" };
        temple.Events.Add(new TempleEvent { Text = "Verified", CreatedAtUtc = new DateTime(2026, 2, 1) });
        temple.Events.Add(new TempleEvent { Text = "Submitted", CreatedAtUtc = new DateTime(2026, 1, 1) });

        var view = Views.Temple(temple, true);

        Assert.Equal("Not set yet", view.Timings);
        Assert.Equal("******6666", view.MobileNumber);
        Assert.Equal(new[] { "Submitted", "Verified" }, view.History.Select(x => x.Text));
        Assert.Equal(2, view.RequiredDocuments.Count);
    }

    [Fact]
    public void Public_temple_view_hides_private_fields()
    {
        var view = Views.PublicTemple(new Temple { Id = Guid.NewGuid(), Name = "Durga Mandir", Timings = "6:30 am", Badge = "Verified" });

        Assert.Equal("Durga Mandir", view.Name);
        Assert.Equal("6:30 am", view.Timings);
        Assert.Equal("Verified", view.Badge);
    }

    [Fact]
    public void Batch_view_sums_inputs_and_counts_sources()
    {
        var productId = Guid.NewGuid();
        var batch = new Batch
        {
            Id = 3,
            Inputs = new List<BatchInput>
            {
                new() { Source = "Shiv Mandir", Kg = 10, ClosedCollectionId = Guid.NewGuid() },
                new() { Source = "Shiv Mandir", Kg = 5, ClosedCollectionId = Guid.NewGuid() },
                new() { Source = "Durga Mandir", Kg = 4, ClosedCollectionId = Guid.NewGuid() },
                new() { Source = "Weight correction: wet", Kg = -1 }
            },
            StockLines = new List<BatchStockLine> { new() { ProductId = productId, Units = 6 } }
        };
        var products = new Dictionary<Guid, Product> { [productId] = new() { Id = productId, Name = "Organic manure", Pack = "1 kg" } };

        var view = Views.Batch(batch, products);

        Assert.Equal("B0003", view.Code);
        Assert.Equal(18m, view.InputKg);
        Assert.Equal(2, view.SourceCount);
        var stock = Assert.Single(view.StockAdded);
        Assert.Equal("Organic manure", stock.ProductName);
        Assert.Equal("1 kg", stock.Pack);
    }

    [Fact]
    public void Rules_view_numbers_levels_from_one()
    {
        var snapshot = new RulesSnapshot
        {
            Settings = new PointsSettings { Version = 3 },
            Levels = new[] { new Level { Name = "Novice" }, new Level { Name = "Regular", MinPoints = 1000 } }
        };

        var view = Views.Rules(snapshot);

        Assert.Equal(3, view.Version);
        Assert.Equal(new[] { 1, 2 }, view.Levels.Select(x => x.Number));
    }

    [Fact]
    public void Ledger_view_adds_deposit_code_only_when_linked()
    {
        Assert.Equal("D2001", Views.Ledger(new LedgerEntry { DepositId = 2001 }).DepositCode);
        Assert.Null(Views.Ledger(new LedgerEntry()).DepositCode);
    }
}
