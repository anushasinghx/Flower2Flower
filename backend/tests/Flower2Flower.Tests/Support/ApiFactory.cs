using System.Net.Http.Headers;
using System.Text.Json.Nodes;
using backend.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Npgsql;

namespace Flower2Flower.Tests.Support;

[CollectionDefinition(Name)]
public sealed class ApiCollection : ICollectionFixture<ApiFactory>
{
    public const string Name = "api";
}

public sealed class ApiFactory : IAsyncLifetime
{
    public const string Otp = "123456";
    public const string SuperAdminMobile = "9000000000";
    public const string AdminMobile = "9000002222";
    public const string OperatorMobile = "9000004444";
    public const string TempleAdminMobile = "9000006666";
    public const string DevoteeMobile = "9876541234";
    public const string ShivMandir = "Shiv Mandir, Shipra Sun City";
    public const string DurgaMandir = "Durga Mandir, Niti Khand";
    public const string HanumanMandir = "Hanuman Mandir, Vaibhav Khand";

    private static int _mobileCounter = 100000000;
    private readonly string _storageRoot = Path.Combine(Path.GetTempPath(), $"f2f-it-{Guid.NewGuid():N}");

    public ApiFactory()
    {
        Environment.SetEnvironmentVariable("ConnectionStrings__Postgres", ConnectionString);
        Environment.SetEnvironmentVariable("POSTGRESQL_CONNECTION_STRING", ConnectionString);
        Environment.SetEnvironmentVariable("OTP_DEV_CODE", Otp);
        Environment.SetEnvironmentVariable("JWT_SIGNING_KEY", "integration-test-signing-key-that-is-long-enough-123");
        Environment.SetEnvironmentVariable("BOOTSTRAP_ADMIN_MOBILE", SuperAdminMobile);
        Environment.SetEnvironmentVariable("BOOTSTRAP_ADMIN_NAME", "Super Admin");
        Environment.SetEnvironmentVariable("STORAGE_ROOT", _storageRoot);
        Environment.SetEnvironmentVariable("SEED_DEMO_DATA", "true");
    }

    public static string ConnectionString { get; } = BuildConnectionString();

    public static string NewMobile() => $"7{Interlocked.Increment(ref _mobileCounter):D9}";

    private Host? _host;

    public IServiceProvider Services => _host!.Services;

    private HttpClient CreateClient() => _host!.CreateClient();

