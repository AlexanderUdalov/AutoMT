using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using AutoMT.Data;
using AutoMT.Services;
using AutoMT.Controllers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.FileProviders;

var jwtKey = "super_secret_jwt_key_123";
var key = Encoding.ASCII.GetBytes(jwtKey);

var builder = WebApplication.CreateBuilder(args);
builder.Configuration.AddJsonFile("TypesConfig.json", optional: false, reloadOnChange: true);
builder.Services.Configure<TypesConfig>(builder.Configuration.GetSection("TypesConfig"));
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
builder.Services.AddDbContext<AppDbContext>(options => options.UseSqlite(
    builder.Configuration.GetConnectionString("AutoMT") ?? "Data Source=auto_mt.db"));
builder.Services.AddScoped<IUserContext, UserContext>();
builder.Services.AddScoped<PasswordHasher<string>>();
builder.Services.AddSingleton(new JwtService(jwtKey));
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
    SchemaUpdates.Apply(db);
    if (!db.CustomTypes.Any())
    {
        db.Database.ExecuteSqlRaw(
            "INSERT OR REPLACE INTO sqlite_sequence (name, seq) VALUES ('CustomTypes', 100)"
        );
    }
}

app.UseCors("AllowAll");
app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();
Directory.CreateDirectory(Path.Combine(app.Environment.ContentRootPath, "wwwroot"));
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(Path.Combine(app.Environment.ContentRootPath, "wwwroot"))
});
var frontendPath = new[] { "../Frontend", "../frontend" }
    .Select(path => Path.GetFullPath(Path.Combine(app.Environment.ContentRootPath, path)))
    .FirstOrDefault(Directory.Exists);
if (frontendPath != null)
{
    var frontendFiles = new PhysicalFileProvider(frontendPath);
    app.UseDefaultFiles(new DefaultFilesOptions { FileProvider = frontendFiles });
    app.UseStaticFiles(new StaticFileOptions { FileProvider = frontendFiles });
}
app.MapAuthEndpoints();
app.MapVehiclesEndpoints();
app.MapMaintenanceEndpoints();
app.MapNotesEndpoints();
app.MapGet("/api/health", () => Results.Ok(new { status = "ok" }));
app.Run();
