using backend.Services;

namespace Flower2Flower.Tests.Unit;

public sealed class MobileTests
{
    [Theory]
    [InlineData("9876543210", "9876543210")]
    [InlineData(" 98765 43210 ", "9876543210")]
    [InlineData("+91 98765 43210", "9876543210")]
    [InlineData("919876543210", "9876543210")]
    [InlineData("98765-43210", "9876543210")]
    [InlineData("0919876543210", "0919876543210")]
    [InlineData("", "")]
    [InlineData(null, "")]
    [InlineData("abc", "")]
    public void Normalize_keeps_digits_and_strips_country_code(string? input, string expected)
    {
        Assert.Equal(expected, Mobile.Normalize(input));
    }

    [Theory]
    [InlineData("9876543210", true)]
    [InlineData("8123456789", true)]
    [InlineData("7123456789", true)]
    [InlineData("6123456789", true)]
    [InlineData("5123456789", false)]
    [InlineData("0123456789", false)]
    [InlineData("987654321", false)]
    [InlineData("98765432101", false)]
    [InlineData("", false)]
    public void IsValid_accepts_only_ten_digit_indian_numbers(string input, bool expected)
    {
        Assert.Equal(expected, Mobile.IsValid(input));
    }

    [Theory]
    [InlineData("9876543210", "******3210")]
    [InlineData("1234", "******1234")]
    [InlineData("123", "******")]
    [InlineData("", "******")]
    [InlineData(null, "******")]
    public void Mask_shows_only_last_four_digits(string? input, string expected)
    {
        Assert.Equal(expected, Mobile.Mask(input));
    }

    [Theory]
    [InlineData("1234 5678 9012", "XXXX XXXX 9012")]
    [InlineData("ABCDE1234F", "XXXX XXXX 234F")]
    [InlineData("12", "XXXX")]
    [InlineData("", "XXXX")]
    [InlineData(null, "XXXX")]
    public void MaskDocument_hides_all_but_last_four(string? input, string expected)
    {
        Assert.Equal(expected, Mobile.MaskDocument(input));
    }

    [Theory]
    [InlineData("2000-06-15", "2018-06-14", 17)]
    [InlineData("2000-06-15", "2018-06-15", 18)]
    [InlineData("2000-06-15", "2018-06-16", 18)]
    [InlineData("2004-02-29", "2022-02-28", 17)]
    [InlineData("2004-02-29", "2022-03-01", 18)]
    [InlineData("1984-03-12", "2026-11-24", 42)]
    public void AgeOn_counts_completed_years(string dob, string today, int expected)
    {
        Assert.Equal(expected, Mobile.AgeOn(DateOnly.Parse(dob), DateOnly.Parse(today)));
    }
}
