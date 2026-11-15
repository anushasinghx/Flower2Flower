using backend.Models;

namespace backend.Services;

public sealed class FileStorageService
{
    public const long MaxBytes = 8 * 1024 * 1024;

    private static readonly Dictionary<string, string> AllowedTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        ["image/jpeg"] = ".jpg",
        ["image/png"] = ".png",
        ["image/webp"] = ".webp",
        ["image/heic"] = ".heic",
        ["application/pdf"] = ".pdf"
    };

    private readonly string _root;

    public FileStorageService(IConfiguration configuration, IWebHostEnvironment environment)
    {
        var configured = configuration["Storage:Root"] ?? configuration["STORAGE_ROOT"];
        _root = string.IsNullOrWhiteSpace(configured)
            ? Path.Combine(environment.ContentRootPath, "storage")
            : Path.GetFullPath(configured);
    }

    public string? Validate(IFormFile? file)
    {
        if (file is null || file.Length == 0)
        {
            return "Choose a file to upload.";
        }

        if (file.Length > MaxBytes)
        {
            return "The file is larger than 8 MB.";
        }

        if (!AllowedTypes.ContainsKey(file.ContentType))
        {
            return "Only JPG, PNG, WEBP, HEIC or PDF files are allowed.";
        }

        return null;
    }

    public async Task<StoredFile> SaveAsync(IFormFile file, Guid ownerUserId, FilePurpose purpose, CancellationToken cancellationToken = default)
    {
        var id = Guid.NewGuid();
        var now = DateTime.UtcNow;
        var relative = Path.Combine(purpose.ToString(), now.ToString("yyyy"), now.ToString("MM"), $"{id:N}{AllowedTypes[file.ContentType]}");
        var fullPath = Path.Combine(_root, relative);
        Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);

        await using (var stream = File.Create(fullPath))
        {
            await file.CopyToAsync(stream, cancellationToken);
        }

        return new StoredFile
        {
            Id = id,
            OwnerUserId = ownerUserId,
            Purpose = purpose,
            OriginalName = Path.GetFileName(file.FileName),
            ContentType = file.ContentType,
            SizeBytes = file.Length,
            StoragePath = relative,
            CreatedAtUtc = now
        };
    }

    public string FullPath(StoredFile file)
    {
        var fullPath = Path.GetFullPath(Path.Combine(_root, file.StoragePath));
        if (!fullPath.StartsWith(Path.GetFullPath(_root), StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Invalid storage path.");
        }

        return fullPath;
    }
}
