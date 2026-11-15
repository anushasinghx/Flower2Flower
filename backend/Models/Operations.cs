namespace backend.Models;

public sealed class Deposit
{
    public long Id { get; set; }
    public string? ClientId { get; set; }
    public Guid DevoteeUserId { get; set; }
    public string DevoteeName { get; set; } = string.Empty;
    public string MobileNumber { get; set; } = string.Empty;
    public Guid TempleId { get; set; }
    public Guid OperatorUserId { get; set; }
    public string Waste { get; set; } = string.Empty;
    public decimal Kg { get; set; }
    public int Points { get; set; }
    public decimal Charge { get; set; }
    public bool ChargeCollected { get; set; }
    public DepositStatus Status { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string Note { get; set; } = string.Empty;
    public Guid? PhotoFileId { get; set; }
    public string Checks { get; set; } = string.Empty;
    public bool Conflict { get; set; }
    public DateTime CapturedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime SyncedAtUtc { get; set; } = DateTime.UtcNow;
}

public sealed class Alert
{
    public Guid Id { get; set; }
    public AlertSeverity Severity { get; set; }
    public string Subject { get; set; } = string.Empty;
    public Guid? SubjectUserId { get; set; }
    public string Rule { get; set; } = string.Empty;
    public AlertRuleKind RuleKind { get; set; }
    public string Detail { get; set; } = string.Empty;
    public int HeldPoints { get; set; }
    public long? DepositId { get; set; }
    public AlertStatus Status { get; set; } = AlertStatus.Open;
    public string Resolution { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public Guid? ResolvedByUserId { get; set; }
    public DateTime? ResolvedAtUtc { get; set; }
}

public sealed class Batch
{
    public int Id { get; set; }
    public BatchStatus Status { get; set; } = BatchStatus.Created;
    public decimal? OutputKg { get; set; }
    public Guid CreatedByUserId { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public List<BatchInput> Inputs { get; set; } = new();
    public List<BatchStockLine> StockLines { get; set; } = new();
    public List<BatchEvent> Events { get; set; } = new();
}

public sealed class BatchInput
{
    public Guid Id { get; set; }
    public int BatchId { get; set; }
    public string Source { get; set; } = string.Empty;
    public DateOnly Date { get; set; }
    public decimal Kg { get; set; }
    public Guid? ClosedCollectionId { get; set; }
}

public sealed class BatchStockLine
{
    public Guid Id { get; set; }
    public int BatchId { get; set; }
    public Guid ProductId { get; set; }
    public int Units { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}

public sealed class BatchEvent
{
    public Guid Id { get; set; }
    public int BatchId { get; set; }
    public string Text { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}

public sealed class ClosedCollection
{
    public Guid Id { get; set; }
    public Guid TempleId { get; set; }
    public string Source { get; set; } = string.Empty;
    public DateOnly Date { get; set; }
    public decimal Kg { get; set; }
    public bool Used { get; set; }
    public int? BatchId { get; set; }
    public Guid ClosedByUserId { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
