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
        public DbSet<VehicleNote> VehicleNotes => Set<VehicleNote>();
        public DbSet<MaintenanceRecord> Maintenances => Set<MaintenanceRecord>();
        public DbSet<Part> Parts => Set<Part>();
        public DbSet<MaintenanceUsedParts> MaintenanceUsedParts => Set<MaintenanceUsedParts>();
        public DbSet<VehicleMaintenanceType> VehicleMaintenanceTypes => Set<VehicleMaintenanceType>();
        public DbSet<MaintenanceType> CustomTypes => Set<MaintenanceType>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            modelBuilder.Entity<VehicleNote>().HasOne<Vehicle>().WithMany()
                .HasForeignKey(n => n.VehicleId).OnDelete(DeleteBehavior.Cascade);
            modelBuilder.Entity<MaintenanceUsedParts>()
                .HasKey(mup => new { mup.MaintenanceId, mup.PartId });

            modelBuilder.Entity<VehicleMaintenanceType>()
                .HasKey(mup => new { mup.VehicleId, mup.TypeId });
        }
    }
}
