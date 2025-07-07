using System.Text;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using AutoMT.Data;
using AutoMT.Models;
using AutoMT.DTOs;

int? GetUserId(HttpContext context)
{
    if (context.User.Identity is ClaimsIdentity identity)
    {
        var claim = identity.FindFirst(ClaimTypes.NameIdentifier);
        return claim != null ? int.Parse(claim.Value) : null;
    }
    return null;
}

var passwordHasher = new PasswordHasher<string>();

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddCors(options =>
{
     options.AddPolicy("AllowAll", policy =>
    {
        policy
            .AllowAnyOrigin()
            .AllowAnyMethod()
            .AllowAnyHeader();
    });
});

builder.Services.AddDbContext<AppDbContext>(options => options.UseSqlite("Data Source=auto_mt.db"));

var jwtKey = "super_secret_jwt_key_123";
var key = Encoding.ASCII.GetBytes(jwtKey);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = false,
        ValidateAudience = false,
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ClockSkew = TimeSpan.Zero
    };
});
builder.Services.AddAuthorization();

var app = builder.Build();
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
}
app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/", () => "Hello World!");
app.MapGet("/api/users", async (AppDbContext db) => await db.Users.ToListAsync());
app.MapGet("/api/vehicles", async (AppDbContext db, HttpContext ctx) =>
{
    var userId = GetUserId(ctx);
    if (userId is null) return Results.Unauthorized();

    var vehicles = await db.Vehicles
        .Where(v => v.UserId == userId)
        .ToListAsync();

    return Results.Ok(vehicles);
}).RequireAuthorization();

app.MapPost("/api/vehicles", async (Vehicle vehicle, AppDbContext db, HttpContext ctx) =>
{
    var userId = GetUserId(ctx);
    if (userId is null) return Results.Unauthorized();

    vehicle.UserId = userId.Value;
    db.Vehicles.Add(vehicle);
    await db.SaveChangesAsync();

    return Results.Created($"/api/vehicles/{vehicle.Id}", vehicle);
}).RequireAuthorization();

app.MapPost("/api/register", async (RegisterDTO dto, AppDbContext db) =>
{
    if (await db.Users.AnyAsync(u => u.Name == dto.Username))
        return Results.BadRequest("Username already exists");

    var user = new User
    {
        Name = dto.Username,
        PasswordHash = passwordHasher.HashPassword(dto.Username, dto.Password)
    };

    db.Users.Add(user);
    await db.SaveChangesAsync();

    return Results.Ok("User registered");
});


app.MapPost("/api/login", async (LoginDTO dto, AppDbContext db) =>
{
    var user = await db.Users.FirstOrDefaultAsync(u => u.Name == dto.Username);
    if (user is null)
        return Results.Unauthorized();

    var result = passwordHasher.VerifyHashedPassword(dto.Username, user.PasswordHash, dto.Password);
    if (result == PasswordVerificationResult.Failed)
        return Results.Unauthorized();

    var tokenHandler = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler();
    var tokenDescriptor = new SecurityTokenDescriptor
    {
        Subject = new ClaimsIdentity(new[] {
        new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
        new Claim(ClaimTypes.Name, user.Name)
    }),
        Expires = DateTime.UtcNow.AddDays(7),
        SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
    };

    var token = tokenHandler.CreateToken(tokenDescriptor);
    var jwt = tokenHandler.WriteToken(token);

    return Results.Ok(new { token = jwt });
});

// Получить все записи для автомобиля
app.MapGet("/api/vehicles/{vehicleId}/services", async (int vehicleId, AppDbContext db, HttpContext ctx) =>
{
    var userId = GetUserId(ctx);
    if (userId is null) return Results.Unauthorized();

    var vehicle = await db.Vehicles.FindAsync(vehicleId);
    if (vehicle == null || vehicle.UserId != userId) return Results.Forbid();

    var records = await db.ServiceRecords
        .Where(r => r.VehicleId == vehicleId)
        .ToListAsync();

    return Results.Ok(records);
}).RequireAuthorization();

// Добавить запись
app.MapPost("/api/vehicles/{vehicleId}/services", async (int vehicleId, Maintenance dto, AppDbContext db, HttpContext ctx) =>
{
    var userId = GetUserId(ctx);
    if (userId is null) return Results.Unauthorized();

    var vehicle = await db.Vehicles.FindAsync(vehicleId);
    if (vehicle == null || vehicle.UserId != userId) return Results.Forbid();

    dto.VehicleId = vehicleId;
    db.ServiceRecords.Add(dto);
    await db.SaveChangesAsync();

    return Results.Created($"/api/vehicles/{vehicleId}/services/{dto.Id}", dto);
}).RequireAuthorization();

// Удалить запись
app.MapDelete("/api/vehicles/{vehicleId}/services/{id}", async (int vehicleId, int id, AppDbContext db, HttpContext ctx) =>
{
    var userId = GetUserId(ctx);
    if (userId is null) return Results.Unauthorized();

    var record = await db.ServiceRecords.FindAsync(id);
    if (record == null) return Results.NotFound();

    var vehicle = await db.Vehicles.FindAsync(vehicleId);
    if (vehicle == null || vehicle.UserId != userId || record.VehicleId != vehicleId)
        return Results.Forbid();

    db.ServiceRecords.Remove(record);
    await db.SaveChangesAsync();

    return Results.NoContent();
}).RequireAuthorization();

app.Run();