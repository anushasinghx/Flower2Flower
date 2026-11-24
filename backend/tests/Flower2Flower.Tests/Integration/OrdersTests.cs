using System.Net;
using System.Text.Json.Nodes;
using Flower2Flower.Tests.Support;

namespace Flower2Flower.Tests.Integration;

[Collection(ApiCollection.Name)]
public sealed class OrdersTests
{
    private readonly ApiFactory _api;

    public OrdersTests(ApiFactory api)
    {
        _api = api;
    }

    private async Task<JsonNode> NewProductAsync(int stock = 5, decimal price = 50, int points = 500, bool listed = true)
    {
        var admin = await _api.SuperAdminAsync();
        return await admin.PostJson("/api/v1/admin/products", new
        {
            group = "test",
            name = $"Test pack {Guid.NewGuid():N}"[..18],
            nameHi = "परीक्षण",
            category = "Test",
            pack = "1 kg",
            price,
            points,
            stock,
            listed
        }).Expect(HttpStatusCode.Created);
    }

    private async Task<int> StockAsync(JsonNode product)
    {
        var admin = await _api.SuperAdminAsync();
        return (await admin.GetAsync($"/api/v1/admin/products/{product.Str("id")}").Expect()).Int("stock");
    }

    private async Task<object> PickupAsync(JsonNode product, int qty = 1, string payWith = "inr", int pointsApplied = 0)
    {
        return new { lines = new[] { new { productId = product.Str("id"), qty } }, fulfilment = "pickup", payWith, pointsApplied, pickupTempleId = await _api.TempleIdAsync(ApiFactory.ShivMandir) };
    }

