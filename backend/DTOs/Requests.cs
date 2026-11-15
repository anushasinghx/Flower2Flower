using System.ComponentModel.DataAnnotations;
using backend.Models;

namespace backend.DTOs;

public sealed class UpdateProfileRequest
{
    [Required]
    [StringLength(150, MinimumLength = 1)]
    public string FullName { get; set; } = string.Empty;

    public DateOnly? DateOfBirth { get; set; }

    [StringLength(500)]
    public string? Address { get; set; }

    [StringLength(100)]
    public string? State { get; set; }

    [StringLength(100)]
    public string? City { get; set; }

    [Range(100000, 999999)]
    public int? Pin { get; set; }
}

public sealed class UpdatePreferencesRequest
{
    public AppLanguage? Language { get; set; }
    public TextSize? TextSize { get; set; }
}

public sealed class SetConsentRequest
{
    public bool Active { get; set; }
}

public sealed class SubmitKycRequest
{
    [Required]
    [StringLength(64)]
    public string DocType { get; set; } = string.Empty;

    [Required]
    [StringLength(64, MinimumLength = 4)]
    public string DocNumber { get; set; } = string.Empty;

    [Required]
    public Guid FrontFileId { get; set; }

    public Guid? BackFileId { get; set; }
}

public sealed class SetSocietyRequest
{
    public Guid? SocietyId { get; set; }
    public bool PoolOn { get; set; }
}

public sealed class OrderLineRequest
{
    [Required]
    public Guid ProductId { get; set; }

    [Range(1, 100)]
    public int Qty { get; set; }
}

public class OrderQuoteRequest
{
    [Required]
    [MinLength(1)]
    public List<OrderLineRequest> Lines { get; set; } = new();

    public Fulfilment Fulfilment { get; set; } = Fulfilment.Pickup;
    public PayWith PayWith { get; set; } = PayWith.Inr;

    [Range(0, int.MaxValue)]
    public int PointsApplied { get; set; }
}

public sealed class PlaceOrderRequest : OrderQuoteRequest
{
    public Guid? PickupTempleId { get; set; }

    [StringLength(150)]
    public string? ContactName { get; set; }

    [StringLength(20)]
    public string? ContactPhone { get; set; }

    [StringLength(400)]
    public string? Address { get; set; }

    [StringLength(10)]
    public string? Pin { get; set; }
}

public sealed class OperatorSendOtpRequest
{
    [Required]
    public string MobileNumber { get; set; } = string.Empty;
}

public sealed class AssistedRegisterRequest
{
    [Required]
    public string MobileNumber { get; set; } = string.Empty;

    [Required]
    public string Otp { get; set; } = string.Empty;

    [Required]
    [StringLength(150, MinimumLength = 1)]
    public string FullName { get; set; } = string.Empty;

    [Required]
    public DateOnly? DateOfBirth { get; set; }

    public AppLanguage Language { get; set; } = AppLanguage.Hi;
    public bool RulesConsent { get; set; }
    public bool KycConsent { get; set; }
}

public sealed class DepositQuoteRequest
{
    public Guid? DevoteeUserId { get; set; }
    public string? MobileNumber { get; set; }

    [Required]
    [StringLength(64)]
    public string Waste { get; set; } = string.Empty;

    [Range(typeof(decimal), "0.001", "1000")]
    public decimal Kg { get; set; }
}

public sealed class DepositRequest
{
    [StringLength(64)]
    public string? ClientId { get; set; }

    public Guid? DevoteeUserId { get; set; }
    public string? MobileNumber { get; set; }

    [Required]
    public Guid TempleId { get; set; }

    [Required]
    [StringLength(64)]
    public string Waste { get; set; } = string.Empty;

    public decimal Kg { get; set; }
    public Guid? PhotoFileId { get; set; }
    public List<string>? Checks { get; set; }
    public bool ChargeCollected { get; set; }
    public bool Rejected { get; set; }

