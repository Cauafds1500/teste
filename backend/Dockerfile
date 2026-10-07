# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["ArenaVoiceBackend.csproj", "./"]
RUN dotnet restore "ArenaVoiceBackend.csproj"
COPY . .
RUN dotnet publish "ArenaVoiceBackend.csproj" -c Release -o /app/publish

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:5000
EXPOSE 5000
ENTRYPOINT ["dotnet", "ArenaVoiceBackend.dll"]
