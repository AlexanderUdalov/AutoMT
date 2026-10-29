using Microsoft.EntityFrameworkCore;

namespace AutoMT.Data;

public static class SchemaUpdates
{
    // This project predates EF migrations. EnsureCreated alone does not add tables
    // to an existing database; keep this additive update safe to run on each start.
    public static void Apply(AppDbContext db)
    {
        db.Database.EnsureCreated();
        db.Database.ExecuteSqlRaw(@"
            CREATE TABLE IF NOT EXISTS VehicleNotes (
                Id INTEGER NOT NULL CONSTRAINT PK_VehicleNotes PRIMARY KEY AUTOINCREMENT,
                VehicleId INTEGER NOT NULL,
                Title TEXT NOT NULL,
                Kind TEXT NOT NULL,
                Body TEXT NOT NULL,
                Url TEXT NULL,
                ItemsJson TEXT NOT NULL,
                CONSTRAINT FK_VehicleNotes_Vehicles_VehicleId
                    FOREIGN KEY (VehicleId) REFERENCES Vehicles (Id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS IX_VehicleNotes_VehicleId ON VehicleNotes (VehicleId);
        ");
    }
}
