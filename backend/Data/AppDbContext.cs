using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Data;

public sealed class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<RegistrationChallenge> RegistrationChallenges => Set<RegistrationChallenge>();
    public DbSet<Consent> Consents => Set<Consent>();
    public DbSet<KycSubmission> KycSubmissions => Set<KycSubmission>();
    public DbSet<LedgerEntry> LedgerEntries => Set<LedgerEntry>();
    public DbSet<Society> Societies => Set<Society>();
    public DbSet<Notice> Notices => Set<Notice>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderLine> OrderLines => Set<OrderLine>();
    public DbSet<Temple> Temples => Set<Temple>();
    public DbSet<TempleDocument> TempleDocuments => Set<TempleDocument>();
    public DbSet<TempleEvent> TempleEvents => Set<TempleEvent>();
    public DbSet<EarningRule> EarningRules => Set<EarningRule>();
    public DbSet<Level> Levels => Set<Level>();
    public DbSet<PointsSettings> PointsSettings => Set<PointsSettings>();
    public DbSet<Deposit> Deposits => Set<Deposit>();
    public DbSet<Alert> Alerts => Set<Alert>();
    public DbSet<Batch> Batches => Set<Batch>();
    public DbSet<BatchInput> BatchInputs => Set<BatchInput>();
    public DbSet<BatchStockLine> BatchStockLines => Set<BatchStockLine>();
    public DbSet<BatchEvent> BatchEvents => Set<BatchEvent>();
    public DbSet<ClosedCollection> ClosedCollections => Set<ClosedCollection>();
    public DbSet<AuditEntry> AuditEntries => Set<AuditEntry>();
    public DbSet<ExportEntry> ExportEntries => Set<ExportEntry>();
    public DbSet<ContactMessage> ContactMessages => Set<ContactMessage>();
    public DbSet<StoredFile> StoredFiles => Set<StoredFile>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.MobileNumber).IsRequired().HasMaxLength(20);
            entity.Property(x => x.NormalizedMobileNumber).IsRequired().HasMaxLength(20);
            entity.Property(x => x.FullName).HasMaxLength(150);
            entity.Property(x => x.State).HasMaxLength(100);
            entity.Property(x => x.City).HasMaxLength(100);
            entity.Property(x => x.Address).HasMaxLength(500);
            entity.Property(x => x.UserType).HasConversion<string>().HasMaxLength(32);
            entity.Property(x => x.AccountStatus).IsRequired().HasMaxLength(32);
            entity.Property(x => x.KycStatus).HasConversion<string>().HasMaxLength(32).HasDefaultValue(KycStatus.NotStarted);
            entity.Property(x => x.Language).HasConversion<string>().HasMaxLength(8).HasDefaultValue(AppLanguage.En);
            entity.Property(x => x.TextSize).HasConversion<string>().HasMaxLength(16).HasDefaultValue(TextSize.Normal);
            entity.HasOne(x => x.Society).WithMany().HasForeignKey(x => x.SocietyId).OnDelete(DeleteBehavior.SetNull);
            entity.HasIndex(x => x.NormalizedMobileNumber).IsUnique();
            entity.HasIndex(x => x.UserType);
        });

        modelBuilder.Entity<RegistrationChallenge>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.MobileNumber).IsRequired().HasMaxLength(20);
            entity.Property(x => x.NormalizedMobileNumber).IsRequired().HasMaxLength(20);
            entity.Property(x => x.FullName).HasMaxLength(150);
            entity.Property(x => x.State).HasMaxLength(100);
            entity.Property(x => x.City).HasMaxLength(100);
            entity.Property(x => x.Address).HasMaxLength(500);
            entity.Property(x => x.UserType).HasConversion<string>().HasMaxLength(32);
            entity.Property(x => x.IsConsumed).HasDefaultValue(false);
            entity.HasIndex(x => x.NormalizedMobileNumber).IsUnique();
        });

        modelBuilder.Entity<Consent>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Key).IsRequired().HasMaxLength(32);
            entity.Property(x => x.Label).IsRequired().HasMaxLength(200);
            entity.Property(x => x.Version).IsRequired().HasMaxLength(16);
            entity.HasIndex(x => new { x.UserId, x.Key }).IsUnique();
            entity.HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<KycSubmission>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.DocType).IsRequired().HasMaxLength(64);
            entity.Property(x => x.DocNumber).IsRequired().HasMaxLength(64);
            entity.Property(x => x.Status).HasConversion<string>().HasMaxLength(32);
            entity.Property(x => x.Reason).HasMaxLength(500);
            entity.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(x => x.Status);
            entity.HasIndex(x => x.UserId);
        });

        modelBuilder.Entity<LedgerEntry>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Kind).HasConversion<string>().HasMaxLength(32);
            entity.Property(x => x.Title).IsRequired().HasMaxLength(150);
            entity.Property(x => x.Detail).HasMaxLength(300);
            entity.HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(x => new { x.UserId, x.CreatedAtUtc });
        });

        modelBuilder.Entity<Society>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name).IsRequired().HasMaxLength(150);
            entity.Property(x => x.Area).HasMaxLength(150);
        });

        modelBuilder.Entity<Notice>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Kind).HasConversion<string>().HasMaxLength(32);
            entity.Property(x => x.Kg).HasPrecision(10, 3);
            entity.Property(x => x.Waste).HasMaxLength(64);
            entity.Property(x => x.TempleName).HasMaxLength(200);
            entity.Property(x => x.Reason).HasMaxLength(300);
            entity.HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(x => new { x.UserId, x.DismissedAtUtc });
        });

        modelBuilder.Entity<Product>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Group).IsRequired().HasMaxLength(64);
            entity.Property(x => x.Name).IsRequired().HasMaxLength(150);
            entity.Property(x => x.NameHi).HasMaxLength(150);
            entity.Property(x => x.Category).IsRequired().HasMaxLength(64);
            entity.Property(x => x.Pack).IsRequired().HasMaxLength(32);
            entity.Property(x => x.Price).HasPrecision(12, 2);
        });

        modelBuilder.Entity<Order>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).UseIdentityByDefaultColumn().HasIdentityOptions(startValue: 1001);
            entity.Property(x => x.CustomerName).HasMaxLength(150);
            entity.Property(x => x.MobileNumber).HasMaxLength(20);
            entity.Property(x => x.Fulfilment).HasConversion<string>().HasMaxLength(16);
            entity.Property(x => x.PayWith).HasConversion<string>().HasMaxLength(16);
            entity.Property(x => x.Status).HasConversion<string>().HasMaxLength(16);
            entity.Property(x => x.TempleName).HasMaxLength(200);
            entity.Property(x => x.Address).HasMaxLength(500);
            entity.Property(x => x.PickupCode).HasMaxLength(8);
            entity.Property(x => x.TrackingNote).HasMaxLength(500);
            entity.Property(x => x.Subtotal).HasPrecision(12, 2);
            entity.Property(x => x.InrPaid).HasPrecision(12, 2);
            entity.Property(x => x.DeliveryFee).HasPrecision(12, 2);
            entity.HasMany(x => x.Lines).WithOne().HasForeignKey(x => x.OrderId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(x => x.UserId);
            entity.HasIndex(x => x.Status);
        });

        modelBuilder.Entity<OrderLine>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name).HasMaxLength(150);
            entity.Property(x => x.Pack).HasMaxLength(32);
            entity.Property(x => x.Price).HasPrecision(12, 2);
        });

        modelBuilder.Entity<Temple>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name).IsRequired().HasMaxLength(200);
            entity.Property(x => x.Type).HasConversion<string>().HasMaxLength(32);
            entity.Property(x => x.Status).HasConversion<string>().HasMaxLength(32);
            entity.Property(x => x.Address).HasMaxLength(500);
            entity.Property(x => x.Contact).HasMaxLength(150);
            entity.Property(x => x.MobileNumber).HasMaxLength(20);
            entity.Property(x => x.Timings).HasMaxLength(100);
            entity.Property(x => x.Badge).HasMaxLength(64);
            entity.Property(x => x.Note).HasMaxLength(500);
            entity.Property(x => x.RegNo).HasMaxLength(64);
            entity.Property(x => x.Deity).HasMaxLength(150);
            entity.HasMany(x => x.Documents).WithOne().HasForeignKey(x => x.TempleId).OnDelete(DeleteBehavior.Cascade);
            entity.HasMany(x => x.Events).WithOne().HasForeignKey(x => x.TempleId).OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(x => x.Status);
            entity.HasIndex(x => x.AdminUserId);
            entity.HasIndex(x => x.MobileNumber);
        });

        modelBuilder.Entity<TempleDocument>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.DocType).IsRequired().HasMaxLength(64);
        });

        modelBuilder.Entity<TempleEvent>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Text).IsRequired().HasMaxLength(300);
        });

        modelBuilder.Entity<EarningRule>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Waste).IsRequired().HasMaxLength(64);
            entity.Property(x => x.MaxPerDay).HasPrecision(10, 3);
            entity.Property(x => x.Charge).HasPrecision(12, 2);
        });

        modelBuilder.Entity<Level>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name).IsRequired().HasMaxLength(64);
            entity.Property(x => x.Multiplier).HasPrecision(6, 3);
        });

        modelBuilder.Entity<PointsSettings>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).ValueGeneratedNever();
            entity.Property(x => x.MaxDepositKg).HasPrecision(10, 3);
        });

        modelBuilder.Entity<Deposit>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).UseIdentityByDefaultColumn().HasIdentityOptions(startValue: 2001);
            entity.Property(x => x.ClientId).HasMaxLength(64);
            entity.Property(x => x.DevoteeName).HasMaxLength(150);
            entity.Property(x => x.MobileNumber).HasMaxLength(20);
            entity.Property(x => x.Waste).IsRequired().HasMaxLength(64);
            entity.Property(x => x.Kg).HasPrecision(10, 3);
            entity.Property(x => x.Charge).HasPrecision(12, 2);
            entity.Property(x => x.Status).HasConversion<string>().HasMaxLength(16);
            entity.Property(x => x.Reason).HasMaxLength(300);
            entity.Property(x => x.Note).HasMaxLength(500);
            entity.Property(x => x.Checks).HasMaxLength(500);
            entity.HasIndex(x => x.ClientId).IsUnique();
            entity.HasIndex(x => new { x.DevoteeUserId, x.CapturedAtUtc });
            entity.HasIndex(x => new { x.TempleId, x.CapturedAtUtc });
            entity.HasOne<User>().WithMany().HasForeignKey(x => x.DevoteeUserId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<Temple>().WithMany().HasForeignKey(x => x.TempleId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Alert>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Severity).HasConversion<string>().HasMaxLength(16);
            entity.Property(x => x.Subject).HasMaxLength(150);
            entity.Property(x => x.Rule).HasMaxLength(150);
            entity.Property(x => x.RuleKind).HasConversion<string>().HasMaxLength(16);
            entity.Property(x => x.Detail).HasMaxLength(500);
            entity.Property(x => x.Status).HasConversion<string>().HasMaxLength(16);
            entity.Property(x => x.Resolution).HasMaxLength(500);
            entity.HasIndex(x => x.Status);
            entity.HasIndex(x => x.SubjectUserId);
        });

        modelBuilder.Entity<Batch>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).UseIdentityByDefaultColumn();
            entity.Property(x => x.Status).HasConversion<string>().HasMaxLength(16);
            entity.Property(x => x.OutputKg).HasPrecision(10, 3);
            entity.HasMany(x => x.Inputs).WithOne().HasForeignKey(x => x.BatchId).OnDelete(DeleteBehavior.Cascade);
            entity.HasMany(x => x.StockLines).WithOne().HasForeignKey(x => x.BatchId).OnDelete(DeleteBehavior.Cascade);
            entity.HasMany(x => x.Events).WithOne().HasForeignKey(x => x.BatchId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<BatchInput>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Source).IsRequired().HasMaxLength(300);
            entity.Property(x => x.Kg).HasPrecision(10, 3);
        });

        modelBuilder.Entity<BatchStockLine>(entity =>
        {
            entity.HasKey(x => x.Id);
        });

        modelBuilder.Entity<BatchEvent>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Text).IsRequired().HasMaxLength(300);
        });

        modelBuilder.Entity<ClosedCollection>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Source).HasMaxLength(200);
            entity.Property(x => x.Kg).HasPrecision(10, 3);
            entity.HasIndex(x => new { x.TempleId, x.Date }).IsUnique();
        });

        modelBuilder.Entity<AuditEntry>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.ActorName).HasMaxLength(150);
            entity.Property(x => x.Role).HasMaxLength(32);
            entity.Property(x => x.Action).HasMaxLength(100);
            entity.Property(x => x.Record).HasMaxLength(200);
            entity.Property(x => x.OldValue).HasMaxLength(500);
            entity.Property(x => x.NewValue).HasMaxLength(500);
            entity.Property(x => x.Reason).HasMaxLength(500);
            entity.HasIndex(x => x.CreatedAtUtc);
        });

        modelBuilder.Entity<ExportEntry>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Dataset).HasMaxLength(64);
            entity.Property(x => x.ByName).HasMaxLength(150);
            entity.Property(x => x.Reason).HasMaxLength(500);
        });

        modelBuilder.Entity<ContactMessage>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name).HasMaxLength(150);
            entity.Property(x => x.Message).IsRequired().HasMaxLength(2000);
            entity.Property(x => x.Topic).HasMaxLength(32);
        });

        modelBuilder.Entity<StoredFile>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Purpose).HasConversion<string>().HasMaxLength(32);
            entity.Property(x => x.OriginalName).HasMaxLength(255);
            entity.Property(x => x.ContentType).HasMaxLength(100);
            entity.Property(x => x.StoragePath).IsRequired().HasMaxLength(500);
            entity.HasIndex(x => x.OwnerUserId);
        });
    }
}
