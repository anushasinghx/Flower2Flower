using backend.Models;
using backend.Services;

namespace backend.DTOs;

public sealed record PagedResult<T>(IReadOnlyList<T> Items, int Total, int Page, int PageSize);

public sealed record ProductView(
    Guid Id,
    string Group,
    string Name,
    string NameHi,
    string Category,
    string Pack,
    decimal Price,
    int Points,
    int Stock,
    bool Listed,
    string StockTone);

public sealed record LedgerView(
    Guid Id,
    LedgerKind Kind,
    int Points,
    string Title,
    string Detail,
    long? DepositId,
    string? DepositCode,
    int? OrderId,
    DateTime CreatedAtUtc);

public sealed record DepositView(
    long Id,
    string Code,
    DateTime CapturedAtUtc,
    DateTime SyncedAtUtc,
    Guid DevoteeUserId,
    string DevoteeName,
    string MobileNumber,
    Guid TempleId,
    string TempleName,
    Guid OperatorUserId,
    string Waste,
    decimal Kg,
    int Points,
    decimal Charge,
    bool ChargeCollected,
    DepositStatus Status,
    string Reason,
    string Note,
    IReadOnlyList<string> Checks,
    Guid? PhotoFileId,
    bool Conflict,
    string? ClientId);

public sealed record DepositTotals(int Count, decimal Kg, int Points);

public sealed record DepositListView(IReadOnlyList<DepositView> Items, int Total, int Page, int PageSize, DepositTotals Totals);

public sealed record OrderLineView(Guid ProductId, string Name, string Pack, int Qty, decimal Price, int Points);

public sealed record OrderView(
    int Id,
    string Customer,
    string MobileNumber,
    DateTime CreatedAtUtc,
    IReadOnlyList<OrderLineView> Lines,
    Fulfilment Fulfilment,
    Guid? PickupTempleId,
    string TempleName,
    string Address,
    PayWith PayWith,
    decimal Subtotal,
    int PointsUsed,
    decimal InrPaid,
    decimal DeliveryFee,
    decimal Total,
    OrderStatus Status,
    string? PickupCode,
    string TrackingNote);

public sealed record OrderQuoteView(
    IReadOnlyList<OrderLineView> Lines,
    int Count,
    decimal Subtotal,
    int SubtotalPoints,
    decimal DeliveryFee,
    int PointsUsed,
    decimal PointsValue,
    decimal ToPay,
    int Available,
    int MaxApplicable,
    int PointsShort,
    bool PointsLocked);

public sealed record TempleEventView(string Text, DateTime CreatedAtUtc);

public sealed record TempleDocumentView(string DocType, Guid FileId, DateTime CreatedAtUtc);

public sealed record TempleView(
    Guid Id,
    string Name,
    TempleType Type,
    TempleStatus Status,
    string Address,
    string Contact,
    string MobileNumber,
    string Timings,
    string Badge,
    string Note,
    string RegNo,
    string Deity,
    Guid? PhotoFileId,
    DateTime? SubmittedAtUtc,
    DateTime CreatedAtUtc,
    IReadOnlyList<string> RequiredDocuments,
    IReadOnlyList<TempleDocumentView> Documents,
    IReadOnlyList<TempleEventView> History);

public sealed record PublicTempleView(Guid Id, string Name, TempleType Type, string Address, string Timings, string Badge);

public sealed record AlertView(
    Guid Id,
    AlertSeverity Severity,
    string Subject,
    Guid? SubjectUserId,
    string Rule,
    AlertRuleKind RuleKind,
    string Detail,
    int HeldPoints,
    long? DepositId,
    string? DepositCode,
    AlertStatus Status,
    string Resolution,
    DateTime CreatedAtUtc,
    DateTime? ResolvedAtUtc);

public sealed record BatchInputView(string Source, DateOnly Date, decimal Kg);

public sealed record BatchStockView(Guid ProductId, string ProductName, string Pack, int Units, DateTime CreatedAtUtc);

