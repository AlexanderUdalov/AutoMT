using System.Text.Json;
using AutoMT.Data;
using AutoMT.DTOs;
using AutoMT.Models;
using AutoMT.Services;
using Microsoft.EntityFrameworkCore;

namespace AutoMT.Controllers;

public static class NotesController
{
    public static void MapNotesEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/vehicles/{vehicleId:int}/notes").RequireAuthorization();

        group.MapGet("", async (int vehicleId, AppDbContext db, HttpContext ctx, IUserContext user) =>
        {
            if (!await OwnsVehicle(vehicleId, db, ctx, user)) return Results.NotFound();
            var notes = await db.VehicleNotes.AsNoTracking()
                .Where(n => n.VehicleId == vehicleId).OrderBy(n => n.Id).ToListAsync();
            return Results.Ok(notes.Select(ToDto));
        });

        group.MapPost("", async (int vehicleId, VehicleNoteDTO dto, AppDbContext db, HttpContext ctx, IUserContext user) =>
        {
            if (!await OwnsVehicle(vehicleId, db, ctx, user)) return Results.NotFound();
            var error = Validate(dto);
            if (error != null) return Results.BadRequest(new { message = error });
            var note = new VehicleNote { VehicleId = vehicleId };
            Apply(note, dto);
            db.VehicleNotes.Add(note);
            await db.SaveChangesAsync();
            return Results.Created($"/api/vehicles/{vehicleId}/notes/{note.Id}", ToDto(note));
        });

        group.MapPut("/{noteId:int}", async (int vehicleId, int noteId, VehicleNoteDTO dto, AppDbContext db, HttpContext ctx, IUserContext user) =>
        {
            if (!await OwnsVehicle(vehicleId, db, ctx, user)) return Results.NotFound();
            var note = await db.VehicleNotes.FirstOrDefaultAsync(n => n.VehicleId == vehicleId && n.Id == noteId);
            if (note == null) return Results.NotFound();
            var error = Validate(dto);
            if (error != null) return Results.BadRequest(new { message = error });
            Apply(note, dto);
            await db.SaveChangesAsync();
            return Results.Ok(ToDto(note));
        });

        group.MapDelete("/{noteId:int}", async (int vehicleId, int noteId, AppDbContext db, HttpContext ctx, IUserContext user) =>
        {
            if (!await OwnsVehicle(vehicleId, db, ctx, user)) return Results.NotFound();
            var note = await db.VehicleNotes.FirstOrDefaultAsync(n => n.VehicleId == vehicleId && n.Id == noteId);
            if (note == null) return Results.NotFound();
            db.VehicleNotes.Remove(note);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }

    private static Task<bool> OwnsVehicle(int vehicleId, AppDbContext db, HttpContext ctx, IUserContext user)
    {
        var userId = user.GetUserId(ctx);
        return db.Vehicles.AnyAsync(v => v.Id == vehicleId && v.UserId == userId);
    }

    private static string? Validate(VehicleNoteDTO dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Title) || dto.Title.Length > 80) return "Укажите название заметки (до 80 символов).";
        if (dto.Kind is not ("text" or "checklist" or "link")) return "Неизвестный формат заметки.";
        if (dto.Body == null || dto.Body.Length > 2000) return "Текст заметки не должен превышать 2000 символов.";
        if (dto.Kind == "text" && string.IsNullOrWhiteSpace(dto.Body)) return "Введите текст заметки.";
        if (dto.Kind == "link" && (dto.Url?.Length > 2048 || !Uri.TryCreate(dto.Url, UriKind.Absolute, out var url) || (url.Scheme != "https" && url.Scheme != "http")))
            return "Укажите ссылку, начинающуюся с https:// или http://.";
        if (dto.Kind == "checklist" && (dto.Items == null || dto.Items.Count == 0 || dto.Items.Count > 100 || dto.Items.Any(i => i == null || string.IsNullOrWhiteSpace(i.Text) || i.Text.Length > 500)))
            return "Добавьте от 1 до 100 пунктов (до 500 символов каждый).";
        return null;
    }

    private static void Apply(VehicleNote note, VehicleNoteDTO dto)
    {
        note.Title = dto.Title.Trim();
        note.Kind = dto.Kind;
        note.Body = dto.Kind == "checklist" ? "" : dto.Body.Trim();
        note.Url = dto.Kind == "link" ? dto.Url!.Trim() : null;
        note.ItemsJson = JsonSerializer.Serialize(dto.Kind == "checklist" ? dto.Items : new());
    }

    private static VehicleNoteDTO ToDto(VehicleNote note) => new()
    {
        Id = note.Id, Title = note.Title, Kind = note.Kind, Body = note.Body, Url = note.Url,
        Items = JsonSerializer.Deserialize<List<NoteChecklistItemDTO>>(note.ItemsJson) ?? new()
    };
}
