using backend.Services;

namespace Flower2Flower.Tests.Unit;

public sealed class AppClockTests
{
    [Fact]
    public void Local_offset_is_india_standard_time()
    {
        Assert.Equal(TimeSpan.FromHours(5.5), AppClock.LocalOffset);
    }

    [Theory]
    [InlineData("2026-01-01T18:29:00", "2026-01-01")]
    [InlineData("2026-01-01T18:30:00", "2026-01-02")]
    [InlineData("2026-01-01T20:00:00", "2026-01-02")]
    [InlineData("2026-01-01T00:00:00", "2026-01-01")]
    public void LocalDate_converts_utc_to_india_date(string utc, string expected)
    {
        var value = DateTime.SpecifyKind(DateTime.Parse(utc), DateTimeKind.Utc);

        Assert.Equal(DateOnly.Parse(expected), AppClock.LocalDate(value));
    }

    [Fact]
    public void LocalDayStartUtc_is_previous_evening_in_utc()
    {
        var start = AppClock.LocalDayStartUtc(new DateOnly(2026, 1, 2));

        Assert.Equal(new DateTime(2026, 1, 1, 18, 30, 0), start);
        Assert.Equal(DateTimeKind.Utc, start.Kind);
    }

    [Fact]
    public void EnsureUtc_marks_unspecified_values_as_utc_without_shifting()
    {
        var value = new DateTime(2026, 5, 1, 10, 0, 0, DateTimeKind.Unspecified);

        var result = AppClock.EnsureUtc(value);

        Assert.Equal(DateTimeKind.Utc, result.Kind);
        Assert.Equal(value.Ticks, result.Ticks);
    }

    [Fact]
    public void EnsureUtc_keeps_utc_values()
    {
        var value = new DateTime(2026, 5, 1, 10, 0, 0, DateTimeKind.Utc);

        Assert.Equal(value, AppClock.EnsureUtc(value));
    }

    [Fact]
    public void EnsureUtc_converts_local_values()
    {
        var local = new DateTime(2026, 5, 1, 10, 0, 0, DateTimeKind.Local);

        Assert.Equal(local.ToUniversalTime(), AppClock.EnsureUtc(local));
    }

    [Fact]
    public void PeriodStartUtc_today_is_start_of_local_day()
    {
        Assert.Equal(AppClock.LocalDayStartUtc(AppClock.LocalToday), AppClock.PeriodStartUtc("today"));
        Assert.Equal(AppClock.LocalDayStartUtc(AppClock.LocalToday), AppClock.PeriodStartUtc(" TODAY "));
    }

    [Fact]
    public void PeriodStartUtc_seven_and_thirty_include_today()
    {
        Assert.Equal(AppClock.LocalDayStartUtc(AppClock.LocalToday.AddDays(-6)), AppClock.PeriodStartUtc("7"));
        Assert.Equal(AppClock.LocalDayStartUtc(AppClock.LocalToday.AddDays(-29)), AppClock.PeriodStartUtc("30"));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("all")]
    [InlineData("")]
    [InlineData("yesterday")]
    public void PeriodStartUtc_returns_null_for_all_or_unknown(string? period)
    {
        Assert.Null(AppClock.PeriodStartUtc(period));
    }
}
