namespace backend.Models;

public sealed class Consent
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Key { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string Version { get; set; } = "v1";
    public bool Active { get; set; }
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}

public sealed class KycSubmission
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public User? User { get; set; }
    public string DocType { get; set; } = string.Empty;
    public string DocNumber { get; set; } = string.Empty;
    public Guid FrontFileId { get; set; }
    public Guid? BackFileId { get; set; }
    public KycStatus Status { get; set; } = KycStatus.InReview;
    public string Reason { get; set; } = string.Empty;
    public DateTime SubmittedAtUtc { get; set; } = DateTime.UtcNow;
    public Guid? ReviewedByUserId { get; set; }
    public DateTime? ReviewedAtUtc { get; set; }
}

public sealed class LedgerEntry
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public LedgerKind Kind { get; set; }
    public int Points { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Detail { get; set; } = string.Empty;
    public long? DepositId { get; set; }
    public int? OrderId { get; set; }
    public Guid? AlertId { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}

public sealed class Society
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Area { get; set; } = string.Empty;
    public int PoolTargetPoints { get; set; } = 30000;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}

public sealed class Notice
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public long DepositId { get; set; }
    public DepositStatus Kind { get; set; }
    public decimal Kg { get; set; }
    public string Waste { get; set; } = string.Empty;
    public int Points { get; set; }
    public string TempleName { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? DismissedAtUtc { get; set; }
}
