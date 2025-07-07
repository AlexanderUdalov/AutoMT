namespace AutoMT.Models;

public class Vehicle
{
    public int Id { get; set; }

    public string VIN { get; set; } = default!;

    public string Brand { get; set; } = default!;

    public string Model { get; set; } = default!;

    public int Year { get; set; }

    public int CurrentMileage { get; set; }

    public ICollection<Maintenance> MaintenanceHistory { get; set; } = new List<Maintenance>();

    public ICollection<Maintenance> PlannedMaintenance { get; set; } = new List<Maintenance>();
}