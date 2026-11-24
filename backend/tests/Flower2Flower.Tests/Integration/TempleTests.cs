using System.Net;
using Flower2Flower.Tests.Support;

namespace Flower2Flower.Tests.Integration;

[Collection(ApiCollection.Name)]
public sealed class TempleTests
{
    private readonly ApiFactory _api;

    public TempleTests(ApiFactory api)
    {
        _api = api;
    }

    private static object Details(string? name = null, string type = "registered", string? regNo = "REG123", bool authorised = true, string? mobile = null) => new
    {
        type,
        name = name ?? "Shani Mandir",
        regNo,
        address = "Sector 4, Vaishali",
        contact = "Pt. Mohan",
        mobileNumber = mobile ?? ApiFactory.NewMobile(),
        authorised
    };

    private static async Task<object[]> DocumentsAsync(HttpClient client, params string[] types)
    {
        var docs = new List<object>();
        foreach (var type in types)
        {
            docs.Add(new { docType = type, fileId = await ApiFactory.UploadAsync(client, "TempleDocument", "application/pdf", "doc.pdf") });
        }

        return docs.ToArray();
    }

    [Fact]
    public async Task Seeded_temple_admin_sees_verified_temple()
    {
        var client = await _api.SignInAsync(ApiFactory.TempleAdminMobile);

        var temple = await client.GetAsync("/api/v1/temple/me").Expect();

        Assert.Equal(ApiFactory.ShivMandir, temple.Str("name"));
        Assert.Equal("verified", temple.Str("status"));
    }

    [Fact]
    public async Task Verified_temple_cannot_be_edited_by_temple_admin()
    {
        var client = await _api.SignInAsync(ApiFactory.TempleAdminMobile);

        var message = await client.PutJson("/api/v1/temple/me", Details(ApiFactory.ShivMandir, mobile: ApiFactory.TempleAdminMobile)).ExpectError(HttpStatusCode.Conflict);

        Assert.Equal("A verified temple can only be changed by the admin team.", message);
    }

    [Fact]
    public async Task User_without_temple_gets_not_found()
    {
        var client = await _api.SignInAsync(ApiFactory.NewMobile());

        var message = await client.GetAsync("/api/v1/temple/me").ExpectError(HttpStatusCode.NotFound);

        Assert.Equal("No temple is linked to this account yet. Register your temple.", message);
    }

    [Fact]
    public async Task Temple_details_validation()
    {
        var client = await _api.SignInAsync(ApiFactory.NewMobile());

        var authorised = await client.PutJson("/api/v1/temple/me", Details(authorised: false)).ExpectError(HttpStatusCode.BadRequest);
        var mobile = await client.PutJson("/api/v1/temple/me", Details(mobile: "12345")).ExpectError(HttpStatusCode.BadRequest);
        var regNo = await client.PutJson("/api/v1/temple/me", Details(regNo: " ")).ExpectError(HttpStatusCode.BadRequest);
        await client.PutJson("/api/v1/temple/me", Details(name: "X")).ExpectStatus(HttpStatusCode.BadRequest);

        Assert.Equal("Confirm that you are authorised to register this temple.", authorised);
        Assert.Equal("Enter a valid 10 digit mobile number.", mobile);
        Assert.Equal("Enter the registration number.", regNo);
    }

    [Fact]
    public async Task Draft_is_created_then_updated()
    {
        var client = await _api.SignInAsync(ApiFactory.NewMobile());

        var created = await client.PutJson("/api/v1/temple/me", Details("Shani Mandir")).Expect(HttpStatusCode.Created);
        var updated = await client.PutJson("/api/v1/temple/me", Details("Shani Dev Mandir", type: "unregistered", regNo: "IGNORED")).Expect();

        Assert.Equal("draft", created.Str("status"));
        Assert.Equal("REG123", created.Str("regNo"));
        Assert.Equal(created.Str("id"), updated.Str("id"));
        Assert.Equal("Shani Dev Mandir", updated.Str("name"));
        Assert.Equal("", updated.Str("regNo"));
        Assert.Equal(new[] { "Committee letter", "Admin ID proof" }, updated.Arr("requiredDocuments").Select(x => x!.GetValue<string>()));
        Assert.Equal("Not set yet", updated.Str("timings"));
    }

