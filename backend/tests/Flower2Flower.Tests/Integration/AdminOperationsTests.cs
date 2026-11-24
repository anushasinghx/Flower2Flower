using System.Net;
using System.Text;
using Flower2Flower.Tests.Support;

namespace Flower2Flower.Tests.Integration;

[Collection(ApiCollection.Name)]
public sealed class AdminOperationsTests
{
    private readonly ApiFactory _api;

    public AdminOperationsTests(ApiFactory api)
    {
        _api = api;
    }

    private async Task<string> ClosedCollectionAsync(decimal kg)
    {
        var templeId = await _api.NewVerifiedTempleAsync();
        var operatorClient = await _api.OperatorAsync();
        if (kg > 0)
        {
            var devotee = await _api.NewDevoteeAsync();
            await ApiFactory.DepositAsync(operatorClient, devotee.UserId, templeId, "Flowers", kg);
        }

        var collection = await operatorClient.PostJson("/api/v1/operator/close-day", new { templeId }).Expect();
        return collection.Str("id");
    }

    private static object Rules(int? baseVersion, object[]? earning = null, object[]? levels = null) => new
    {
        baseVersion,
        earning = earning ?? new object[]
        {
            new { waste = "Flowers", ptsPerKg = 100, maxPerDay = 10, active = true },
            new { waste = "Leaves", ptsPerKg = 100, maxPerDay = 10, active = true },
            new { waste = "Coconut shells", ptsPerKg = 20, maxPerDay = 5, active = true },
            new { waste = "Garlands", ptsPerKg = 80, maxPerDay = 10, active = true },
            new { waste = "Broken idols", ptsPerKg = 50, maxPerDay = 0, active = true, charge = 10 }
        },
        levels = levels ?? new object[]
        {
            new { name = "Novice", minPoints = 0, multiplier = 1 },
            new { name = "Regular", minPoints = 1000, multiplier = 1 },
            new { name = "Evangelist", minPoints = 5000, multiplier = 1.2 }
        },
        pointsPerRupee = 10,
        requiresKyc = true,
        maxPctInPoints = 100,
        rejectionLimit = 3,
        maxDepositKg = 10,
        holdOnFlag = true
    };

    [Fact]
    public async Task Batch_is_created_from_closed_collections()
    {
        var admin = await _api.SuperAdminAsync();
        var first = await ClosedCollectionAsync(2m);
        var second = await ClosedCollectionAsync(3m);

        var batch = await admin.PostJson("/api/v1/admin/batches", new { collectionIds = new[] { first, second } }).Expect(HttpStatusCode.Created);
        var used = (await admin.GetAsync("/api/v1/admin/collections?used=true").Expect()).AsArray();
        var reuse = await admin.PostJson("/api/v1/admin/batches", new { collectionIds = new[] { first } }).ExpectError(HttpStatusCode.Conflict);

        Assert.Equal("created", batch.Str("status"));
        Assert.Equal(5m, batch.Dec("inputKg"));
        Assert.Equal(2, batch.Int("sourceCount"));
        Assert.Matches("^B[0-9]{4,}$", batch.Str("code"));
        Assert.Contains(used, x => x!.Str("id") == first && x.Int("batchId") == batch.Int("id"));
        Assert.Equal("One of the collections is already in a batch.", reuse);
    }

    [Fact]
    public async Task Collection_in_a_batch_cannot_be_closed_again()
    {
        var admin = await _api.SuperAdminAsync();
        var templeId = await _api.NewVerifiedTempleAsync();
        var operatorClient = await _api.OperatorAsync();
        var collection = await operatorClient.PostJson("/api/v1/operator/close-day", new { templeId }).Expect();
        await admin.PostJson("/api/v1/admin/batches", new { collectionIds = new[] { collection.Str("id") } }).Expect(HttpStatusCode.Created);

        var message = await operatorClient.PostJson("/api/v1/operator/close-day", new { templeId }).ExpectError(HttpStatusCode.Conflict);

        Assert.Equal("Today's collection is already in a batch.", message);
    }

    [Fact]
    public async Task Weight_override_needs_reason_and_adds_correction_line()
    {
        var admin = await _api.SuperAdminAsync();
        var collection = await ClosedCollectionAsync(4m);

        var noReason = await admin.PostJson("/api/v1/admin/batches", new { collectionIds = new[] { collection }, totalOverrideKg = 3.5m }).ExpectError(HttpStatusCode.BadRequest);
        var batch = await admin.PostJson("/api/v1/admin/batches", new { collectionIds = new[] { collection }, totalOverrideKg = 3.5m, overrideReason = "Wet flowers dried" }).Expect(HttpStatusCode.Created);

        Assert.Equal("Give a reason when the total weight is changed.", noReason);
        Assert.Equal(3.5m, batch.Dec("inputKg"));
        Assert.Contains(batch.Arr("inputs"), x => x!.Str("source") == "Weight correction: Wet flowers dried" && x.Dec("kg") == -0.5m);
        Assert.Equal(1, batch.Int("sourceCount"));
    }

