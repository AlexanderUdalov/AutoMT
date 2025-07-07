namespace AutoMT.Models;

public class MaintenanceType
{
    public int Id { get; set; }

    public int Name { get; set; }
    public string Icon { get; set; } = default!;
    public int PeriodMileage { get; set; }
    public int PeriodDays { get; set; }
    public bool IsCritical { get; set; }
    public bool IsCustom { get; set; }
}

public class Maintenance
{
    public int Id { get; set; }

    public string Comment { get; set; } = default!;
    public int Mileage { get; set; }
    public DateTime Date { get; set; }

    public ICollection<Part> Parts { get; set; } = new List<Part>();

    public MaintenanceType Type { get; set; } = default!;
    public int VehicleId { get; set; }
}