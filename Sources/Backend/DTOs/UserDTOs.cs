namespace AutoMT.DTOs;

public class RegisterDTO
{
    public string Username { get; set; } = default!;
    public string Password { get; set; } = default!;
}

public class LoginDTO
{
    public string Username { get; set; } = default!;
    public string Password { get; set; } = default!;
}