    [Fact]
    public async Task Batch_with_unknown_collection_is_not_found()
    {
        var admin = await _api.SuperAdminAsync();

        await admin.PostJson("/api/v1/admin/batches", new { collectionIds = new[] { Guid.NewGuid() } }).ExpectStatus(HttpStatusCode.NotFound);
        await admin.PostJson("/api/v1/admin/batches", new { collectionIds = Array.Empty<Guid>() }).ExpectStatus(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Batch_moves_one_stage_at_a_time_and_back_needs_reason()
    {
        var admin = await _api.SuperAdminAsync();
        var batch = await admin.PostJson("/api/v1/admin/batches", new { collectionIds = new[] { await ClosedCollectionAsync(1m) } }).Expect(HttpStatusCode.Created);
        var url = $"/api/v1/admin/batches/{batch.Int("id")}/move";

        var skip = await admin.PostJson(url, new { to = "curing" }).ExpectError(HttpStatusCode.BadRequest);
        await admin.PostJson(url, new { to = "composting" }).Expect();
        var backNoReason = await admin.PostJson(url, new { to = "created" }).ExpectError(HttpStatusCode.BadRequest);
        var back = await admin.PostJson(url, new { to = "created", reason = "Moved too early" }).Expect();

        Assert.Equal("A batch can only move one stage forward or back.", skip);
        Assert.Equal("Give a reason to move the batch back.", backNoReason);
        Assert.Equal("created", back.Str("status"));
        Assert.Equal("Moved to Created (Moved too early)", back.Arr("history").Last()!.Str("text"));
    }

    [Fact]
    public async Task Output_stock_is_added_only_when_ready()
    {
        var admin = await _api.SuperAdminAsync();
        var product = await admin.PostJson("/api/v1/admin/products", new { group = "manure", name = $"Batch manure {Guid.NewGuid():N}"[..20], category = "Manure", pack = "2 kg", price = 100, points = 1000, stock = 0, listed = true }).Expect(HttpStatusCode.Created);
        var batch = await admin.PostJson("/api/v1/admin/batches", new { collectionIds = new[] { await ClosedCollectionAsync(2m) } }).Expect(HttpStatusCode.Created);
        var id = batch.Int("id");
        var stock = new { outputKg = 12.5m, lines = new[] { new { productId = product.Str("id"), units = 4 }, new { productId = product.Str("id"), units = 2 } } };

        var early = await admin.PostJson($"/api/v1/admin/batches/{id}/stock", stock).ExpectError(HttpStatusCode.Conflict);
        foreach (var stage in new[] { "composting", "curing", "ready" })
        {
            await admin.PostJson($"/api/v1/admin/batches/{id}/move", new { to = stage }).Expect();
        }

        var updated = await admin.PostJson($"/api/v1/admin/batches/{id}/stock", stock).Expect();
        var after = await admin.GetAsync($"/api/v1/admin/products/{product.Str("id")}").Expect();
        var unknown = await admin.PostJson($"/api/v1/admin/batches/{id}/stock", new { outputKg = 1m, lines = new[] { new { productId = Guid.NewGuid(), units = 1 } } }).ExpectError(HttpStatusCode.NotFound);

        Assert.Equal("Record output once the batch is Ready.", early);
        Assert.Equal(12.5m, updated.Dec("outputKg"));
        Assert.Equal(6, Assert.Single(updated.Arr("stockAdded"))!.Int("units"));
        Assert.Equal(6, after.Int("stock"));
        Assert.Equal("One of the products was not found.", unknown);
    }

    [Fact]
    public async Task Batch_list_filters_and_counts()
    {
        var admin = await _api.SuperAdminAsync();
        var batch = await admin.PostJson("/api/v1/admin/batches", new { collectionIds = new[] { await ClosedCollectionAsync(1m) } }).Expect(HttpStatusCode.Created);

        var created = await admin.GetAsync("/api/v1/admin/batches?status=Created").Expect();
        var one = await admin.GetAsync($"/api/v1/admin/batches/{batch.Int("id")}").Expect();

        Assert.Contains(created.Items(), x => x.Int("id") == batch.Int("id"));
        Assert.True(created["counts"]!.Int("Created") >= 1);
        Assert.Equal(batch.Str("code"), one.Str("code"));
        await admin.GetAsync("/api/v1/admin/batches/999999").ExpectStatus(HttpStatusCode.NotFound);
        await admin.PostJson("/api/v1/admin/batches/999999/move", new { to = "composting" }).ExpectStatus(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Rules_publish_bumps_version_and_forces_charged_waste_to_zero_points()
    {
        var admin = await _api.SuperAdminAsync();
        var current = await admin.GetAsync("/api/v1/admin/rules").Expect();
        var version = current.Int("version");

        var published = await admin.PutJson("/api/v1/admin/rules", Rules(version)).Expect();
        var stale = await admin.PutJson("/api/v1/admin/rules", Rules(version)).ExpectError(HttpStatusCode.Conflict);
        var audit = await admin.GetAsync($"/api/v1/admin/audit?action={Uri.EscapeDataString("Rule changed")}").Expect();

        Assert.Equal(version + 1, published.Int("version"));
        var idols = published.Arr("earning").First(x => x!.Str("waste") == "Broken idols")!;
        Assert.Equal(0, idols.Int("ptsPerKg"));
        Assert.Equal(10m, idols.Dec("charge"));
        Assert.Equal($"Rules were changed by someone else. Reload version {version + 1} and try again.", stale);
        Assert.Contains(audit.Items(), x => x.Str("newValue") == $"Version {version + 1}");
    }

    [Fact]
    public async Task Rules_publish_validation()
    {
        var admin = await _api.SuperAdminAsync();

        var dupWaste = await admin.PutJson("/api/v1/admin/rules", Rules(null, earning: new object[] { new { waste = "Flowers", ptsPerKg = 1, maxPerDay = 1 }, new { waste = " flowers ", ptsPerKg = 1, maxPerDay = 1 } })).ExpectError(HttpStatusCode.BadRequest);
        var dupLevel = await admin.PutJson("/api/v1/admin/rules", Rules(null, levels: new object[] { new { name = "A", minPoints = 0, multiplier = 1 }, new { name = "B", minPoints = 0, multiplier = 1 } })).ExpectError(HttpStatusCode.BadRequest);
        var noZero = await admin.PutJson("/api/v1/admin/rules", Rules(null, levels: new object[] { new { name = "A", minPoints = 10, multiplier = 1 } })).ExpectError(HttpStatusCode.BadRequest);
        await admin.PutJson("/api/v1/admin/rules", Rules(null, levels: Array.Empty<object>())).ExpectStatus(HttpStatusCode.BadRequest);
        await admin.PutJson("/api/v1/admin/rules", Rules(null, levels: new object[] { new { name = "A", minPoints = 0, multiplier = 50 } })).ExpectStatus(HttpStatusCode.BadRequest);

        Assert.Equal("Each waste type can appear only once.", dupWaste);
        Assert.Equal("Each level needs a different minimum points value.", dupLevel);
        Assert.Equal("The first level must start at 0 points.", noZero);
    }

    [Fact]
    public async Task Audit_log_filters_and_lists_filter_values()
    {
        var admin = await _api.SuperAdminAsync();
        var name = $"Audited {Guid.NewGuid():N}"[..18];
        await admin.PostJson("/api/v1/admin/temples", new { name, type = "unregistered", address = "Sector 3", contact = "X", mobileNumber = ApiFactory.NewMobile() }).Expect(HttpStatusCode.Created);
        var today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(5.5)).ToString("yyyy-MM-dd");

        var filtered = await admin.GetAsync($"/api/v1/admin/audit?action={Uri.EscapeDataString("Temple added")}&actor={Uri.EscapeDataString("Super Admin")}&from={today}&to={today}&q={Uri.EscapeDataString(name)}").Expect();
        var past = await admin.GetAsync($"/api/v1/admin/audit?to=2020-01-01&q={Uri.EscapeDataString(name)}").Expect();
        var filters = await admin.GetAsync("/api/v1/admin/audit/filters").Expect();

        var entry = Assert.Single(filtered.Items());
        Assert.Equal("Admin", entry.Str("role"));
        Assert.Equal("Pending", entry.Str("newValue"));
        Assert.Equal(0, past.Int("total"));
        Assert.Contains(filters.Arr("actors"), x => x!.GetValue<string>() == "Super Admin");
        Assert.Contains(filters.Arr("actions"), x => x!.GetValue<string>() == "Temple added");
        Assert.Equal(5, filters.Arr("datasets").Count);
    }

    [Fact]
    public async Task Masked_deposit_export_hides_mobiles_and_is_logged()
    {
        var admin = await _api.SuperAdminAsync();
        var devotee = await _api.NewDevoteeAsync();
        var templeId = await _api.TempleIdAsync(ApiFactory.ShivMandir);
        await ApiFactory.DepositAsync(await _api.OperatorAsync(), devotee.UserId, templeId);
        var reason = $"Monthly report {Guid.NewGuid():N}";

        using var response = await admin.PostJson("/api/v1/admin/exports", new { dataset = "deposits", reason, masked = true });
        var csv = Encoding.UTF8.GetString(await response.Content.ReadAsByteArrayAsync());
        var exports = await admin.GetAsync("/api/v1/admin/exports").Expect();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/csv", response.Content.Headers.ContentType?.MediaType);
        Assert.StartsWith("deposits_", response.Content.Headers.ContentDisposition?.FileName?.Trim('"'));
        Assert.Contains("Deposit,Date,Devotee,Mobile,Temple,Waste,Kg,Points,Charge,Status,Reason,Conflict", csv);
        Assert.Contains($"******{devotee.Mobile[^4..]}", csv);
        Assert.DoesNotContain(devotee.Mobile, csv);
        var logged = exports.AsArray().First(x => x!.Str("reason") == reason)!;
        Assert.Equal("Deposits", logged.Str("dataset"));
        Assert.True(logged.Bool("masked"));
    }

    [Fact]
    public async Task Unmasked_export_shows_full_mobile()
    {
        var admin = await _api.SuperAdminAsync();
        var devotee = await _api.NewDevoteeAsync();

        using var response = await admin.PostJson("/api/v1/admin/exports", new { dataset = "Users", reason = "KYC audit", masked = false });
        var csv = Encoding.UTF8.GetString(await response.Content.ReadAsByteArrayAsync());

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains(devotee.Mobile, csv);
    }

    [Theory]
    [InlineData("Orders", "Order,Date,Customer")]
    [InlineData("Points ledger", "Entry,Date,Devotee")]
    [InlineData("Pilot KPIs", "Metric,Value")]
    public async Task Every_dataset_exports_with_its_header(string dataset, string header)
    {
        var admin = await _api.SuperAdminAsync();

        using var response = await admin.PostJson("/api/v1/admin/exports", new { dataset, reason = "Check", masked = true });
        var csv = Encoding.UTF8.GetString(await response.Content.ReadAsByteArrayAsync());

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains(header, csv);
    }

    [Fact]
    public async Task Export_validation()
    {
        var admin = await _api.SuperAdminAsync();

        var unknown = await admin.PostJson("/api/v1/admin/exports", new { dataset = "Passwords", reason = "x" }).ExpectError(HttpStatusCode.BadRequest);
        var dates = await admin.PostJson("/api/v1/admin/exports", new { dataset = "Orders", reason = "x", from = "2026-02-01", to = "2026-01-01" }).ExpectError(HttpStatusCode.BadRequest);
        await admin.PostJson("/api/v1/admin/exports", new { dataset = "Orders", reason = "" }).ExpectStatus(HttpStatusCode.BadRequest);

        Assert.Equal("Choose one of: Deposits, Users, Orders, Points ledger, Pilot KPIs.", unknown);
        Assert.Equal("The start date must be before the end date.", dates);
    }

    [Fact]
    public async Task Admin_deposit_list_masks_mobile()
    {
        var admin = await _api.SuperAdminAsync();
        var devotee = await _api.NewDevoteeAsync();
        var templeId = await _api.TempleIdAsync(ApiFactory.ShivMandir);
        var deposit = await ApiFactory.DepositAsync(await _api.OperatorAsync(), devotee.UserId, templeId);

        var list = await admin.GetAsync($"/api/v1/admin/deposits?templeId={templeId}&q={devotee.Mobile[^6..]}").Expect();
        var one = await admin.GetAsync($"/api/v1/admin/deposits/{deposit.Long("id")}").Expect();

        Assert.Contains(list.Items(), x => x.Long("id") == deposit.Long("id"));
        Assert.All(list.Items(), x => Assert.StartsWith("******", x.Str("mobileNumber")));
        Assert.StartsWith("******", one.Str("mobileNumber"));
        await admin.GetAsync("/api/v1/admin/deposits/999999999").ExpectStatus(HttpStatusCode.NotFound);
    }

    [Theory]
    [InlineData(null, "30")]
    [InlineData("7", "7")]
    [InlineData("all", "all")]
    [InlineData("365", "30")]
    public async Task Dashboard_returns_kpis_week_and_cohorts(string? range, string expected)
    {
        var admin = await _api.SuperAdminAsync();

        var dashboard = await admin.GetAsync(range is null ? "/api/v1/admin/dashboard" : $"/api/v1/admin/dashboard?range={range}").Expect();

        Assert.Equal(expected, dashboard.Str("range"));
        Assert.True(dashboard["kpis"]!.Int("devotees") >= 1);
        Assert.Equal(7, dashboard.Arr("collectionByDay").Count);
        Assert.Equal(4, dashboard.Arr("retentionCohorts").Count);
        Assert.All(dashboard.Arr("retentionCohorts"), x => Assert.Equal(4, x!.Arr("values").Count));
        Assert.True(dashboard["queues"]!.Int("templesPending") >= 1);
    }
}