    public async Task InitializeAsync()
    {
        var builder = new NpgsqlConnectionStringBuilder(ConnectionString);
        if (builder.Database is null || !builder.Database.EndsWith("_test", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Integration tests only run against a database whose name ends with _test.");
        }

        var options = new DbContextOptionsBuilder<AppDbContext>().UseNpgsql(ConnectionString).Options;
        await using (var db = new AppDbContext(options))
        {
            await db.Database.EnsureDeletedAsync();
        }

        _host = new Host(_storageRoot);
        _ = _host.Server;

        using var scope = Services.CreateScope();
        var used = scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.GetDbConnection().Database;
        if (!used.EndsWith("_test", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException($"The API started against {used}, not the test database.");
        }
    }

    async Task IAsyncLifetime.DisposeAsync()
    {
        if (_host is not null)
        {
            await _host.DisposeAsync();
        }

        if (Directory.Exists(_storageRoot))
        {
            Directory.Delete(_storageRoot, true);
        }
    }

    public HttpClient Anonymous() => CreateClient();

    public async Task<HttpClient> SignInAsync(string mobile)
    {
        var client = CreateClient();
        await client.PostJson("/api/v1/auth/login", new { mobileNumber = mobile }).Expect();
        var auth = await client.PostJson("/api/v1/auth/login/verify-otp", new { mobileNumber = mobile, otp = Otp, createAccount = true }).Expect();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth.Str("accessToken"));
        return client;
    }

    public Task<HttpClient> SuperAdminAsync() => SignInAsync(SuperAdminMobile);

    public Task<HttpClient> OperatorAsync() => SignInAsync(OperatorMobile);

    public async Task<TestDevotee> NewDevoteeAsync(bool kycVerified = false, string name = "Test Devotee")
    {
        var mobile = NewMobile();
        var client = await SignInAsync(mobile);
        var profile = await client.PutJson("/api/v1/me/profile", new { fullName = name, dateOfBirth = "1990-05-20", address = "Indirapuram" }).Expect();
        var devotee = new TestDevotee(client, profile.Guid("userId"), mobile, name);

        if (kycVerified)
        {
            var submissionId = await SubmitKycAsync(client);
            var admin = await SuperAdminAsync();
            await admin.PostJson($"/api/v1/admin/kyc/{submissionId}/decision", new { approve = true }).Expect();
        }

        return devotee;
    }

    public static async Task<Guid> SubmitKycAsync(HttpClient client, string docNumber = "1234 5678 9012")
    {
        var front = await UploadAsync(client, "KycFront");
        var back = await UploadAsync(client, "KycBack");
        var submission = await client.PostJson("/api/v1/me/kyc", new { docType = "Aadhaar", docNumber, frontFileId = front, backFileId = back }).Expect(System.Net.HttpStatusCode.Created);
        return submission.Guid("id");
    }

    public static async Task<Guid> UploadAsync(HttpClient client, string purpose, string contentType = "image/jpeg", string name = "photo.jpg", byte[]? bytes = null)
    {
        var response = await client.Upload(purpose, contentType, name, bytes);
        var body = await Task.FromResult(response).Expect(System.Net.HttpStatusCode.Created);
        return body.Guid("id");
    }

    public async Task<Guid> TempleIdAsync(string name)
    {
        var admin = await SuperAdminAsync();
        var list = await admin.GetAsync("/api/v1/admin/temples").Expect();
        return list["items"]!.AsArray().First(x => x!.Str("name") == name)!.Guid("id");
    }

    public async Task<Guid> NewVerifiedTempleAsync(string? name = null)
    {
        var admin = await SuperAdminAsync();
        var temple = await admin.PostJson("/api/v1/admin/temples", new
        {
            name = name ?? $"Test Mandir {Guid.NewGuid():N}"[..20],
            type = "unregistered",
            address = "Sector 1, Indirapuram",
            contact = "Test Contact",
            mobileNumber = NewMobile()
        }).Expect(System.Net.HttpStatusCode.Created);
        var id = temple.Guid("id");
        await admin.PostJson($"/api/v1/admin/temples/{id}/verify", new { badge = "Verified" }).Expect();
        return id;
    }

    public static async Task<JsonNode> DepositAsync(HttpClient operatorClient, Guid devoteeUserId, Guid templeId, string waste = "Flowers", decimal kg = 1m, bool withPhoto = true, bool rejected = false, string? reason = null, bool chargeCollected = false, string? clientId = null)
    {
        Guid? photo = withPhoto ? await UploadAsync(operatorClient, "PurityPhoto") : null;
        var response = await operatorClient.PostJson("/api/v1/operator/deposits", new
        {
            clientId,
            devoteeUserId,
            templeId,
            waste,
            kg,
            photoFileId = photo,
            checks = new[] { "No plastic, metal or cloth" },
            chargeCollected,
            rejected,
            reason
        });
        var status = response.StatusCode;
        var body = await Task.FromResult(response).ExpectAny();
        Assert.True(status is System.Net.HttpStatusCode.Created or System.Net.HttpStatusCode.OK, $"Deposit failed with {(int)status}: {body.ToJsonString()}");
        return body;
    }

    private static string BuildConnectionString()
    {
        var configured = Environment.GetEnvironmentVariable("F2F_TEST_POSTGRES");
        var source = !string.IsNullOrWhiteSpace(configured) ? configured : ReadDevConnectionString() ?? "Host=localhost;Port=5432;Username=postgres;Password=root";
        var builder = new NpgsqlConnectionStringBuilder(source);
        if (string.IsNullOrWhiteSpace(configured) || string.IsNullOrWhiteSpace(builder.Database))
        {
            builder.Database = "flower2flower_test";
        }

        return builder.ConnectionString;
    }

    private static string? ReadDevConnectionString()
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (directory is not null && !File.Exists(Path.Combine(directory.FullName, "backend.csproj")))
        {
            directory = directory.Parent;
        }

        var envFile = directory is null ? null : Path.Combine(directory.FullName, ".env.backend");
        if (envFile is null || !File.Exists(envFile))
        {
            return null;
        }

        const string key = "POSTGRESQL_CONNECTION_STRING=";
        var line = File.ReadAllLines(envFile).FirstOrDefault(x => x.TrimStart().StartsWith(key, StringComparison.Ordinal));
        return line?.Trim()[key.Length..];
    }
}

internal sealed class Host : WebApplicationFactory<Program>
{
    private readonly string _storageRoot;

    public Host(string storageRoot)
    {
        _storageRoot = storageRoot;
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.ConfigureLogging(logging => logging.ClearProviders());
        builder.UseSetting("ConnectionStrings:Postgres", ApiFactory.ConnectionString);
        builder.UseSetting("STORAGE_ROOT", _storageRoot);
    }
}

public sealed record TestDevotee(HttpClient Client, Guid UserId, string Mobile, string Name);
