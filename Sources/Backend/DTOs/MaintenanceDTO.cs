namespace AutoMT.DTOs;

public class MaintenanceHistoryRecordDTO
{
    public int Id { get; set; }
    public int TypeId { get; set; }
    public int Mileage { get; set; }
    public bool? IsSkipped { get; set; }
    public List<MaintenancePartDTO> Parts { get; set; } = default!;
}

public class MaintenanceTypeDTO
{
    public int Id { get; set; }
    public string Name { get; set; } = default!;
    public string Icon { get; set; } = default!;
    public int Period { get; set; }
    public List<MaintenancePartTypeDTO> Parts { get; set; } = default!;
}

public class MaintenancePartTypeDTO
{
    public int Id { get; set; }
    public string Name { get; set; } = default!;
}

public class MaintenancePartDTO
{
    public string Name { get; set; } = default!;
    public string Article { get; set; } = default!;
    public string Brand { get; set; } = default!;
}