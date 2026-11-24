using System.Net;
using System.Net.Http.Headers;
using Flower2Flower.Tests.Support;

namespace Flower2Flower.Tests.Integration;

[Collection(ApiCollection.Name)]
public sealed class AuthTests
{
    private readonly ApiFactory _api;

    public AuthTests(ApiFactory api)
    {
        _api = api;
    }

    [Theory]
    [InlineData("12345")]
    [InlineData("5123456789")]
    [InlineData("")]
    public async Task Login_rejects_invalid_mobile(string mobile)
    {
        var message = await _api.Anonymous().PostJson("/api/v1/auth/login", new { mobileNumber = mobile }).ExpectError(HttpStatusCode.BadRequest);

        Assert.Equal("Enter a valid 10-digit Indian mobile number.", message);
    }

    [Fact]
    public async Task Login_sends_otp_without_revealing_if_number_exists()
    {
        var body = await _api.Anonymous().PostJson("/api/v1/auth/login", new { mobileNumber = ApiFactory.NewMobile() }).Expect();

        Assert.Equal("If this number is registered, an OTP has been sent.", body.Str("message"));
    }

    [Fact]
    public async Task Verify_rejects_wrong_otp()
    {
        var message = await _api.Anonymous().PostJson("/api/v1/auth/login/verify-otp", new { mobileNumber = ApiFactory.NewMobile(), otp = "000000" }).ExpectError(HttpStatusCode.BadRequest);

        Assert.Equal("Invalid or expired OTP.", message);
    }

    [Theory]
    [InlineData("12345")]
    [InlineData("1234567")]
    [InlineData("12a456")]
    [InlineData("")]
    public async Task Verify_rejects_badly_formed_otp(string otp)
    {
        var message = await _api.Anonymous().PostJson("/api/v1/auth/login/verify-otp", new { mobileNumber = ApiFactory.NewMobile(), otp }).ExpectError(HttpStatusCode.BadRequest);

        Assert.Equal("Enter a valid 6-digit OTP.", message);
    }

    [Fact]
    public async Task Verify_without_create_account_refuses_unknown_number()
    {
        var message = await _api.Anonymous().PostJson("/api/v1/auth/login/verify-otp", new { mobileNumber = ApiFactory.NewMobile(), otp = ApiFactory.Otp, createAccount = false }).ExpectError(HttpStatusCode.BadRequest);

        Assert.Equal("No account found for this number.", message);
    }

    [Fact]
    public async Task First_verify_creates_devotee_and_second_signs_in()
    {
        var mobile = ApiFactory.NewMobile();
        var client = _api.Anonymous();

        var first = await client.PostJson("/api/v1/auth/login/verify-otp", new { mobileNumber = mobile, otp = ApiFactory.Otp }).Expect();
        var second = await client.PostJson("/api/v1/auth/login/verify-otp", new { mobileNumber = mobile, otp = ApiFactory.Otp }).Expect();

        Assert.True(first.Bool("isNewUser"));
        Assert.False(first.Bool("profileComplete"));
        Assert.Equal("devotee", first.Str("userType"));
        Assert.True(first.Bool("mobileVerified"));
        Assert.False(string.IsNullOrWhiteSpace(first.Str("accessToken")));
        Assert.False(second.Bool("isNewUser"));
        Assert.Equal(first.Str("userId"), second.Str("userId"));
    }

    [Fact]
    public async Task Mobile_with_country_code_and_spaces_is_normalized()
    {
        var body = await _api.Anonymous().PostJson("/api/v1/auth/login/verify-otp", new { mobileNumber = " 98765 41234 ", otp = ApiFactory.Otp }).Expect();

        Assert.Equal(ApiFactory.DevoteeMobile, body.Str("mobileNumber"));
    }

