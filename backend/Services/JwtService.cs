using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using backend.Models;
using Microsoft.IdentityModel.Tokens;

namespace backend.Services;

public sealed class JwtService
{
    private readonly IConfiguration _configuration;

    public JwtService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public string CreateToken(User user)
    {
        var signingKey = GetSigningKey();
        var credentials = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);
        var issuer = _configuration["Jwt:Issuer"] ?? _configuration["JWT_ISSUER"] ?? "Flower2Flower";
        var audience = _configuration["Jwt:Audience"] ?? _configuration["JWT_AUDIENCE"] ?? "Flower2Flower-Frontend";
        var expiryMinutes = GetExpiryMinutes();

        var claims = new[]
        {
            new Claim("user_id", user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.UniqueName, user.MobileNumber),
            new Claim("role", user.UserType.ToString())
        };

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expiryMinutes),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public ClaimsPrincipal? ValidateToken(string token)
    {
        var handler = new JwtSecurityTokenHandler();
        var signingKey = GetSigningKey();
        var issuer = _configuration["Jwt:Issuer"] ?? _configuration["JWT_ISSUER"] ?? "Flower2Flower";
        var audience = _configuration["Jwt:Audience"] ?? _configuration["JWT_AUDIENCE"] ?? "Flower2Flower-Frontend";

        try
        {
            var principal = handler.ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = signingKey,
                ValidateIssuer = true,
                ValidIssuer = issuer,
                ValidateAudience = true,
                ValidAudience = audience,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromMinutes(1)
            }, out _);

            return principal;
        }
        catch
        {
            return null;
        }
    }

    public (string Token, DateTime ExpiresAtUtc) CreateQrToken(User user)
    {
        var issuer = _configuration["Jwt:Issuer"] ?? _configuration["JWT_ISSUER"] ?? "Flower2Flower";
        var expiresAt = DateTime.UtcNow.AddHours(24);
        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: QrAudience,
            claims: new[] { new Claim("user_id", user.Id.ToString()) },
            expires: expiresAt,
            signingCredentials: new SigningCredentials(GetSigningKey(), SecurityAlgorithms.HmacSha256));

        return (new JwtSecurityTokenHandler().WriteToken(token), expiresAt);
    }

    public Guid? ReadQrToken(string token)
    {
        var issuer = _configuration["Jwt:Issuer"] ?? _configuration["JWT_ISSUER"] ?? "Flower2Flower";
        try
        {
            var principal = new JwtSecurityTokenHandler().ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = GetSigningKey(),
                ValidateIssuer = true,
                ValidIssuer = issuer,
                ValidateAudience = true,
                ValidAudience = QrAudience,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromMinutes(1)
            }, out _);

            return Guid.TryParse(principal.FindFirst("user_id")?.Value, out var userId) ? userId : null;
        }
        catch
        {
            return null;
        }
    }

    private const string QrAudience = "Flower2Flower-Counter-QR";

    private SymmetricSecurityKey GetSigningKey()
    {
        var key = _configuration["JWT_SIGNING_KEY"] ?? _configuration["Jwt:SigningKey"] ?? "flower2flower-development-signing-key-1234567890";
        return new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
    }

    private int GetExpiryMinutes()
    {
        var configuredValue = _configuration["Jwt:ExpiryMinutes"] ?? _configuration["JWT_EXPIRY_MINUTES"] ?? "15";
        return int.TryParse(configuredValue, out var expiryMinutes) ? expiryMinutes : 15;
    }
}
