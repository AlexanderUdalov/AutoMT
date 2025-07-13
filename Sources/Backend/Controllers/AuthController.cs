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
            app.MapGet("/api/auth/validate", () => Results.Ok()).RequireAuthorization();
            app.MapPost("/api/auth/changeUsername", async ([FromBody] string newUsername, AppDbContext db, HttpContext ctx, IUserContext userCtx) =>
            {
                var userId = userCtx.GetUserId(ctx);
                if (userId is null) return Results.Unauthorized();

                var isTaken = await db.Users.AnyAsync(u => u.Name == newUsername);
                if (isTaken)
                    return Results.Conflict();

                var user = await db.Users.FindAsync(userId);
                if (user is null)
                    return Results.NotFound();

                user.Name = newUsername;
                await db.SaveChangesAsync();

                return Results.Ok();
            }).RequireAuthorization();

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
            }).RequireAuthorization();

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
            }).RequireAuthorization();

            app.MapDelete("/api/auth/delete", async (AppDbContext db, PasswordHasher<string> hasher, HttpContext ctx, IUserContext userCtx) =>
            {
                var userId = userCtx.GetUserId(ctx);
                if (userId is null) return Results.Unauthorized();

                var user = await db.Users.FindAsync(userId);
                if (user is null)
                    return Results.NotFound();

                db.Users.Remove(user);
                await db.SaveChangesAsync();

                return Results.Ok();
            }).RequireAuthorization();

            app.MapPost("/api/auth/register", async (RegisterDTO dto, AppDbContext db, JwtService jwtService, PasswordHasher<string> hasher) =>
            {
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