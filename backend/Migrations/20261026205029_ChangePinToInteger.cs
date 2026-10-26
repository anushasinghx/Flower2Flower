using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class ChangePinToInteger : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                "ALTER TABLE \"Users\" ALTER COLUMN \"Pin\" TYPE integer USING \"Pin\"::integer;");

            migrationBuilder.Sql(
                "ALTER TABLE \"RegistrationChallenges\" ALTER COLUMN \"Pin\" TYPE integer USING \"Pin\"::integer;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                "ALTER TABLE \"Users\" ALTER COLUMN \"Pin\" TYPE character varying(6) USING \"Pin\"::character varying(6);");

            migrationBuilder.Sql(
                "ALTER TABLE \"RegistrationChallenges\" ALTER COLUMN \"Pin\" TYPE character varying(6) USING \"Pin\"::character varying(6);");
        }
    }
}
