using ArenaVoiceBackend.Hubs;
using Microsoft.AspNetCore.SignalR;

var builder = WebApplication.CreateBuilder(args);

// Configuração de CORS permissiva para desenvolvimento e túneis públicos com SignalR
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

builder.Services.AddSignalR();

var app = builder.Build();

app.UseCors();

// Estado em memória simples para a POC
int? lastSupportedSeat = null;

// Endpoint POST /api/support
app.MapPost("/api/support", async (SupportRequest request, IHubContext<ArenaHub> hubContext) =>
{
    // 1. Validar que seatNumber está entre 1 e 4
    if (request.SeatNumber < 1 || request.SeatNumber > 4)
    {
        return Results.BadRequest(new { error = "seatNumber deve estar entre 1 e 4." });
    }

    // 2. Registrar no console
    Console.WriteLine($"CADEIRA {request.SeatNumber} APOIOU!");

    // 3. Atualizar o estado em memória
    lastSupportedSeat = request.SeatNumber;

    // 4. Disparar imediatamente evento SignalR para todos os navegadores conectados
    await hubContext.Clients.All.SendAsync("ChairSupported", new { seatNumber = request.SeatNumber });

    // Responder ao ESP32 / chamador HTTP 200
    return Results.Ok(new
    {
        accepted = true,
        seatNumber = request.SeatNumber
    });
});

// Endpoint GET /api/state
app.MapGet("/api/state", () =>
{
    return Results.Ok(new
    {
        lastSupportedSeat
    });
});

// Mapeamento do Hub SignalR
app.MapHub<ArenaHub>("/arenaHub");

Console.WriteLine("=========================================");
Console.WriteLine(" ARENA VOICE BACKEND INICIADO COM SUCESSO ");
Console.WriteLine(" Endpoints:                             ");
Console.WriteLine("   POST /api/support                    ");
Console.WriteLine("   GET  /api/state                      ");
Console.WriteLine("   HUB  /arenaHub                       ");
Console.WriteLine("=========================================");

app.Run();

// Modelo do payload de apoio
public record SupportRequest(int SeatNumber);
