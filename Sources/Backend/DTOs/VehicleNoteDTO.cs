namespace AutoMT.DTOs;

public class VehicleNoteDTO
{
    public int Id { get; set; }
    public string Title { get; set; } = "";
    public string Kind { get; set; } = "text";
    public string Body { get; set; } = "";
    public string? Url { get; set; }
    public List<NoteChecklistItemDTO> Items { get; set; } = new();
}

public class NoteChecklistItemDTO
{
    public string Text { get; set; } = "";
    public bool Done { get; set; }
}
