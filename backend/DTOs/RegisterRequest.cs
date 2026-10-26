using System.ComponentModel.DataAnnotations;
using backend.Models;

namespace backend.DTOs;

public sealed class RegisterRequest
{
    [Required]
    public string MobileNumber { get; set; } = string.Empty;

    [Required]
    [StringLength(150)]
    public string FullName { get; set; } = string.Empty;

    public DateOnly? DateOfBirth { get; set; }

    [Required]
    [StringLength(100)]
    public string State { get; set; } = string.Empty;

    [Required]
    [StringLength(100)]
    public string City { get; set; } = string.Empty;

    [Required]
    [Range(100000, 999999)]
    public int Pin { get; set; }

    [Required]
    [StringLength(500)]
    public string Address { get; set; } = string.Empty;

    public UserType UserType { get; set; } = UserType.Devotee;
}
