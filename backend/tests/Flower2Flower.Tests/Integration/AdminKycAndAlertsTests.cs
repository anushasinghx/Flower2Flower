using System.Net;
using Flower2Flower.Tests.Support;

namespace Flower2Flower.Tests.Integration;

[Collection(ApiCollection.Name)]
public sealed class AdminKycAndAlertsTests
{
    private readonly ApiFactory _api;

    public AdminKycAndAlertsTests(ApiFactory api)
    {
        _api = api;
    }

    [Fact]
    public async Task Kyc_queue_shows_masked_pending_requests()
    {
        var devotee = await _api.NewDevoteeAsync(name: $"Kyc Queue {Guid.NewGuid():N}"[..18]);
        await devotee.Client.PutJson("/api/v1/me/consents/rules", new { active = true }).Expect();
        var id = await ApiFactory.SubmitKycAsync(devotee.Client, "9999 8888 7777");
        var admin = await _api.SuperAdminAsync();

        var pending = await admin.GetAsync($"/api/v1/admin/kyc?status=pending&q={Uri.EscapeDataString(devotee.Name)}").Expect();
        var one = await admin.GetAsync($"/api/v1/admin/kyc/{id}").Expect();

        var item = Assert.Single(pending.Items());
        Assert.Equal(id.ToString(), item.Str("id"));
        Assert.Equal($"******{devotee.Mobile[^4..]}", item.Str("maskedMobile"));
        Assert.Equal("XXXX XXXX 7777", item.Str("docNumber"));
        Assert.Equal("1 of 2", item.Str("consents"));
        Assert.True(item.Bool("hasBackImage"));
        Assert.True(pending["counts"]!.Int("pending") >= 1);
        Assert.Equal("inReview", one.Str("status"));
    }

    [Fact]
    public async Task Kyc_queue_searches_by_mobile_digits()
    {
        var devotee = await _api.NewDevoteeAsync();
        await ApiFactory.SubmitKycAsync(devotee.Client);
        var admin = await _api.SuperAdminAsync();

        var found = await admin.GetAsync($"/api/v1/admin/kyc?q={devotee.Mobile[^6..]}").Expect();

        Assert.Contains(found.Items(), x => x.Guid("userId") == devotee.UserId);
    }

    [Fact]
    public async Task Unmask_shows_full_details_and_is_audited()
    {
        var devotee = await _api.NewDevoteeAsync(name: $"Unmask {Guid.NewGuid():N}"[..16]);
        var id = await ApiFactory.SubmitKycAsync(devotee.Client, "1111 2222 3333");
        var admin = await _api.SuperAdminAsync();

        var full = await admin.PostJson($"/api/v1/admin/kyc/{id}/unmask").Expect();
        var audit = await admin.GetAsync($"/api/v1/admin/audit?action={Uri.EscapeDataString("Viewed unmasked data")}&q={Uri.EscapeDataString(devotee.Name)}").Expect();

        Assert.Equal(devotee.Mobile, full.Str("mobileNumber"));
        Assert.Equal("1111 2222 3333", full.Str("docNumber"));
        Assert.Equal(1, audit.Int("total"));
    }

    [Fact]
    public async Task Reject_needs_reason_and_lets_devotee_resubmit()
    {
        var devotee = await _api.NewDevoteeAsync();
        var id = await ApiFactory.SubmitKycAsync(devotee.Client);
        var admin = await _api.SuperAdminAsync();

        var noReason = await admin.PostJson($"/api/v1/admin/kyc/{id}/decision", new { approve = false, reason = " " }).ExpectError(HttpStatusCode.BadRequest);
        var rejected = await admin.PostJson($"/api/v1/admin/kyc/{id}/decision", new { approve = false, reason = "Photo is blurred" }).Expect();
        var seen = await devotee.Client.GetAsync("/api/v1/me/kyc").Expect();
        var profile = await devotee.Client.GetAsync("/api/v1/me").Expect();
        var points = await devotee.Client.GetAsync("/api/v1/me/points").Expect();
        await ApiFactory.SubmitKycAsync(devotee.Client);

        Assert.Equal("Give a reason so the devotee knows what to fix.", noReason);
        Assert.Equal("rejected", rejected.Str("status"));
        Assert.Equal("rejected", seen.Str("status"));
        Assert.Equal("Photo is blurred", seen["submission"]!.Str("reason"));
        Assert.Equal("Photo is blurred", profile["kyc"]!.Str("reason"));
        Assert.Equal(0, points.Int("available"));
    }

    [Fact]
    public async Task Approve_grants_bonus_once_and_cannot_be_decided_twice()
    {
        var devotee = await _api.NewDevoteeAsync();
        var first = await ApiFactory.SubmitKycAsync(devotee.Client);
        var admin = await _api.SuperAdminAsync();
        await admin.PostJson($"/api/v1/admin/kyc/{first}/decision", new { approve = false, reason = "Retake" }).Expect();
        var second = await ApiFactory.SubmitKycAsync(devotee.Client);

        var approved = await admin.PostJson($"/api/v1/admin/kyc/{second}/decision", new { approve = true }).Expect();
        var again = await admin.PostJson($"/api/v1/admin/kyc/{second}/decision", new { approve = true }).ExpectError(HttpStatusCode.Conflict);
        var bonus = await devotee.Client.GetAsync("/api/v1/me/ledger?kinds=bonus").Expect();
        var audit = await admin.GetAsync($"/api/v1/admin/audit?action={Uri.EscapeDataString("KYC approved")}").Expect();

        Assert.Equal("verified", approved.Str("status"));
        Assert.Equal("This KYC request was already decided.", again);
        Assert.Equal(1, bonus.Int("total"));
        Assert.True(audit.Int("total") >= 1);
    }

