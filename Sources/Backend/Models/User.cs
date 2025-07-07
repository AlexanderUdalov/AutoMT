namespace AutoMT.Models;

public class User
{
    public int Id { get; set; }

    public string Name { get; set; } = default!;
    public string PasswordHash { get; set; } = default!;

    public ICollection<Vehicle> Vehicles { get; set; } = new List<Vehicle>();
}