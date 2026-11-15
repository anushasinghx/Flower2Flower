namespace backend.Services;

public static class AppClock
{
    public static readonly TimeSpan LocalOffset = TimeSpan.FromMinutes(330);

    public static DateOnly LocalToday => LocalDate(DateTime.UtcNow);

    public static DateOnly LocalDate(DateTime utc)
    {
        return DateOnly.FromDateTime(EnsureUtc(utc) + LocalOffset);
    }

    public static DateTime LocalDayStartUtc(DateOnly date)
    {
        return DateTime.SpecifyKind(date.ToDateTime(TimeOnly.MinValue) - LocalOffset, DateTimeKind.Utc);
    }

    public static DateTime EnsureUtc(DateTime value)
    {
        return value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
        };
    }

    public static DateTime? PeriodStartUtc(string? period)
    {
        var today = LocalToday;
        return (period ?? "all").Trim().ToLowerInvariant() switch
        {
            "today" => LocalDayStartUtc(today),
            "7" => LocalDayStartUtc(today.AddDays(-6)),
            "30" => LocalDayStartUtc(today.AddDays(-29)),
            _ => null
        };
    }
}
