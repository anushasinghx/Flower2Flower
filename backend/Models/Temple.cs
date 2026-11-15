namespace backend.Models;

public sealed class Temple
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public TempleType Type { get; set; }
    public TempleStatus Status { get; set; } = TempleStatus.Draft;
    public string Address { get; set; } = string.Empty;
    public string Contact { get; set; } = string.Empty;
    public string MobileNumber { get; set; } = string.Empty;
    public string Timings { get; set; } = string.Empty;
    public string Badge { get; set; } = string.Empty;
    public string Note { get; set; } = string.Empty;
    public string RegNo { get; set; } = string.Empty;
    public string Deity { get; set; } = string.Empty;
    public Guid? PhotoFileId { get; set; }
    public Guid? AdminUserId { get; set; }
    public DateTime? SubmittedAtUtc { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
    public List<TempleDocument> Documents { get; set; } = new();
    public List<TempleEvent> Events { get; set; } = new();
}

public sealed class TempleDocument
{
    public Guid Id { get; set; }
    public Guid TempleId { get; set; }
    public string DocType { get; set; } = string.Empty;
    public Guid FileId { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}

public sealed class TempleEvent
{
    public Guid Id { get; set; }
    public Guid TempleId { get; set; }
    public string Text { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
