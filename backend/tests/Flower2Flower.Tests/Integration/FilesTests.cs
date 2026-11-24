using System.Net;
using Flower2Flower.Tests.Support;

namespace Flower2Flower.Tests.Integration;

[Collection(ApiCollection.Name)]
public sealed class FilesTests
{
    private readonly ApiFactory _api;

    public FilesTests(ApiFactory api)
    {
        _api = api;
    }

    [Fact]
    public async Task Upload_requires_sign_in()
    {
        await _api.Anonymous().Upload("KycFront").ExpectStatus(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Upload_returns_file_details()
    {
        var client = await _api.SignInAsync(ApiFactory.NewMobile());

        var file = await client.Upload("KycFront", "image/png", "front.png").Expect(HttpStatusCode.Created);

        Assert.Equal("kycFront", file.Str("purpose"));
        Assert.Equal("front.png", file.Str("originalName"));
        Assert.Equal("image/png", file.Str("contentType"));
        Assert.Equal(256, file.Int("sizeBytes"));
    }

    [Theory]
    [InlineData("text/plain", "note.txt")]
    [InlineData("application/zip", "files.zip")]
    public async Task Upload_rejects_disallowed_types(string contentType, string name)
    {
        var client = await _api.SignInAsync(ApiFactory.NewMobile());

        var message = await client.Upload("KycFront", contentType, name).ExpectError(HttpStatusCode.BadRequest);

        Assert.Equal("Only JPG, PNG, WEBP, HEIC or PDF files are allowed.", message);
    }

    [Fact]
    public async Task Upload_rejects_empty_file()
    {
        var client = await _api.SignInAsync(ApiFactory.NewMobile());

        await client.Upload("KycFront", bytes: Array.Empty<byte>()).ExpectStatus(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Devotee_cannot_upload_purity_photo()
    {
        var client = await _api.SignInAsync(ApiFactory.NewMobile());

        var message = await client.Upload("PurityPhoto").ExpectError(HttpStatusCode.Forbidden);

        Assert.Equal("Only counter operators can upload purity photos.", message);
    }

    [Fact]
    public async Task Operator_and_admin_can_upload_purity_photo()
    {
        await (await _api.OperatorAsync()).Upload("PurityPhoto").ExpectStatus(HttpStatusCode.Created);
        await (await _api.SuperAdminAsync()).Upload("PurityPhoto").ExpectStatus(HttpStatusCode.Created);
    }

    [Fact]
    public async Task Owner_downloads_the_same_bytes()
    {
        var client = await _api.SignInAsync(ApiFactory.NewMobile());
        var bytes = Enumerable.Range(0, 100).Select(x => (byte)(x * 3)).ToArray();
        var id = await ApiFactory.UploadAsync(client, "KycFront", "image/jpeg", "front.jpg", bytes);

        using var response = await client.GetAsync($"/api/v1/files/{id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("image/jpeg", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal(bytes, await response.Content.ReadAsByteArrayAsync());
    }

    [Fact]
    public async Task Other_devotee_cannot_download()
    {
        var owner = await _api.SignInAsync(ApiFactory.NewMobile());
        var stranger = await _api.SignInAsync(ApiFactory.NewMobile());
        var id = await ApiFactory.UploadAsync(owner, "KycFront");

        var message = await stranger.GetAsync($"/api/v1/files/{id}").ExpectError(HttpStatusCode.Forbidden);

        Assert.Equal("You do not have access to this file.", message);
    }

    [Fact]
    public async Task Operator_cannot_download_kyc_documents()
    {
        var owner = await _api.SignInAsync(ApiFactory.NewMobile());
        var id = await ApiFactory.UploadAsync(owner, "KycFront");

        await (await _api.OperatorAsync()).GetAsync($"/api/v1/files/{id}").ExpectStatus(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Admin_viewing_kyc_document_is_audited()
    {
        var owner = await _api.SignInAsync(ApiFactory.NewMobile());
        var id = await ApiFactory.UploadAsync(owner, "KycFront");
        var admin = await _api.SuperAdminAsync();

        await admin.GetAsync($"/api/v1/files/{id}").ExpectStatus(HttpStatusCode.OK);
        var audit = await admin.GetAsync($"/api/v1/admin/audit?action={Uri.EscapeDataString("Viewed KYC document")}&q={id}").Expect();

        Assert.Equal(1, audit.Int("total"));
    }

    [Fact]
    public async Task Any_operator_can_view_purity_photos()
    {
        var admin = await _api.SuperAdminAsync();
        var id = await ApiFactory.UploadAsync(admin, "PurityPhoto");

        await (await _api.OperatorAsync()).GetAsync($"/api/v1/files/{id}").ExpectStatus(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Unknown_file_is_not_found()
    {
        var client = await _api.SignInAsync(ApiFactory.NewMobile());

        var message = await client.GetAsync($"/api/v1/files/{Guid.NewGuid()}").ExpectError(HttpStatusCode.NotFound);

        Assert.Equal("File not found.", message);
    }
}