    [Fact]
    public async Task Submit_requires_temple_and_all_documents()
    {
        var client = await _api.SignInAsync(ApiFactory.NewMobile());

        var noTemple = await client.PostJson("/api/v1/temple/me/submit", new { documents = Array.Empty<object>() }).ExpectError(HttpStatusCode.NotFound);
        await client.PutJson("/api/v1/temple/me", Details()).Expect(HttpStatusCode.Created);
        var partial = await client.PostJson("/api/v1/temple/me/submit", new { documents = await DocumentsAsync(client, "Admin ID proof") }).ExpectError(HttpStatusCode.BadRequest);

        Assert.Equal("Register your temple first.", noTemple);
        Assert.Equal("Upload these documents: Registration certificate.", partial);
    }

    [Fact]
    public async Task Submit_rejects_uploads_with_wrong_purpose_or_owner()
    {
        var client = await _api.SignInAsync(ApiFactory.NewMobile());
        var other = await _api.SignInAsync(ApiFactory.NewMobile());
        await client.PutJson("/api/v1/temple/me", Details()).Expect(HttpStatusCode.Created);
        var kycFile = await ApiFactory.UploadAsync(client, "KycFront");
        var othersDoc = await ApiFactory.UploadAsync(other, "TempleDocument", "application/pdf");
        var goodDoc = await ApiFactory.UploadAsync(client, "TempleDocument", "application/pdf");
        var notPhoto = await ApiFactory.UploadAsync(client, "TempleDocument", "application/pdf");

        var wrongPurpose = await client.PostJson("/api/v1/temple/me/submit", new { documents = new[] { new { docType = "Registration certificate", fileId = kycFile }, new { docType = "Admin ID proof", fileId = goodDoc } } }).ExpectError(HttpStatusCode.BadRequest);
        var wrongOwner = await client.PostJson("/api/v1/temple/me/submit", new { documents = new[] { new { docType = "Registration certificate", fileId = othersDoc }, new { docType = "Admin ID proof", fileId = goodDoc } } }).ExpectError(HttpStatusCode.BadRequest);
        var badPhoto = await client.PostJson("/api/v1/temple/me/submit", new { photoFileId = notPhoto, documents = new[] { new { docType = "Registration certificate", fileId = goodDoc }, new { docType = "Admin ID proof", fileId = goodDoc } } }).ExpectError(HttpStatusCode.BadRequest);

        Assert.Equal("One of the document uploads was not found. Upload it again.", wrongPurpose);
        Assert.Equal("One of the document uploads was not found. Upload it again.", wrongOwner);
        Assert.Equal("The temple photo upload was not found.", badPhoto);
    }

    [Fact]
    public async Task Full_registration_review_and_resubmission_flow()
    {
        var client = await _api.SignInAsync(ApiFactory.NewMobile());
        var admin = await _api.SuperAdminAsync();
        var name = $"Flow Mandir {Guid.NewGuid():N}"[..20];
        await client.PutJson("/api/v1/temple/me", Details(name)).Expect(HttpStatusCode.Created);
        var photo = await ApiFactory.UploadAsync(client, "TemplePhoto");

        var submitted = await client.PostJson("/api/v1/temple/me/submit", new { deity = " Shani Dev ", photoFileId = photo, documents = await DocumentsAsync(client, "registration CERTIFICATE", "Admin ID proof") }).Expect();
        var twice = await client.PostJson("/api/v1/temple/me/submit", new { documents = await DocumentsAsync(client, "Registration certificate", "Admin ID proof") }).ExpectError(HttpStatusCode.Conflict);
        var templeId = submitted.Str("id");
        var sentBack = await admin.PostJson($"/api/v1/admin/temples/{templeId}/request-changes", new { note = "Certificate is blurred" }).Expect();
        var seen = await client.GetAsync("/api/v1/temple/me").Expect();
        var resubmitted = await client.PostJson("/api/v1/temple/me/submit", new { documents = await DocumentsAsync(client, "Registration certificate", "Admin ID proof") }).Expect();
        var verified = await admin.PostJson($"/api/v1/admin/temples/{templeId}/verify", new { badge = "Verified Registered" }).Expect();
        var publicList = (await _api.Anonymous().GetAsync("/api/v1/public/temples").Expect()).Items();

        Assert.Equal("pending", submitted.Str("status"));
        Assert.Equal("Shani Dev", submitted.Str("deity"));
        Assert.Equal(photo.ToString(), submitted.Str("photoFileId"));
        Assert.Equal(2, submitted.Arr("documents").Count);
        Assert.Equal("Submitted", submitted.Arr("history").Last()!.Str("text"));
        Assert.Equal("Documents are already waiting for review.", twice);
        Assert.Equal("needsChanges", sentBack.Str("status"));
        Assert.Equal("Certificate is blurred", seen.Str("note"));
        Assert.Equal("pending", resubmitted.Str("status"));
        Assert.Equal("", resubmitted.Str("note"));
        Assert.Equal("Submitted again", resubmitted.Arr("history").Last()!.Str("text"));
        Assert.Equal(photo.ToString(), resubmitted.Str("photoFileId"));
        Assert.Equal("verified", verified.Str("status"));
        Assert.Equal("Verified Registered", verified.Str("badge"));
        Assert.Contains(publicList, x => x.Str("name") == name);
    }

