using System.Net;
using Flower2Flower.Tests.Support;

namespace Flower2Flower.Tests.Integration;

[Collection(ApiCollection.Name)]
public sealed class AdminCatalogueStaffTemplesTests
{
    private readonly ApiFactory _api;

    public AdminCatalogueStaffTemplesTests(ApiFactory api)
    {
        _api = api;
    }

    private static object Product(string name, int stock = 3, bool listed = true, decimal price = 99) => new
    {
        group = "kit",
        name,
        nameHi = " किट ",
        category = "Kits",
        pack = "1 kit",
        price,
        points = 990,
        stock,
        listed
    };

    [Fact]
    public async Task Product_is_created_trimmed_and_audited()
    {
        var admin = await _api.SuperAdminAsync();
        var name = $"Balcony kit {Guid.NewGuid():N}"[..20];

        var created = await admin.PostJson("/api/v1/admin/products", Product($"  {name}  ")).Expect(HttpStatusCode.Created);
        var audit = await admin.GetAsync($"/api/v1/admin/audit?action={Uri.EscapeDataString("Product added")}&q={Uri.EscapeDataString(name)}").Expect();

        Assert.Equal(name, created.Str("name"));
        Assert.Equal("किट", created.Str("nameHi"));
        Assert.Equal("low", created.Str("stockTone"));
        Assert.Equal(1, audit.Int("total"));
    }

    [Fact]
    public async Task Product_update_changes_price_stock_and_visibility()
    {
        var admin = await _api.SuperAdminAsync();
        var name = $"Seed kit {Guid.NewGuid():N}"[..16];
        var created = await admin.PostJson("/api/v1/admin/products", Product(name)).Expect(HttpStatusCode.Created);

        var updated = await admin.PutJson($"/api/v1/admin/products/{created.Str("id")}", Product(name, stock: 0, listed: false, price: 120)).Expect();
        var publicList = (await _api.Anonymous().GetAsync("/api/v1/products").Expect()).Items();
        var hidden = (await admin.GetAsync("/api/v1/admin/products?listed=false").Expect()).Items();
        var audit = await admin.GetAsync($"/api/v1/admin/audit?action={Uri.EscapeDataString("Product changed")}&q={Uri.EscapeDataString(name)}").Expect();

        Assert.Equal(120m, updated.Dec("price"));
        Assert.Equal("out", updated.Str("stockTone"));
        Assert.False(updated.Bool("listed"));
        Assert.DoesNotContain(publicList, x => x.Str("id") == created.Str("id"));
        Assert.Contains(hidden, x => x.Str("id") == created.Str("id"));
        Assert.Contains("stock 3, Listed", audit.Items().Single().Str("oldValue"));
        Assert.Contains("stock 0, Hidden", audit.Items().Single().Str("newValue"));
    }