public sealed record BatchView(
    int Id,
    string Code,
    DateTime CreatedAtUtc,
    BatchStatus Status,
    decimal InputKg,
    decimal? OutputKg,
    int SourceCount,
    IReadOnlyList<BatchInputView> Inputs,
    IReadOnlyList<BatchStockView> StockAdded,
    IReadOnlyList<TempleEventView> History);

public sealed record ClosedCollectionView(Guid Id, Guid TempleId, string Source, DateOnly Date, decimal Kg, bool Used, int? BatchId);

public sealed record RulesView(
    int Version,
    IReadOnlyList<EarningRuleView> Earning,
    IReadOnlyList<LevelView> Levels,
    int PointsPerRupee,
    bool RequiresKyc,
    int MaxPctInPoints,
    int RejectionLimit,
    decimal MaxDepositKg,
    bool HoldOnFlag,
    DateTime UpdatedAtUtc);

public sealed record EarningRuleView(Guid Id, string Waste, int PtsPerKg, decimal MaxPerDay, bool Active, decimal? Charge);

public sealed record LevelView(Guid Id, int Number, string Name, int MinPoints, decimal Multiplier);

public sealed record SocietyView(Guid Id, string Name, string Area, int Members, int PoolPoints, int PoolTargetPoints, decimal Progress);

public sealed record FileView(Guid Id, FilePurpose Purpose, string OriginalName, string ContentType, long SizeBytes, DateTime CreatedAtUtc);

public static class Views
{
    public static string DepositCode(long id) => $"D{id}";

    public static string BatchCode(int id) => $"B{id:D4}";

    public static string StockTone(int stock) => stock <= 0 ? "out" : stock <= 5 ? "low" : "in";

    public static ProductView Product(Product product)
    {
        return new ProductView(product.Id, product.Group, product.Name, product.NameHi, product.Category, product.Pack, product.Price, product.Points, product.Stock, product.Listed, StockTone(product.Stock));
    }

    public static LedgerView Ledger(LedgerEntry entry)
    {
        return new LedgerView(entry.Id, entry.Kind, entry.Points, entry.Title, entry.Detail, entry.DepositId, entry.DepositId.HasValue ? DepositCode(entry.DepositId.Value) : null, entry.OrderId, entry.CreatedAtUtc);
    }

    public static DepositView Deposit(Deposit deposit, string templeName, bool maskMobile)
    {
        return new DepositView(
            deposit.Id,
            DepositCode(deposit.Id),
            deposit.CapturedAtUtc,
            deposit.SyncedAtUtc,
            deposit.DevoteeUserId,
            deposit.DevoteeName,
            maskMobile ? Mobile.Mask(deposit.MobileNumber) : deposit.MobileNumber,
            deposit.TempleId,
            templeName,
            deposit.OperatorUserId,
            deposit.Waste,
            deposit.Kg,
            deposit.Points,
            deposit.Charge,
            deposit.ChargeCollected,
            deposit.Status,
            deposit.Reason,
            deposit.Note,
            deposit.Checks.Split('|', StringSplitOptions.RemoveEmptyEntries),
            deposit.PhotoFileId,
            deposit.Conflict,
            deposit.ClientId);
    }

    public static OrderView Order(Order order, bool showPickupCode, bool maskMobile)
    {
        var lines = order.Lines.Select(x => new OrderLineView(x.ProductId, x.Name, x.Pack, x.Qty, x.Price, x.Points)).ToList();
        return new OrderView(
            order.Id,
            order.CustomerName,
            maskMobile ? Mobile.Mask(order.MobileNumber) : order.MobileNumber,
            order.CreatedAtUtc,
            lines,
            order.Fulfilment,
            order.PickupTempleId,
            order.TempleName,
            order.Address,
            order.PayWith,
            order.Subtotal,
            order.PointsUsed,
            order.InrPaid,
            order.DeliveryFee,
            order.Subtotal + order.DeliveryFee,
            order.Status,
            showPickupCode && order.Fulfilment == Fulfilment.Pickup ? order.PickupCode : null,
            order.TrackingNote);
    }

    public static IReadOnlyList<string> RequiredTempleDocuments(TempleType type)
    {
        return type == TempleType.Registered
            ? new[] { "Registration certificate", "Admin ID proof" }
            : new[] { "Committee letter", "Admin ID proof" };
    }

