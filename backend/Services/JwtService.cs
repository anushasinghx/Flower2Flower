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
            new Claim(JwtRegisteredClaimNames.UniqueName, user.MobileNumber)
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

    private SymmetricSecurityKey GetSigningKey()
    {
        var key = _configuration["Jwt:SigningKey"] ?? _configuration["JWT_SIGNING_KEY"] ?? "flower2flower-development-signing-key-123";
        return new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
    }

    private int GetExpiryMinutes()
    {
        var configuredValue = _configuration["Jwt:ExpiryMinutes"] ?? _configuration["JWT_EXPIRY_MINUTES"] ?? "15";
        return int.TryParse(configuredValue, out var expiryMinutes) ? expiryMinutes : 15;
    }
}
