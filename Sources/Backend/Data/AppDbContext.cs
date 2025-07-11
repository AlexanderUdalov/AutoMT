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

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<MaintenanceType>().HasData(
                new MaintenanceType { Id = 1, Name = "Замена масла", Icon = "fas fa-oil-can", Period = 7500 },
                new MaintenanceType { Id = 2, Name = "Замена воздушного фильтра", Icon = "fas fa-oil-can", Period = 7500 },
                new MaintenanceType { Id = 3, Name = "Замена тормозных колодок", Icon = "fas fa-oil-can", Period = 7500 },
                new MaintenanceType { Id = 4, Name = "Замена свечей зажигания", Icon = "fas fa-oil-can", Period = 7500 },
                new MaintenanceType { Id = 5, Name = "Проверка охлаждающей жидкости", Icon = "fas fa-oil-can", Period = 7500 }
            );
        }
    }
}