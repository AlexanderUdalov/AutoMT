using AutoMT.Data;
using AutoMT.DTOs;
using AutoMT.Models;
using AutoMT.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace AutoMT.Controllers
{
    public static class VehiclesController
    {
        public static void MapVehiclesEndpoints(this IEndpointRouteBuilder app)
        {
            app.MapGet("/api/vehicles", async (AppDbContext db, HttpContext ctx, IUserContext userCtx) =>
            {
                var userId = userCtx.GetUserId(ctx);
                if (userId is null) return Results.Unauthorized();

                var vehicles = await db.Vehicles
                    .Where(v => v.UserId == userId)
                    .OrderByDescending(x => x.IsDefault)
                    .ToListAsync();

                return Results.Ok(vehicles);
            }).RequireAuthorization().DisableAntiforgery();

            app.MapGet("/api/vehicles/{vehicleId}", async (int vehicleId, AppDbContext db, HttpContext ctx, IUserContext userCtx) =>
            {
                var userId = userCtx.GetUserId(ctx);
                if (userId is null) return Results.Unauthorized();

                var vehicle = await db.Vehicles.FirstOrDefaultAsync(v => v.UserId == userId.Value && v.Id == vehicleId);
                if (vehicle is null) return Results.NotFound();

                return Results.Ok(vehicle);
            }).RequireAuthorization().DisableAntiforgery();

            app.MapPost("/api/vehicles", async (VehicleCreateDTO vehicleDto, AppDbContext db, HttpContext ctx, IUserContext userCtx, IOptions<TypesConfig> config) =>
            {
                var userId = userCtx.GetUserId(ctx);
                if (userId is null) return Results.Unauthorized();

                var history = vehicleDto.MaintenanceHistory ?? new();
                if (string.IsNullOrWhiteSpace(vehicleDto.Brand) || vehicleDto.Brand.Length > 60 ||
                    string.IsNullOrWhiteSpace(vehicleDto.Model) || vehicleDto.Model.Length > 60 ||
                    string.IsNullOrWhiteSpace(vehicleDto.VIN) || vehicleDto.VIN.Length != 17 ||
                    vehicleDto.Mileage is < 0 or > 9999999 || vehicleDto.Year < 1900 || vehicleDto.Year > DateTime.UtcNow.Year + 1 ||
                    history.Select(r => r.TypeId).Distinct().Count() != history.Count ||
                    history.Any(r => r.Mileage < 0 || r.Mileage > vehicleDto.Mileage || !config.Value.MaintenanceTypes.Any(t => t.Id == r.TypeId)))
                    return Results.BadRequest(new { message = "Проверьте данные автомобиля и последнего обслуживания." });
                await using var transaction = await db.Database.BeginTransactionAsync();
                var vehicle = new Vehicle
                {
                    Brand = vehicleDto.Brand,
                    Model = vehicleDto.Model,
                    Year = vehicleDto.Year,
                    Mileage = vehicleDto.Mileage,
                    VIN = vehicleDto.VIN,
                    UserId = userId.Value,
                    LastMileageUpdate = DateTime.UtcNow,
                    DisableNotify = false,
                    IsDefault = !await db.Vehicles.AnyAsync(v => v.UserId == userId.Value)
                };
                db.Vehicles.Add(vehicle);
                await db.SaveChangesAsync();

                if (vehicleDto.MaintenanceHistory != null)
                {
                    foreach (var entry in vehicleDto.MaintenanceHistory)
                    {
                        var record = new MaintenanceRecord
                        {
                            VehicleId = vehicle.Id,
                            TypeId = entry.TypeId,
                            Mileage = entry.Mileage,
                            IsSkipped = false
                        };

                        var vehicleMaintenance = new VehicleMaintenanceType
                        {
                            VehicleId = vehicle.Id,
                            TypeId = entry.TypeId,
                        };
                        db.VehicleMaintenanceTypes.Add(vehicleMaintenance);
                        db.Maintenances.Add(record);
                    }
                    await db.SaveChangesAsync();
                }


                await transaction.CommitAsync();
                return Results.Created($"/api/vehicles/{vehicle.Id}", vehicle);
            }).RequireAuthorization().DisableAntiforgery();

            app.MapPost("/api/vehicles/upload/{id}", async (int id, [FromForm] IFormFile image, AppDbContext db, HttpContext ctx, IUserContext userCtx) =>
            {
                Console.WriteLine("Content-Type: " + ctx.Request.ContentType);
                var userId = userCtx.GetUserId(ctx);
                if (userId is null) return Results.Unauthorized();

                if (image == null || image.Length == 0 || image.Length > 10 * 1024 * 1024 ||
                    !new[] { ".jpg", ".jpeg", ".png", ".webp", ".gif" }.Contains(Path.GetExtension(image.FileName).ToLowerInvariant()))
                    return Results.BadRequest();

                var vehicle = await db.Vehicles.FirstOrDefaultAsync(v => v.UserId == userId.Value && v.Id == id);
                if (vehicle is null) return Results.NotFound();

                var uploadsFolder = Path.Combine("wwwroot", "uploads", "vehicles", id.ToString());
                Directory.CreateDirectory(uploadsFolder);

                var fileName = Guid.NewGuid() + Path.GetExtension(image.FileName);
                var filePath = Path.Combine(uploadsFolder, fileName);

                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await image.CopyToAsync(stream);
                }


                vehicle.ImageUrl = $"/uploads/vehicles/{id}/{fileName}";
                await db.SaveChangesAsync();

                return Results.Ok();
            }).RequireAuthorization().DisableAntiforgery();

            app.MapPut("/api/vehicles/{vehicleId}", async (int vehicleId, VehicleUpdateDTO vehicleDto, AppDbContext db, HttpContext ctx, IUserContext userCtx) =>
            {
                var userId = userCtx.GetUserId(ctx);
                if (userId is null) return Results.Unauthorized();

                var existing = await db.Vehicles.FirstOrDefaultAsync(v => v.UserId == userId.Value && v.Id == vehicleId);
                if (existing is null) return Results.NotFound();

                if (!string.IsNullOrWhiteSpace(vehicleDto.Brand))
                    existing.Brand = vehicleDto.Brand;

                if (!string.IsNullOrWhiteSpace(vehicleDto.Model))
                    existing.Model = vehicleDto.Model;

                if (vehicleDto.Year.HasValue)
                    existing.Year = vehicleDto.Year.Value;

                if (vehicleDto.Mileage is < 0 or > 9999999)
                    return Results.BadRequest(new { message = "Проверьте пробег автомобиля." });
                if (vehicleDto.Mileage.HasValue)
                {
                    existing.Mileage = vehicleDto.Mileage.Value;
                    existing.LastMileageUpdate = DateTime.UtcNow;
                }

                if (vehicleDto.DisableNotify.HasValue)
                    existing.DisableNotify = vehicleDto.DisableNotify.Value;


                if (vehicleDto.IsDefault.HasValue && vehicleDto.IsDefault.Value)
                {
                    await db.Vehicles.ForEachAsync(x =>
                    {
                        if (x.UserId == userId.Value)
                            x.IsDefault = false;
                    });
                    existing.IsDefault = vehicleDto.IsDefault.Value;
                }

                if (!string.IsNullOrWhiteSpace(vehicleDto.VIN))
                    existing.VIN = vehicleDto.VIN;

                await db.SaveChangesAsync();
                return Results.Accepted($"/api/vehicles/{vehicleId}", existing);
            }).RequireAuthorization().DisableAntiforgery();

            app.MapDelete("/api/vehicles/{vehicleId}", async (int vehicleId, AppDbContext db, HttpContext ctx, IUserContext userCtx) =>
            {
                var userId = userCtx.GetUserId(ctx);
                if (userId is null) return Results.Unauthorized();

                var existing = await db.Vehicles.FirstOrDefaultAsync(v => v.UserId == userId.Value && v.Id == vehicleId);
                if (existing is null) return Results.NotFound();

                await using var transaction = await db.Database.BeginTransactionAsync();
                var recordIds = await db.Maintenances.Where(r => r.VehicleId == vehicleId).Select(r => r.Id).ToListAsync();
                db.MaintenanceUsedParts.RemoveRange(db.MaintenanceUsedParts.Where(p => recordIds.Contains(p.MaintenanceId)));
                db.Maintenances.RemoveRange(db.Maintenances.Where(r => r.VehicleId == vehicleId));
                db.VehicleNotes.RemoveRange(db.VehicleNotes.Where(n => n.VehicleId == vehicleId));
                db.VehicleMaintenanceTypes.RemoveRange(db.VehicleMaintenanceTypes.Where(t => t.VehicleId == vehicleId));
                db.Vehicles.Remove(existing);
                await db.SaveChangesAsync();
                if (existing.IsDefault)
                {
                    var next = await db.Vehicles.FirstOrDefaultAsync(v => v.UserId == userId.Value);
                    if (next != null) next.IsDefault = true;
                    await db.SaveChangesAsync();
                }
                await transaction.CommitAsync();
                return Results.Ok();
            }).RequireAuthorization().DisableAntiforgery();

        }
    }
}
