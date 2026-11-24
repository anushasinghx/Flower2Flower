using backend.Data;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Services;

public static class DataSeeder
{
    public static async Task SeedAsync(AppDbContext dbContext, IConfiguration configuration, bool demo = false)
    {
        if (!await dbContext.PointsSettings.AnyAsync())
        {
            dbContext.PointsSettings.Add(new PointsSettings
            {
                Id = 1,
                Version = 1,
                PointsPerRupee = 10,
                RequiresKyc = true,
                MaxPctInPoints = 100,
                RejectionLimit = 3,
                MaxDepositKg = 10,
                HoldOnFlag = true
            });
        }

        if (!await dbContext.EarningRules.AnyAsync())
        {
            dbContext.EarningRules.AddRange(
                new EarningRule { Id = Guid.NewGuid(), Waste = "Flowers", PtsPerKg = 100, MaxPerDay = 10, Active = true, SortOrder = 1 },
                new EarningRule { Id = Guid.NewGuid(), Waste = "Leaves", PtsPerKg = 100, MaxPerDay = 10, Active = true, SortOrder = 2 },
                new EarningRule { Id = Guid.NewGuid(), Waste = "Coconut shells", PtsPerKg = 20, MaxPerDay = 5, Active = true, SortOrder = 3 },
                new EarningRule { Id = Guid.NewGuid(), Waste = "Garlands", PtsPerKg = 80, MaxPerDay = 10, Active = true, SortOrder = 4 },
                new EarningRule { Id = Guid.NewGuid(), Waste = "Broken idols", PtsPerKg = 0, MaxPerDay = 0, Active = true, Charge = 10, SortOrder = 5 });
        }

        if (!await dbContext.Levels.AnyAsync())
        {
            dbContext.Levels.AddRange(
                new Level { Id = Guid.NewGuid(), Name = "Novice", MinPoints = 0, Multiplier = 1 },
                new Level { Id = Guid.NewGuid(), Name = "Regular", MinPoints = 1000, Multiplier = 1 },
                new Level { Id = Guid.NewGuid(), Name = "Evangelist", MinPoints = 5000, Multiplier = 1.2m });
        }

        if (!await dbContext.Products.AnyAsync())
        {
            dbContext.Products.AddRange(
                NewProduct("manure", "Organic manure", "जैविक खाद", "Manure", "500 g", 35, 350, 48, true),
                NewProduct("manure", "Organic manure", "जैविक खाद", "Manure", "1 kg", 60, 600, 36, true),
                NewProduct("manure", "Organic manure", "जैविक खाद", "Manure", "5 kg", 250, 2500, 12, true),
                NewProduct("vermicompost", "Vermicompost", "केंचुआ खाद", "Vermicompost", "1 kg", 80, 800, 4, true),
                NewProduct("sapling", "Tulsi sapling", "तुलसी का पौधा", "Saplings", "1 pc", 40, 400, 0, true),
                NewProduct("kit", "Home garden kit", "घरेलू बगीचा किट", "Kits", "1 kit", 180, 1800, 18, true),
                NewProduct("vermicompost", "Vermicompost", "केंचुआ खाद", "Vermicompost", "5 kg", 350, 3500, 0, false));
        }

        if (!await dbContext.Societies.AnyAsync())
        {
            dbContext.Societies.AddRange(
                new Society { Id = Guid.NewGuid(), Name = "Shipra Sun City Residents", Area = "Indirapuram", PoolTargetPoints = 30000 },
                new Society { Id = Guid.NewGuid(), Name = "Niti Khand Society", Area = "Indirapuram", PoolTargetPoints = 30000 },
                new Society { Id = Guid.NewGuid(), Name = "Vaibhav Khand Society", Area = "Indirapuram", PoolTargetPoints = 30000 });
        }

        var adminMobile = Mobile.Normalize(configuration["Bootstrap:AdminMobile"] ?? configuration["BOOTSTRAP_ADMIN_MOBILE"]);
        if (Mobile.IsValid(adminMobile) && !await dbContext.Users.AnyAsync(x => x.NormalizedMobileNumber == adminMobile))
        {
            dbContext.Users.Add(new User
            {
                Id = Guid.NewGuid(),
                MobileNumber = adminMobile,
                NormalizedMobileNumber = adminMobile,
                FullName = configuration["Bootstrap:AdminName"] ?? configuration["BOOTSTRAP_ADMIN_NAME"] ?? "Super Admin",
                UserType = UserType.SuperAdmin,
                MobileVerified = true,
                AccountStatus = "Active",
                CreatedAtUtc = DateTime.UtcNow,
                UpdatedAtUtc = DateTime.UtcNow
            });
        }

        await dbContext.SaveChangesAsync();

        if (demo)
        {
            await SeedDemoAsync(dbContext);
        }
    }

