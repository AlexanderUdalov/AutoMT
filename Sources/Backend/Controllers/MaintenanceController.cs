using AutoMT.Data;
using AutoMT.DTOs;
using AutoMT.Models;
using AutoMT.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace AutoMT.Controllers;

public static class MaintenanceController
{
    public static void MapMaintenanceEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/maintenance/types", (IOptions<TypesConfig> config) =>
            Results.Ok(config.Value.MaintenanceTypes.Select(type => ToTypeDto(type, config.Value))))
            .RequireAuthorization();

        app.MapGet("/api/maintenance/{vehicleId:int}/types", async (int vehicleId, AppDbContext db,
            HttpContext ctx, IUserContext user, IOptions<TypesConfig> config) =>
        {
            if (!await OwnsVehicle(vehicleId, db, ctx, user)) return Results.NotFound();
            var ids = await db.VehicleMaintenanceTypes.Where(t => t.VehicleId == vehicleId).Select(t => t.TypeId).ToListAsync();
            var custom = await db.CustomTypes.AsNoTracking().Where(t => ids.Contains(t.Id)).ToListAsync();
            return Results.Ok(config.Value.MaintenanceTypes.Where(t => ids.Contains(t.Id)).Concat(custom)
                .Select(type => ToTypeDto(type, config.Value)));
        }).RequireAuthorization();

        app.MapGet("/api/maintenance/{vehicleId:int}", async (int vehicleId, bool? fullHistory, AppDbContext db,
            HttpContext ctx, IUserContext user, IOptions<TypesConfig> config) =>
        {
            if (!await OwnsVehicle(vehicleId, db, ctx, user)) return Results.NotFound();
            var records = await db.Maintenances.AsNoTracking().Where(r => r.VehicleId == vehicleId).ToListAsync();
            var active = await db.VehicleMaintenanceTypes.Where(t => t.VehicleId == vehicleId).Select(t => t.TypeId).ToListAsync();
            if (fullHistory != true)
                records = records.Where(r => active.Contains(r.TypeId)).GroupBy(r => r.TypeId)
                    .Select(g => g.OrderByDescending(r => r.Mileage).ThenByDescending(r => r.Id).First()).ToList();
            var ids = records.Select(r => r.Id).ToList();
            var usedParts = await (from used in db.MaintenanceUsedParts join part in db.Parts on used.PartId equals part.Id
                                   where ids.Contains(used.MaintenanceId)
                                   select new { used.MaintenanceId, part.Id, part.TypeId, part.Brand, part.Article }).ToListAsync();
            var custom = await db.CustomTypes.AsNoTracking().Where(t => records.Select(r => r.TypeId).Contains(t.Id)).ToListAsync();
            var names = config.Value.MaintenanceTypes.Concat(custom).GroupBy(t => t.Id).ToDictionary(g => g.Key, g => g.First().Name);
            return Results.Ok(records.Select(r => new MaintenanceHistoryRecordDTO
            {
                Id = r.Id, TypeId = r.TypeId, TypeName = names.GetValueOrDefault(r.TypeId, "Техническая работа"),
                Mileage = r.Mileage, IsSkipped = r.IsSkipped,
                Parts = usedParts.Where(p => p.MaintenanceId == r.Id).Select(p => new MaintenancePartDTO
                {
                    Id = p.Id, TypeId = p.TypeId, Name = config.Value.PartTypes.FirstOrDefault(t => t.Id == p.TypeId)?.Name ?? "Расходник",
                    Brand = p.Brand, Article = p.Article
                }).ToList()
            }));
        }).RequireAuthorization();

        app.MapPost("/api/maintenance/{vehicleId:int}", async (int vehicleId, MaintenanceHistoryRecordDTO dto,
            AppDbContext db, HttpContext ctx, IUserContext user, IOptions<TypesConfig> config) =>
        {
            var userId = user.GetUserId(ctx);
            var vehicle = await db.Vehicles.FirstOrDefaultAsync(v => v.Id == vehicleId && v.UserId == userId);
            if (vehicle == null) return Results.NotFound();
            if (dto.Mileage < 0 || dto.Mileage > 9999999 || !await db.VehicleMaintenanceTypes.AnyAsync(t => t.VehicleId == vehicleId && t.TypeId == dto.TypeId))
                return Results.BadRequest(new { message = "Проверьте тип работы и пробег." });
            var previous = await db.Maintenances.Where(r => r.VehicleId == vehicleId && r.TypeId == dto.TypeId).MaxAsync(r => (int?)r.Mileage) ?? 0;
            if (dto.Mileage < previous) return Results.BadRequest(new { message = "Пробег меньше предыдущего выполнения." });
            var parts = dto.Parts ?? new();
            var allowed = config.Value.MaintenanceRequiredPartTypes.Where(p => p.MaintenanceTypeId == dto.TypeId).Select(p => p.PartTypeId).ToList();
            foreach (var part in parts)
                if (part.TypeId == 0) part.TypeId = config.Value.PartTypes.FirstOrDefault(t => t.Name == part.Name)?.Id ?? 0;
            if ((dto.IsSkipped == true && parts.Count > 0) || parts.Count > allowed.Count || parts.Select(p => p.TypeId).Distinct().Count() != parts.Count ||
                parts.Any(p => !allowed.Contains(p.TypeId) || string.IsNullOrWhiteSpace(p.Brand) || p.Brand.Length > 120 || (p.Article?.Length ?? 0) > 120))
                return Results.BadRequest(new { message = "Проверьте типы, бренды и артикулы расходников." });
            await using var transaction = await db.Database.BeginTransactionAsync();
            var record = new MaintenanceRecord { VehicleId = vehicleId, TypeId = dto.TypeId, Mileage = dto.Mileage, IsSkipped = dto.IsSkipped ?? false };
            db.Maintenances.Add(record);
            if (dto.Mileage > vehicle.Mileage) { vehicle.Mileage = dto.Mileage; vehicle.LastMileageUpdate = DateTime.UtcNow; }
            var savedParts = parts.Select(p => new Part { TypeId = p.TypeId, Brand = p.Brand.Trim(), Article = p.Article?.Trim() ?? "" }).ToList();
            db.Parts.AddRange(savedParts);
            await db.SaveChangesAsync();
            db.MaintenanceUsedParts.AddRange(savedParts.Select(p => new MaintenanceUsedParts { MaintenanceId = record.Id, PartId = p.Id }));
            await db.SaveChangesAsync();
            await transaction.CommitAsync();
            return Results.Created($"/api/maintenance/{vehicleId}/{record.Id}", new { record.Id });
        }).RequireAuthorization();

        app.MapPost("/api/maintenance/{vehicleId:int}/types", async (int vehicleId, MaintenanceTypeDTO dto,
            AppDbContext db, HttpContext ctx, IUserContext user, IOptions<TypesConfig> config) =>
        {
            if (!await OwnsVehicle(vehicleId, db, ctx, user)) return Results.NotFound();
            await using var transaction = await db.Database.BeginTransactionAsync();
            int id = dto.Id;
            if (id == -1)
            {
                if (string.IsNullOrWhiteSpace(dto.Name) || dto.Name.Length > 100 || dto.Period <= 0 || dto.Period > 9999999)
                    return Results.BadRequest(new { message = "Укажите название и положительный интервал работы." });
                var type = new MaintenanceType { Name = dto.Name.Trim(), Period = dto.Period, Icon = "wrench" };
                db.CustomTypes.Add(type); await db.SaveChangesAsync(); id = type.Id;
            }
            else if (!config.Value.MaintenanceTypes.Any(t => t.Id == id))
                return Results.BadRequest(new { message = "Неизвестный тип работы." });
            if (await db.VehicleMaintenanceTypes.AnyAsync(t => t.VehicleId == vehicleId && t.TypeId == id))
                return Results.Conflict(new { message = "Эта работа уже добавлена." });
            db.VehicleMaintenanceTypes.Add(new VehicleMaintenanceType { VehicleId = vehicleId, TypeId = id });
            db.Maintenances.Add(new MaintenanceRecord { VehicleId = vehicleId, TypeId = id, Mileage = 0 });
            await db.SaveChangesAsync(); await transaction.CommitAsync();
            return Results.Ok(new { typeId = id });
        }).RequireAuthorization();

        app.MapDelete("/api/maintenance/{vehicleId:int}/types/{typeId:int}", async (int vehicleId, int typeId,
            AppDbContext db, HttpContext ctx, IUserContext user) =>
        {
            if (!await OwnsVehicle(vehicleId, db, ctx, user)) return Results.NotFound();
            var type = await db.VehicleMaintenanceTypes.FirstOrDefaultAsync(t => t.VehicleId == vehicleId && t.TypeId == typeId);
            if (type == null) return Results.NotFound();
            db.VehicleMaintenanceTypes.Remove(type);
            // Keep completed work in history when a regulation is removed.
            var initial = await db.Maintenances.Where(r => r.VehicleId == vehicleId && r.TypeId == typeId && r.Mileage == 0).ToListAsync();
            var ids = initial.Select(r => r.Id).ToList();
            db.MaintenanceUsedParts.RemoveRange(db.MaintenanceUsedParts.Where(p => ids.Contains(p.MaintenanceId)));
            db.Maintenances.RemoveRange(initial);
            await db.SaveChangesAsync(); return Results.NoContent();
        }).RequireAuthorization();
    }

    private static MaintenanceTypeDTO ToTypeDto(MaintenanceType type, TypesConfig config) => new()
    {
        Id = type.Id, Name = type.Name, Icon = type.Icon, Period = type.Period,
        Parts = config.MaintenanceRequiredPartTypes.Where(p => p.MaintenanceTypeId == type.Id)
            .Join(config.PartTypes, p => p.PartTypeId, t => t.Id, (_, t) => new MaintenancePartTypeDTO { Id = t.Id, Name = t.Name }).ToList()
    };

    private static Task<bool> OwnsVehicle(int vehicleId, AppDbContext db, HttpContext ctx, IUserContext user)
    {
        var userId = user.GetUserId(ctx);
        return db.Vehicles.AnyAsync(v => v.Id == vehicleId && v.UserId == userId);
    }
}
