using AutoMT.Data;
using AutoMT.DTOs;
using AutoMT.Models;
using AutoMT.Services;
using Microsoft.EntityFrameworkCore;

namespace AutoMT.Controllers
{
    public static class MaintenanceController
    {
        public static void MapMaintenanceEndpoints(this IEndpointRouteBuilder app)
        {
            app.MapGet("/api/maintenance/{vehicleId}", async (int vehicleId, AppDbContext db, HttpContext ctx, IUserContext userCtx) =>
                {
                    var userId = userCtx.GetUserId(ctx);
                    if (userId is null) return Results.Unauthorized();

                    var vehicle = await db.Vehicles.FindAsync(vehicleId);
                    if (vehicle == null) return Results.BadRequest();
                    if (vehicle.UserId != userId) return Results.Forbid();

                    var records = await db.Maintenances
                        .Where(r => r.VehicleId == vehicleId)
                        .GroupBy(r => r.TypeId) // Группируем по типу работ
                        .Select(g => g.OrderByDescending(r => r.Mileage).FirstOrDefault()) // В каждой группе берем запись с максимальным пробегом
                        .ToListAsync();

                    return Results.Ok(records);
                }).RequireAuthorization();

            app.MapGet("/api/maintenance/types", async (AppDbContext db, HttpContext ctx, IUserContext userCtx) =>
            {
                var maintenanceTypes = await db.MaintenanceTypes
                    .Select(x => new MaintenanceTypeDTO
                    {
                        Id = x.Id,
                        Icon = x.Icon,
                        Name = x.Name,
                        Period = x.Period,
                        Parts = db.MaintenanceRequiredPartTypes
                            .Where(mrp => mrp.MaintenanceTypeId == x.Id)
                            .Join(db.PartTypes,
                                mrp => mrp.PartTypeId,
                                pt => pt.Id,
                                (mrp, pt) => new MaintenancePartTypeDTO
                                {
                                    Id = pt.Id,
                                    Name = pt.Name
                                })
                            .ToList()
                    }).ToListAsync();

                return Results.Ok(maintenanceTypes);
            }).RequireAuthorization();

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
                        Mileage = maintenance.Mileage
                    };
                    db.Maintenances.Add(Maintenance);

                    await db.SaveChangesAsync();
                    return Results.Created($"/api/maintenance/{vehicleId}/{Maintenance.Id}", Maintenance);
                }).RequireAuthorization();
        }
    }
}