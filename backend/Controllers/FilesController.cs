using backend.Data;
using backend.DTOs;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[Authorize]
[Route("api/v1/files")]
public sealed class FilesController : ApiControllerBase
{
    private readonly AppDbContext _dbContext;
    private readonly FileStorageService _storage;
    private readonly AuditService _audit;

    public FilesController(AppDbContext dbContext, FileStorageService storage, AuditService audit)
    {
        _dbContext = dbContext;
        _storage = storage;
        _audit = audit;
    }

    [HttpPost]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(FileStorageService.MaxBytes + 1024 * 1024)]
    public async Task<ActionResult<FileView>> Upload([FromForm] FileUploadRequest request, CancellationToken cancellationToken)
    {
        var me = await GetCurrentUserAsync(_dbContext);
        if (me is null)
        {
            return NotSignedIn();
        }

        if (request.Purpose == FilePurpose.PurityPhoto && !(me.UserType == UserType.Operator || Roles.IsAdmin(me.UserType)))
        {
            return Error("Only counter operators can upload purity photos.", StatusCodes.Status403Forbidden);
        }

        var problem = _storage.Validate(request.File);
        if (problem is not null)
        {
            return Error(problem);
        }

        var stored = await _storage.SaveAsync(request.File!, me.Id, request.Purpose, cancellationToken);
        _dbContext.StoredFiles.Add(stored);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return StatusCode(StatusCodes.Status201Created, Views.File(stored));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Download(Guid id, CancellationToken cancellationToken)
    {
        var me = await GetCurrentUserAsync(_dbContext);
        if (me is null)
        {
            return NotSignedIn();
        }

        var file = await _dbContext.StoredFiles.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (file is null)
        {
            return Error("File not found.", StatusCodes.Status404NotFound);
        }

        var allowed = file.OwnerUserId == me.Id
            || Roles.IsAdmin(me.UserType)
            || (file.Purpose == FilePurpose.PurityPhoto && me.UserType == UserType.Operator)
            || (file.Purpose == FilePurpose.TemplePhoto && await _dbContext.Temples.AnyAsync(x => x.PhotoFileId == id && x.Status == TempleStatus.Verified, cancellationToken));
        if (!allowed)
        {
            return Error("You do not have access to this file.", StatusCodes.Status403Forbidden);
        }

        var path = _storage.FullPath(file);
        if (!System.IO.File.Exists(path))
        {
            return Error("File is missing from storage.", StatusCodes.Status404NotFound);
        }

        if (file.OwnerUserId != me.Id && file.Purpose is FilePurpose.KycFront or FilePurpose.KycBack)
        {
            _audit.Add(me, "Viewed KYC document", $"File {file.Id}", "Masked", "Viewed", "KYC document check");
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        return PhysicalFile(path, file.ContentType, file.OriginalName);
    }
}
