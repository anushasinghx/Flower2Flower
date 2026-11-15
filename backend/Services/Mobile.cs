namespace backend.Services;

public static class Mobile
{
    public static string Normalize(string? value)
    {
        var digits = new string((value ?? string.Empty).Trim().Where(char.IsDigit).ToArray());
        if (digits.Length == 12 && digits.StartsWith("91"))
        {
            digits = digits[2..];
        }

        return digits;
    }

    public static bool IsValid(string normalized)
    {
        return normalized.Length == 10 && normalized[0] is '6' or '7' or '8' or '9';
    }

    public static string Mask(string? mobile)
    {
        if (string.IsNullOrWhiteSpace(mobile) || mobile.Length < 4)
        {
            return "******";
        }

        return $"******{mobile[^4..]}";
    }

    public static string MaskDocument(string? value)
    {
        var compact = new string((value ?? string.Empty).Where(c => !char.IsWhiteSpace(c)).ToArray());
        return compact.Length < 4 ? "XXXX" : $"XXXX XXXX {compact[^4..]}";
    }

    public static int AgeOn(DateOnly dateOfBirth, DateOnly today)
    {
        var age = today.Year - dateOfBirth.Year;
        if (dateOfBirth > today.AddYears(-age))
        {
            age--;
        }

        return age;
    }
}
