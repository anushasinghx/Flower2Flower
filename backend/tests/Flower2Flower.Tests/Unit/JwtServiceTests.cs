using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using backend.Models;
using backend.Services;
using Flower2Flower.Tests.Support;

namespace Flower2Flower.Tests.Unit;

public sealed class JwtServiceTests
{
    private const string Key = "unit-test-signing-key-that-is-long-enough-123456";

    private static readonly User Admin = new() { Id = Guid.NewGuid(), MobileNumber = "9000002222", UserType = UserType.Admin };

    private static JwtService Service(string key = Key, string? expiry = null) => new(TestConfig.From(
        ("JWT_SIGNING_KEY", key),
        ("Jwt:Issuer", "Flower2Flower"),
        ("Jwt:Audience", "Flower2Flower-Frontend"),
        ("Jwt:ExpiryMinutes", expiry)));

    private static bool HasRole(ClaimsPrincipal principal, string role) =>
        principal.Claims.Any(x => (x.Type == "role" || x.Type == ClaimTypes.Role) && x.Value == role);

    [Fact]
    public void Created_token_validates_and_carries_user_claims()
    {
        var service = Service();

        var principal = service.ValidateToken(service.CreateToken(Admin));

        Assert.NotNull(principal);
        Assert.Equal(Admin.Id.ToString(), principal!.FindFirst("user_id")?.Value);
        Assert.True(HasRole(principal, "Admin"));
    }

    [Fact]
    public void Token_has_configured_issuer_audience_and_expiry()
    {
        var token = new JwtSecurityTokenHandler().ReadJwtToken(Service(expiry: "30").CreateToken(Admin));

        Assert.Equal("Flower2Flower", token.Issuer);
        Assert.Contains("Flower2Flower-Frontend", token.Audiences);
        Assert.InRange(token.ValidTo, DateTime.UtcNow.AddMinutes(29), DateTime.UtcNow.AddMinutes(31));
    }

    [Fact]
    public void Invalid_expiry_setting_falls_back_to_fifteen_minutes()
    {
        var token = new JwtSecurityTokenHandler().ReadJwtToken(Service(expiry: "abc").CreateToken(Admin));

        Assert.InRange(token.ValidTo, DateTime.UtcNow.AddMinutes(14), DateTime.UtcNow.AddMinutes(16));
    }

    [Fact]
    public void Token_signed_with_other_key_is_rejected()
    {
        var token = Service("another-signing-key-that-is-also-long-enough-999").CreateToken(Admin);

        Assert.Null(Service().ValidateToken(token));
    }

    [Theory]
    [InlineData("")]
    [InlineData("not-a-jwt")]
    [InlineData("a.b.c")]
    public void Garbage_token_is_rejected(string token)
    {
        Assert.Null(Service().ValidateToken(token));
    }

    [Fact]
    public void Qr_token_round_trips_user_id_and_lasts_a_day()
    {
        var service = Service();

        var (token, expiresAt) = service.CreateQrToken(Admin);

        Assert.Equal(Admin.Id, service.ReadQrToken(token));
        Assert.InRange(expiresAt, DateTime.UtcNow.AddHours(23.9), DateTime.UtcNow.AddHours(24.1));
    }

    [Fact]
    public void Access_token_cannot_be_used_as_qr_token()
    {
        var service = Service();

        Assert.Null(service.ReadQrToken(service.CreateToken(Admin)));
    }

    [Fact]
    public void Qr_token_cannot_be_used_as_access_token()
    {
        var service = Service();

        Assert.Null(service.ValidateToken(service.CreateQrToken(Admin).Token));
    }

    [Fact]
    public void Qr_token_from_other_key_is_rejected()
    {
        var token = Service("another-signing-key-that-is-also-long-enough-999").CreateQrToken(Admin).Token;

        Assert.Null(Service().ReadQrToken(token));
    }
}
