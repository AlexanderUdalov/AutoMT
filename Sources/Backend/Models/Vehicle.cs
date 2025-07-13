namespace AutoMT.Models;

public class Vehicle
{
    public int Id { get; set; }
    public int UserId { get; set; }

    public string VIN { get; set; } = default!;

    public string Brand { get; set; } = default!;

    public string Model { get; set; } = default!;

    public int Year { get; set; }

    public int Mileage { get; set; }

    public bool IsDefault { get; set; }
    public string? ImageUrl { get; set; } = default!;
}