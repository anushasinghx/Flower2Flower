using backend.Models;
using backend.Services;

namespace Flower2Flower.Tests.Unit;

public sealed class RolesTests
{
    [Theory]
    [InlineData(UserType.Devotee, false)]
    [InlineData(UserType.Operator, true)]
    [InlineData(UserType.TempleAdmin, true)]
    [InlineData(UserType.Admin, true)]
    [InlineData(UserType.NurseryAdmin, true)]
    [InlineData(UserType.SuperAdmin, true)]
    public void IsStaff_is_true_for_all_but_devotee(UserType type, bool expected)
    {
        Assert.Equal(expected, Roles.IsStaff(type));
    }

    [Theory]
    [InlineData(UserType.Admin, true)]
    [InlineData(UserType.SuperAdmin, true)]
    [InlineData(UserType.Operator, false)]
    [InlineData(UserType.TempleAdmin, false)]
    [InlineData(UserType.Devotee, false)]
    public void IsAdmin_covers_admin_and_super_admin(UserType type, bool expected)
    {
        Assert.Equal(expected, Roles.IsAdmin(type));
    }

    [Theory]
    [InlineData(UserType.Admin, "Admin")]
    [InlineData(UserType.SuperAdmin, "Admin")]
    [InlineData(UserType.Operator, "Operator")]
    [InlineData(UserType.TempleAdmin, "Temple admin")]
    [InlineData(UserType.NurseryAdmin, "Nursery admin")]
    [InlineData(UserType.Devotee, "Devotee")]
    public void Label_returns_display_name(UserType type, string expected)
    {
        Assert.Equal(expected, Roles.Label(type));
    }

    [Theory]
    [InlineData(StaffRole.Admin, UserType.Admin)]
    [InlineData(StaffRole.Operator, UserType.Operator)]
    [InlineData(StaffRole.TempleAdmin, UserType.TempleAdmin)]
    public void FromStaffRole_maps_to_user_type(StaffRole role, UserType expected)
    {
        Assert.Equal(expected, Roles.FromStaffRole(role));
    }

    [Theory]
    [InlineData(UserType.Admin, StaffRole.Admin)]
    [InlineData(UserType.SuperAdmin, StaffRole.Admin)]
    [InlineData(UserType.Operator, StaffRole.Operator)]
    [InlineData(UserType.TempleAdmin, StaffRole.TempleAdmin)]
    [InlineData(UserType.Devotee, null)]
    [InlineData(UserType.NurseryAdmin, null)]
    public void ToStaffRole_maps_back_or_returns_null(UserType type, StaffRole? expected)
    {
        Assert.Equal(expected, Roles.ToStaffRole(type));
    }

    [Fact]
    public void Role_strings_match_authorize_attributes()
    {
        Assert.Equal("Admin,SuperAdmin", Roles.Admin);
        Assert.Equal("Operator,Admin,SuperAdmin", Roles.OperatorOrAdmin);
    }
}
