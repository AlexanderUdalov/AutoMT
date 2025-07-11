namespace AutoMT.DTOs;

public class MaintenanceHistoryRecordDTO
{
    public int Id { get; set; }
    public int TypeId { get; set; }
    public int Mileage { get; set; }
    public List<MaintenancePartDTO> Parts { get; set; } = default!;
}

public class MaintenancePartDTO
{
    public int Id { get; set; }
    public int TypeId { get; set; }
    public string Article { get; set; } = default!;
    public string Brand { get; set; } = default!;
}