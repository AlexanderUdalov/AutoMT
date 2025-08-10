namespace AutoMT.Models;

public class MaintenanceType
{
    public int Id { get; set; }

    public string Name { get; set; } = default!;
    public string Icon { get; set; } = default!;
    public int Period { get; set; }
}

public class MaintenanceRequiredPartTypes
{
    public int MaintenanceTypeId { get; set; }
    public int PartTypeId { get; set; }
}

public class MaintenanceRecord
{
    public int Id { get; set; }

    public int VehicleId { get; set; }
    public int TypeId { get; set; }
    public int Mileage { get; set; }
    public bool IsSkipped { get; set; }
}

public class MaintenanceUsedParts
{
    public int MaintenanceId { get; set; }
    public int PartId { get; set; }
}

public class VehicleMaintenanceType
{
    public int VehicleId { get; set; }
    public int TypeId { get; set; }
}