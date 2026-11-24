using System.Net;
using backend.Services;
using Flower2Flower.Tests.Support;

namespace Flower2Flower.Tests.Unit;

public sealed class OtpServiceTests
{
    private static int _counter = Random.Shared.Next(10000000, 50000000);

    private static string NewMobile() => $"9{Interlocked.Increment(ref _counter):D9}";

    private static Fast2SmsOtpService DevService(string environment = "Development") => new(
        new StubHttpClientFactory(StubHttpHandler.Throws(new InvalidOperationException("HTTP must not be called"))),
        TestConfig.From(("OTP_DEV_CODE", "123456")),
        new FakeHostEnvironment(environment));

    private static Fast2SmsOtpService LiveService(HttpMessageHandler handler, string? apiKey = "key", string? templateId = "tpl") => new(
        new StubHttpClientFactory(handler),
        TestConfig.From(("Fast2Sms:ApiKey", apiKey), ("Fast2Sms:OtpTemplateId", templateId)),
        new FakeHostEnvironment("Production"));

    [Fact]
    public void Dev_code_is_used_only_in_development()
    {
        Assert.True(DevService().UsesDevelopmentCode);
        Assert.False(DevService("Production").UsesDevelopmentCode);
    }

    [Fact]
    public async Task Dev_send_succeeds_without_calling_sms_provider()
    {
        var result = await DevService().SendOtpAsync(NewMobile());

        Assert.True(result.IsSuccess);
    }

    [Fact]
    public async Task Dev_verify_accepts_only_the_dev_code()
    {
        var service = DevService();
        var mobile = NewMobile();

        Assert.True((await service.VerifyOtpAsync(mobile, " 123456 ")).IsSuccess);
        var wrong = await service.VerifyOtpAsync(mobile, "654321");
        Assert.False(wrong.IsSuccess);
        Assert.Equal("Invalid or expired OTP.", wrong.Message);
    }

    [Theory]
    [InlineData("12345")]
    [InlineData("5123456789")]
    [InlineData("")]
    public async Task Send_rejects_invalid_numbers(string mobile)
    {
        var result = await DevService().SendOtpAsync(mobile);

        Assert.False(result.IsSuccess);
        Assert.Equal("Invalid mobile number.", result.Message);
    }

    [Fact]
    public async Task Verify_rejects_empty_code()
    {
        var result = await DevService().VerifyOtpAsync(NewMobile(), " ");

        Assert.False(result.IsSuccess);
        Assert.Equal("Invalid OTP request.", result.Message);
    }

    [Fact]
    public async Task Send_fails_when_provider_is_not_configured()
    {
        var result = await LiveService(StubHttpHandler.Json("{}"), apiKey: null).SendOtpAsync(NewMobile());

        Assert.False(result.IsSuccess);
        Assert.Equal("OTP service is not configured.", result.Message);
    }

    [Fact]
    public async Task Send_fails_without_template_id()
    {
        var result = await LiveService(StubHttpHandler.Json("{}"), templateId: null).SendOtpAsync(NewMobile());

        Assert.Equal("OTP service is not configured.", result.Message);
    }

    [Fact]
    public async Task Live_send_posts_to_provider_and_succeeds()
    {
        var handler = StubHttpHandler.Json("{\"return\":true}");
        var mobile = NewMobile();

        var result = await LiveService(handler).SendOtpAsync(mobile);

        Assert.True(result.IsSuccess);
        Assert.Equal("/dev/otp/send", Assert.Single(handler.Paths));
        Assert.Contains(mobile, handler.Bodies[0]);
        Assert.Contains("\"otp_id\":\"tpl\"", handler.Bodies[0]);
    }

    [Fact]
    public async Task Second_send_within_cooldown_is_blocked()
    {
        var service = LiveService(StubHttpHandler.Json("{\"return\":true}"));
        var mobile = NewMobile();

        Assert.True((await service.SendOtpAsync(mobile)).IsSuccess);
        var second = await service.SendOtpAsync(mobile);

        Assert.False(second.IsSuccess);
        Assert.Equal("Too many OTP requests. Please try again later.", second.Message);
        Assert.False(service.IsRequestAllowed(mobile));
    }

    [Fact]
    public void New_number_is_allowed()
    {
        Assert.True(DevService().IsRequestAllowed(NewMobile()));
    }

    [Fact]
    public async Task Provider_message_is_returned_when_send_is_refused()
    {
        var result = await LiveService(StubHttpHandler.Json("{\"return\":false,\"message\":\"Invalid template\"}")).SendOtpAsync(NewMobile());

        Assert.False(result.IsSuccess);
        Assert.Equal("Invalid template", result.Message);
    }

    [Fact]
    public async Task Provider_http_error_returns_friendly_message()
    {
        var result = await LiveService(StubHttpHandler.Json("{}", HttpStatusCode.InternalServerError)).SendOtpAsync(NewMobile());

        Assert.Equal("Unable to send OTP right now.", result.Message);
    }

    [Fact]
    public async Task Network_failure_returns_unavailable_message()
    {
        var result = await LiveService(StubHttpHandler.Throws(new HttpRequestException("down"))).SendOtpAsync(NewMobile());

        Assert.Equal("OTP service is temporarily unavailable.", result.Message);
    }

    [Fact]
    public async Task Timeout_returns_timeout_message()
    {
        var result = await LiveService(StubHttpHandler.Throws(new TaskCanceledException())).SendOtpAsync(NewMobile());

        Assert.Equal("OTP request timed out.", result.Message);
    }

    [Fact]
    public async Task Live_verify_succeeds_when_provider_confirms()
    {
        var handler = StubHttpHandler.Json("{\"return\":true}");

        var result = await LiveService(handler).VerifyOtpAsync(NewMobile(), "123456");

        Assert.True(result.IsSuccess);
        Assert.Equal("/dev/otp/verify", Assert.Single(handler.Paths));
    }

    [Fact]
    public async Task Live_verify_fails_on_http_error()
    {
        var result = await LiveService(StubHttpHandler.Json("{}", HttpStatusCode.BadRequest)).VerifyOtpAsync(NewMobile(), "123456");

        Assert.False(result.IsSuccess);
        Assert.Equal("Invalid or expired OTP.", result.Message);
    }

    [Fact]
    public async Task Live_verify_without_api_key_is_not_configured()
    {
        var result = await LiveService(StubHttpHandler.Json("{}"), apiKey: null).VerifyOtpAsync(NewMobile(), "123456");

        Assert.Equal("OTP service is not configured.", result.Message);
    }

    [Fact]
    public async Task Resend_calls_resend_endpoint()
    {
        var handler = StubHttpHandler.Json("{\"return\":true}");

        var result = await LiveService(handler).ResendOtpAsync(NewMobile());

        Assert.True(result.IsSuccess);
        Assert.Equal("/dev/otp/resend", Assert.Single(handler.Paths));
    }

    [Theory]
    [InlineData(" 98765 43210 ", "9876543210")]
    [InlineData("+91-98765-43210", "919876543210")]
    public void NormalizeMobileNumber_keeps_digits_only(string input, string expected)
    {
        Assert.Equal(expected, DevService().NormalizeMobileNumber(input));
    }
}