    private static async Task SeedDemoAsync(AppDbContext dbContext)
    {
        var now = DateTime.UtcNow;
        var templeAdmin = await EnsureUserAsync(dbContext, "9000006666", "Mahesh Pandey", UserType.TempleAdmin);
        await EnsureUserAsync(dbContext, "9000004444", "Ravi Prasad", UserType.Operator);
        await EnsureUserAsync(dbContext, "9000002222", "Neha Kapoor", UserType.Admin);

        if (!await dbContext.Temples.AnyAsync())
        {
            dbContext.Temples.AddRange(
                NewTemple("Shiv Mandir, Shipra Sun City", TempleType.Registered, TempleStatus.Verified, "Shipra Sun City, Indirapuram, 201014", "Mahesh Pandey", "9000006666", "7:00 am to 11:00 am", "Verified Registered", templeAdmin.Id, now),
                NewTemple("Durga Mandir, Niti Khand", TempleType.Unregistered, TempleStatus.Verified, "Niti Khand 2, Indirapuram, 201014", "Suresh Dubey", "9810025566", "6:30 am to 10:30 am", "Verified", null, now),
                NewTemple("Hanuman Mandir, Vaibhav Khand", TempleType.Registered, TempleStatus.Pending, "Vaibhav Khand, Indirapuram, 201014", "Gopal Sharma", "9810037788", "7:00 am to 12:00 pm", string.Empty, null, now));
        }

        var devotee = await dbContext.Users.FirstOrDefaultAsync(x => x.NormalizedMobileNumber == "9876541234");
        if (devotee is null)
        {
            var society = await dbContext.Societies.OrderBy(x => x.Name).FirstOrDefaultAsync(x => x.Name == "Shipra Sun City Residents");
            devotee = new User
            {
                Id = Guid.NewGuid(),
                MobileNumber = "9876541234",
                NormalizedMobileNumber = "9876541234",
                FullName = "Sunita",
                DateOfBirth = new DateOnly(1984, 3, 12),
                Address = "Shipra Sun City, Indirapuram, 201014",
                UserType = UserType.Devotee,
                MobileVerified = true,
                AccountStatus = "Active",
                KycStatus = KycStatus.Verified,
                SocietyId = society?.Id,
                PoolOn = society is not null,
                CreatedAtUtc = now,
                UpdatedAtUtc = now
            };
            dbContext.Users.Add(devotee);
            dbContext.Consents.AddRange(
                new Consent { Id = Guid.NewGuid(), UserId = devotee.Id, Key = "rules", Label = "Nirmalya deposit and points rules", Version = "v1", Active = true, UpdatedAtUtc = now },
                new Consent { Id = Guid.NewGuid(), UserId = devotee.Id, Key = "data", Label = "Data and KYC processing", Version = "v1", Active = true, UpdatedAtUtc = now });
            dbContext.LedgerEntries.Add(new LedgerEntry
            {
                Id = Guid.NewGuid(),
                UserId = devotee.Id,
                Kind = LedgerKind.Bonus,
                Points = PointsService.WelcomeBonusPoints,
                Title = "Welcome bonus",
                Detail = "KYC verified",
                CreatedAtUtc = now
            });
        }

        await dbContext.SaveChangesAsync();
    }

    private static async Task<User> EnsureUserAsync(AppDbContext dbContext, string mobile, string name, UserType type)
    {
        var user = await dbContext.Users.FirstOrDefaultAsync(x => x.NormalizedMobileNumber == mobile);
        if (user is not null)
        {
            return user;
        }

        user = new User
        {
            Id = Guid.NewGuid(),
            MobileNumber = mobile,
            NormalizedMobileNumber = mobile,
            FullName = name,
            UserType = type,
            MobileVerified = true,
            AccountStatus = "Active",
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        };
        dbContext.Users.Add(user);
        return user;
    }

    private static Temple NewTemple(string name, TempleType type, TempleStatus status, string address, string contact, string mobile, string timings, string badge, Guid? adminUserId, DateTime now)
    {
        var temple = new Temple
        {
            Id = Guid.NewGuid(),
            Name = name,
            Type = type,
            Status = status,
            Address = address,
            Contact = contact,
            MobileNumber = mobile,
            Timings = timings,
            Badge = badge,
            RegNo = type == TempleType.Registered ? "REG2019" : string.Empty,
            AdminUserId = adminUserId,
            SubmittedAtUtc = now,
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };
        temple.Events.Add(new TempleEvent { Id = Guid.NewGuid(), TempleId = temple.Id, Text = status == TempleStatus.Verified ? "Verified by Admin" : "Submitted", CreatedAtUtc = now });
        return temple;
    }

    private static Product NewProduct(string group, string name, string nameHi, string category, string pack, decimal price, int points, int stock, bool listed)
    {
        return new Product
        {
            Id = Guid.NewGuid(),
            Group = group,
            Name = name,
            NameHi = nameHi,
            Category = category,
            Pack = pack,
            Price = price,
            Points = points,
            Stock = stock,
            Listed = listed,
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        };
    }
}
