using System.Net;
using Flower2Flower.Tests.Support;

namespace Flower2Flower.Tests.Integration;

[Collection(ApiCollection.Name)]
public sealed class PublicTests
{
    private readonly ApiFactory _api;

    public PublicTests(ApiFactory api)
    {
        _api = api;
    }

    [Fact]
    public async Task Stats_are_public_and_count_verified_temples()
    {
        var stats = await _api.Anonymous().GetAsync("/api/v1/public/stats").Expect();

        Assert.True(stats.Int("verifiedTemples") >= 2);
        Assert.True(stats.Int("devotees") >= 1);
        Assert.NotNull(stats["kgOffered"]);
        Assert.NotNull(stats["co2AvoidedKg"]);
        Assert.NotNull(stats["manureKg"]);
    }

    [Fact]
    public async Task Public_temples_list_only_verified()
    {
        var temples = (await _api.Anonymous().GetAsync("/api/v1/public/temples").Expect()).Items().Select(x => x.Str("name")).ToList();

        Assert.Contains(ApiFactory.ShivMandir, temples);
        Assert.Contains(ApiFactory.DurgaMandir, temples);
        Assert.DoesNotContain(ApiFactory.HanumanMandir, temples);
    }

    [Theory]
    [InlineData("durga")]
    [InlineData("DURGA")]
    [InlineData("Niti Khand 2")]
    public async Task Public_temple_search_matches_name_or_address_ignoring_case(string q)
    {
        var temples = (await _api.Anonymous().GetAsync($"/api/v1/public/temples?q={Uri.EscapeDataString(q)}").Expect()).Items().ToList();

        Assert.Contains(temples, x => x.Str("name") == ApiFactory.DurgaMandir);
        Assert.DoesNotContain(temples, x => x.Str("name") == ApiFactory.ShivMandir);
    }

    [Fact]
    public async Task Public_temple_view_hides_contact_details()
    {
        var temple = (await _api.Anonymous().GetAsync("/api/v1/public/temples").Expect()).Items().First();

        Assert.Null(temple["mobileNumber"]);
        Assert.Null(temple["contact"]);
    }

    [Fact]
    public async Task Rules_are_public()
    {
        var rules = await _api.Anonymous().GetAsync("/api/v1/rules").Expect();

        Assert.True(rules.Int("version") >= 1);
        Assert.Contains(rules.Arr("earning"), x => x!.Str("waste") == "Flowers" && x.Int("ptsPerKg") == 100);
        Assert.Contains(rules.Arr("earning"), x => x!.Str("waste") == "Broken idols" && x.Dec("charge") == 10m);
        Assert.Equal(new[] { 1, 2, 3 }, rules.Arr("levels").Select(x => x!.Int("number")));
        Assert.Equal(10, rules.Int("pointsPerRupee"));
    }

    [Fact]
    public async Task Products_list_only_listed_items()
    {
        var products = (await _api.Anonymous().GetAsync("/api/v1/products").Expect()).Items().ToList();

        Assert.NotEmpty(products);
        Assert.All(products, x => Assert.True(x.Bool("listed")));
        Assert.DoesNotContain(products, x => x.Str("name") == "Vermicompost" && x.Str("pack") == "5 kg");
    }

    [Fact]
    public async Task Products_filter_by_category()
    {
        var products = (await _api.Anonymous().GetAsync("/api/v1/products?category=Manure").Expect()).Items().ToList();

        Assert.NotEmpty(products);
        Assert.All(products, x => Assert.Equal("Manure", x.Str("category")));
    }

    [Theory]
    [InlineData("tulsi")]
    [InlineData("तुलसी")]
    [InlineData("SAPLINGS")]
    public async Task Products_search_name_hindi_name_and_category(string q)
    {
        var products = (await _api.Anonymous().GetAsync($"/api/v1/products?q={Uri.EscapeDataString(q)}").Expect()).Items().ToList();

        Assert.Contains(products, x => x.Str("name") == "Tulsi sapling");
    }

    [Fact]
    public async Task Products_report_stock_tone()
    {
        var products = (await _api.Anonymous().GetAsync("/api/v1/products").Expect()).Items().ToList();

        Assert.Equal("out", products.First(x => x.Str("name") == "Tulsi sapling").Str("stockTone"));
        Assert.Equal("low", products.First(x => x.Str("name") == "Vermicompost").Str("stockTone"));
    }

    [Fact]
    public async Task Categories_are_distinct_and_sorted()
    {
        var categories = (await _api.Anonymous().GetAsync("/api/v1/products/categories").Expect()).AsArray().Select(x => x!.GetValue<string>()).ToList();

        Assert.Contains("Manure", categories);
        Assert.Equal(categories.Distinct().OrderBy(x => x, StringComparer.Ordinal).ToList(), categories);
    }

    [Fact]
    public async Task Single_product_is_found_but_hidden_product_is_not()
    {
        var admin = await _api.SuperAdminAsync();
        var hidden = (await admin.GetAsync("/api/v1/admin/products?listed=false").Expect()).Items().First();
        var listed = (await _api.Anonymous().GetAsync("/api/v1/products").Expect()).Items().First();

        await _api.Anonymous().GetAsync($"/api/v1/products/{listed.Str("id")}").ExpectStatus(HttpStatusCode.OK);
        var message = await _api.Anonymous().GetAsync($"/api/v1/products/{hidden.Str("id")}").ExpectError(HttpStatusCode.NotFound);

        Assert.Equal("Product not found.", message);
    }

    [Fact]
    public async Task Societies_are_listed_and_searchable()
    {
        var all = (await _api.Anonymous().GetAsync("/api/v1/societies").Expect()).Items().ToList();
        var niti = (await _api.Anonymous().GetAsync("/api/v1/societies?q=niti").Expect()).Items().ToList();

        Assert.True(all.Count >= 3);
        Assert.Equal("Niti Khand Society", Assert.Single(niti).Str("name"));
        Assert.Equal(30000, niti[0].Int("poolTargetPoints"));
    }

    [Fact]
    public async Task Contact_message_is_saved_and_visible_to_admin()
    {
        var text = $"Please add a counter in Sector {Guid.NewGuid():N}";

        var body = await _api.Anonymous().PostJson("/api/v1/public/contact", new { name = "Visitor", message = text, topic = "feedback" }).Expect();
        var admin = await _api.SuperAdminAsync();
        var messages = (await admin.GetAsync("/api/v1/admin/messages?topic=feedback&pageSize=200").Expect()).Items();

        Assert.Equal("Thank you. Your message was sent.", body.Str("message"));
        Assert.Contains(messages, x => x.Str("message") == text);
    }

    [Fact]
    public async Task Contact_requires_message_and_known_topic()
    {
        await _api.Anonymous().PostJson("/api/v1/public/contact", new { name = "A", message = "" }).ExpectStatus(HttpStatusCode.BadRequest);
        await _api.Anonymous().PostJson("/api/v1/public/contact", new { name = "A", message = "Hi", topic = "sales" }).ExpectStatus(HttpStatusCode.BadRequest);
    }
}
