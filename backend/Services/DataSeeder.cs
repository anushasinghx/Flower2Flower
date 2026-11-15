using backend.Data;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Services;

public static class DataSeeder
{
    public static async Task SeedAsync(AppDbContext dbContext, IConfiguration configuration)
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