    [Theory]
    [InlineData(ApiFactory.SuperAdminMobile, "superAdmin")]
    [InlineData(ApiFactory.AdminMobile, "admin")]
    [InlineData(ApiFactory.OperatorMobile, "operator")]
    [InlineData(ApiFactory.TempleAdminMobile, "templeAdmin")]
    [InlineData(ApiFactory.DevoteeMobile, "devotee")]
    public async Task Seeded_accounts_sign_in_with_their_role(string mobile, string userType)
    {
        var body = await _api.Anonymous().PostJson("/api/v1/auth/login/verify-otp", new { mobileNumber = mobile, otp = ApiFactory.Otp }).Expect();

        Assert.Equal(userType, body.Str("userType"));
        Assert.False(body.Bool("isNewUser"));
    }

    [Fact]
    public async Task Seeded_devotee_has_complete_profile()
    {
        var body = await _api.Anonymous().PostJson("/api/v1/auth/login/verify-otp", new { mobileNumber = ApiFactory.DevoteeMobile, otp = ApiFactory.Otp }).Expect();

        Assert.True(body.Bool("profileComplete"));
        Assert.Equal("Sunita", body.Str("fullName"));
    }

    [Fact]
    public async Task Me_requires_a_token()
    {
        await _api.Anonymous().GetAsync("/api/v1/auth/me").ExpectStatus(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Me_rejects_a_garbage_token()
    {
        var client = _api.Anonymous();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", "not.a.token");

        await client.GetAsync("/api/v1/auth/me").ExpectStatus(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Me_returns_masked_mobile()
    {
        var mobile = ApiFactory.NewMobile();
        var client = await _api.SignInAsync(mobile);

        var me = await client.GetAsync("/api/v1/auth/me").Expect();

        Assert.Equal($"******{mobile[^3..]}", me.Str("mobileNumber"));
        Assert.Equal("Active", me.Str("accountStatus"));
    }

    [Fact]
    public async Task Logout_succeeds_for_signed_in_user()
    {
        var client = await _api.SignInAsync(ApiFactory.NewMobile());

        var body = await client.PostJson("/api/v1/auth/logout").Expect();

        Assert.True(body.Bool("success"));
    }

    [Fact]
    public async Task Logout_requires_a_token()
    {
        await _api.Anonymous().PostJson("/api/v1/auth/logout").ExpectStatus(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Register_then_verify_creates_account_with_details()
    {
        var mobile = ApiFactory.NewMobile();
        var client = _api.Anonymous();

        var started = await client.PostJson("/api/v1/auth/register", new { mobileNumber = mobile, fullName = "  Asha Verma ", dateOfBirth = "1988-01-10", state = "UP", city = "Ghaziabad", pin = 201014, address = "Niti Khand" }).Expect();
        var done = await client.PostJson("/api/v1/auth/register/verify-otp", new { mobileNumber = mobile, otp = ApiFactory.Otp }).Expect();

        Assert.True(started.Bool("requiresOtpVerification"));
        Assert.Equal("Asha Verma", done.Str("fullName"));
        Assert.Equal("Ghaziabad", done.Str("city"));
        Assert.Equal(201014, done.Int("pin"));
        Assert.Equal("devotee", done.Str("userType"));
    }

    [Fact]
    public async Task Register_rejects_existing_number()
    {
        var message = await _api.Anonymous().PostJson("/api/v1/auth/register", new { mobileNumber = ApiFactory.DevoteeMobile, fullName = "Copy", state = "UP", city = "Ghaziabad", pin = 201014, address = "X" }).ExpectError(HttpStatusCode.Conflict);

        Assert.Equal("An account already exists for this mobile number.", message);
    }

    [Fact]
    public async Task Register_rejects_future_date_of_birth()
    {
        var future = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(5)).ToString("yyyy-MM-dd");

        var message = await _api.Anonymous().PostJson("/api/v1/auth/register", new { mobileNumber = ApiFactory.NewMobile(), fullName = "Late", dateOfBirth = future, state = "UP", city = "Ghaziabad", pin = 201014, address = "X" }).ExpectError(HttpStatusCode.BadRequest);

        Assert.Equal("Date of birth cannot be in the future.", message);
    }

    [Fact]
    public async Task Register_refuses_staff_user_types()
    {
        var message = await _api.Anonymous().PostJson("/api/v1/auth/register", new { mobileNumber = ApiFactory.NewMobile(), fullName = "Sneaky", state = "UP", city = "Ghaziabad", pin = 201014, address = "X", userType = "admin" }).ExpectError(HttpStatusCode.BadRequest);

        Assert.Equal("Public registration is limited to the Devotee user type.", message);
    }

    [Fact]
    public async Task Register_validates_required_fields_and_pin_range()
    {
        await _api.Anonymous().PostJson("/api/v1/auth/register", new { mobileNumber = ApiFactory.NewMobile(), fullName = "", state = "UP", city = "Ghaziabad", pin = 201014, address = "X" }).ExpectStatus(HttpStatusCode.BadRequest);
        await _api.Anonymous().PostJson("/api/v1/auth/register", new { mobileNumber = ApiFactory.NewMobile(), fullName = "A", state = "UP", city = "Ghaziabad", pin = 123, address = "X" }).ExpectStatus(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Register_verify_without_challenge_fails()
    {
        var message = await _api.Anonymous().PostJson("/api/v1/auth/register/verify-otp", new { mobileNumber = ApiFactory.NewMobile(), otp = ApiFactory.Otp }).ExpectError(HttpStatusCode.BadRequest);

        Assert.Equal("No active registration challenge found.", message);
    }

    [Fact]
    public async Task Register_verify_with_wrong_otp_keeps_challenge_open()
    {
        var mobile = ApiFactory.NewMobile();
        var client = _api.Anonymous();
        await client.PostJson("/api/v1/auth/register", new { mobileNumber = mobile, fullName = "Retry", state = "UP", city = "Ghaziabad", pin = 201014, address = "X" }).Expect();

        await client.PostJson("/api/v1/auth/register/verify-otp", new { mobileNumber = mobile, otp = "999999" }).ExpectStatus(HttpStatusCode.BadRequest);
        await client.PostJson("/api/v1/auth/register/verify-otp", new { mobileNumber = mobile, otp = ApiFactory.Otp }).ExpectStatus(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Suspended_account_cannot_sign_in()
    {
        var admin = await _api.SuperAdminAsync();
        var mobile = ApiFactory.NewMobile();
        var staff = await admin.PostJson("/api/v1/admin/staff", new { fullName = "Temp Operator", mobileNumber = mobile, role = "operator" }).Expect(HttpStatusCode.Created);
        await admin.PutJson($"/api/v1/admin/staff/{staff.Str("id")}", new { status = "suspended" }).Expect();

        var loginMessage = await _api.Anonymous().PostJson("/api/v1/auth/login", new { mobileNumber = mobile }).ExpectError(HttpStatusCode.Forbidden);
        var verifyMessage = await _api.Anonymous().PostJson("/api/v1/auth/login/verify-otp", new { mobileNumber = mobile, otp = ApiFactory.Otp }).ExpectError(HttpStatusCode.BadRequest);

        Assert.Equal("This account is not active.", loginMessage);
        Assert.Equal("This account is not active.", verifyMessage);
    }

    [Fact]
    public async Task Token_of_suspended_user_is_refused_by_protected_endpoints()
    {
        var admin = await _api.SuperAdminAsync();
        var mobile = ApiFactory.NewMobile();
        var staff = await admin.PostJson("/api/v1/admin/staff", new { fullName = "Soon Suspended", mobileNumber = mobile, role = "operator" }).Expect(HttpStatusCode.Created);
        var operatorClient = await _api.SignInAsync(mobile);
        await admin.PutJson($"/api/v1/admin/staff/{staff.Str("id")}", new { status = "suspended" }).Expect();

        var message = await operatorClient.GetAsync("/api/v1/me").ExpectError(HttpStatusCode.Unauthorized);

        Assert.Equal("Your session is not valid or the account is not active.", message);
    }
}
