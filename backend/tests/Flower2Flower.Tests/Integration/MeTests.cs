using System.Net;
using Flower2Flower.Tests.Support;

namespace Flower2Flower.Tests.Integration;

[Collection(ApiCollection.Name)]
public sealed class MeTests
{
    private readonly ApiFactory _api;

    public MeTests(ApiFactory api)
    {
        _api = api;
    }

    [Fact]
    public async Task Profile_requires_sign_in()
    {
        await _api.Anonymous().GetAsync("/api/v1/me").ExpectStatus(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task New_user_profile_is_incomplete()
    {
        var mobile = ApiFactory.NewMobile();
        var client = await _api.SignInAsync(mobile);

        var me = await client.GetAsync("/api/v1/me").Expect();

        Assert.False(me.Bool("profileComplete"));
        Assert.Equal(mobile, me.Str("mobileNumber"));
        Assert.Equal($"******{mobile[^4..]}", me.Str("maskedMobile"));
        Assert.Equal("notStarted", me["kyc"]!.Str("status"));
        Assert.Equal(1, me["level"]!.Int("number"));
        Assert.Equal("devotee", me.Str("userType"));
    }

    [Fact]
    public async Task Saving_profile_trims_and_completes_it()
    {
        var client = await _api.SignInAsync(ApiFactory.NewMobile());

        var me = await client.PutJson("/api/v1/me/profile", new { fullName = "  Kavita  ", dateOfBirth = "1992-08-15", address = " Vaibhav Khand ", pin = 201014 }).Expect();

        Assert.True(me.Bool("profileComplete"));
        Assert.Equal("Kavita", me.Str("fullName"));
        Assert.Equal("1992-08-15", me.Str("dateOfBirth"));
        Assert.Equal("Vaibhav Khand", me.Str("address"));
        Assert.Equal(201014, me.Int("pin"));
    }

    [Fact]
    public async Task Profile_rejects_minors()
    {
        var client = await _api.SignInAsync(ApiFactory.NewMobile());
        var dob = DateOnly.FromDateTime(DateTime.UtcNow).AddYears(-17).ToString("yyyy-MM-dd");

        var message = await client.PutJson("/api/v1/me/profile", new { fullName = "Young", dateOfBirth = dob }).ExpectError(HttpStatusCode.BadRequest);

        Assert.Equal("Accounts are for adults 18 and above.", message);
    }

    [Fact]
    public async Task Profile_rejects_future_date_of_birth()
    {
        var client = await _api.SignInAsync(ApiFactory.NewMobile());
        var dob = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(10).ToString("yyyy-MM-dd");

        var message = await client.PutJson("/api/v1/me/profile", new { fullName = "Later", dateOfBirth = dob }).ExpectError(HttpStatusCode.BadRequest);

        Assert.Equal("Date of birth cannot be in the future.", message);
    }

    [Fact]
    public async Task Profile_requires_name_and_valid_pin()
    {
        var client = await _api.SignInAsync(ApiFactory.NewMobile());

        await client.PutJson("/api/v1/me/profile", new { fullName = "" }).ExpectStatus(HttpStatusCode.BadRequest);
        await client.PutJson("/api/v1/me/profile", new { fullName = "Ok", pin = 99 }).ExpectStatus(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Preferences_are_saved()
    {
        var client = await _api.SignInAsync(ApiFactory.NewMobile());

        var prefs = await client.PutJson("/api/v1/me/preferences", new { language = "hi", textSize = "large" }).Expect();
        var me = await client.GetAsync("/api/v1/me").Expect();

        Assert.Equal("hi", prefs.Str("language"));
        Assert.Equal("large", prefs.Str("textSize"));
        Assert.Equal("hi", me.Str("language"));
    }

    [Fact]
    public async Task Preferences_keep_values_not_sent()
    {
        var client = await _api.SignInAsync(ApiFactory.NewMobile());
        await client.PutJson("/api/v1/me/preferences", new { language = "hi" }).Expect();

        var prefs = await client.PutJson("/api/v1/me/preferences", new { textSize = "small" }).Expect();

        Assert.Equal("hi", prefs.Str("language"));
        Assert.Equal("small", prefs.Str("textSize"));
    }

    [Fact]
    public async Task Consents_can_be_given_and_withdrawn()
    {
        var client = await _api.SignInAsync(ApiFactory.NewMobile());

        await client.PutJson("/api/v1/me/consents/rules", new { active = true }).Expect();
        var consents = await client.PutJson("/api/v1/me/consents/DATA", new { active = true }).Expect();
        var withdrawn = await client.PutJson("/api/v1/me/consents/data", new { active = false }).Expect();

        Assert.Equal(2, consents.AsArray().Count);
        Assert.All(consents.AsArray(), x => Assert.True(x!.Bool("active")));
        Assert.False(withdrawn.AsArray().First(x => x!.Str("id") == "data")!.Bool("active"));
        Assert.Equal("Nirmalya deposit and points rules", withdrawn.AsArray().First(x => x!.Str("id") == "rules")!.Str("label"));
    }

    [Fact]
    public async Task Unknown_consent_is_not_found()
    {
        var client = await _api.SignInAsync(ApiFactory.NewMobile());

        var message = await client.PutJson("/api/v1/me/consents/marketing", new { active = true }).ExpectError(HttpStatusCode.NotFound);

        Assert.Equal("Unknown consent. Use rules or data.", message);
    }

    [Fact]
    public async Task Kyc_status_starts_not_started_with_doc_types()
    {
        var client = await _api.SignInAsync(ApiFactory.NewMobile());

        var kyc = await client.GetAsync("/api/v1/me/kyc").Expect();

        Assert.Equal("notStarted", kyc.Str("status"));
        Assert.Equal(new[] { "Aadhaar", "Voter ID", "Driving licence" }, kyc.Arr("docTypes").Select(x => x!.GetValue<string>()));
        Assert.Null(kyc["submission"]);
    }

    [Fact]
    public async Task Kyc_submission_masks_document_number_and_blocks_resubmit()
    {
        var client = await _api.SignInAsync(ApiFactory.NewMobile());
        var front = await ApiFactory.UploadAsync(client, "KycFront");

        var created = await client.PostJson("/api/v1/me/kyc", new { docType = "voter id", docNumber = "ABC1234567", frontFileId = front }).Expect(HttpStatusCode.Created);
        var again = await client.PostJson("/api/v1/me/kyc", new { docType = "Aadhaar", docNumber = "1234 5678 9012", frontFileId = front }).ExpectError(HttpStatusCode.Conflict);
        var status = await client.GetAsync("/api/v1/me/kyc").Expect();

        Assert.Equal("Voter ID", created.Str("docType"));
        Assert.Equal("XXXX XXXX 4567", created.Str("docNumber"));
        Assert.Equal("inReview", created.Str("status"));
        Assert.Equal("Your KYC is already in review.", again);
        Assert.Equal("inReview", status.Str("status"));
        Assert.Equal("XXXX XXXX 4567", status["submission"]!.Str("docNumber"));
    }

    [Fact]
    public async Task Kyc_rejects_unknown_document_type()
    {
        var client = await _api.SignInAsync(ApiFactory.NewMobile());
        var front = await ApiFactory.UploadAsync(client, "KycFront");

        var message = await client.PostJson("/api/v1/me/kyc", new { docType = "PAN", docNumber = "ABCDE1234F", frontFileId = front }).ExpectError(HttpStatusCode.BadRequest);

        Assert.Equal("Choose Aadhaar, Voter ID or Driving licence.", message);
    }

    [Fact]
    public async Task Kyc_needs_own_front_upload()
    {
        var client = await _api.SignInAsync(ApiFactory.NewMobile());
        var other = await _api.SignInAsync(ApiFactory.NewMobile());
        var othersFile = await ApiFactory.UploadAsync(other, "KycFront");
        var wrongPurpose = await ApiFactory.UploadAsync(client, "KycBack");

        var missing = await client.PostJson("/api/v1/me/kyc", new { docType = "Aadhaar", docNumber = "1234 5678 9012", frontFileId = Guid.NewGuid() }).ExpectError(HttpStatusCode.BadRequest);
        var notMine = await client.PostJson("/api/v1/me/kyc", new { docType = "Aadhaar", docNumber = "1234 5678 9012", frontFileId = othersFile }).ExpectError(HttpStatusCode.BadRequest);
        var wrong = await client.PostJson("/api/v1/me/kyc", new { docType = "Aadhaar", docNumber = "1234 5678 9012", frontFileId = wrongPurpose }).ExpectError(HttpStatusCode.BadRequest);

        Assert.Equal("Upload the front of the document first.", missing);
        Assert.Equal("Upload the front of the document first.", notMine);
        Assert.Equal("Upload the front of the document first.", wrong);
    }

    [Fact]
    public async Task Kyc_back_must_be_a_back_upload()
    {
        var client = await _api.SignInAsync(ApiFactory.NewMobile());
        var front = await ApiFactory.UploadAsync(client, "KycFront");
        var anotherFront = await ApiFactory.UploadAsync(client, "KycFront");

        var message = await client.PostJson("/api/v1/me/kyc", new { docType = "Aadhaar", docNumber = "1234 5678 9012", frontFileId = front, backFileId = anotherFront }).ExpectError(HttpStatusCode.BadRequest);

        Assert.Equal("The back side upload was not found.", message);
    }

    [Fact]
    public async Task Kyc_document_number_must_have_four_characters()
    {
        var client = await _api.SignInAsync(ApiFactory.NewMobile());
        var front = await ApiFactory.UploadAsync(client, "KycFront");

        await client.PostJson("/api/v1/me/kyc", new { docType = "Aadhaar", docNumber = "123", frontFileId = front }).ExpectStatus(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Verified_kyc_cannot_be_submitted_again()
    {
        var devotee = await _api.NewDevoteeAsync(kycVerified: true);
        var front = await ApiFactory.UploadAsync(devotee.Client, "KycFront");

        var message = await devotee.Client.PostJson("/api/v1/me/kyc", new { docType = "Aadhaar", docNumber = "1234 5678 9012", frontFileId = front }).ExpectError(HttpStatusCode.Conflict);

        Assert.Equal("Your KYC is already verified.", message);
    }

    [Fact]
    public async Task Society_can_be_joined_and_left()
    {
        var client = await _api.SignInAsync(ApiFactory.NewMobile());
        var society = (await _api.Anonymous().GetAsync("/api/v1/societies?q=Vaibhav").Expect()).Items().First();

        var joined = await client.PutJson("/api/v1/me/society", new { societyId = society.Str("id"), poolOn = true }).Expect();
        var left = await client.PutJson("/api/v1/me/society", new { societyId = (Guid?)null, poolOn = true }).Expect();

        Assert.Equal(society.Str("id"), joined["society"]!.Str("id"));
        Assert.True(joined.Bool("poolOn"));
        Assert.Null(left["society"]);
        Assert.False(left.Bool("poolOn"));
    }

    [Fact]
    public async Task Unknown_society_is_not_found()
    {
        var client = await _api.SignInAsync(ApiFactory.NewMobile());

        var message = await client.PutJson("/api/v1/me/society", new { societyId = Guid.NewGuid(), poolOn = true }).ExpectError(HttpStatusCode.NotFound);

        Assert.Equal("Society not found.", message);
    }

    [Fact]
    public async Task Pool_contribution_counts_lifetime_points_when_on()
    {
        var devotee = await _api.NewDevoteeAsync(kycVerified: true);
        var society = (await _api.Anonymous().GetAsync("/api/v1/societies?q=Niti").Expect()).Items().First();

        var on = await devotee.Client.PutJson("/api/v1/me/society", new { societyId = society.Str("id"), poolOn = true }).Expect();
        var off = await devotee.Client.PutJson("/api/v1/me/society", new { societyId = society.Str("id"), poolOn = false }).Expect();

        Assert.Equal(100, on.Int("myContribution"));
        Assert.Equal(0, off.Int("myContribution"));
        Assert.True(on["society"]!.Int("poolPoints") >= 100);
    }

    [Fact]
    public async Task New_user_points_are_zero_and_redeem_is_locked()
    {
        var client = await _api.SignInAsync(ApiFactory.NewMobile());

        var points = await client.GetAsync("/api/v1/me/points").Expect();

        Assert.Equal(0, points.Int("available"));
        Assert.Equal(0, points.Int("held"));
        Assert.True(points.Bool("redeemLocked"));
        Assert.False(points.Bool("flagged"));
        Assert.Equal("Novice", points["level"]!.Str("name"));
    }

    [Fact]
    public async Task Verified_user_gets_welcome_bonus_once()
    {
        var devotee = await _api.NewDevoteeAsync(kycVerified: true);

        var points = await devotee.Client.GetAsync("/api/v1/me/points").Expect();
        var ledger = await devotee.Client.GetAsync("/api/v1/me/ledger").Expect();

        Assert.Equal(100, points.Int("available"));
        Assert.Equal(100, points.Int("lifetime"));
        Assert.Equal(10m, points.Dec("rupeeValue"));
        Assert.False(points.Bool("redeemLocked"));
        var bonus = Assert.Single(ledger.Items());
        Assert.Equal("bonus", bonus.Str("kind"));
        Assert.Equal("Welcome bonus", bonus.Str("title"));
    }

    [Fact]
    public async Task Ledger_filters_by_kind_and_pages()
    {
        var devotee = await _api.NewDevoteeAsync(kycVerified: true);

        var earned = await devotee.Client.GetAsync("/api/v1/me/ledger?kinds=earned").Expect();
        var bonus = await devotee.Client.GetAsync("/api/v1/me/ledger?kinds=earned,BONUS,unknown").Expect();
        var paged = await devotee.Client.GetAsync("/api/v1/me/ledger?page=0&pageSize=500").Expect();

        Assert.Equal(0, earned.Int("total"));
        Assert.Equal(1, bonus.Int("total"));
        Assert.Equal(1, paged.Int("page"));
        Assert.Equal(200, paged.Int("pageSize"));
    }

    [Fact]
    public async Task Qr_token_identifies_devotee_at_counter()
    {
        var devotee = await _api.NewDevoteeAsync(name: "Qr Person");
        var qr = await devotee.Client.GetAsync("/api/v1/me/qr").Expect();
        var operatorClient = await _api.OperatorAsync();

        var found = await operatorClient.GetAsync($"/api/v1/operator/devotees/lookup?qr={Uri.EscapeDataString(qr.Str("qrToken"))}").Expect();

        Assert.Equal(devotee.UserId, found.Guid("userId"));
        Assert.Equal("Qr Person", found.Str("name"));
        Assert.Equal($"******{devotee.Mobile[^4..]}", qr.Str("maskedMobile"));
    }

    [Fact]
    public async Task Deposits_and_notices_show_own_activity()
    {
        var devotee = await _api.NewDevoteeAsync();
        var operatorClient = await _api.OperatorAsync();
        var templeId = await _api.TempleIdAsync(ApiFactory.ShivMandir);
        var deposit = await ApiFactory.DepositAsync(operatorClient, devotee.UserId, templeId, "Flowers", 1.5m);

        var list = await devotee.Client.GetAsync("/api/v1/me/deposits").Expect();
        var one = await devotee.Client.GetAsync($"/api/v1/me/deposits/{deposit.Long("id")}").Expect();
        var notices = (await devotee.Client.GetAsync("/api/v1/me/notices").Expect()).AsArray();

        var item = Assert.Single(list.Items());
        Assert.Equal(devotee.Mobile, item.Str("mobileNumber"));
        Assert.Equal(150, list["totals"]!.Int("points"));
        Assert.Equal(ApiFactory.ShivMandir, one.Str("templeName"));
        var notice = Assert.Single(notices);
        Assert.Equal("accepted", notice!.Str("kind"));
        Assert.Equal(150, notice.Int("points"));
    }

    [Fact]
    public async Task Notice_can_be_dismissed_once()
    {
        var devotee = await _api.NewDevoteeAsync();
        var operatorClient = await _api.OperatorAsync();
        var templeId = await _api.TempleIdAsync(ApiFactory.ShivMandir);
        await ApiFactory.DepositAsync(operatorClient, devotee.UserId, templeId);
        var notice = (await devotee.Client.GetAsync("/api/v1/me/notices").Expect()).AsArray().Single()!;

        await devotee.Client.PostJson($"/api/v1/me/notices/{notice.Str("id")}/dismiss").ExpectStatus(HttpStatusCode.NoContent);
        var after = (await devotee.Client.GetAsync("/api/v1/me/notices").Expect()).AsArray();
        var unknown = await devotee.Client.PostJson($"/api/v1/me/notices/{Guid.NewGuid()}/dismiss").ExpectError(HttpStatusCode.NotFound);

        Assert.Empty(after);
        Assert.Equal("Notice not found.", unknown);
    }

    [Fact]
    public async Task Other_users_deposit_is_not_visible()
    {
        var owner = await _api.NewDevoteeAsync();
        var stranger = await _api.NewDevoteeAsync();
        var operatorClient = await _api.OperatorAsync();
        var templeId = await _api.TempleIdAsync(ApiFactory.ShivMandir);
        var deposit = await ApiFactory.DepositAsync(operatorClient, owner.UserId, templeId);

        var message = await stranger.Client.GetAsync($"/api/v1/me/deposits/{deposit.Long("id")}").ExpectError(HttpStatusCode.NotFound);

        Assert.Equal("Deposit not found.", message);
    }
}
