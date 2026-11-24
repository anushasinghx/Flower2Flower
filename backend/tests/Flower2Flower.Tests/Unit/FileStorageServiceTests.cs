using backend.Models;
using backend.Services;
using Flower2Flower.Tests.Support;

namespace Flower2Flower.Tests.Unit;

public sealed class FileStorageServiceTests : IDisposable
{
    private readonly string _root = Path.Combine(Path.GetTempPath(), $"f2f-storage-{Guid.NewGuid():N}");

    private FileStorageService Service() => new(TestConfig.From(("Storage:Root", _root)), new FakeHostEnvironment());

    public void Dispose()
    {
        if (Directory.Exists(_root))
        {
            Directory.Delete(_root, true);
        }
    }

    [Fact]
    public void Missing_file_is_rejected()
    {
        Assert.Equal("Choose a file to upload.", Service().Validate(null));
    }

    [Fact]
    public void Empty_file_is_rejected()
    {
        Assert.Equal("Choose a file to upload.", Service().Validate(TestFiles.Sized("image/jpeg", 0)));
    }

    [Fact]
    public void File_over_eight_megabytes_is_rejected()
    {
        Assert.Equal("The file is larger than 8 MB.", Service().Validate(TestFiles.Sized("image/jpeg", FileStorageService.MaxBytes + 1)));
    }

    [Fact]
    public void File_of_exactly_eight_megabytes_is_allowed()
    {
        Assert.Null(Service().Validate(TestFiles.Sized("image/jpeg", FileStorageService.MaxBytes)));
    }

    [Theory]
    [InlineData("image/jpeg")]
    [InlineData("image/png")]
    [InlineData("image/webp")]
    [InlineData("image/heic")]
    [InlineData("application/pdf")]
    [InlineData("IMAGE/PNG")]
    public void Allowed_types_pass(string contentType)
    {
        Assert.Null(Service().Validate(TestFiles.Make(contentType)));
    }

    [Theory]
    [InlineData("text/plain")]
    [InlineData("application/zip")]
    [InlineData("image/gif")]
    [InlineData("application/x-msdownload")]
    public void Other_types_are_rejected(string contentType)
    {
        Assert.Equal("Only JPG, PNG, WEBP, HEIC or PDF files are allowed.", Service().Validate(TestFiles.Make(contentType)));
    }

    [Fact]
    public async Task SaveAsync_writes_file_under_purpose_and_month()
    {
        var owner = Guid.NewGuid();
        var service = Service();

        var stored = await service.SaveAsync(TestFiles.Make("image/png", "front.png", 128), owner, FilePurpose.KycFront);

        Assert.Equal(owner, stored.OwnerUserId);
        Assert.Equal(FilePurpose.KycFront, stored.Purpose);
        Assert.Equal("front.png", stored.OriginalName);
        Assert.Equal("image/png", stored.ContentType);
        Assert.Equal(128, stored.SizeBytes);
        Assert.StartsWith(Path.Combine("KycFront", DateTime.UtcNow.ToString("yyyy")), stored.StoragePath);
        Assert.EndsWith(".png", stored.StoragePath);
        Assert.True(File.Exists(service.FullPath(stored)));
        Assert.Equal(128, new FileInfo(service.FullPath(stored)).Length);
    }

    [Fact]
    public async Task SaveAsync_drops_directory_parts_from_original_name()
    {
        var stored = await Service().SaveAsync(TestFiles.Make("application/pdf", "../../secret/doc.pdf"), Guid.NewGuid(), FilePurpose.TempleDocument);

        Assert.Equal("doc.pdf", stored.OriginalName);
        Assert.EndsWith(".pdf", stored.StoragePath);
    }

    [Fact]
    public void FullPath_refuses_paths_outside_root()
    {
        var file = new StoredFile { StoragePath = Path.Combine("..", "..", "outside.txt") };

        Assert.Throws<InvalidOperationException>(() => Service().FullPath(file));
    }

    [Fact]
    public void Without_configured_root_storage_uses_content_root()
    {
        var contentRoot = Path.Combine(_root, "content");
        var service = new FileStorageService(TestConfig.From(), new FakeHostEnvironment(contentRoot: contentRoot));

        var path = service.FullPath(new StoredFile { StoragePath = "a.jpg" });

        Assert.Equal(Path.Combine(contentRoot, "storage", "a.jpg"), path);
    }
}
