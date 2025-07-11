namespace AutoMT.Models;

public class PartType
{
    public int Id { get; set; }
    public string Name { get; set; } = default!;
}

public class Part
{
    public int Id { get; set; }
    public int TypeId { get; set; }
    public string Article { get; set; } = default!;
    public string Brand { get; set; } = default!;
}