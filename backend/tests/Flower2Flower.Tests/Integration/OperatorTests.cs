using System.Net;
using Flower2Flower.Tests.Support;

namespace Flower2Flower.Tests.Integration;

[Collection(ApiCollection.Name)]
public sealed class OperatorTests
{
    private readonly ApiFactory _api;

    public OperatorTests(ApiFactory api)
    {
        _api = api;
    }

    private async Task<(HttpClient Operator, Guid TempleId)> CounterAsync()
    {
        return (await _api.OperatorAsync(), await _api.TempleIdAsync(ApiFactory.ShivMandir));
    }

    [Fact]
    public async Task Operator_endpoints_need_operator_or_admin_role()
    {
        var devotee = await _api.SignInAsync(ApiFactory.NewMobile());
        var templeAdmin = await _api.SignInAsync(ApiFactory.TempleAdminMobile);

        await _api.Anonymous().GetAsync("/api/v1/operator/temples").ExpectStatus(HttpStatusCode.Unauthorized);
        await devotee.GetAsync("/api/v1/operator/temples").ExpectStatus(HttpStatusCode.Forbidden);
        await templeAdmin.GetAsync("/api/v1/operator/temples").ExpectStatus(HttpStatusCode.Forbidden);
        await (await _api.OperatorAsync()).GetAsync("/api/v1/operator/temples").ExpectStatus(HttpStatusCode.OK);
        await (await _api.SuperAdminAsync()).GetAsync("/api/v1/operator/temples").ExpectStatus(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Counter_temples_are_only_verified()
    {
        var temples = (await (await _api.OperatorAsync()).GetAsync("/api/v1/operator/temples").Expect()).Items().Select(x => x.Str("name")).ToList();

        Assert.Contains(ApiFactory.ShivMandir, temples);
        Assert.DoesNotContain(ApiFactory.HanumanMandir, temples);
    }

    [Fact]
    public async Task Lookup_by_mobile_returns_masked_devotee()
    {
        var found = await (await _api.OperatorAsync()).GetAsync($"/api/v1/operator/devotees/lookup?mobile={ApiFactory.DevoteeMobile}").Expect();

        Assert.Equal("Sunita", found.Str("name"));
        Assert.Equal("******1234", found.Str("maskedMobile"));
        Assert.Equal("verified", found.Str("kyc"));
        Assert.Equal("Shipra Sun City Residents", found.Str("societyName"));
        Assert.Equal(3, found.Int("rejectionLimit"));
    }

    [Theory]
    [InlineData("12345")]
    [InlineData("5555555555")]
    public async Task Lookup_rejects_invalid_mobile(string mobile)
    {
        var message = await (await _api.OperatorAsync()).GetAsync($"/api/v1/operator/devotees/lookup?mobile={mobile}").ExpectError(HttpStatusCode.BadRequest);

        Assert.Equal("Enter a valid 10 digit number starting with 6, 7, 8 or 9.", message);
    }

    [Fact]
    public async Task Lookup_of_unknown_or_staff_number_is_not_found()
    {
        var client = await _api.OperatorAsync();

        var unknown = await client.GetAsync($"/api/v1/operator/devotees/lookup?mobile={ApiFactory.NewMobile()}").ExpectError(HttpStatusCode.NotFound);
        await client.GetAsync($"/api/v1/operator/devotees/lookup?mobile={ApiFactory.AdminMobile}").ExpectStatus(HttpStatusCode.NotFound);

        Assert.Equal("No devotee found with this number. Register them at the counter.", unknown);
    }

    [Fact]
    public async Task Lookup_rejects_invalid_qr()
    {
        var message = await (await _api.OperatorAsync()).GetAsync("/api/v1/operator/devotees/lookup?qr=bad.token.value").ExpectError(HttpStatusCode.BadRequest);

        Assert.Equal("This QR code is not valid or has expired.", message);
    }

    [Fact]
    public async Task Send_otp_refuses_registered_numbers()
    {
        var client = await _api.OperatorAsync();

        var message = await client.PostJson("/api/v1/operator/devotees/send-otp", new { mobileNumber = ApiFactory.DevoteeMobile }).ExpectError(HttpStatusCode.Conflict);
        await client.PostJson("/api/v1/operator/devotees/send-otp", new { mobileNumber = ApiFactory.NewMobile() }).ExpectStatus(HttpStatusCode.OK);
        await client.PostJson("/api/v1/operator/devotees/send-otp", new { mobileNumber = "123" }).ExpectStatus(HttpStatusCode.BadRequest);

        Assert.Equal("This number is already registered.", message);
    }

    [Fact]
    public async Task Assisted_registration_creates_consented_devotee()
    {
        var client = await _api.OperatorAsync();
        var mobile = ApiFactory.NewMobile();

        var created = await client.PostJson("/api/v1/operator/devotees/register", new { mobileNumber = mobile, otp = ApiFactory.Otp, fullName = " Ramesh ", dateOfBirth = "1960-01-01", language = "hi", rulesConsent = true, kycConsent = true }).Expect(HttpStatusCode.Created);
        var lookup = await client.GetAsync($"/api/v1/operator/devotees/lookup?mobile={mobile}").Expect();
        var duplicate = await client.PostJson("/api/v1/operator/devotees/register", new { mobileNumber = mobile, otp = ApiFactory.Otp, fullName = "Again", dateOfBirth = "1960-01-01", rulesConsent = true, kycConsent = true }).ExpectError(HttpStatusCode.Conflict);
        var devoteeClient = await _api.SignInAsync(mobile);
        var consents = await devoteeClient.GetAsync("/api/v1/me/consents").Expect();
        var me = await devoteeClient.GetAsync("/api/v1/me").Expect();

        Assert.Equal("Ramesh", created.Str("name"));
        Assert.Equal("Ravi Prasad", created.Str("assistedBy"));
        Assert.Equal("Ravi Prasad", lookup.Str("assistedBy"));
        Assert.Equal("This number is already registered.", duplicate);
        Assert.Equal(2, consents.AsArray().Count(x => x!.Bool("active")));
        Assert.Equal("hi", me.Str("language"));
    }

    [Fact]
    public async Task Assisted_registration_validations()
    {
        var client = await _api.OperatorAsync();
        var minor = DateOnly.FromDateTime(DateTime.UtcNow).AddYears(-16).ToString("yyyy-MM-dd");

        var young = await client.PostJson("/api/v1/operator/devotees/register", new { mobileNumber = ApiFactory.NewMobile(), otp = ApiFactory.Otp, fullName = "Kid", dateOfBirth = minor, rulesConsent = true, kycConsent = true }).ExpectError(HttpStatusCode.BadRequest);
        var consent = await client.PostJson("/api/v1/operator/devotees/register", new { mobileNumber = ApiFactory.NewMobile(), otp = ApiFactory.Otp, fullName = "No", dateOfBirth = "1980-01-01", rulesConsent = true, kycConsent = false }).ExpectError(HttpStatusCode.BadRequest);
        var format = await client.PostJson("/api/v1/operator/devotees/register", new { mobileNumber = ApiFactory.NewMobile(), otp = "12ab", fullName = "Bad", dateOfBirth = "1980-01-01", rulesConsent = true, kycConsent = true }).ExpectError(HttpStatusCode.BadRequest);
        var wrong = await client.PostJson("/api/v1/operator/devotees/register", new { mobileNumber = ApiFactory.NewMobile(), otp = "000000", fullName = "Bad", dateOfBirth = "1980-01-01", rulesConsent = true, kycConsent = true }).ExpectError(HttpStatusCode.BadRequest);
        await client.PostJson("/api/v1/operator/devotees/register", new { mobileNumber = ApiFactory.NewMobile(), otp = ApiFactory.Otp, fullName = "No dob", rulesConsent = true, kycConsent = true }).ExpectStatus(HttpStatusCode.BadRequest);

        Assert.Equal("The devotee must be 18 or older.", young);
        Assert.Equal("Both consents are needed to register.", consent);
        Assert.Equal("Enter the 6 digit code.", format);
        Assert.Equal("Incorrect code. Try again.", wrong);
    }

    [Fact]
    public async Task Quote_previews_points_without_saving()
    {
        var devotee = await _api.NewDevoteeAsync();
        var (client, _) = await CounterAsync();

        var quote = await client.PostJson("/api/v1/operator/deposits/quote", new { devoteeUserId = devotee.UserId, waste = "Garlands", kg = 2.5m }).Expect();
        var deposits = await devotee.Client.GetAsync("/api/v1/me/deposits").Expect();

        Assert.True(quote.Bool("eligible"));
        Assert.Equal(200, quote.Int("points"));
        Assert.Equal(0, deposits.Int("total"));
    }

    [Fact]
    public async Task Quote_for_unknown_devotee_is_not_found()
    {
        var (client, _) = await CounterAsync();

        await client.PostJson("/api/v1/operator/deposits/quote", new { devoteeUserId = Guid.NewGuid(), waste = "Flowers", kg = 1m }).ExpectStatus(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Accepted_deposit_earns_points_and_notifies_devotee()
    {
        var devotee = await _api.NewDevoteeAsync();
        var (client, templeId) = await CounterAsync();

        var deposit = await ApiFactory.DepositAsync(client, devotee.UserId, templeId, "Flowers", 2m);
        var points = await devotee.Client.GetAsync("/api/v1/me/points").Expect();
        var ledger = await devotee.Client.GetAsync("/api/v1/me/ledger?kinds=earned").Expect();

        Assert.Equal("accepted", deposit.Str("status"));
        Assert.Equal(200, deposit.Int("points"));
        Assert.StartsWith("D", deposit.Str("code"));
        Assert.Equal($"******{devotee.Mobile[^4..]}", deposit.Str("mobileNumber"));
        Assert.Equal(ApiFactory.ShivMandir, deposit.Str("templeName"));
        Assert.Equal(new[] { "No plastic, metal or cloth" }, deposit.Arr("checks").Select(x => x!.GetValue<string>()));
        Assert.Equal(200, points.Int("available"));
        Assert.Equal(2m, points.Dec("kgOffered"));
        Assert.Equal(200, Assert.Single(ledger.Items()).Int("points"));
    }

    [Fact]
    public async Task Deposit_can_be_found_by_mobile_number()
    {
        var devotee = await _api.NewDevoteeAsync();
        var (client, templeId) = await CounterAsync();
        Guid photo = await ApiFactory.UploadAsync(client, "PurityPhoto");

        var deposit = await client.PostJson("/api/v1/operator/deposits", new { mobileNumber = devotee.Mobile, templeId, waste = "Leaves", kg = 1m, photoFileId = photo }).Expect(HttpStatusCode.Created);

        Assert.Equal(devotee.UserId, deposit.Guid("devoteeUserId"));
    }

    [Fact]
    public async Task Deposit_validation_messages()
    {
        var devotee = await _api.NewDevoteeAsync();
        var (client, templeId) = await CounterAsync();
        var pending = await _api.TempleIdAsync(ApiFactory.HanumanMandir);
        var photo = await ApiFactory.UploadAsync(client, "PurityPhoto");
        var notPurity = await ApiFactory.UploadAsync(client, "KycFront");

        async Task<string> Fail(object body, HttpStatusCode code = HttpStatusCode.BadRequest) => await client.PostJson("/api/v1/operator/deposits", body).ExpectError(code);

        Assert.Equal("Enter a weight greater than zero.", await Fail(new { devoteeUserId = devotee.UserId, templeId, waste = "Flowers", kg = 0m, photoFileId = photo }));
        Assert.Equal("Enter a weight greater than zero.", await Fail(new { devoteeUserId = devotee.UserId, templeId, waste = "Flowers", kg = 1001m, photoFileId = photo }));
        Assert.Equal("Devotee not found. Register the devotee first.", await Fail(new { devoteeUserId = Guid.NewGuid(), templeId, waste = "Flowers", kg = 1m, photoFileId = photo }, HttpStatusCode.NotFound));
        Assert.Equal("Choose a verified temple counter.", await Fail(new { devoteeUserId = devotee.UserId, templeId = pending, waste = "Flowers", kg = 1m, photoFileId = photo }));
        Assert.Equal("Purity photo was not found. Upload it again.", await Fail(new { devoteeUserId = devotee.UserId, templeId, waste = "Flowers", kg = 1m, photoFileId = notPurity }));
        Assert.Equal("A purity photo is needed to accept a deposit.", await Fail(new { devoteeUserId = devotee.UserId, templeId, waste = "Flowers", kg = 1m }));
        Assert.Equal("Choose a reason to reject.", await Fail(new { devoteeUserId = devotee.UserId, templeId, waste = "Flowers", kg = 1m, rejected = true, reason = "  " }));
        Assert.Equal("This waste type is not eligible. Reject it with a reason instead.", await Fail(new { devoteeUserId = devotee.UserId, templeId, waste = "Plastic bags", kg = 1m, photoFileId = photo }));
        Assert.Equal("Collect the handling charge before accepting.", await Fail(new { devoteeUserId = devotee.UserId, templeId, waste = "Broken idols", kg = 2m, photoFileId = photo }));
    }

    [Fact]
    public async Task Rejected_deposit_needs_no_photo_and_earns_nothing()
    {
        var devotee = await _api.NewDevoteeAsync();
        var (client, templeId) = await CounterAsync();

        var deposit = await ApiFactory.DepositAsync(client, devotee.UserId, templeId, "Flowers", 1m, withPhoto: false, rejected: true, reason: "Plastic mixed in");
        var points = await devotee.Client.GetAsync("/api/v1/me/points").Expect();

        Assert.Equal("rejected", deposit.Str("status"));
        Assert.Equal(0, deposit.Int("points"));
        Assert.Equal("Plastic mixed in", deposit.Str("reason"));
        Assert.Equal(0, points.Int("available"));
        Assert.Equal(0m, points.Dec("kgOffered"));
    }

    [Fact]
    public async Task Charged_waste_records_charge_without_points()
    {
        var devotee = await _api.NewDevoteeAsync();
        var (client, templeId) = await CounterAsync();

        var deposit = await ApiFactory.DepositAsync(client, devotee.UserId, templeId, "Broken idols", 2m, chargeCollected: true);

        Assert.Equal("accepted", deposit.Str("status"));
        Assert.Equal(0, deposit.Int("points"));
        Assert.Equal(20m, deposit.Dec("charge"));
        Assert.True(deposit.Bool("chargeCollected"));
    }

    [Fact]
    public async Task Daily_cap_limits_points_across_deposits()
    {
        var devotee = await _api.NewDevoteeAsync();
        var (client, templeId) = await CounterAsync();

        var first = await ApiFactory.DepositAsync(client, devotee.UserId, templeId, "Coconut shells", 4m);
        var second = await ApiFactory.DepositAsync(client, devotee.UserId, templeId, "Coconut shells", 3m);

        Assert.Equal(80, first.Int("points"));
        Assert.Equal(20, second.Int("points"));
    }

    [Fact]
    public async Task Overweight_deposit_is_held_with_alert()
    {
        var devotee = await _api.NewDevoteeAsync(name: "Heavy Giver");
        var (client, templeId) = await CounterAsync();

        var deposit = await ApiFactory.DepositAsync(client, devotee.UserId, templeId, "Flowers", 12m);
        var points = await devotee.Client.GetAsync("/api/v1/me/points").Expect();
        var alerts = (await (await _api.SuperAdminAsync()).GetAsync("/api/v1/admin/alerts?status=Open").Expect()).Items().Where(x => x.Str("subjectUserId") == devotee.UserId.ToString()).ToList();

        Assert.Equal("held", deposit.Str("status"));
        Assert.Equal(1000, deposit.Int("points"));
        Assert.Equal(0, points.Int("available"));
        Assert.Equal(1000, points.Int("held"));
        Assert.True(points.Bool("flagged"));
        var alert = Assert.Single(alerts);
        Assert.Equal("weight", alert.Str("ruleKind"));
        Assert.Equal(1000, alert.Int("heldPoints"));
        Assert.Equal(deposit.Str("code"), alert.Str("depositCode"));
    }

    [Fact]
    public async Task Third_rejection_in_a_week_raises_one_high_alert()
    {
        var devotee = await _api.NewDevoteeAsync();
        var (client, templeId) = await CounterAsync();

        for (var i = 0; i < 4; i++)
        {
            await ApiFactory.DepositAsync(client, devotee.UserId, templeId, withPhoto: false, rejected: true, reason: "Contaminated");
        }

        var alerts = (await (await _api.SuperAdminAsync()).GetAsync("/api/v1/admin/alerts").Expect()).Items().Where(x => x.Str("subjectUserId") == devotee.UserId.ToString()).ToList();
        var lookup = await client.GetAsync($"/api/v1/operator/devotees/lookup?mobile={devotee.Mobile}").Expect();

        var alert = Assert.Single(alerts);
        Assert.Equal("rejection", alert.Str("ruleKind"));
        Assert.Equal("high", alert.Str("severity"));
        Assert.Equal(4, lookup.Int("rejectionsThisWeek"));
        Assert.True(lookup.Bool("flagged"));
    }

    [Fact]
    public async Task Six_deposits_in_an_hour_raise_rapid_alert()
    {
        var devotee = await _api.NewDevoteeAsync();
        var (client, templeId) = await CounterAsync();

        for (var i = 0; i < 6; i++)
        {
            await ApiFactory.DepositAsync(client, devotee.UserId, templeId, "Leaves", 0.5m);
        }

        var alerts = (await (await _api.SuperAdminAsync()).GetAsync("/api/v1/admin/alerts").Expect()).Items().Where(x => x.Str("subjectUserId") == devotee.UserId.ToString()).ToList();

        Assert.Equal("rapid", Assert.Single(alerts).Str("ruleKind"));
    }

    [Fact]
    public async Task Same_client_id_is_saved_only_once()
    {
        var devotee = await _api.NewDevoteeAsync();
        var (client, templeId) = await CounterAsync();
        var clientId = $"c{Guid.NewGuid():N}";

        var first = await ApiFactory.DepositAsync(client, devotee.UserId, templeId, clientId: clientId);
        var second = await ApiFactory.DepositAsync(client, devotee.UserId, templeId, clientId: clientId);
        var mine = await devotee.Client.GetAsync("/api/v1/me/deposits").Expect();

        Assert.Equal(first.Long("id"), second.Long("id"));
        Assert.Equal(1, mine.Int("total"));
    }

    [Fact]
    public async Task Sync_requires_client_ids()
    {
        var (client, templeId) = await CounterAsync();

        var message = await client.PostJson("/api/v1/operator/deposits/sync", new { deposits = new[] { new { templeId, waste = "Flowers", kg = 1m, rejected = true, reason = "x" } } }).ExpectError(HttpStatusCode.BadRequest);

        Assert.Equal("Every queued deposit needs a clientId so it is saved only once.", message);
    }

    [Fact]
    public async Task Sync_saves_each_item_and_reports_errors_and_duplicates()
    {
        var devotee = await _api.NewDevoteeAsync();
        var (client, templeId) = await CounterAsync();
        var photo = await ApiFactory.UploadAsync(client, "PurityPhoto");
        var goodId = $"c{Guid.NewGuid():N}";
        var badId = $"c{Guid.NewGuid():N}";
        var payload = new
        {
            deposits = new object[]
            {
                new { clientId = goodId, devoteeUserId = devotee.UserId, templeId, waste = "Flowers", kg = 1m, photoFileId = photo, capturedAtUtc = DateTime.UtcNow.AddMinutes(-10) },
                new { clientId = badId, devoteeUserId = devotee.UserId, templeId, waste = "Flowers", kg = 0m, photoFileId = photo }
            }
        };

        var first = await client.PostJson("/api/v1/operator/deposits/sync", payload).Expect();
        var again = await client.PostJson("/api/v1/operator/deposits/sync", payload).Expect();

        var good = first.Arr("results").First(x => x!.Str("clientId") == goodId)!;
        var bad = first.Arr("results").First(x => x!.Str("clientId") == badId)!;
        Assert.True(good.Bool("saved"));
        Assert.False(good.Bool("duplicate"));
        Assert.Equal(100, good.Int("points"));
        Assert.False(bad.Bool("saved"));
        Assert.Equal("Enter a weight greater than zero.", bad.Str("error"));
        Assert.True(again.Arr("results").First(x => x!.Str("clientId") == goodId)!.Bool("duplicate"));
    }

    [Fact]
    public async Task Offline_deposit_for_flagged_devotee_is_held_as_conflict()
    {
        var devotee = await _api.NewDevoteeAsync();
        var (client, templeId) = await CounterAsync();
        await ApiFactory.DepositAsync(client, devotee.UserId, templeId, "Flowers", 11m);
        var photo = await ApiFactory.UploadAsync(client, "PurityPhoto");
        var clientId = $"c{Guid.NewGuid():N}";

        var sync = await client.PostJson("/api/v1/operator/deposits/sync", new { deposits = new[] { new { clientId, devoteeUserId = devotee.UserId, templeId, waste = "Leaves", kg = 1m, photoFileId = photo } } }).Expect();
        var alerts = (await (await _api.SuperAdminAsync()).GetAsync("/api/v1/admin/alerts").Expect()).Items().Where(x => x.Str("subjectUserId") == devotee.UserId.ToString()).ToList();

        var result = Assert.Single(sync.Arr("results"))!;
        Assert.True(result.Bool("conflict"));
        Assert.Equal("held", result.Str("status"));
        Assert.Contains(alerts, x => x.Str("rule") == "Sync conflict" && x.Int("heldPoints") == 100);
    }

    [Fact]
    public async Task Future_capture_time_is_clamped_to_now()
    {
        var devotee = await _api.NewDevoteeAsync();
        var (client, templeId) = await CounterAsync();
        var photo = await ApiFactory.UploadAsync(client, "PurityPhoto");

        var deposit = await client.PostJson("/api/v1/operator/deposits", new { devoteeUserId = devotee.UserId, templeId, waste = "Flowers", kg = 1m, photoFileId = photo, capturedAtUtc = DateTime.UtcNow.AddDays(2) }).Expect(HttpStatusCode.Created);

        Assert.True(DateTime.Parse(deposit.Str("capturedAtUtc")).ToUniversalTime() < DateTime.UtcNow.AddMinutes(1));
    }

    [Fact]
    public async Task Operator_history_lists_own_deposits_and_searches()
    {
        var devotee = await _api.NewDevoteeAsync(name: $"Searchable {Guid.NewGuid():N}"[..20]);
        var (client, templeId) = await CounterAsync();
        var deposit = await ApiFactory.DepositAsync(client, devotee.UserId, templeId);

        var byName = await client.GetAsync($"/api/v1/operator/deposits?q={Uri.EscapeDataString(devotee.Name.ToLowerInvariant())}").Expect();
        var byCode = await client.GetAsync($"/api/v1/operator/deposits?q={deposit.Str("code")}").Expect();
        var byMobile = await client.GetAsync($"/api/v1/operator/deposits?q={devotee.Mobile[^5..]}").Expect();
        var rejected = await client.GetAsync($"/api/v1/operator/deposits?q={Uri.EscapeDataString(devotee.Name)}&status=rejected").Expect();
        var today = await client.GetAsync($"/api/v1/operator/deposits?templeId={templeId}&period=today&pageSize=1").Expect();

        Assert.Equal(deposit.Long("id"), Assert.Single(byName.Items()).Long("id"));
        Assert.Contains(byCode.Items(), x => x.Long("id") == deposit.Long("id"));
        Assert.Contains(byMobile.Items(), x => x.Long("id") == deposit.Long("id"));
        Assert.Equal(0, rejected.Int("total"));
        Assert.Single(today.Items());
        Assert.True(today.Int("total") >= 1);
    }

    [Fact]
    public async Task Single_deposit_lookup()
    {
        var devotee = await _api.NewDevoteeAsync();
        var (client, templeId) = await CounterAsync();
        var deposit = await ApiFactory.DepositAsync(client, devotee.UserId, templeId);

        var one = await client.GetAsync($"/api/v1/operator/deposits/{deposit.Long("id")}").Expect();
        var missing = await client.GetAsync("/api/v1/operator/deposits/999999999").ExpectError(HttpStatusCode.NotFound);

        Assert.Equal(deposit.Str("code"), one.Str("code"));
        Assert.Equal("Deposit not found.", missing);
    }

    [Fact]
    public async Task Daily_summary_counts_today_by_status()
    {
        var templeId = await _api.NewVerifiedTempleAsync();
        var devotee = await _api.NewDevoteeAsync();
        var client = await _api.OperatorAsync();
        await ApiFactory.DepositAsync(client, devotee.UserId, templeId, "Flowers", 2m);
        await ApiFactory.DepositAsync(client, devotee.UserId, templeId, "Leaves", 1m);
        await ApiFactory.DepositAsync(client, devotee.UserId, templeId, withPhoto: false, rejected: true, reason: "Plastic");
        await ApiFactory.DepositAsync(client, devotee.UserId, templeId, "Broken idols", 1m, chargeCollected: true);

        var summary = await client.GetAsync($"/api/v1/operator/summary?templeId={templeId}").Expect();

        Assert.Equal(4, summary.Int("deposits"));
        Assert.Equal(3, summary.Int("accepted"));
        Assert.Equal(1, summary.Int("rejected"));
        Assert.Equal(0, summary.Int("held"));
        Assert.Equal(4m, summary.Dec("totalKg"));
        Assert.Equal(300, summary.Int("points"));
        Assert.Equal(10m, summary.Dec("chargesCollected"));
        Assert.Equal("Flowers", summary.Arr("byType")[0]!.Str("waste"));
        Assert.Null(summary["closedCollection"]);
    }

    [Fact]
    public async Task Summary_for_unknown_temple_is_not_found()
    {
        await (await _api.OperatorAsync()).GetAsync($"/api/v1/operator/summary?templeId={Guid.NewGuid()}").ExpectStatus(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Close_day_records_collection_and_can_be_repeated()
    {
        var templeId = await _api.NewVerifiedTempleAsync();
        var devotee = await _api.NewDevoteeAsync();
        var client = await _api.OperatorAsync();
        await ApiFactory.DepositAsync(client, devotee.UserId, templeId, "Flowers", 2m);

        var first = await client.PostJson("/api/v1/operator/close-day", new { templeId }).Expect();
        await ApiFactory.DepositAsync(client, devotee.UserId, templeId, "Leaves", 1.5m);
        var second = await client.PostJson("/api/v1/operator/close-day", new { templeId }).Expect();
        var summary = await client.GetAsync($"/api/v1/operator/summary?templeId={templeId}").Expect();

        Assert.Equal(2m, first.Dec("kg"));
        Assert.Equal(first.Str("id"), second.Str("id"));
        Assert.Equal(3.5m, second.Dec("kg"));
        Assert.False(second.Bool("used"));
        Assert.Equal(second.Str("id"), summary["closedCollection"]!.Str("id"));
    }

    [Fact]
    public async Task Close_day_for_unknown_temple_is_not_found()
    {
        await (await _api.OperatorAsync()).PostJson("/api/v1/operator/close-day", new { templeId = Guid.NewGuid() }).ExpectStatus(HttpStatusCode.NotFound);
    }
}
