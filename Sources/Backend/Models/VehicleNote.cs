namespace AutoMT.Models;

public class VehicleNote
{
    public int Id { get; set; }
    public int VehicleId { get; set; }
    public string Title { get; set; } = "";
    public string Kind { get; set; } = "text";
    public string Body { get; set; } = "";
    public string? Url { get; set; }
    public string ItemsJson { get; set; } = "[]";
}