    public static TempleView Temple(Temple temple, bool maskMobile)
    {
        return new TempleView(
            temple.Id,
            temple.Name,
            temple.Type,
            temple.Status,
            temple.Address,
            temple.Contact,
            maskMobile ? Mobile.Mask(temple.MobileNumber) : temple.MobileNumber,
            string.IsNullOrWhiteSpace(temple.Timings) ? "Not set yet" : temple.Timings,
            temple.Badge,
            temple.Note,
            temple.RegNo,
            temple.Deity,
            temple.PhotoFileId,
            temple.SubmittedAtUtc,
            temple.CreatedAtUtc,
            RequiredTempleDocuments(temple.Type),
            temple.Documents.OrderBy(x => x.CreatedAtUtc).Select(x => new TempleDocumentView(x.DocType, x.FileId, x.CreatedAtUtc)).ToList(),
            temple.Events.OrderBy(x => x.CreatedAtUtc).Select(x => new TempleEventView(x.Text, x.CreatedAtUtc)).ToList());
    }

    public static PublicTempleView PublicTemple(Temple temple)
    {
        return new PublicTempleView(temple.Id, temple.Name, temple.Type, temple.Address, string.IsNullOrWhiteSpace(temple.Timings) ? "Not set yet" : temple.Timings, temple.Badge);
    }

    public static AlertView Alert(Alert alert)
    {
        return new AlertView(alert.Id, alert.Severity, alert.Subject, alert.SubjectUserId, alert.Rule, alert.RuleKind, alert.Detail, alert.HeldPoints, alert.DepositId, alert.DepositId.HasValue ? DepositCode(alert.DepositId.Value) : null, alert.Status, alert.Resolution, alert.CreatedAtUtc, alert.ResolvedAtUtc);
    }

    public static BatchView Batch(Batch batch, IReadOnlyDictionary<Guid, Product> products)
    {
        return new BatchView(
            batch.Id,
            BatchCode(batch.Id),
            batch.CreatedAtUtc,
            batch.Status,
            batch.Inputs.Sum(x => x.Kg),
            batch.OutputKg,
            batch.Inputs.Where(x => x.ClosedCollectionId.HasValue).Select(x => x.Source).Distinct().Count(),
            batch.Inputs.Select(x => new BatchInputView(x.Source, x.Date, x.Kg)).ToList(),
            batch.StockLines.OrderBy(x => x.CreatedAtUtc).Select(x => new BatchStockView(
                x.ProductId,
                products.TryGetValue(x.ProductId, out var product) ? product.Name : string.Empty,
                products.TryGetValue(x.ProductId, out var packProduct) ? packProduct.Pack : string.Empty,
                x.Units,
                x.CreatedAtUtc)).ToList(),
            batch.Events.OrderBy(x => x.CreatedAtUtc).Select(x => new TempleEventView(x.Text, x.CreatedAtUtc)).ToList());
    }

    public static ClosedCollectionView Collection(ClosedCollection collection)
    {
        return new ClosedCollectionView(collection.Id, collection.TempleId, collection.Source, collection.Date, collection.Kg, collection.Used, collection.BatchId);
    }

    public static RulesView Rules(RulesSnapshot rules)
    {
        return new RulesView(
            rules.Settings.Version,
            rules.Earning.Select(x => new EarningRuleView(x.Id, x.Waste, x.PtsPerKg, x.MaxPerDay, x.Active, x.Charge)).ToList(),
            rules.Levels.Select((x, index) => new LevelView(x.Id, index + 1, x.Name, x.MinPoints, x.Multiplier)).ToList(),
            rules.Settings.PointsPerRupee,
            rules.Settings.RequiresKyc,
            rules.Settings.MaxPctInPoints,
            rules.Settings.RejectionLimit,
            rules.Settings.MaxDepositKg,
            rules.Settings.HoldOnFlag,
            rules.Settings.UpdatedAtUtc);
    }

    public static FileView File(StoredFile file)
    {
        return new FileView(file.Id, file.Purpose, file.OriginalName, file.ContentType, file.SizeBytes, file.CreatedAtUtc);
    }
}
