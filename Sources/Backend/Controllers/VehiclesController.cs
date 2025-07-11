using AutoMT.Data;
using AutoMT.DTOs;
using AutoMT.Models;
using AutoMT.Services;
using Microsoft.EntityFrameworkCore;

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
                    .ToListAsync();

                return Results.Ok(vehicles);
            }).RequireAuthorization();

            app.MapGet("/api/vehicles/{vehicleId}", async (int vehicleId, AppDbContext db, HttpContext ctx, IUserContext userCtx) =>
            {
                var userId = userCtx.GetUserId(ctx);
                if (userId is null) return Results.Unauthorized();

                var vehicle = await db.Vehicles.FirstOrDefaultAsync(v => v.UserId == userId.Value && v.Id == vehicleId);
                if (vehicle is null) return Results.NotFound();

                return Results.Ok(vehicle);
            }).RequireAuthorization();

            app.MapPost("/api/vehicles", async (VehicleCreateDTO vehicleDto, AppDbContext db, HttpContext ctx, IUserContext userCtx) =>
            {
                var userId = userCtx.GetUserId(ctx);
                if (userId is null) return Results.Unauthorized();

                var vehicle = new Vehicle
                {
                    Brand = vehicleDto.Brand,
                    Model = vehicleDto.Model,
                    Year = vehicleDto.Year,
                    Mileage = vehicleDto.Mileage,
                    VIN = vehicleDto.VIN,
                    UserId = userId.Value
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
                            Mileage = entry.Mileage
                        };

                        db.Maintenances.Add(record);
                    }
                await db.SaveChangesAsync();
                }


                return Results.Created($"/api/vehicles/{vehicle.Id}", vehicle);
            }).RequireAuthorization();

            app.MapPut("/api/vehicles/{vehicleId}", async (int vehicleId, VehicleUpdateDTO vehicleDto, AppDbContext db, HttpContext ctx, IUserContext userCtx) =>
            {
                var userId = userCtx.GetUserId(ctx);
                if (userId is null) return Results.Unauthorized();

                var existing = db.Vehicles.First(v => v.UserId == userId.Value && v.Id == vehicleId);
                if (existing is null) return Results.NotFound();

                if (!string.IsNullOrWhiteSpace(vehicleDto.Brand))
                    existing.Brand = vehicleDto.Brand;

                if (!string.IsNullOrWhiteSpace(vehicleDto.Model))
                    existing.Model = vehicleDto.Model;

                if (vehicleDto.Year.HasValue)
                    existing.Year = vehicleDto.Year.Value;

                if (vehicleDto.Mileage.HasValue)
                    existing.Mileage = vehicleDto.Mileage.Value;

                if (!string.IsNullOrWhiteSpace(vehicleDto.VIN))
                    existing.VIN = vehicleDto.VIN;

                await db.SaveChangesAsync();
                return Results.Accepted($"/api/vehicles/{vehicleId}", existing);
            }).RequireAuthorization();

            app.MapDelete("/api/vehicles/{vehicleId}", async (int vehicleId, AppDbContext db, HttpContext ctx, IUserContext userCtx) =>
            {
                var userId = userCtx.GetUserId(ctx);
                if (userId is null) return Results.Unauthorized();

                var existing = db.Vehicles.First(v => v.UserId == userId.Value && v.Id == vehicleId);
                if (existing is null) return Results.NotFound();

                db.Vehicles.Remove(existing);
                await db.SaveChangesAsync();
                return Results.Ok();
            }).RequireAuthorization();

        }
    }
}