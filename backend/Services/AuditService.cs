using backend.Data;
using backend.Models;

namespace backend.Services;

public sealed class AuditService
{
    private readonly AppDbContext _dbContext;

    public AuditService(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public void Add(User? actor, string action, string record, string oldValue, string newValue, string reason)
    {
        _dbContext.AuditEntries.Add(new AuditEntry
        {
            Id = Guid.NewGuid(),
            CreatedAtUtc = DateTime.UtcNow,
            ActorUserId = actor?.Id,
            ActorName = actor?.FullName ?? (actor is null ? "System" : Mobile.Mask(actor.MobileNumber)),
            Role = actor is null ? "System" : Roles.Label(actor.UserType),
            Action = action,
            Record = record,
            OldValue = oldValue,
            NewValue = newValue,
            Reason = reason
        });
    }
}
