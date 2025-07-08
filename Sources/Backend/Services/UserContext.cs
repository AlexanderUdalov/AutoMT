using System.Security.Claims;

namespace AutoMT.Services
{
    public interface IUserContext
    {
        int? GetUserId(HttpContext context);
    }

    public class UserContext : IUserContext
    {
        public int? GetUserId(HttpContext context)
        {
            if (context.User.Identity is ClaimsIdentity identity)
            {
                var claim = identity.FindFirst(ClaimTypes.NameIdentifier);
                return claim != null ? int.Parse(claim.Value) : null;
            }
            return null;
        }
    }
}