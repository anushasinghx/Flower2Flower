using System.Text;
using backend.Services;

namespace Flower2Flower.Tests.Unit;

public sealed class CsvTests
{
    private static string[] Lines(byte[] content)
    {
        var preamble = Encoding.UTF8.GetPreamble();
        Assert.True(content.Take(preamble.Length).SequenceEqual(preamble));
        var text = Encoding.UTF8.GetString(content, preamble.Length, content.Length - preamble.Length);
        return text.Split('\n', StringSplitOptions.RemoveEmptyEntries).Select(x => x.TrimEnd('\r')).ToArray();
    }

    [Fact]
    public void Build_writes_bom_header_and_rows()
    {
        var lines = Lines(Csv.Build(new[] { "A", "B" }, new[] { new object?[] { "x", 1 }, new object?[] { "y", 2 } }));

        Assert.Equal(new[] { "A,B", "x,1", "y,2" }, lines);
    }

    [Fact]
    public void Cells_with_commas_quotes_or_newlines_are_quoted()
    {
        var lines = Lines(Csv.Build(new[] { "Text" }, new[] { new object?[] { "a,b" }, new object?[] { "say \"hi\"" } }));

        Assert.Equal("\"a,b\"", lines[1]);
        Assert.Equal("\"say \"\"hi\"\"\"", lines[2]);
    }

    [Theory]
    [InlineData("=SUM(A1:A2)", "'=SUM(A1:A2)")]
    [InlineData("+911234", "'+911234")]
    [InlineData("-5", "'-5")]
    [InlineData("@cmd", "'@cmd")]
    [InlineData("plain", "plain")]
    public void Formula_like_strings_are_escaped(string value, string expected)
    {
        var lines = Lines(Csv.Build(new[] { "V" }, new[] { new object?[] { value } }));

        Assert.Equal(expected, lines[1]);
    }

    [Fact]
    public void Negative_numbers_are_not_escaped()
    {
        var lines = Lines(Csv.Build(new[] { "V" }, new[] { new object?[] { -5 } }));

        Assert.Equal("-5", lines[1]);
    }

    [Fact]
    public void Dates_numbers_and_nulls_use_invariant_format()
    {
        var row = new object?[]
        {
            new DateTime(2026, 11, 24, 9, 5, 0, DateTimeKind.Utc),
            new DateOnly(2026, 1, 2),
            1.5m,
            null
        };

        var lines = Lines(Csv.Build(new[] { "When", "Day", "Kg", "Empty" }, new[] { row }));

        Assert.Equal("2026-11-24 09:05,2026-01-02,1.5,", lines[1]);
    }
}
