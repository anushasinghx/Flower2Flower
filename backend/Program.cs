using System.Text;
using System.Text.Json.Serialization;
using backend.Data;
using backend.Services;
using DotNetEnv;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Any;
using Microsoft.OpenApi.Models;

var environmentFilePath = Path.Combine(Directory.GetCurrentDirectory(), ".env.backend");
if (File.Exists(environmentFilePath))
{
    Env.Load(environmentFilePath);
}

var builder = WebApplication.CreateBuilder(args);

builder.Configuration
    .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
    .AddEnvironmentVariables();

var connectionString = builder.Configuration["ConnectionStrings:Postgres"] ?? builder.Configuration["POSTGRESQL_CONNECTION_STRING"];
if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException("Missing PostgreSQL connection string. Set ConnectionStrings__Postgres or POSTGRESQL_CONNECTION_STRING.");
}

var jwtSigningKey = builder.Configuration["Jwt:SigningKey"] ?? builder.Configuration["JWT_SIGNING_KEY"];
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? builder.Configuration["JWT_ISSUER"] ?? "Flower2Flower";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? builder.Configuration["JWT_AUDIENCE"] ?? "Flower2Flower-Frontend";
var allowedFrontendOrigins = builder.Configuration["AllowedFrontendOrigins"] ?? builder.Configuration["ALLOWED_FRONTEND_ORIGINS"] ?? "http://localhost:3000,https://localhost:3000";

if (builder.Environment.IsProduction())
{
    if (string.IsNullOrWhiteSpace(jwtSigningKey) || jwtSigningKey == "change-me")
    {
        throw new InvalidOperationException("JWT signing key must be configured in production.");
    }

    if (string.IsNullOrWhiteSpace(connectionString) || (connectionString.Contains("localhost") && connectionString.Contains("postgres")))
    {
        throw new InvalidOperationException("Production PostgreSQL configuration is invalid.");
    }
}

builder.Services.AddDbContext<AppDbContext>(options => options.UseNpgsql(connectionString));
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });
builder.Services.AddHttpClient("fast2sms");
builder.Services.AddScoped<Fast2SmsOtpService>();
builder.Services.AddSingleton<JwtService>();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSigningKey ?? "flower2flower-development-signing-key-1234567890")),
            ValidateIssuer = true,
            ValidIssuer = jwtIssuer,
            ValidateAudience = true,
            ValidAudience = jwtAudience,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1)
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddCors(options =>
{
    var origins = allowedFrontendOrigins.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(origins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "Flower2Flower API", Version = "v1" });
    options.MapType<DateOnly>(() => new OpenApiSchema
    {
        Type = "string",
        Format = "date",
        Example = new OpenApiString("1990-05-20")
    });
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "JWT access token"
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    dbContext.Database.Migrate();
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowFrontend");
app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();
