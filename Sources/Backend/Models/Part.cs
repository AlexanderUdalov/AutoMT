namespace AutoMT.Models;

public enum PartType
{
    
}

public class Part
{
    int Id { get; set; }
    PartType Type { get; set; }
    string Article { get; set; } = default!;
    string Brand { get; set; } = default!;
}