    [Fact]
    public async Task Public_can_view_verified_temple_photo_only()
    {
        var client = await _api.SignInAsync(ApiFactory.NewMobile());
        var admin = await _api.SuperAdminAsync();
        await client.PutJson("/api/v1/temple/me", Details($"Photo Mandir {Guid.NewGuid():N}"[..20])).Expect(HttpStatusCode.Created);
        var photo = await ApiFactory.UploadAsync(client, "TemplePhoto");
        var submitted = await client.PostJson("/api/v1/temple/me/submit", new { photoFileId = photo, documents = await DocumentsAsync(client, "Registration certificate", "Admin ID proof") }).Expect();
        var stranger = await _api.SignInAsync(ApiFactory.NewMobile());

        await stranger.GetAsync($"/api/v1/files/{photo}").ExpectStatus(HttpStatusCode.Forbidden);
        await admin.PostJson($"/api/v1/admin/temples/{submitted.Str("id")}/verify", new { badge = "Verified" }).Expect();
        await stranger.GetAsync($"/api/v1/files/{photo}").ExpectStatus(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Temple_added_by_admin_links_to_contact_on_first_visit()
    {
        var admin = await _api.SuperAdminAsync();
        var mobile = ApiFactory.NewMobile();
        var added = await admin.PostJson("/api/v1/admin/temples", new { name = "Linked Mandir", type = "unregistered", address = "Sector 9, Vasundhara", contact = "Pt. Ram", mobileNumber = mobile }).Expect(HttpStatusCode.Created);

        var client = await _api.SignInAsync(mobile);
        var mine = await client.GetAsync("/api/v1/temple/me").Expect();

        Assert.Equal(added.Str("id"), mine.Str("id"));
        Assert.Equal("pending", mine.Str("status"));
    }

    [Fact]
    public async Task Timings_summary_and_deposits()
    {
        var client = await _api.SignInAsync(ApiFactory.TempleAdminMobile);

        var timed = await client.PutJson("/api/v1/temple/me/timings", new { timings = " 7:00 am to 11:00 am " }).Expect();
        var summary = await client.GetAsync("/api/v1/temple/me/summary").Expect();
        var deposits = await client.GetAsync("/api/v1/temple/me/deposits?period=all").Expect();

        Assert.Equal("7:00 am to 11:00 am", timed.Str("timings"));
        Assert.Equal("verified", summary.Str("status"));
        Assert.NotNull(summary["todayKg"]);
        Assert.NotNull(summary["devotees"]);
        Assert.NotNull(deposits["totals"]);
        Assert.All(deposits.Items(), x => Assert.StartsWith("******", x.Str("mobileNumber")));
    }

    [Fact]
    public async Task Timings_need_text_and_a_temple()
    {
        var withTemple = await _api.SignInAsync(ApiFactory.TempleAdminMobile);
        var withoutTemple = await _api.SignInAsync(ApiFactory.NewMobile());

        await withTemple.PutJson("/api/v1/temple/me/timings", new { timings = "" }).ExpectStatus(HttpStatusCode.BadRequest);
        await withoutTemple.PutJson("/api/v1/temple/me/timings", new { timings = "6 am" }).ExpectStatus(HttpStatusCode.NotFound);
        await withoutTemple.GetAsync("/api/v1/temple/me/summary").ExpectStatus(HttpStatusCode.NotFound);
        await withoutTemple.GetAsync("/api/v1/temple/me/deposits").ExpectStatus(HttpStatusCode.NotFound);
    }
}
