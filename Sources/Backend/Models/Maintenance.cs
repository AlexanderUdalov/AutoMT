namespace AutoMT.Models;

public class MaintenanceType
{
    public int Id { get; set; }

    public string Name { get; set; } = default!;
    public string? Icon { get; set; } = default!;
    public int? Period { get; set; }
}

public class MaintenanceRecord
{
    public int Id { get; set; }
    
    public int VehicleId { get; set; }
    public int TypeId { get; set; }
    public int Mileage { get; set; }
}