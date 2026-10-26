using System.Collections.Concurrent;
using System.Text;
using System.Text.Json;

namespace backend.Services;

public sealed class Fast2SmsOtpService
{
    private readonly IHttpClientFactory _clientFactory;
    private readonly IConfiguration _configuration;
    private readonly ConcurrentDictionary<string, DateTime> _lastOtpRequestAt = new();
    private readonly ConcurrentDictionary<string, int> _otpRequestCount = new();
    private static readonly TimeSpan AllowedWindow = TimeSpan.FromMinutes(10);
    private static readonly int MaxRequestsPerWindow = 5;
    private static readonly TimeSpan CooldownWindow = TimeSpan.FromSeconds(30);

    public Fast2SmsOtpService(IHttpClientFactory clientFactory, IConfiguration configuration)
    {
        _clientFactory = clientFactory;
        _configuration = configuration;
    }

    public string NormalizeMobileNumber(string mobile)
    {
        return new string((mobile ?? string.Empty).Trim().Where(char.IsDigit).ToArray());
    }

    public bool IsIndianMobileNumber(string mobile)
    {
        var normalized = NormalizeMobileNumber(mobile);
        return normalized.Length == 10 &&
               (normalized.StartsWith("9") || normalized.StartsWith("8") || normalized.StartsWith("7") || normalized.StartsWith("6"));
    }

    public bool IsRequestAllowed(string mobile)
    {
        var normalized = NormalizeMobileNumber(mobile);
        var now = DateTime.UtcNow;
        var lastRequest = _lastOtpRequestAt.GetOrAdd(normalized, now);
        if ((now - lastRequest) < CooldownWindow)
        {
            return false;
        }

        var requestCount = _otpRequestCount.GetOrAdd(normalized, 0);
        if ((now - lastRequest) <= AllowedWindow && requestCount >= MaxRequestsPerWindow)
        {
            return false;
        }

        if ((now - lastRequest) > AllowedWindow)
        {
            _otpRequestCount[normalized] = 0;
        }

        return true;
    }

    public async Task<OtpResult> SendOtpAsync(string mobile)
    {
        var normalized = NormalizeMobileNumber(mobile);
        if (!IsIndianMobileNumber(normalized))
        {
            return OtpResult.Failure("Invalid mobile number.");
        }

        var apiKey = _configuration["Fast2Sms:ApiKey"] ?? _configuration["FAST2SMS_API_KEY"];
        var templateId = _configuration["Fast2Sms:OtpTemplateId"] ?? _configuration["FAST2SMS_OTP_TEMPLATE_ID"];
        var otpExpiryMinutes = GetIntValue("Fast2Sms:OtpExpiryMinutes", "OTP_EXPIRY_MINUTES", 5);
        var otpLength = GetIntValue("Fast2Sms:OtpLength", "OTP_LENGTH", 6);

        if (string.IsNullOrWhiteSpace(apiKey) || string.IsNullOrWhiteSpace(templateId))
        {
            return OtpResult.Failure("OTP service is not configured.");
        }

        if (!IsRequestAllowed(normalized))
        {
            return OtpResult.Failure("Too many OTP requests. Please try again later.");
        }

        var client = _clientFactory.CreateClient("fast2sms");
        client.Timeout = TimeSpan.FromSeconds(20);
        client.BaseAddress = new Uri("https://www.fast2sms.com/");

        using var request = new HttpRequestMessage(HttpMethod.Post, "dev/otp/send");
        request.Headers.Add("Authorization", apiKey);
        request.Content = new StringContent(
            JsonSerializer.Serialize(new
            {
                mobile = normalized,
                otp_id = templateId,
                otp_expiry = otpExpiryMinutes,
                otp_length = otpLength,
                variables_values = "{otp}"
            }),
            Encoding.UTF8,
            "application/json");

        try
        {
            using var response = await client.SendAsync(request);
            var responseContent = await response.Content.ReadAsStringAsync();
            if (!response.IsSuccessStatusCode)
            {
                return OtpResult.Failure("Unable to send OTP right now.");
            }

            using var jsonDocument = JsonDocument.Parse(responseContent);
            if (jsonDocument.RootElement.TryGetProperty("return", out var returnValue) && returnValue.ValueKind == JsonValueKind.True)
            {
                _lastOtpRequestAt[normalized] = DateTime.UtcNow;
                _otpRequestCount[normalized] = _otpRequestCount.GetOrAdd(normalized, 0) + 1;
                return OtpResult.Success();
            }

            var message = jsonDocument.RootElement.TryGetProperty("message", out var messageValue) ? messageValue.GetString() : "Unable to send OTP right now.";
            return OtpResult.Failure(message ?? "Unable to send OTP right now.");
        }
        catch (TaskCanceledException)
        {
            return OtpResult.Failure("OTP request timed out.");
        }
        catch (HttpRequestException)
        {
            return OtpResult.Failure("OTP service is temporarily unavailable.");
        }
    }

