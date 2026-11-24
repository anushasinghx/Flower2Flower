using System.Net;
using System.Text;
using backend.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;

namespace Flower2Flower.Tests.Support;

public sealed class FakeHostEnvironment : IWebHostEnvironment
{
    public FakeHostEnvironment(string environmentName = "Development", string? contentRoot = null)
    {
        EnvironmentName = environmentName;
        ContentRootPath = contentRoot ?? Path.GetTempPath();
        WebRootPath = ContentRootPath;
    }

    public string EnvironmentName { get; set; }
    public string ApplicationName { get; set; } = "backend";
    public string ContentRootPath { get; set; }
    public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    public string WebRootPath { get; set; }
    public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
}

public sealed class StubHttpHandler : HttpMessageHandler
{
    private readonly Func<HttpRequestMessage, HttpResponseMessage> _respond;

    public StubHttpHandler(Func<HttpRequestMessage, HttpResponseMessage> respond)
    {
        _respond = respond;
    }

    public List<string> Paths { get; } = new();
    public List<string> Bodies { get; } = new();

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        Paths.Add(request.RequestUri!.AbsolutePath);
        Bodies.Add(request.Content is null ? string.Empty : await request.Content.ReadAsStringAsync(cancellationToken));
        return _respond(request);
    }

    public static StubHttpHandler Json(string body, HttpStatusCode status = HttpStatusCode.OK)
    {
        return new StubHttpHandler(_ => new HttpResponseMessage(status) { Content = new StringContent(body, Encoding.UTF8, "application/json") });
    }

    public static StubHttpHandler Throws(Exception exception)
    {
        return new StubHttpHandler(_ => throw exception);
    }
}

public sealed class StubHttpClientFactory : IHttpClientFactory
{
    private readonly HttpMessageHandler _handler;

    public StubHttpClientFactory(HttpMessageHandler handler)
    {
        _handler = handler;
    }

    public HttpClient CreateClient(string name)
    {
        return new HttpClient(_handler, disposeHandler: false);
    }
}

public static class TestConfig
{
    public static IConfiguration From(params (string Key, string? Value)[] values)
    {
        return new ConfigurationBuilder()
            .AddInMemoryCollection(values.Select(x => new KeyValuePair<string, string?>(x.Key, x.Value)))
            .Build();
    }
}

public static class TestDb
{
    public static AppDbContext Create()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"f2f-{Guid.NewGuid():N}")
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;
        return new AppDbContext(options);
    }
}

public static class TestFiles
{
    public static IFormFile Make(string contentType, string name = "photo.jpg", int size = 64)
    {
        var bytes = Enumerable.Range(0, size).Select(x => (byte)(x % 255)).ToArray();
        return new FormFile(new MemoryStream(bytes), 0, bytes.Length, "File", name)
        {
            Headers = new HeaderDictionary(),
            ContentType = contentType
        };
    }

    public static IFormFile Sized(string contentType, long length)
    {
        return new FormFile(Stream.Null, 0, length, "File", "big.jpg")
        {
            Headers = new HeaderDictionary(),
            ContentType = contentType
        };
    }
}
