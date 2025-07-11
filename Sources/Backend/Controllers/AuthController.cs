using AutoMT.Data;
using AutoMT.DTOs;
using AutoMT.Models;
using AutoMT.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace AutoMT.Controllers
{
    public static class AuthController
    {
        public static void MapAuthEndpoints(this IEndpointRouteBuilder app)
        {
            app.MapPost("/api/register", async (RegisterDTO dto, AppDbContext db, JwtService jwtService, PasswordHasher<string> hasher) =>
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

            app.MapPost("/api/login", async (LoginDTO dto, AppDbContext db, JwtService jwtService, PasswordHasher<string> hasher) =>
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