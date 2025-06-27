namespace AutoMT.Models;

public class ServiceRecord
{
    public int Id { get; set; }

    public string Description { get; set; } = default!;
    public int MileageAtService { get; set; }
    public DateTime DateOfService { get; set; }

    public int VehicleId { get; set; }
}