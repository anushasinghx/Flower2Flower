using backend.Models;

namespace backend.Services;

public static class Roles
{
    public const string Admin = "Admin,SuperAdmin";
    public const string OperatorOrAdmin = "Operator,Admin,SuperAdmin";

    public static bool IsStaff(UserType type)
    {
        return type is UserType.Admin or UserType.SuperAdmin or UserType.Operator or UserType.TempleAdmin or UserType.NurseryAdmin;
    }

    public static bool IsAdmin(UserType type)
    {
        return type is UserType.Admin or UserType.SuperAdmin;
    }

    public static string Label(UserType type)
    {
        return type switch
        {
            UserType.Admin => "Admin",
            UserType.SuperAdmin => "Admin",
            UserType.Operator => "Operator",
            UserType.TempleAdmin => "Temple admin",
            UserType.NurseryAdmin => "Nursery admin",
            _ => "Devotee"
        };
    }

    public static UserType FromStaffRole(StaffRole role)
    {
        return role switch
        {
            StaffRole.Admin => UserType.Admin,
            StaffRole.Operator => UserType.Operator,
            _ => UserType.TempleAdmin
        };
    }

    public static StaffRole? ToStaffRole(UserType type)
    {
        return type switch
        {
            UserType.Admin or UserType.SuperAdmin => StaffRole.Admin,
            UserType.Operator => StaffRole.Operator,
            UserType.TempleAdmin => StaffRole.TempleAdmin,
            _ => null
        };
    }
}
