using AutoMT.Data;
using AutoMT.DTOs;
using AutoMT.Models;
using AutoMT.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AutoMT.Controllers
{
    public static class AuthController
    {
        public static void MapAuthEndpoints(this IEndpointRouteBuilder app)
        {
            app.MapGet("/api/auth/me", async (AppDbContext db, HttpContext ctx, IUserContext userCtx) =>
            {
                var userId = userCtx.GetUserId(ctx);
                var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
                return user == null ? Results.Unauthorized() : Results.Ok(new { username = user.Name });
            }).RequireAuthorization();
            app.MapGet("/api/auth/validate", () => Results.Ok()).RequireAuthorization().DisableAntiforgery();
            app.MapPost("/api/auth/changeUsername", async ([FromBody] string newUsername, AppDbContext db, HttpContext ctx, IUserContext userCtx) =>
            {
                var userId = userCtx.GetUserId(ctx);
                if (userId is null) return Results.Unauthorized();

                if (string.IsNullOrWhiteSpace(newUsername) || newUsername.Length > 60)
                    return Results.BadRequest(new { message = "Укажите имя пользователя (до 60 символов)." });
                newUsername = newUsername.Trim();
                var isTaken = await db.Users.AnyAsync(u => u.Name == newUsername);
                if (isTaken)
                    return Results.Conflict();

                var user = await db.Users.FindAsync(userId);
                if (user is null)
                    return Results.NotFound();

                user.Name = newUsername;
                await db.SaveChangesAsync();

                return Results.Ok();
            }).RequireAuthorization().DisableAntiforgery();

            app.MapPost("/api/auth/changePassword", async ([FromBody] string newPassword, AppDbContext db, JwtService jwtService, PasswordHasher<string> hasher, HttpContext ctx, IUserContext userCtx) =>
            {
                var userId = userCtx.GetUserId(ctx);
                if (userId is null) return Results.Unauthorized();

                var user = await db.Users.FindAsync(userId);
                if (user is null)
                    return Results.NotFound();

                user.PasswordHash = hasher.HashPassword(user.Name, newPassword);
                await db.SaveChangesAsync();

                return Results.Ok();
            }).RequireAuthorization().DisableAntiforgery();

            app.MapPost("/api/auth/checkCurrentPassword", async ([FromBody] string password, AppDbContext db, PasswordHasher<string> hasher, HttpContext ctx, IUserContext userCtx) =>
            {
                var userId = userCtx.GetUserId(ctx);
                if (userId is null) return Results.Unauthorized();

                var user = await db.Users.FindAsync(userId);
                if (user is null)
                    return Results.NotFound();

                var result = hasher.VerifyHashedPassword(user.Name, user.PasswordHash, password);
                if (result == PasswordVerificationResult.Failed)
                    return Results.BadRequest();

                return Results.Ok();
            }).RequireAuthorization().DisableAntiforgery();

            app.MapDelete("/api/auth/delete", async (AppDbContext db, PasswordHasher<string> hasher, HttpContext ctx, IUserContext userCtx) =>
            {
                var userId = userCtx.GetUserId(ctx);
                if (userId is null) return Results.Unauthorized();

                var user = await db.Users.FindAsync(userId);
                if (user is null)
                    return Results.NotFound();

                await using var transaction = await db.Database.BeginTransactionAsync();
                var vehicleIds = await db.Vehicles.Where(v => v.UserId == userId).Select(v => v.Id).ToListAsync();
                var recordIds = await db.Maintenances.Where(r => vehicleIds.Contains(r.VehicleId)).Select(r => r.Id).ToListAsync();
                db.MaintenanceUsedParts.RemoveRange(db.MaintenanceUsedParts.Where(p => recordIds.Contains(p.MaintenanceId)));
                db.Maintenances.RemoveRange(db.Maintenances.Where(r => vehicleIds.Contains(r.VehicleId)));
                db.VehicleNotes.RemoveRange(db.VehicleNotes.Where(n => vehicleIds.Contains(n.VehicleId)));
                db.VehicleMaintenanceTypes.RemoveRange(db.VehicleMaintenanceTypes.Where(t => vehicleIds.Contains(t.VehicleId)));
                db.Vehicles.RemoveRange(db.Vehicles.Where(v => v.UserId == userId));
                db.Users.Remove(user);
                await db.SaveChangesAsync();
                await transaction.CommitAsync();

                return Results.Ok();
            }).RequireAuthorization().DisableAntiforgery();

            app.MapPost("/api/auth/register", async (RegisterDTO dto, AppDbContext db, JwtService jwtService, PasswordHasher<string> hasher) =>
            {
                if (string.IsNullOrWhiteSpace(dto.Username) || dto.Username.Length > 60 || string.IsNullOrEmpty(dto.Password) || dto.Password.Length < 6)
                    return Results.BadRequest(new { message = "Укажите имя и пароль не короче 6 символов." });
                dto.Username = dto.Username.Trim();
                if (await db.Users.AnyAsync(u => u.Name == dto.Username))
                    return Results.BadRequest("Username already exists");

                var user = new User
                {
                    Name = dto.Username,
                    PasswordHash = hasher.HashPassword(dto.Username, dto.Password)
                };

                db.Users.Add(user);
                await db.SaveChangesAsync();

                var token = jwtService.GenerateToken(user.Id, user.Name);
                return Results.Ok(new { token });
            });

            app.MapPost("/api/auth/login", async (LoginDTO dto, AppDbContext db, JwtService jwtService, PasswordHasher<string> hasher) =>
            {
                var user = await db.Users.FirstOrDefaultAsync(u => u.Name == dto.Username);
                if (user is null)
                    return Results.NotFound();

                var result = hasher.VerifyHashedPassword(dto.Username, user.PasswordHash, dto.Password);
                if (result == PasswordVerificationResult.Failed)
                    return Results.Unauthorized();

                var token = jwtService.GenerateToken(user.Id, user.Name);
                return Results.Ok(new { token });
            });

        }
    }
}
