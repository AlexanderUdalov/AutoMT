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
        public DbSet<MaintenanceRecord> Maintenances => Set<MaintenanceRecord>();
        public DbSet<Part> Parts => Set<Part>();
        public DbSet<MaintenanceUsedParts> MaintenanceUsedParts => Set<MaintenanceUsedParts>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            modelBuilder.Entity<MaintenanceUsedParts>()
                .HasKey(mup => new { mup.MaintenanceId, mup.PartId });
        }
    }
}