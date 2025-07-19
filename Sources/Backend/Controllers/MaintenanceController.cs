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
            app.MapGet("/api/maintenance/{vehicleId}", async (int vehicleId, [FromQuery] bool? fullHistory, IOptions<TypesConfig> config, AppDbContext db, HttpContext ctx, IUserContext userCtx) =>
                {
                    var userId = userCtx.GetUserId(ctx);
                    if (userId is null) return Results.Unauthorized();

                    var vehicle = await db.Vehicles.FindAsync(vehicleId);
                    if (vehicle == null) return Results.BadRequest();
                    if (vehicle.UserId != userId) return Results.Forbid();

                    var maintenanceList = await db.Maintenances
                        .Where(r => r.VehicleId == vehicleId && !r.IsSkipped)
                        .ToListAsync();

                    var filteredMaintenances = fullHistory == true
                      ? maintenanceList
                      : maintenanceList
                          .GroupBy(m => m.TypeId)
                          .Select(g => g.OrderByDescending(m => m.Mileage).First())
                          .ToList();

                    var maintenanceIds = filteredMaintenances.Select(m => m.Id).ToList();

                    var partTypes = config.Value.PartTypes.ToDictionary(pt => pt.Id, pt => pt.Name);
                    var parts = await db.MaintenanceUsedParts
                        .Where(up => maintenanceIds.Contains(up.MaintenanceId))
                        .Join(db.Parts,
                            up => up.PartId,
                            p => p.Id,
                            (up, p) => new
                            {
                                up.MaintenanceId,
                                Part = new MaintenancePartDTO
                                {
                                    Name = partTypes[p.TypeId],
                                    Article = p.Article,
                                    Brand = p.Brand
                                }
                            })
                        .ToListAsync();

                    var partsByMaintenance = parts
                        .GroupBy(x => x.MaintenanceId)
                        .ToDictionary(
                            g => g.Key,
                            g => g.Select(x => x.Part).ToList()
                        );

                    var result = filteredMaintenances
                        .Select(m => new MaintenanceHistoryRecordDTO
                        {
                            Id = m.Id,
                            TypeId = m.TypeId,
                            Mileage = m.Mileage,
                            IsSkipped = m.IsSkipped,
                            Parts = partsByMaintenance.TryGetValue(m.Id, out var partList) ? partList : []
                        })
                        .ToList();

                    return Results.Ok(result);
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

            app.MapPost("/api/maintenance/{vehicleId}", async (int vehicleId, IOptions<TypesConfig> config, MaintenanceHistoryRecordDTO maintenance, AppDbContext db, HttpContext ctx, IUserContext userCtx) =>
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

                    if (maintenance.Parts != null)
                    {
                        foreach (var Part in maintenance.Parts)
                        {
                            var NewPart = new Part()
                            {
                                TypeId = config.Value.PartTypes.First(pt => pt.Name == Part.Name).Id,
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
                    }

                    await db.SaveChangesAsync();
                    return Results.Created($"/api/maintenance/{vehicleId}/{Maintenance.Id}", Maintenance);
                }).RequireAuthorization().DisableAntiforgery();
        }
    }
}