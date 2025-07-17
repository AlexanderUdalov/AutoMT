namespace AutoMT.DTOs;

public class VehicleUpdateDTO
{
    public string? VIN { get; set; }

    public string? Brand { get; set; }

    public string? Model { get; set; }

    public int? Year { get; set; }

    public int? Mileage { get; set; }

    public bool? IsDefault { get; set; }

    public bool? DisableNotify { get; set; }
}

public class VehicleCreateDTO
{
    public string VIN { get; set; } = default!;

    public string Brand { get; set; } = default!;

    public string Model { get; set; } = default!;

    public int Year { get; set; }

    public int Mileage { get; set; }

    public List<MaintenanceHistoryRecordDTO> MaintenanceHistory { get; set; } = default!;
}
