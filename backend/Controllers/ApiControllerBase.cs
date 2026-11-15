using System.Security.Claims;
using backend.Data;
using backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Produces("application/json")]
public abstract class ApiControllerBase : ControllerBase
{
    protected Guid? CurrentUserId
    {
        get
        {
            var value = User.FindFirst("user_id")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            return Guid.TryParse(value, out var id) ? id : null;
        }
    }

    protected async Task<User?> GetCurrentUserAsync(AppDbContext dbContext)
    {
        var userId = CurrentUserId;
        if (userId is null)
        {
            return null;
        }

        return await dbContext.Users.FirstOrDefaultAsync(x => x.Id == userId.Value && x.AccountStatus == "Active", HttpContext.RequestAborted);
    }

    protected ObjectResult Error(string message, int statusCode = StatusCodes.Status400BadRequest)
    {
        return StatusCode(statusCode, new { message });
    }

    protected ObjectResult NotSignedIn()
    {
        return Error("Your session is not valid or the account is not active.", StatusCodes.Status401Unauthorized);
    }

    protected static (int Page, int PageSize) Paging(int? page, int? pageSize, int defaultSize = 20)
    {
        var safePage = Math.Max(1, page ?? 1);
        var safeSize = Math.Clamp(pageSize ?? defaultSize, 1, 200);
        return (safePage, safeSize);
    }
}
