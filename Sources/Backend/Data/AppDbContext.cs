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
        public DbSet<MaintenanceType> MaintenanceTypes => Set<MaintenanceType>();
        public DbSet<PartType> PartTypes => Set<PartType>();
        public DbSet<Part> Parts => Set<Part>();
        public DbSet<MaintenanceRequiredPartTypes> MaintenanceRequiredPartTypes => Set<MaintenanceRequiredPartTypes>();
        public DbSet<MaintenanceUsedParts> MaintenanceUsedParts => Set<MaintenanceUsedParts>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            modelBuilder.Entity<MaintenanceRequiredPartTypes>()
                .HasKey(mrp => new { mrp.MaintenanceTypeId, mrp.PartTypeId });
            modelBuilder.Entity<MaintenanceUsedParts>()
                .HasKey(mup => new { mup.MaintenanceId, mup.PartId });

            modelBuilder.Entity<MaintenanceType>().HasData(
                new MaintenanceType { Id = 1, Name = "Замена масла", Icon = "fas fa-oil-can", Period = 7500 },
                new MaintenanceType { Id = 2, Name = "Замена воздушного фильтра", Icon = "fas fa-oil-can", Period = 7500 },
                new MaintenanceType { Id = 3, Name = "Замена тормозных колодок", Icon = "fas fa-oil-can", Period = 7500 },
                new MaintenanceType { Id = 4, Name = "Замена свечей зажигания", Icon = "fas fa-oil-can", Period = 7500 },
                new MaintenanceType { Id = 5, Name = "Проверка охлаждающей жидкости", Icon = "fas fa-oil-can", Period = 7500 }
            );

            modelBuilder.Entity<PartType>().HasData(
                new PartType { Id = 1, Name = "Моторное масло" },
                new PartType { Id = 2, Name = "Маслянный фильтр" },
                new PartType { Id = 3, Name = "Воздушный фильтр" },
                new PartType { Id = 4, Name = "Тормозные колодки" },
                new PartType { Id = 5, Name = "Свчеа зажигания" }
            );

            modelBuilder.Entity<MaintenanceRequiredPartTypes>().HasData(
               new MaintenanceRequiredPartTypes { MaintenanceTypeId = 1, PartTypeId = 1 },
               new MaintenanceRequiredPartTypes { MaintenanceTypeId = 1, PartTypeId = 2 },
               new MaintenanceRequiredPartTypes { MaintenanceTypeId = 2, PartTypeId = 3 },
               new MaintenanceRequiredPartTypes { MaintenanceTypeId = 3, PartTypeId = 4 },
               new MaintenanceRequiredPartTypes { MaintenanceTypeId = 4, PartTypeId = 5 }

           );
        }
    }
}