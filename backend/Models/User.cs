namespace backend.Models;

public sealed class User
{
    public Guid Id { get; set; }
    public string MobileNumber { get; set; } = string.Empty;
    public string NormalizedMobileNumber { get; set; } = string.Empty;
    public string? FullName { get; set; }
    public DateOnly? DateOfBirth { get; set; }
    public string? State { get; set; }
    public string? City { get; set; }
    public int? Pin { get; set; }
    public string? Address { get; set; }
    public UserType UserType { get; set; } = UserType.Devotee;
    public bool MobileVerified { get; set; }
    public string AccountStatus { get; set; } = "Active";
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? LastLoginAtUtc { get; set; }
    public KycStatus KycStatus { get; set; } = KycStatus.NotStarted;
    public Guid? SocietyId { get; set; }
    public Society? Society { get; set; }
    public bool PoolOn { get; set; }
    public AppLanguage Language { get; set; } = AppLanguage.En;
    public TextSize TextSize { get; set; } = TextSize.Normal;
    public Guid? AssistedByUserId { get; set; }
}
