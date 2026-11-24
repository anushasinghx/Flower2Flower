using System.Net;
using Flower2Flower.Tests.Support;

namespace Flower2Flower.Tests.Integration;

[Collection(ApiCollection.Name)]
public sealed class AccessControlTests
{
    private readonly ApiFactory _api;

    public AccessControlTests(ApiFactory api)
    {
        _api = api;
    }

    public static readonly TheoryData<string> AdminEndpoints = new()
    {
        "/api/v1/admin/dashboard",
        "/api/v1/admin/kyc",
        "/api/v1/admin/temples",
        "/api/v1/admin/rules",
        "/api/v1/admin/alerts",
        "/api/v1/admin/collections",
        "/api/v1/admin/batches",
        "/api/v1/admin/products",
        "/api/v1/admin/orders",
        "/api/v1/admin/staff",
        "/api/v1/admin/audit",
        "/api/v1/admin/audit/filters",
        "/api/v1/admin/exports",
        "/api/v1/admin/deposits",
        "/api/v1/admin/messages"
    };

    [Theory]
    [MemberData(nameof(AdminEndpoints))]
    public async Task Admin_endpoints_refuse_anonymous(string url)
    {
        await _api.Anonymous().GetAsync(url).ExpectStatus(HttpStatusCode.Unauthorized);
    }

    [Theory]
    [MemberData(nameof(AdminEndpoints))]
    public async Task Admin_endpoints_refuse_devotee_operator_and_temple_admin(string url)
    {
        foreach (var mobile in new[] { ApiFactory.DevoteeMobile, ApiFactory.OperatorMobile, ApiFactory.TempleAdminMobile })
        {
            var client = await _api.SignInAsync(mobile);
            await client.GetAsync(url).ExpectStatus(HttpStatusCode.Forbidden);
        }
    }

    [Theory]
    [MemberData(nameof(AdminEndpoints))]
    public async Task Admin_endpoints_allow_admin_and_super_admin(string url)
    {
        await (await _api.SignInAsync(ApiFactory.AdminMobile)).GetAsync(url).ExpectStatus(HttpStatusCode.OK);
        await (await _api.SuperAdminAsync()).GetAsync(url).ExpectStatus(HttpStatusCode.OK);
    }

    [Theory]
    [InlineData("/api/v1/me")]
    [InlineData("/api/v1/me/points")]
    [InlineData("/api/v1/me/ledger")]
    [InlineData("/api/v1/me/qr")]
    [InlineData("/api/v1/orders")]
    [InlineData("/api/v1/temple/me")]
    public async Task Signed_in_endpoints_refuse_anonymous(string url)
    {
        await _api.Anonymous().GetAsync(url).ExpectStatus(HttpStatusCode.Unauthorized);
    }

    [Theory]
    [InlineData("/api/v1/public/stats")]
    [InlineData("/api/v1/public/temples")]
    [InlineData("/api/v1/rules")]
    [InlineData("/api/v1/products")]
    [InlineData("/api/v1/products/categories")]
    [InlineData("/api/v1/societies")]
    public async Task Public_endpoints_need_no_sign_in(string url)
    {
        await _api.Anonymous().GetAsync(url).ExpectStatus(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Devotee_cannot_change_another_users_data_through_admin_routes()
    {
        var devotee = await _api.SignInAsync(ApiFactory.NewMobile());

        await devotee.PostJson($"/api/v1/admin/kyc/{Guid.NewGuid()}/decision", new { approve = true }).ExpectStatus(HttpStatusCode.Forbidden);
        await devotee.PutJson("/api/v1/admin/rules", new { }).ExpectStatus(HttpStatusCode.Forbidden);
        await devotee.PostJson("/api/v1/admin/staff", new { fullName = "Me", mobileNumber = ApiFactory.NewMobile(), role = "admin" }).ExpectStatus(HttpStatusCode.Forbidden);
    }
}
