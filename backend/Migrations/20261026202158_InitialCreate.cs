using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "RegistrationChallenges",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    MobileNumber = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    NormalizedMobileNumber = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ExpiresAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsConsumed = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    ResendCount = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RegistrationChallenges", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    MobileNumber = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    NormalizedMobileNumber = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    MobileVerified = table.Column<bool>(type: "boolean", nullable: false),
                    AccountStatus = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastLoginAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RegistrationChallenges_NormalizedMobileNumber",
                table: "RegistrationChallenges",
                column: "NormalizedMobileNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_NormalizedMobileNumber",
                table: "Users",
                column: "NormalizedMobileNumber",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RegistrationChallenges");

            migrationBuilder.DropTable(
                name: "Users");
        }
    }
}
