using AutoMT.Data;
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
                        .ToListAsync();

                    return Results.Ok(records);
                }).RequireAuthorization();
        }
    }
}