using AutoMT.Models;

namespace AutoMT.Data
{
    public class TypesConfig
    {
        public List<MaintenanceType> MaintenanceTypes { get; set; } = [];
        public List<PartType> PartTypes { get; set; } = [];
        public List<MaintenanceRequiredPartTypes> MaintenanceRequiredPartTypes { get; set; } = [];
    }
}