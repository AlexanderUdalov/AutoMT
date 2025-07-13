using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using AutoMT.Data;
using AutoMT.Services;
using AutoMT.Controllers;

var jwtKey = "super_secret_jwt_key_123";
var key = Encoding.ASCII.GetBytes(jwtKey);

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
    db.Database.EnsureCreated();
}
app.UseCors("AllowAll");
app.UseAuthentication();
app.UseRouting();
app.UseStaticFiles();
app.UseAuthorization();
app.MapAuthEndpoints();
app.MapVehiclesEndpoints();
app.MapMaintenanceEndpoints();
app.Run();