    [Fact]
    public async Task Orders_require_sign_in()
    {
        await _api.Anonymous().PostJson("/api/v1/orders/quote", new { lines = Array.Empty<object>() }).ExpectStatus(HttpStatusCode.Unauthorized);
        await _api.Anonymous().GetAsync("/api/v1/orders").ExpectStatus(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Quote_validation_messages()
    {
        var devotee = await _api.NewDevoteeAsync();
        var product = await NewProductAsync(stock: 2);
        var hidden = await NewProductAsync(listed: false);

        await devotee.Client.PostJson("/api/v1/orders/quote", new { lines = Array.Empty<object>() }).ExpectStatus(HttpStatusCode.BadRequest);
        var unknown = await devotee.Client.PostJson("/api/v1/orders/quote", new { lines = new[] { new { productId = Guid.NewGuid(), qty = 1 } } }).ExpectError(HttpStatusCode.BadRequest);
        var notListed = await devotee.Client.PostJson("/api/v1/orders/quote", new { lines = new[] { new { productId = hidden.Str("id"), qty = 1 } } }).ExpectError(HttpStatusCode.BadRequest);
        var tooMany = await devotee.Client.PostJson("/api/v1/orders/quote", new { lines = new[] { new { productId = product.Str("id"), qty = 3 } } }).ExpectError(HttpStatusCode.BadRequest);
        await devotee.Client.PostJson("/api/v1/orders/quote", new { lines = new[] { new { productId = product.Str("id"), qty = 0 } } }).ExpectStatus(HttpStatusCode.BadRequest);

        Assert.Equal("One of the products is no longer available.", unknown);
        Assert.Equal("One of the products is no longer available.", notListed);
        Assert.Equal($"Only 2 left of {product.Str("name")} 1 kg.", tooMany);
    }

    [Fact]
    public async Task Quote_merges_repeated_lines_and_adds_delivery_fee()
    {
        var devotee = await _api.NewDevoteeAsync();
        var product = await NewProductAsync(stock: 10);

        var quote = await devotee.Client.PostJson("/api/v1/orders/quote", new { lines = new[] { new { productId = product.Str("id"), qty = 1 }, new { productId = product.Str("id"), qty = 2 } }, fulfilment = "delivery", payWith = "inr" }).Expect();

        Assert.Equal(3, quote.Int("count"));
        Assert.Equal(150m, quote.Dec("subtotal"));
        Assert.Equal(10m, quote.Dec("deliveryFee"));
        Assert.Equal(160m, quote.Dec("toPay"));
        Assert.Single(quote.Arr("lines"));
    }

    [Fact]
    public async Task Quote_locks_points_until_kyc_is_verified()
    {
        var unverified = await _api.NewDevoteeAsync();
        var verified = await _api.NewDevoteeAsync(kycVerified: true);
        var product = await NewProductAsync();

        var locked = await unverified.Client.PostJson("/api/v1/orders/quote", await PickupAsync(product, payWith: "mixed", pointsApplied: 100)).Expect();
        var open = await verified.Client.PostJson("/api/v1/orders/quote", await PickupAsync(product, payWith: "mixed", pointsApplied: 100)).Expect();

        Assert.True(locked.Bool("pointsLocked"));
        Assert.Equal(0, locked.Int("available"));
        Assert.Equal(0, locked.Int("pointsUsed"));
        Assert.False(open.Bool("pointsLocked"));
        Assert.Equal(100, open.Int("available"));
        Assert.Equal(100, open.Int("pointsUsed"));
        Assert.Equal(40m, open.Dec("toPay"));
    }

    [Fact]
    public async Task Pickup_and_delivery_details_are_validated()
    {
        var devotee = await _api.NewDevoteeAsync();
        var product = await NewProductAsync();
        var pending = await _api.TempleIdAsync(ApiFactory.HanumanMandir);
        var line = new[] { new { productId = product.Str("id"), qty = 1 } };

        var noTemple = await devotee.Client.PostJson("/api/v1/orders", new { lines = line, fulfilment = "pickup", payWith = "inr" }).ExpectError(HttpStatusCode.BadRequest);
        var unverified = await devotee.Client.PostJson("/api/v1/orders", new { lines = line, fulfilment = "pickup", payWith = "inr", pickupTempleId = pending }).ExpectError(HttpStatusCode.BadRequest);
        var address = await devotee.Client.PostJson("/api/v1/orders", new { lines = line, fulfilment = "delivery", payWith = "inr", address = "ab", pin = "201014" }).ExpectError(HttpStatusCode.BadRequest);
        var pin = await devotee.Client.PostJson("/api/v1/orders", new { lines = line, fulfilment = "delivery", payWith = "inr", address = "House 12, Niti Khand", pin = "2010" }).ExpectError(HttpStatusCode.BadRequest);
        var phone = await devotee.Client.PostJson("/api/v1/orders", new { lines = line, fulfilment = "delivery", payWith = "inr", address = "House 12, Niti Khand", pin = "201014", contactPhone = "12345" }).ExpectError(HttpStatusCode.BadRequest);

        Assert.Equal("Choose a temple for pickup.", noTemple);
        Assert.Equal("Choose a verified temple for pickup.", unverified);
        Assert.Equal("Enter the delivery address.", address);
        Assert.Equal("Enter a valid 6 digit PIN code.", pin);
        Assert.Equal("Enter a valid 10 digit phone number.", phone);
        Assert.Equal(5, await StockAsync(product));
    }

    [Fact]
    public async Task Pickup_order_with_rupees_reduces_stock_and_gets_code()
    {
        var devotee = await _api.NewDevoteeAsync(name: "Order Person");
        var product = await NewProductAsync(stock: 5);

        var order = await devotee.Client.PostJson("/api/v1/orders", await PickupAsync(product, qty: 2)).Expect(HttpStatusCode.Created);

        Assert.Equal("new", order.Str("status"));
        Assert.Equal("inr", order.Str("payWith"));
        Assert.Equal(100m, order.Dec("inrPaid"));
        Assert.Equal(0, order.Int("pointsUsed"));
        Assert.Matches("^[0-9]{4}$", order.Str("pickupCode"));
        Assert.Equal(ApiFactory.ShivMandir, order.Str("templeName"));
        Assert.Equal("Order Person", order.Str("customer"));
        Assert.Equal(3, await StockAsync(product));
    }

    [Fact]
    public async Task Delivery_order_stores_address_and_contact()
    {
        var devotee = await _api.NewDevoteeAsync();
        var product = await NewProductAsync();
        var phone = ApiFactory.NewMobile();

        var order = await devotee.Client.PostJson("/api/v1/orders", new { lines = new[] { new { productId = product.Str("id"), qty = 1 } }, fulfilment = "delivery", payWith = "inr", address = " House 12, Niti Khand ", pin = "201014", contactName = "Gift Receiver", contactPhone = phone }).Expect(HttpStatusCode.Created);

        Assert.Equal("House 12, Niti Khand, 201014", order.Str("address"));
        Assert.Equal("Gift Receiver", order.Str("customer"));
        Assert.Equal(phone, order.Str("mobileNumber"));
        Assert.Equal(60m, order.Dec("inrPaid"));
        Assert.Equal(60m, order.Dec("total"));
        Assert.Null(order["pickupCode"]);
    }

    [Fact]
    public async Task Points_cannot_be_used_before_kyc()
    {
        var devotee = await _api.NewDevoteeAsync();
        var product = await NewProductAsync();

        var message = await devotee.Client.PostJson("/api/v1/orders", await PickupAsync(product, payWith: "points")).ExpectError(HttpStatusCode.Forbidden);

        Assert.Equal("Points can be used after your KYC is verified.", message);
        Assert.Equal(5, await StockAsync(product));
    }

    [Fact]
    public async Task Paying_fully_with_points_needs_enough_points()
    {
        var devotee = await _api.NewDevoteeAsync(kycVerified: true);
        var product = await NewProductAsync(points: 500);

        var message = await devotee.Client.PostJson("/api/v1/orders", await PickupAsync(product, payWith: "points")).ExpectError(HttpStatusCode.BadRequest);

        Assert.Equal("You need 400 more points to pay fully with points.", message);
        Assert.Equal(5, await StockAsync(product));
    }

    [Fact]
    public async Task Paying_fully_with_points_redeems_them()
    {
        var devotee = await _api.NewDevoteeAsync(kycVerified: true);
        var product = await NewProductAsync(price: 10, points: 100);

        var order = await devotee.Client.PostJson("/api/v1/orders", await PickupAsync(product, payWith: "points")).Expect(HttpStatusCode.Created);
        var points = await devotee.Client.GetAsync("/api/v1/me/points").Expect();
        var ledger = await devotee.Client.GetAsync("/api/v1/me/ledger?kinds=redeemed").Expect();

        Assert.Equal("points", order.Str("payWith"));
        Assert.Equal(100, order.Int("pointsUsed"));
        Assert.Equal(0m, order.Dec("inrPaid"));
        Assert.Equal(0, points.Int("available"));
        Assert.Equal(100, points.Int("lifetime"));
        Assert.Equal(-100, Assert.Single(ledger.Items()).Int("points"));
    }

    [Fact]
    public async Task Mixed_payment_uses_points_and_rupees()
    {
        var devotee = await _api.NewDevoteeAsync(kycVerified: true);
        var product = await NewProductAsync();

        var order = await devotee.Client.PostJson("/api/v1/orders", await PickupAsync(product, payWith: "mixed", pointsApplied: 60)).Expect(HttpStatusCode.Created);
        var points = await devotee.Client.GetAsync("/api/v1/me/points").Expect();

        Assert.Equal("mixed", order.Str("payWith"));
        Assert.Equal(60, order.Int("pointsUsed"));
        Assert.Equal(44m, order.Dec("inrPaid"));
        Assert.Equal(40, points.Int("available"));
    }

    [Fact]
    public async Task Mixed_with_no_points_is_saved_as_rupees()
    {
        var devotee = await _api.NewDevoteeAsync(kycVerified: true);
        var product = await NewProductAsync();

        var order = await devotee.Client.PostJson("/api/v1/orders", await PickupAsync(product, payWith: "mixed", pointsApplied: 0)).Expect(HttpStatusCode.Created);

        Assert.Equal("inr", order.Str("payWith"));
    }

    [Fact]
    public async Task Last_item_can_be_bought_only_once()
    {
        var first = await _api.NewDevoteeAsync();
        var second = await _api.NewDevoteeAsync();
        var product = await NewProductAsync(stock: 1);

        await first.Client.PostJson("/api/v1/orders", await PickupAsync(product)).Expect(HttpStatusCode.Created);
        var message = await second.Client.PostJson("/api/v1/orders", await PickupAsync(product)).ExpectError(HttpStatusCode.BadRequest);

        Assert.Equal($"Only 0 left of {product.Str("name")} 1 kg.", message);
        Assert.Equal(0, await StockAsync(product));
    }

    [Fact]
    public async Task My_orders_are_split_into_tabs_and_private()
    {
        var devotee = await _api.NewDevoteeAsync();
        var stranger = await _api.NewDevoteeAsync();
        var product = await NewProductAsync();
        var order = await devotee.Client.PostJson("/api/v1/orders", await PickupAsync(product)).Expect(HttpStatusCode.Created);
        var id = order.Int("id");

        var active = await devotee.Client.GetAsync("/api/v1/orders?tab=active").Expect();
        var past = await devotee.Client.GetAsync("/api/v1/orders?tab=past").Expect();
        var one = await devotee.Client.GetAsync($"/api/v1/orders/{id}").Expect();
        var hidden = await stranger.Client.GetAsync($"/api/v1/orders/{id}").ExpectError(HttpStatusCode.NotFound);

        Assert.Contains(active.AsArray(), x => x!.Int("id") == id);
        Assert.DoesNotContain(past.AsArray(), x => x!.Int("id") == id);
        Assert.Equal(order.Str("pickupCode"), one.Str("pickupCode"));
        Assert.Equal("Order not found.", hidden);
    }

    [Fact]
    public async Task Admin_moves_pickup_order_through_lifecycle()
    {
        var devotee = await _api.NewDevoteeAsync();
        var admin = await _api.SuperAdminAsync();
        var product = await NewProductAsync();
        var order = await devotee.Client.PostJson("/api/v1/orders", await PickupAsync(product)).Expect(HttpStatusCode.Created);
        var id = order.Int("id");
        var url = $"/api/v1/admin/orders/{id}/status";

        var skip = await admin.PostJson(url, new { status = "ready" }).ExpectError(HttpStatusCode.Conflict);
        await admin.PostJson(url, new { status = "confirmed" }).Expect();
        await admin.PostJson(url, new { status = "ready", trackingNote = "Packed at counter" }).Expect();
        var wrongCode = await admin.PostJson(url, new { status = "completed", pickupCode = "0000" }).ExpectError(HttpStatusCode.BadRequest);
        var done = await admin.PostJson(url, new { status = "completed", pickupCode = order.Str("pickupCode") }).Expect();
        var afterDone = await admin.PostJson(url, new { status = "cancelled" }).ExpectError(HttpStatusCode.Conflict);
        var past = await devotee.Client.GetAsync("/api/v1/orders?tab=past").Expect();

        Assert.Equal("An order that is New cannot move to Ready.", skip);
        Assert.Equal("That code does not match this order.", wrongCode);
        Assert.Equal("completed", done.Str("status"));
        Assert.Equal("Packed at counter", done.Str("trackingNote"));
        Assert.Null(done["pickupCode"]);
        Assert.StartsWith("******", done.Str("mobileNumber"));
        Assert.Equal("An order that is Completed cannot move to Cancelled.", afterDone);
        Assert.Contains(past.AsArray(), x => x!.Int("id") == id);
    }

    [Fact]
    public async Task Cancelling_refunds_points_and_restocks()
    {
        var devotee = await _api.NewDevoteeAsync(kycVerified: true);
        var admin = await _api.SuperAdminAsync();
        var product = await NewProductAsync(stock: 5);
        var order = await devotee.Client.PostJson("/api/v1/orders", await PickupAsync(product, qty: 2, payWith: "mixed", pointsApplied: 100)).Expect(HttpStatusCode.Created);

        await admin.PostJson($"/api/v1/admin/orders/{order.Int("id")}/status", new { status = "cancelled", trackingNote = "Customer asked" }).Expect();
        var points = await devotee.Client.GetAsync("/api/v1/me/points").Expect();
        var refund = await devotee.Client.GetAsync("/api/v1/me/ledger?kinds=refund").Expect();

        Assert.Equal(5, await StockAsync(product));
        Assert.Equal(100, points.Int("available"));
        Assert.Equal(100, Assert.Single(refund.Items()).Int("points"));
    }

    [Fact]
    public async Task Tracking_note_can_change_without_status_change()
    {
        var devotee = await _api.NewDevoteeAsync();
        var admin = await _api.SuperAdminAsync();
        var product = await NewProductAsync();
        var order = await devotee.Client.PostJson("/api/v1/orders", await PickupAsync(product)).Expect(HttpStatusCode.Created);
        var url = $"/api/v1/admin/orders/{order.Int("id")}/status";

        var nothing = await admin.PostJson(url, new { status = "new" }).ExpectError(HttpStatusCode.BadRequest);
        var noted = await admin.PostJson(url, new { status = "new", trackingNote = "Waiting for stock check" }).Expect();

        Assert.Equal("Nothing to change.", nothing);
        Assert.Equal("Waiting for stock check", noted.Str("trackingNote"));
        Assert.Equal("new", noted.Str("status"));
    }

    [Fact]
    public async Task Admin_order_list_searches_and_counts()
    {
        var devotee = await _api.NewDevoteeAsync(name: $"Buyer {Guid.NewGuid():N}"[..16]);
        var admin = await _api.SuperAdminAsync();
        var product = await NewProductAsync();
        var order = await devotee.Client.PostJson("/api/v1/orders", await PickupAsync(product)).Expect(HttpStatusCode.Created);

        var byId = await admin.GetAsync($"/api/v1/admin/orders?q=%23{order.Int("id")}").Expect();
        var byName = await admin.GetAsync($"/api/v1/admin/orders?q={Uri.EscapeDataString(devotee.Name.ToUpperInvariant())}").Expect();
        var pickupNew = await admin.GetAsync("/api/v1/admin/orders?status=New&fulfilment=Pickup&pageSize=200").Expect();
        var one = await admin.GetAsync($"/api/v1/admin/orders/{order.Int("id")}").Expect();

        Assert.Contains(byId.Items(), x => x.Int("id") == order.Int("id"));
        Assert.Equal(order.Int("id"), Assert.Single(byName.Items()).Int("id"));
        Assert.All(pickupNew.Items(), x => Assert.Equal("new", x.Str("status")));
        Assert.True(byId["counts"]!.Int("New") >= 1);
        Assert.Null(one["pickupCode"]);
        await admin.GetAsync("/api/v1/admin/orders/999999").ExpectStatus(HttpStatusCode.NotFound);
    }
}