    [Fact]
    public async Task Unknown_kyc_request_is_not_found()
    {
        var admin = await _api.SuperAdminAsync();
        var missing = Guid.NewGuid();

        await admin.GetAsync($"/api/v1/admin/kyc/{missing}").ExpectStatus(HttpStatusCode.NotFound);
        await admin.PostJson($"/api/v1/admin/kyc/{missing}/unmask").ExpectStatus(HttpStatusCode.NotFound);
        await admin.PostJson($"/api/v1/admin/kyc/{missing}/decision", new { approve = true }).ExpectStatus(HttpStatusCode.NotFound);
    }

    private async Task<(TestDevotee Devotee, string AlertId, long DepositId)> HeldDepositAsync()
    {
        var devotee = await _api.NewDevoteeAsync();
        var operatorClient = await _api.OperatorAsync();
        var templeId = await _api.TempleIdAsync(ApiFactory.ShivMandir);
        var deposit = await ApiFactory.DepositAsync(operatorClient, devotee.UserId, templeId, "Flowers", 15m);
        var admin = await _api.SuperAdminAsync();
        var alert = (await admin.GetAsync("/api/v1/admin/alerts?status=Open").Expect()).Items().Single(x => x.Str("subjectUserId") == devotee.UserId.ToString());
        return (devotee, alert.Str("id"), deposit.Long("id"));
    }

    [Fact]
    public async Task Releasing_held_points_accepts_deposit_and_credits_devotee()
    {
        var (devotee, alertId, depositId) = await HeldDepositAsync();
        var admin = await _api.SuperAdminAsync();

        var resolved = await admin.PostJson($"/api/v1/admin/alerts/{alertId}/resolve", new { action = "release", note = "Weighed again, correct" }).Expect();
        var points = await devotee.Client.GetAsync("/api/v1/me/points").Expect();
        var deposit = await devotee.Client.GetAsync($"/api/v1/me/deposits/{depositId}").Expect();
        var again = await admin.PostJson($"/api/v1/admin/alerts/{alertId}/resolve", new { action = "release", note = "Twice" }).ExpectError(HttpStatusCode.Conflict);

        Assert.Equal("resolved", resolved.Str("status"));
        Assert.Equal(0, resolved.Int("heldPoints"));
        Assert.Equal("Weighed again, correct", resolved.Str("resolution"));
        Assert.Equal(1000, points.Int("available"));
        Assert.Equal(0, points.Int("held"));
        Assert.Equal(1000, points.Int("lifetime"));
        Assert.False(points.Bool("flagged"));
        Assert.Equal("accepted", deposit.Str("status"));
        Assert.Equal("This alert is already resolved.", again);
    }

    [Fact]
    public async Task Removing_held_points_never_credits_devotee()
    {
        var (devotee, alertId, depositId) = await HeldDepositAsync();
        var admin = await _api.SuperAdminAsync();

        await admin.PostJson($"/api/v1/admin/alerts/{alertId}/resolve", new { action = "remove", note = "Scale tampered" }).Expect();
        var points = await devotee.Client.GetAsync("/api/v1/me/points").Expect();
        var removed = await devotee.Client.GetAsync("/api/v1/me/ledger?kinds=removed").Expect();
        var deposit = await devotee.Client.GetAsync($"/api/v1/me/deposits/{depositId}").Expect();

        Assert.Equal(0, points.Int("available"));
        Assert.Equal(0, points.Int("held"));
        Assert.Equal(-1000, Assert.Single(removed.Items()).Int("points"));
        Assert.Equal("held", deposit.Str("status"));
    }

    [Fact]
    public async Task Dismissing_keeps_points_held()
    {
        var (devotee, alertId, _) = await HeldDepositAsync();
        var admin = await _api.SuperAdminAsync();

        var resolved = await admin.PostJson($"/api/v1/admin/alerts/{alertId}/resolve", new { action = "dismiss", note = "Duplicate alert" }).Expect();
        var points = await devotee.Client.GetAsync("/api/v1/me/points").Expect();

        Assert.Equal(1000, resolved.Int("heldPoints"));
        Assert.Equal(1000, points.Int("held"));
        Assert.Equal(0, points.Int("available"));
    }

    [Fact]
    public async Task Resolve_needs_a_note_and_existing_alert()
    {
        var (_, alertId, _) = await HeldDepositAsync();
        var admin = await _api.SuperAdminAsync();

        await admin.PostJson($"/api/v1/admin/alerts/{alertId}/resolve", new { action = "release", note = "" }).ExpectStatus(HttpStatusCode.BadRequest);
        await admin.PostJson($"/api/v1/admin/alerts/{Guid.NewGuid()}/resolve", new { action = "release", note = "x" }).ExpectStatus(HttpStatusCode.NotFound);
        await admin.GetAsync($"/api/v1/admin/alerts/{Guid.NewGuid()}").ExpectStatus(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Alert_list_puts_open_first_and_counts()
    {
        await HeldDepositAsync();
        var admin = await _api.SuperAdminAsync();

        var all = await admin.GetAsync("/api/v1/admin/alerts").Expect();
        var high = await admin.GetAsync("/api/v1/admin/alerts?severity=High").Expect();

        var statuses = all.Items().Select(x => x.Str("status")).ToList();
        Assert.Equal(statuses.OrderBy(x => x == "open" ? 0 : 1).ToList(), statuses);
        Assert.True(all["counts"]!.Int("open") >= 1);
        Assert.All(high.Items(), x => Assert.Equal("high", x.Str("severity")));
    }
}