    [Fact]
    public async Task Product_validation_and_not_found()
    {
        var admin = await _api.SuperAdminAsync();

        await admin.PostJson("/api/v1/admin/products", Product("")).ExpectStatus(HttpStatusCode.BadRequest);
        await admin.PostJson("/api/v1/admin/products", Product("Neg", stock: -1)).ExpectStatus(HttpStatusCode.BadRequest);
        await admin.PutJson($"/api/v1/admin/products/{Guid.NewGuid()}", Product("Ghost")).ExpectStatus(HttpStatusCode.NotFound);
        await admin.GetAsync($"/api/v1/admin/products/{Guid.NewGuid()}").ExpectStatus(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Admin_product_search_covers_pack_and_category()
    {
        var admin = await _api.SuperAdminAsync();

        var byPack = (await admin.GetAsync("/api/v1/admin/products?q=500%20g").Expect()).Items().ToList();
        var byCategory = (await admin.GetAsync("/api/v1/admin/products?category=Vermicompost").Expect()).Items().ToList();

        Assert.Contains(byPack, x => x.Str("name") == "Organic manure");
        Assert.Equal(2, byCategory.Count);
    }

    [Fact]
    public async Task Staff_invite_list_and_role_change()
    {
        var admin = await _api.SuperAdminAsync();
        var mobile = ApiFactory.NewMobile();

        var invited = await admin.PostJson("/api/v1/admin/staff", new { fullName = " Counter Two ", mobileNumber = mobile, role = "operator" }).Expect(HttpStatusCode.Created);
        var operators = (await admin.GetAsync("/api/v1/admin/staff?role=Operator").Expect()).Items();
        var searched = (await admin.GetAsync($"/api/v1/admin/staff?q={mobile}").Expect()).Items();
        var promoted = await admin.PutJson($"/api/v1/admin/staff/{invited.Str("id")}", new { role = "templeAdmin", fullName = "Temple Two" }).Expect();
        var signedIn = await _api.Anonymous().PostJson("/api/v1/auth/login/verify-otp", new { mobileNumber = mobile, otp = ApiFactory.Otp }).Expect();

        Assert.Equal("Counter Two", invited.Str("name"));
        Assert.Equal("operator", invited.Str("role"));
        Assert.Equal("active", invited.Str("status"));
        Assert.Contains(operators, x => x.Str("id") == invited.Str("id"));
        Assert.Single(searched);
        Assert.Equal("templeAdmin", promoted.Str("role"));
        Assert.Equal("Temple Two", promoted.Str("name"));
        Assert.Equal("templeAdmin", signedIn.Str("userType"));
    }

    [Fact]
    public async Task Staff_invite_validation()
    {
        var admin = await _api.SuperAdminAsync();

        var bad = await admin.PostJson("/api/v1/admin/staff", new { fullName = "Bad", mobileNumber = "12", role = "operator" }).ExpectError(HttpStatusCode.BadRequest);
        var taken = await admin.PostJson("/api/v1/admin/staff", new { fullName = "Taken", mobileNumber = ApiFactory.DevoteeMobile, role = "operator" }).ExpectError(HttpStatusCode.Conflict);
        await admin.PutJson($"/api/v1/admin/staff/{Guid.NewGuid()}", new { status = "active" }).ExpectStatus(HttpStatusCode.NotFound);
        await admin.PutJson($"/api/v1/admin/staff/{Guid.NewGuid()}", new { status = "deleted" }).ExpectStatus(HttpStatusCode.BadRequest);

        Assert.Equal("Enter a valid 10 digit mobile number.", bad);
        Assert.Equal("An account already exists for this mobile number.", taken);
    }

    [Fact]
    public async Task Admin_cannot_suspend_or_demote_self()
    {
        var mobile = ApiFactory.NewMobile();
        var super = await _api.SuperAdminAsync();
        var invited = await super.PostJson("/api/v1/admin/staff", new { fullName = "Self Admin", mobileNumber = mobile, role = "admin" }).Expect(HttpStatusCode.Created);
        var self = await _api.SignInAsync(mobile);

        var suspend = await self.PutJson($"/api/v1/admin/staff/{invited.Str("id")}", new { status = "suspended" }).ExpectError(HttpStatusCode.Conflict);
        var demote = await self.PutJson($"/api/v1/admin/staff/{invited.Str("id")}", new { role = "operator" }).ExpectError(HttpStatusCode.Conflict);
        await self.PutJson($"/api/v1/admin/staff/{invited.Str("id")}", new { fullName = "Self Admin Renamed" }).ExpectStatus(HttpStatusCode.OK);

        Assert.Equal("You cannot suspend or demote your own account.", suspend);
        Assert.Equal("You cannot suspend or demote your own account.", demote);
    }

    [Fact]
    public async Task Only_super_admin_can_change_super_admin()
    {
        var super = await _api.SuperAdminAsync();
        var superId = (await super.GetAsync("/api/v1/me").Expect()).Str("userId");
        var admin = await _api.SignInAsync(ApiFactory.AdminMobile);

        var message = await admin.PutJson($"/api/v1/admin/staff/{superId}", new { status = "suspended" }).ExpectError(HttpStatusCode.Forbidden);

        Assert.Equal("Only a super admin can change this account.", message);
    }

    [Fact]
    public async Task Staff_changes_are_audited()
    {
        var admin = await _api.SuperAdminAsync();
        var name = $"Audit Staff {Guid.NewGuid():N}"[..20];
        var invited = await admin.PostJson("/api/v1/admin/staff", new { fullName = name, mobileNumber = ApiFactory.NewMobile(), role = "operator" }).Expect(HttpStatusCode.Created);

        await admin.PutJson($"/api/v1/admin/staff/{invited.Str("id")}", new { status = "suspended" }).Expect();
        var audit = (await admin.GetAsync($"/api/v1/admin/audit?q={Uri.EscapeDataString(name)}").Expect()).Items().ToList();

        Assert.Contains(audit, x => x.Str("action") == "Staff invited");
        Assert.Contains(audit, x => x.Str("action") == "Role changed" && x.Str("oldValue") == "Operator, active" && x.Str("newValue") == "Operator, suspended");
    }

    [Fact]
    public async Task Admin_adds_temple_as_pending()
    {
        var admin = await _api.SuperAdminAsync();
        var name = $"Kali Mandir {Guid.NewGuid():N}"[..20];

        var added = await admin.PostJson("/api/v1/admin/temples", new { name, type = "registered", address = "Sector 62, Noida", contact = "Pt. Dev", mobileNumber = ApiFactory.NewMobile() }).Expect(HttpStatusCode.Created);
        var pending = await admin.GetAsync("/api/v1/admin/temples?status=Pending").Expect();
        var searched = await admin.GetAsync($"/api/v1/admin/temples?q={Uri.EscapeDataString(name.ToLowerInvariant())}").Expect();

        Assert.Equal("pending", added.Str("status"));
        Assert.Equal("Added by Super Admin", added.Arr("history")[0]!.Str("text"));
        Assert.Contains(pending.Items(), x => x.Str("id") == added.Str("id"));
        Assert.Single(searched.Items());
        Assert.True(pending["counts"]!.Int("Pending") >= 1);
    }

    [Fact]
    public async Task Admin_temple_validation_and_state_rules()
    {
        var admin = await _api.SuperAdminAsync();
        var shiv = await _api.TempleIdAsync(ApiFactory.ShivMandir);

        var mobile = await admin.PostJson("/api/v1/admin/temples", new { name = "Bad Mobile", type = "registered", address = "Sector 1", contact = "X", mobileNumber = "000" }).ExpectError(HttpStatusCode.BadRequest);
        var verifyAgain = await admin.PostJson($"/api/v1/admin/temples/{shiv}/verify", new { badge = "Verified" }).ExpectError(HttpStatusCode.Conflict);
        var sendBack = await admin.PostJson($"/api/v1/admin/temples/{shiv}/request-changes", new { note = "No" }).ExpectError(HttpStatusCode.Conflict);
        await admin.GetAsync($"/api/v1/admin/temples/{Guid.NewGuid()}").ExpectStatus(HttpStatusCode.NotFound);
        await admin.PostJson($"/api/v1/admin/temples/{Guid.NewGuid()}/verify", new { badge = "Verified" }).ExpectStatus(HttpStatusCode.NotFound);

        Assert.Equal("Enter a valid 10 digit mobile number.", mobile);
        Assert.Equal("Only temples waiting for review can be verified.", verifyAgain);
        Assert.Equal("Only temples waiting for review can be sent back.", sendBack);
    }

    [Fact]
    public async Task Temple_added_for_existing_user_links_to_that_user()
    {
        var admin = await _api.SuperAdminAsync();
        var mobile = ApiFactory.NewMobile();
        var client = await _api.SignInAsync(mobile);

        var added = await admin.PostJson("/api/v1/admin/temples", new { name = "Owned Mandir", type = "unregistered", address = "Sector 5, Indirapuram", contact = "Owner", mobileNumber = mobile }).Expect(HttpStatusCode.Created);
        var mine = await client.GetAsync("/api/v1/temple/me").Expect();

        Assert.Equal(added.Str("id"), mine.Str("id"));
    }
}
