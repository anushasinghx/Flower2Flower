using backend.Models;

namespace backend.DTOs;

public sealed class AuthResponse
{
    public string AccessToken { get; set; } = string.Empty;
    public DateTime ExpiresAtUtc { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string MobileNumber { get; set; } = string.Empty;
    public string? FullName { get; set; }
    public DateOnly? DateOfBirth { get; set; }
    public string? State { get; set; }
    public string? City { get; set; }
    public int? Pin { get; set; }
    public string? Address { get; set; }
    public UserType UserType { get; set; }
    public bool MobileVerified { get; set; }
    public string AccountStatus { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }
}
