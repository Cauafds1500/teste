# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["backend/ArenaVoiceBackend.csproj", "backend/"]
RUN dotnet restore "backend/ArenaVoiceBackend.csproj"
COPY backend/ backend/
WORKDIR /src/backend
RUN dotnet publish "ArenaVoiceBackend.csproj" -c Release -o /app/publish

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:5000
EXPOSE 5000
ENTRYPOINT ["dotnet", "ArenaVoiceBackend.dll"]