    public async Task<OtpResult> VerifyOtpAsync(string mobile, string otp)
    {
        var normalized = NormalizeMobileNumber(mobile);
        if (!IsIndianMobileNumber(normalized) || string.IsNullOrWhiteSpace(otp))
        {
            return OtpResult.Failure("Invalid OTP request.");
        }

        var apiKey = _configuration["Fast2Sms:ApiKey"] ?? _configuration["FAST2SMS_API_KEY"];
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            return OtpResult.Failure("OTP service is not configured.");
        }

        var client = _clientFactory.CreateClient("fast2sms");
        client.Timeout = TimeSpan.FromSeconds(20);
        client.BaseAddress = new Uri("https://www.fast2sms.com/");

        using var request = new HttpRequestMessage(HttpMethod.Post, "dev/otp/verify");
        request.Headers.Add("Authorization", apiKey);
        request.Content = new StringContent(
            JsonSerializer.Serialize(new { mobile = normalized, otp = otp.Trim() }),
            Encoding.UTF8,
            "application/json");

        try
        {
            using var response = await client.SendAsync(request);
            var content = await response.Content.ReadAsStringAsync();
            if (!response.IsSuccessStatusCode)
            {
                return OtpResult.Failure("Invalid or expired OTP.");
            }

            using var jsonDocument = JsonDocument.Parse(content);
            if (jsonDocument.RootElement.TryGetProperty("return", out var returnValue) && returnValue.ValueKind == JsonValueKind.True)
            {
                return OtpResult.Success();
            }

            var message = jsonDocument.RootElement.TryGetProperty("message", out var messageValue) ? messageValue.GetString() : "Invalid or expired OTP.";
            return OtpResult.Failure(message ?? "Invalid or expired OTP.");
        }
        catch (TaskCanceledException)
        {
            return OtpResult.Failure("OTP verification timed out.");
        }
        catch (HttpRequestException)
        {
            return OtpResult.Failure("OTP service is temporarily unavailable.");
        }
    }

    public async Task<OtpResult> ResendOtpAsync(string mobile)
    {
        var normalized = NormalizeMobileNumber(mobile);
        if (!IsIndianMobileNumber(normalized))
        {
            return OtpResult.Failure("Invalid mobile number.");
        }

        var apiKey = _configuration["Fast2Sms:ApiKey"] ?? _configuration["FAST2SMS_API_KEY"];
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            return OtpResult.Failure("OTP service is not configured.");
        }

        var client = _clientFactory.CreateClient("fast2sms");
        client.Timeout = TimeSpan.FromSeconds(20);
        client.BaseAddress = new Uri("https://www.fast2sms.com/");

        using var request = new HttpRequestMessage(HttpMethod.Post, "dev/otp/resend");
        request.Headers.Add("Authorization", apiKey);
        request.Content = new StringContent(
            JsonSerializer.Serialize(new { mobile = normalized }),
            Encoding.UTF8,
            "application/json");

        try
        {
            using var response = await client.SendAsync(request);
            var content = await response.Content.ReadAsStringAsync();
            if (!response.IsSuccessStatusCode)
            {
                return OtpResult.Failure("Unable to resend OTP right now.");
            }

            using var jsonDocument = JsonDocument.Parse(content);
            if (jsonDocument.RootElement.TryGetProperty("return", out var returnValue) && returnValue.ValueKind == JsonValueKind.True)
            {
                _lastOtpRequestAt[normalized] = DateTime.UtcNow;
                _otpRequestCount[normalized] = _otpRequestCount.GetOrAdd(normalized, 0) + 1;
                return OtpResult.Success();
            }

            var message = jsonDocument.RootElement.TryGetProperty("message", out var messageValue) ? messageValue.GetString() : "Unable to resend OTP right now.";
            return OtpResult.Failure(message ?? "Unable to resend OTP right now.");
        }
        catch (TaskCanceledException)
        {
            return OtpResult.Failure("OTP resend timed out.");
        }
        catch (HttpRequestException)
        {
            return OtpResult.Failure("OTP service is temporarily unavailable.");
        }
    }

    private int GetIntValue(string key, string alternativeKey, int defaultValue)
    {
        var value = _configuration[key] ?? _configuration[alternativeKey];
        if (int.TryParse(value, out var result))
        {
            return result;
        }

        return defaultValue;
    }
}

public sealed class OtpResult
{
    public bool IsSuccess { get; private set; }
    public string Message { get; private set; } = string.Empty;

    public static OtpResult Success() => new() { IsSuccess = true, Message = "Success" };
    public static OtpResult Failure(string message) => new() { IsSuccess = false, Message = message };
}
