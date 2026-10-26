namespace backend.DTOs;

public sealed class VerifyOtpRequest
{
    public string MobileNumber { get; set; } = string.Empty;
    public string Otp { get; set; } = string.Empty;
}
