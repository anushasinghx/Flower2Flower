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
            entity.HasIndex(x => x.NormalizedMobileNumber).IsUnique();
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
    }
}
