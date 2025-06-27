namespace AutoMT.Models;

public class Vehicle
{
    public int Id { get; set; }

    public string VIN { get; set; } = default!;

    // todo: parsed VIN

    public int CurrentMileage { get; set; }

    public int UserId { get; set; }
    public User User { get; set; } = default!;

    public ICollection<ServiceRecord> ServiceRecords { get; set; } = new List<ServiceRecord>();
}