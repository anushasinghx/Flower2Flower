namespace backend.Models;

public enum KycStatus
{
    NotStarted,
    InReview,
    Verified,
    Rejected
}

public enum LedgerKind
{
    Earned,
    Bonus,
    Redeemed,
    Refund,
    Held,
    Released,
    Removed,
    Rejected
}

public enum Fulfilment
{
    Pickup,
    Delivery
}

public enum PayWith
{
    Mixed,
    Points,
    Inr
}

public enum OrderStatus
{
    New,
    Confirmed,
    Ready,
    Completed,
    Cancelled
}

public enum TempleStatus
{
    Draft,
    Pending,
    Verified,
    NeedsChanges
}

public enum TempleType
{
    Registered,
    Unregistered
}

public enum BatchStatus
{
    Created,
    Composting,
    Curing,
    Ready,
    Closed
}

public enum DepositStatus
{
    Accepted,
    Held,
    Rejected
}

public enum AlertSeverity
{
    High,
    Medium,
    Low
}

public enum AlertRuleKind
{
    Weight,
    Rejection,
    Rapid,
    Other
}

public enum AlertStatus
{
    Open,
    Resolved
}

public enum AlertAction
{
    Release,
    Remove,
    Dismiss
}

public enum FilePurpose
{
    KycFront,
    KycBack,
    PurityPhoto,
    TempleDocument,
    TemplePhoto
}

public enum AppLanguage
{
    En,
    Hi
}

public enum TextSize
{
    Normal,
    Small,
    Large
}

public enum StaffRole
{
    Admin,
    Operator,
    TempleAdmin
}
