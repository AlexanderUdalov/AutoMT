using AutoMT.Data;
using AutoMT.DTOs;
using AutoMT.Models;
using AutoMT.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace AutoMT.Controllers
{
    public static class MaintenanceController
    {
        public static void MapMaintenanceEndpoints(this IEndpointRouteBuilder app)
        {
            app.MapGet("/api/maintenance/{vehicleId}", async (int vehicleId, [FromQuery] bool? fullHistory, AppDbContext db, HttpContext ctx, IUserContext userCtx) =>
                {
                    var userId = userCtx.GetUserId(ctx);
                    if (userId is null) return Results.Unauthorized();

                    var vehicle = await db.Vehicles.FindAsync(vehicleId);
                    if (vehicle == null) return Results.BadRequest();
                    if (vehicle.UserId != userId) return Results.Forbid();

                    var query = db.Maintenances.Where(r => r.VehicleId == vehicleId);
                    if (fullHistory.HasValue && fullHistory.Value)
                    {
                        return Results.Ok(await query.ToListAsync());
                    }

                    var records = await query
                        .GroupBy(r => r.TypeId)
                        .Select(g => g.OrderByDescending(r => r.Mileage).FirstOrDefault())
                        .ToListAsync();
                    return Results.Ok(records);
                }).RequireAuthorization().DisableAntiforgery();

            app.MapGet("/api/maintenance/types", (IOptions<TypesConfig> config, AppDbContext db, HttpContext ctx, IUserContext userCtx) =>
            {
                var maintenanceTypes = config.Value.MaintenanceTypes
                    .Select(x => new MaintenanceTypeDTO
                    {
                        Id = x.Id,
                        Icon = x.Icon,
                        Name = x.Name,
                        Period = x.Period,
                        Parts = config.Value.MaintenanceRequiredPartTypes
                            .Where(mrp => mrp.MaintenanceTypeId == x.Id)
                            .Join(config.Value.PartTypes,
                                mrp => mrp.PartTypeId,
                                pt => pt.Id,
                                (mrp, pt) => new MaintenancePartTypeDTO
                                {
                                    Id = pt.Id,
                                    Name = pt.Name
                                })
                            .ToList()
                    }).ToList();

                return Results.Ok(maintenanceTypes);
            }).RequireAuthorization().DisableAntiforgery();

            app.MapPost("/api/maintenance/{vehicleId}", async (int vehicleId, MaintenanceHistoryRecordDTO maintenance, AppDbContext db, HttpContext ctx, IUserContext userCtx) =>
                {
                    var userId = userCtx.GetUserId(ctx);
                    if (userId is null) return Results.Unauthorized();

                    var vehicle = await db.Vehicles.FindAsync(vehicleId);
                    if (vehicle == null) return Results.BadRequest();
                    if (vehicle.UserId != userId) return Results.Forbid();

                    var Maintenance = new MaintenanceRecord
                    {
                        VehicleId = vehicleId,
                        TypeId = maintenance.TypeId,
                        Mileage = maintenance.Mileage,
                        IsSkipped = maintenance.IsSkipped ?? false
                    };
                    db.Maintenances.Add(Maintenance);
                    await db.SaveChangesAsync();

                    foreach (var Part in maintenance.Parts)
                    {
                        var NewPart = new Part()
                        {
                            TypeId = Part.TypeId,
                            Article = Part.Article,
                            Brand = Part.Brand
                        };
                        db.Parts.Add(NewPart);
                        await db.SaveChangesAsync();

                        var usedParts = new MaintenanceUsedParts()
                        {
                            MaintenanceId = Maintenance.Id,
                            PartId = NewPart.Id
                        };

                        db.MaintenanceUsedParts.Add(usedParts);
                        await db.SaveChangesAsync();
                    }

                    await db.SaveChangesAsync();
                    return Results.Created($"/api/maintenance/{vehicleId}/{Maintenance.Id}", Maintenance);
                }).RequireAuthorization().DisableAntiforgery();
        }
    }
}