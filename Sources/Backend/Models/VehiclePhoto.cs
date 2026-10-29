namespace AutoMT.Models;

public class VehiclePhoto
{
    public int Id { get; set; }
    public int VehicleId { get; set; }
    public string Url { get; set; } = default!;
}
