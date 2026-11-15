using backend.Data;
using backend.DTOs;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers.Admin;

[Authorize(Roles = Roles.Admin)]
[Route("api/v1/admin/staff")]
public sealed class AdminStaffController : ApiControllerBase
{
    private static readonly UserType[] StaffTypes = { UserType.Admin, UserType.SuperAdmin, UserType.Operator, UserType.TempleAdmin };

    private readonly AppDbContext _dbContext;
    private readonly AuditService _audit;

    public AdminStaffController(AppDbContext dbContext, AuditService audit)
    {
        _dbContext = dbContext;
        _audit = audit;
    }

    [HttpGet]
    public async Task<IActionResult> GetList([FromQuery] StaffRole? role, [FromQuery] string? q, CancellationToken cancellationToken)
    {
        var query = _dbContext.Users.AsNoTracking().Where(x => StaffTypes.Contains(x.UserType));
        if (role.HasValue)
        {
            var types = role.Value == StaffRole.Admin ? new[] { UserType.Admin, UserType.SuperAdmin } : new[] { Roles.FromStaffRole(role.Value) };
            query = query.Where(x => types.Contains(x.UserType));
        }

        var term = (q ?? string.Empty).Trim();
        if (term.Length > 0)
        {
            var pattern = $"%{term}%";
            query = query.Where(x => EF.Functions.ILike(x.FullName ?? string.Empty, pattern) || x.MobileNumber.Contains(term));
        }

        var staff = await query.OrderBy(x => x.FullName).ToListAsync(cancellationToken);
        return Ok(staff.Select(View).ToList());
    }

    [HttpPost]
    public async Task<IActionResult> Invite([FromBody] InviteStaffRequest request, CancellationToken cancellationToken)
    {
        var me = await GetCurrentUserAsync(_dbContext);
        if (me is null)
        {
            return NotSignedIn();
        }

        var mobile = Mobile.Normalize(request.MobileNumber);
        if (!Mobile.IsValid(mobile))
        {
            return Error("Enter a valid 10 digit mobile number.");
        }

        if (await _dbContext.Users.AnyAsync(x => x.NormalizedMobileNumber == mobile, cancellationToken))
        {
            return Error("An account already exists for this mobile number.", StatusCodes.Status409Conflict);
        }

        var user = new User
        {
            Id = Guid.NewGuid(),
            MobileNumber = mobile,
            NormalizedMobileNumber = mobile,
            FullName = request.FullName.Trim(),
            UserType = Roles.FromStaffRole(request.Role),
            MobileVerified = false,
            AccountStatus = "Active",
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        };
        _dbContext.Users.Add(user);
        _audit.Add(me, "Staff invited", user.FullName, "None", $"{request.Role}, active", "Users and roles");
        await _dbContext.SaveChangesAsync(cancellationToken);

        return StatusCode(StatusCodes.Status201Created, View(user));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateStaffRequest request, CancellationToken cancellationToken)
    {
        var me = await GetCurrentUserAsync(_dbContext);
        if (me is null)
        {
            return NotSignedIn();
        }

        var user = await _dbContext.Users.FirstOrDefaultAsync(x => x.Id == id && StaffTypes.Contains(x.UserType), cancellationToken);
        if (user is null)
        {
            return Error("Staff member not found.", StatusCodes.Status404NotFound);
        }

        if (user.UserType == UserType.SuperAdmin && me.UserType != UserType.SuperAdmin)
        {
            return Error("Only a super admin can change this account.", StatusCodes.Status403Forbidden);
        }

        if (user.Id == me.Id && (request.Status == "suspended" || (request.Role.HasValue && request.Role.Value != StaffRole.Admin)))
        {
            return Error("You cannot suspend or demote your own account.", StatusCodes.Status409Conflict);
        }

        var before = $"{Roles.ToStaffRole(user.UserType)}, {user.AccountStatus.ToLowerInvariant()}";
        if (!string.IsNullOrWhiteSpace(request.FullName))
        {
            user.FullName = request.FullName.Trim();
        }

        if (request.Role.HasValue && !(user.UserType == UserType.SuperAdmin && request.Role.Value == StaffRole.Admin))
        {
            user.UserType = Roles.FromStaffRole(request.Role.Value);
        }

        if (request.Status is not null)
        {
            user.AccountStatus = request.Status == "suspended" ? "Suspended" : "Active";
        }

        user.UpdatedAtUtc = DateTime.UtcNow;
        var after = $"{Roles.ToStaffRole(user.UserType)}, {user.AccountStatus.ToLowerInvariant()}";
        _audit.Add(me, "Role changed", user.FullName ?? Mobile.Mask(user.MobileNumber), before, after, "Users and roles");
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(View(user));
    }

    private static object View(User user)
    {
        return new
        {
            id = user.Id,
            name = user.FullName,
            mobileNumber = user.MobileNumber,
            role = Roles.ToStaffRole(user.UserType),
            userType = user.UserType,
            status = user.AccountStatus == "Active" ? "active" : "suspended",
            lastLoginAtUtc = user.LastLoginAtUtc,
            createdAtUtc = user.CreatedAtUtc
        };
    }
}
