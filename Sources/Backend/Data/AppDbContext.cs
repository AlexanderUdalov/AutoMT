using Microsoft.EntityFrameworkCore;
using AutoMT.Models;

namespace AutoMT.Data
{

    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options)
            : base(options)
        {
        }

        public DbSet<User> Users => Set<User>();
        public DbSet<Vehicle> Vehicles => Set<Vehicle>();
        public DbSet<Maintenance> Maintenances => Set<Maintenance>();
    }
}