    [StringLength(300)]
    public string? Reason { get; set; }

    [StringLength(500)]
    public string? Note { get; set; }

    public DateTime? CapturedAtUtc { get; set; }
}

public sealed class SyncDepositsRequest
{
    [Required]
    [MinLength(1)]
    [MaxLength(200)]
    public List<DepositRequest> Deposits { get; set; } = new();
}

public sealed class CloseDayRequest
{
    [Required]
    public Guid TempleId { get; set; }
}

public sealed class TempleDetailsRequest
{
    public TempleType Type { get; set; } = TempleType.Registered;

    [Required]
    [StringLength(200, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;

    [StringLength(64)]
    public string? RegNo { get; set; }

    [Required]
    [StringLength(500, MinimumLength = 3)]
    public string Address { get; set; } = string.Empty;

    [Required]
    [StringLength(150, MinimumLength = 1)]
    public string Contact { get; set; } = string.Empty;

    [Required]
    public string MobileNumber { get; set; } = string.Empty;

    public bool Authorised { get; set; }
}

public sealed class TempleDocumentRequest
{
    [Required]
    [StringLength(64)]
    public string DocType { get; set; } = string.Empty;

    [Required]
    public Guid FileId { get; set; }
}

public sealed class SubmitTempleRequest
{
    [StringLength(150)]
    public string? Deity { get; set; }

    public Guid? PhotoFileId { get; set; }

    [Required]
    public List<TempleDocumentRequest> Documents { get; set; } = new();
}

public sealed class TempleTimingsRequest
{
    [Required]
    [StringLength(100, MinimumLength = 1)]
    public string Timings { get; set; } = string.Empty;
}

public sealed class KycDecisionRequest
{
    public bool Approve { get; set; }

    [StringLength(500)]
    public string? Reason { get; set; }
}

public sealed class AddTempleRequest
{
    [Required]
    [StringLength(200, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;

    public TempleType Type { get; set; } = TempleType.Registered;

    [Required]
    [StringLength(500, MinimumLength = 3)]
    public string Address { get; set; } = string.Empty;

    [Required]
    [StringLength(150, MinimumLength = 1)]
    public string Contact { get; set; } = string.Empty;

    [Required]
    public string MobileNumber { get; set; } = string.Empty;
}

public sealed class VerifyTempleRequest
{
    [Required]
    [StringLength(64)]
    public string Badge { get; set; } = string.Empty;
}

public sealed class RequestTempleChangesRequest
{
    [Required]
    [StringLength(500, MinimumLength = 1)]
    public string Note { get; set; } = string.Empty;
}

public sealed class EarningRuleRequest
{
    [Required]
    [StringLength(64, MinimumLength = 1)]
    public string Waste { get; set; } = string.Empty;

    [Range(0, 100000)]
    public int PtsPerKg { get; set; }

    [Range(typeof(decimal), "0", "1000")]
    public decimal MaxPerDay { get; set; }

    public bool Active { get; set; } = true;

    [Range(typeof(decimal), "0", "100000")]
    public decimal? Charge { get; set; }
}

public sealed class LevelRequest
{
    [Required]
    [StringLength(64, MinimumLength = 1)]
    public string Name { get; set; } = string.Empty;

    [Range(0, int.MaxValue)]
    public int MinPoints { get; set; }

    [Range(typeof(decimal), "0.1", "10")]
    public decimal Multiplier { get; set; } = 1;
}

public sealed class PublishRulesRequest
{
    public int? BaseVersion { get; set; }

    [Required]
    [MinLength(1)]
    public List<EarningRuleRequest> Earning { get; set; } = new();

    [Required]
    [MinLength(1)]
    public List<LevelRequest> Levels { get; set; } = new();

    [Range(1, 1000)]
    public int PointsPerRupee { get; set; } = 10;

    public bool RequiresKyc { get; set; } = true;

    [Range(0, 100)]
    public int MaxPctInPoints { get; set; } = 100;

    [Range(1, 100)]
    public int RejectionLimit { get; set; } = 3;

    [Range(typeof(decimal), "0.1", "1000")]
    public decimal MaxDepositKg { get; set; } = 10;

    public bool HoldOnFlag { get; set; } = true;
}

public sealed class ResolveAlertRequest
{
    public AlertAction Action { get; set; }

    [Required]
    [StringLength(500, MinimumLength = 1)]
    public string Note { get; set; } = string.Empty;
}

public sealed class CreateBatchRequest
{
    [Required]
    [MinLength(1)]
    public List<Guid> CollectionIds { get; set; } = new();

    [Range(typeof(decimal), "0", "100000")]
    public decimal? TotalOverrideKg { get; set; }

    [StringLength(200)]
    public string? OverrideReason { get; set; }
}

public sealed class MoveBatchRequest
{
    public BatchStatus To { get; set; }

    [StringLength(300)]
    public string? Reason { get; set; }
}

public sealed class StockLineRequest
{
    [Required]
    public Guid ProductId { get; set; }

    [Range(1, 100000)]
    public int Units { get; set; }
}

public sealed class UpdateStockRequest
{
    [Range(typeof(decimal), "0.001", "100000")]
    public decimal OutputKg { get; set; }

    public List<StockLineRequest> Lines { get; set; } = new();
}

public sealed class ProductRequest
{
    [Required]
    [StringLength(64, MinimumLength = 1)]
    public string Group { get; set; } = string.Empty;

    [Required]
    [StringLength(150, MinimumLength = 1)]
    public string Name { get; set; } = string.Empty;

    [StringLength(150)]
    public string? NameHi { get; set; }

    [Required]
    [StringLength(64, MinimumLength = 1)]
    public string Category { get; set; } = string.Empty;

    [Required]
    [StringLength(32, MinimumLength = 1)]
    public string Pack { get; set; } = string.Empty;

    [Range(typeof(decimal), "0", "1000000")]
    public decimal Price { get; set; }

    [Range(0, int.MaxValue)]
    public int Points { get; set; }

    [Range(0, int.MaxValue)]
    public int Stock { get; set; }

    public bool Listed { get; set; } = true;
}

public sealed class OrderStatusRequest
{
    public OrderStatus Status { get; set; }

    [StringLength(500)]
    public string? TrackingNote { get; set; }

    [StringLength(8)]
    public string? PickupCode { get; set; }
}

public sealed class InviteStaffRequest
{
    [Required]
    [StringLength(150, MinimumLength = 1)]
    public string FullName { get; set; } = string.Empty;

    [Required]
    public string MobileNumber { get; set; } = string.Empty;

    public StaffRole Role { get; set; } = StaffRole.Operator;
}

public sealed class UpdateStaffRequest
{
    [StringLength(150, MinimumLength = 1)]
    public string? FullName { get; set; }

    public StaffRole? Role { get; set; }

    [RegularExpression("^(active|suspended)$", ErrorMessage = "Status must be active or suspended.")]
    public string? Status { get; set; }
}

public sealed class ExportRequest
{
    [Required]
    [StringLength(64)]
    public string Dataset { get; set; } = string.Empty;

    public DateOnly? From { get; set; }
    public DateOnly? To { get; set; }

    [Required]
    [StringLength(500, MinimumLength = 1)]
    public string Reason { get; set; } = string.Empty;

    public bool Masked { get; set; } = true;
}

public sealed class ContactRequest
{
    [StringLength(150)]
    public string? Name { get; set; }

    [Required]
    [StringLength(2000, MinimumLength = 1)]
    public string Message { get; set; } = string.Empty;

    [RegularExpression("^(contact|feedback)$", ErrorMessage = "Topic must be contact or feedback.")]
    public string? Topic { get; set; }
}

public sealed class FileUploadRequest
{
    [Required]
    public IFormFile? File { get; set; }

    public FilePurpose Purpose { get; set; }
}
