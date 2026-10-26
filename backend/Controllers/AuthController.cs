using System.Collections.Concurrent;
using System.Security.Claims;
using backend.Data;
using backend.DTOs;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/v1/auth")]
public sealed class AuthController : ControllerBase
{
    private readonly AppDbContext _dbContext;
    private readonly Fast2SmsOtpService _otpService;
    private readonly JwtService _jwtService;
    private readonly IConfiguration _configuration;
    private static readonly ConcurrentDictionary<string, DateTime> LoginRequestTimes = new();
    private static readonly ConcurrentDictionary<string, int> LoginRequestCounts = new();

    public AuthController(AppDbContext dbContext, Fast2SmsOtpService otpService, JwtService jwtService, IConfiguration configuration)
    {
        _dbContext = dbContext;
        _otpService = otpService;
        _jwtService = jwtService;
        _configuration = configuration;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        var normalized = NormalizeMobileNumber(request.MobileNumber);
        if (!IsValidIndianMobileNumber(normalized))
        {
            return BadRequest(new { message = "Enter a valid 10-digit Indian mobile number." });
        }

        if (request.DateOfBirth > DateOnly.FromDateTime(DateTime.UtcNow))
        {
            return BadRequest(new { message = "Date of birth cannot be in the future." });
        }

        if (!Enum.IsDefined(request.UserType) || request.UserType != UserType.Devotee)
        {
            return BadRequest(new { message = "Public registration is limited to the Devotee user type." });
        }

        var user = await _dbContext.Users.FirstOrDefaultAsync(x => x.NormalizedMobileNumber == normalized);
        if (user is not null)
        {
            return Conflict(new { message = "An account already exists for this mobile number." });
        }

        var expiryMinutes = GetExpiryMinutes();
        var challenge = await _dbContext.RegistrationChallenges.FirstOrDefaultAsync(x => x.NormalizedMobileNumber == normalized);
        if (challenge is null)
        {
            challenge = new RegistrationChallenge
            {
                Id = Guid.NewGuid(),
                MobileNumber = normalized,
                NormalizedMobileNumber = normalized,
                FullName = request.FullName.Trim(),
                DateOfBirth = request.DateOfBirth,
                State = request.State.Trim(),
                City = request.City.Trim(),
                Pin = request.Pin,
                Address = request.Address.Trim(),
                UserType = UserType.Devotee,
                ExpiresAtUtc = DateTime.UtcNow.AddMinutes(expiryMinutes),
                CreatedAtUtc = DateTime.UtcNow,
                UpdatedAtUtc = DateTime.UtcNow,
                IsConsumed = false,
                ResendCount = 0
            };

            _dbContext.RegistrationChallenges.Add(challenge);
        }
        else
        {
            challenge.MobileNumber = normalized;
            challenge.NormalizedMobileNumber = normalized;
            challenge.FullName = request.FullName.Trim();
            challenge.DateOfBirth = request.DateOfBirth;
            challenge.State = request.State.Trim();
            challenge.City = request.City.Trim();
            challenge.Pin = request.Pin;
            challenge.Address = request.Address.Trim();
            challenge.UserType = UserType.Devotee;
            challenge.ExpiresAtUtc = DateTime.UtcNow.AddMinutes(expiryMinutes);
            challenge.UpdatedAtUtc = DateTime.UtcNow;
            challenge.IsConsumed = false;
            challenge.ResendCount += 1;
        }

        await _dbContext.SaveChangesAsync();

        var result = await _otpService.SendOtpAsync(normalized);
        if (!result.IsSuccess)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = result.Message });
        }

        return Ok(new { message = "An OTP has been sent. Verify it to complete your registration.", requiresOtpVerification = true });
    }

    [HttpPost("register/verify-otp")]
    public async Task<IActionResult> RegisterVerifyOtp([FromBody] VerifyOtpRequest request)
    {
        var normalized = NormalizeMobileNumber(request.MobileNumber);
        if (!IsValidIndianMobileNumber(normalized))
        {
            return BadRequest(new { message = "Enter a valid 10-digit Indian mobile number." });
        }

        if (string.IsNullOrWhiteSpace(request.Otp) || request.Otp.Trim().Length != 6 || !request.Otp.All(char.IsDigit))
        {
            return BadRequest(new { message = "Enter a valid 6-digit OTP." });
        }

        var challenge = await _dbContext.RegistrationChallenges.FirstOrDefaultAsync(x => x.NormalizedMobileNumber == normalized && !x.IsConsumed);
        if (challenge is null)
        {
            return BadRequest(new { message = "No active registration challenge found." });
        }

        if (challenge.ExpiresAtUtc < DateTime.UtcNow)
        {
            challenge.IsConsumed = true;
            challenge.UpdatedAtUtc = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync();
            return BadRequest(new { message = "The OTP has expired. Please request a new one." });
        }

        if (challenge.FullName is null || challenge.State is null ||
            challenge.City is null || challenge.Pin is null || challenge.Address is null)
        {
            return BadRequest(new { message = "Registration details are incomplete. Please start registration again." });
        }

        var verificationResult = await _otpService.VerifyOtpAsync(normalized, request.Otp);
        if (!verificationResult.IsSuccess)
        {
            return BadRequest(new { message = verificationResult.Message });
        }

        var user = await _dbContext.Users.FirstOrDefaultAsync(x => x.NormalizedMobileNumber == normalized);
        if (user is null)
        {
            user = new User
            {
                Id = Guid.NewGuid(),
                MobileNumber = normalized,
                NormalizedMobileNumber = normalized,
                FullName = challenge.FullName,
                DateOfBirth = challenge.DateOfBirth,
                State = challenge.State,
                City = challenge.City,
                Pin = challenge.Pin,
                Address = challenge.Address,
                UserType = challenge.UserType,
                MobileVerified = true,
                AccountStatus = "Active",
                CreatedAtUtc = DateTime.UtcNow,
                UpdatedAtUtc = DateTime.UtcNow,
                LastLoginAtUtc = null
            };

            _dbContext.Users.Add(user);
        }
        else
        {
            user.MobileVerified = true;
            user.AccountStatus = "Active";
            user.UpdatedAtUtc = DateTime.UtcNow;
        }

        challenge.IsConsumed = true;
        challenge.UpdatedAtUtc = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync();

        var token = _jwtService.CreateToken(user);
        var response = new AuthResponse
        {
            AccessToken = token,
            ExpiresAtUtc = DateTime.UtcNow.AddMinutes(GetExpiryMinutes()),
            UserId = user.Id.ToString(),
            MobileNumber = user.MobileNumber,
            FullName = user.FullName,
            DateOfBirth = user.DateOfBirth,
            State = user.State,
            City = user.City,
            Pin = user.Pin,
            Address = user.Address,
            UserType = user.UserType,
            MobileVerified = user.MobileVerified,
            AccountStatus = user.AccountStatus,
            CreatedAtUtc = user.CreatedAtUtc
        };

        return Ok(response);
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var normalized = NormalizeMobileNumber(request.MobileNumber);
        if (!IsValidIndianMobileNumber(normalized))
        {
            return BadRequest(new { message = "Enter a valid 10-digit Indian mobile number." });
        }

        var user = await _dbContext.Users.FirstOrDefaultAsync(x => x.NormalizedMobileNumber == normalized);
        if (user is null)
        {
            return Ok(new { message = "If this number is registered, an OTP has been sent." });
        }

        if (user.AccountStatus != "Active")
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "This account is not active." });
        }

        if (!IsLoginRequestAllowed(normalized))
        {
            return StatusCode(StatusCodes.Status429TooManyRequests, new { message = "Too many OTP attempts. Please try again later." });
        }

        var otpResult = await _otpService.SendOtpAsync(normalized);
        if (!otpResult.IsSuccess)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = otpResult.Message });
        }

        return Ok(new { message = "If this number is registered, an OTP has been sent." });
    }

    [HttpPost("login/verify-otp")]
    public async Task<IActionResult> LoginVerifyOtp([FromBody] VerifyOtpRequest request)
    {
        var normalized = NormalizeMobileNumber(request.MobileNumber);
        if (!IsValidIndianMobileNumber(normalized))
        {
            return BadRequest(new { message = "Enter a valid 10-digit Indian mobile number." });
        }

        if (string.IsNullOrWhiteSpace(request.Otp) || request.Otp.Trim().Length != 6 || !request.Otp.All(char.IsDigit))
        {
            return BadRequest(new { message = "Enter a valid 6-digit OTP." });
        }

        var user = await _dbContext.Users.FirstOrDefaultAsync(x => x.NormalizedMobileNumber == normalized);
        if (user is null || user.AccountStatus != "Active")
        {
            return BadRequest(new { message = "Account not found or inactive." });
        }

        var verificationResult = await _otpService.VerifyOtpAsync(normalized, request.Otp);
        if (!verificationResult.IsSuccess)
        {
            return BadRequest(new { message = verificationResult.Message });
        }

        user.LastLoginAtUtc = DateTime.UtcNow;
        user.UpdatedAtUtc = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync();

        var token = _jwtService.CreateToken(user);
        var response = new AuthResponse
        {
            AccessToken = token,
            ExpiresAtUtc = DateTime.UtcNow.AddMinutes(GetExpiryMinutes()),
            UserId = user.Id.ToString(),
            MobileNumber = user.MobileNumber,
            FullName = user.FullName,
            DateOfBirth = user.DateOfBirth,
            State = user.State,
            City = user.City,
            Pin = user.Pin,
            Address = user.Address,
            UserType = user.UserType,
            MobileVerified = user.MobileVerified,
            AccountStatus = user.AccountStatus,
            CreatedAtUtc = user.CreatedAtUtc
        };

        return Ok(response);
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> GetCurrentUser()
    {
        var userIdClaim = User.FindFirst("user_id") ?? User.FindFirst(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdClaim?.Value, out var userId))
        {
            return Unauthorized();
        }

        var user = await _dbContext.Users.FirstOrDefaultAsync(x => x.Id == userId);
        if (user is null)
        {
            return NotFound(new { message = "User not found." });
        }

        return Ok(new
        {
            userId = user.Id,
            mobileNumber = MaskMobileNumber(user.MobileNumber),
            fullName = user.FullName,
            dateOfBirth = user.DateOfBirth,
            state = user.State,
            city = user.City,
            pin = user.Pin,
            address = user.Address,
            userType = user.UserType,
            mobileVerified = user.MobileVerified,
            accountStatus = user.AccountStatus,
            createdAtUtc = user.CreatedAtUtc
        });
    }

    [Authorize]
    [HttpPost("logout")]
    public IActionResult Logout()
    {
        return Ok(new { success = true, message = "Logout successful. Please clear the stored access token on the client." });
    }

    private static string NormalizeMobileNumber(string? value)
    {
        return new string((value ?? string.Empty).Trim().Where(char.IsDigit).ToArray());
    }

    private static bool IsValidIndianMobileNumber(string mobile)
    {
        return mobile.Length == 10 && (mobile.StartsWith("6") || mobile.StartsWith("7") || mobile.StartsWith("8") || mobile.StartsWith("9"));
    }

    private static string MaskMobileNumber(string mobile)
    {
        if (string.IsNullOrWhiteSpace(mobile) || mobile.Length < 4)
        {
            return "********";
        }

        return $"******{mobile[^3..]}";
    }

    private int GetExpiryMinutes()
    {
        var configuredValue = _configuration["Otp:ExpiryMinutes"] ?? _configuration["OTP_EXPIRY_MINUTES"] ?? _configuration["Fast2Sms:OtpExpiryMinutes"] ?? "5";
        return int.TryParse(configuredValue, out var expiryMinutes) ? expiryMinutes : 5;
    }

    private bool IsLoginRequestAllowed(string mobile)
    {
        var now = DateTime.UtcNow;
        var window = TimeSpan.FromMinutes(10);
        var maxRequests = 3;
        var key = NormalizeMobileNumber(mobile);

        if (!LoginRequestTimes.TryGetValue(key, out var lastAttempt))
        {
            LoginRequestTimes[key] = now;
            LoginRequestCounts[key] = 1;
            return true;
        }

        var requestCount = LoginRequestCounts.GetOrAdd(key, 1);
        if ((now - lastAttempt) > window)
        {
            LoginRequestTimes[key] = now;
            LoginRequestCounts[key] = 1;
            return true;
        }

        if (requestCount >= maxRequests)
        {
            return false;
        }

        LoginRequestTimes[key] = now;
        LoginRequestCounts[key] = requestCount + 1;
        return true;
    }
}
