namespace backend.Models;

public sealed class EarningRule
{
    public Guid Id { get; set; }
    public string Waste { get; set; } = string.Empty;
    public int PtsPerKg { get; set; }
    public decimal MaxPerDay { get; set; }
    public bool Active { get; set; } = true;
    public decimal? Charge { get; set; }
    public int SortOrder { get; set; }
}

public sealed class Level
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int MinPoints { get; set; }
    public decimal Multiplier { get; set; } = 1;
}

public sealed class PointsSettings
{
    public int Id { get; set; } = 1;
    public int Version { get; set; } = 1;
    public int PointsPerRupee { get; set; } = 10;
    public bool RequiresKyc { get; set; } = true;
    public int MaxPctInPoints { get; set; } = 100;
    public int RejectionLimit { get; set; } = 3;
    public decimal MaxDepositKg { get; set; } = 10;
    public bool HoldOnFlag { get; set; } = true;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}
