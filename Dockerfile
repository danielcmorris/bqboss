# Stage 1: Build Angular frontend
FROM node:22-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npx ng build --configuration production

# Stage 2: Build .NET backend
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS backend-build
WORKDIR /app/backend
COPY backend/BigQueryApi/BigQueryApi.csproj ./BigQueryApi/
RUN dotnet restore BigQueryApi/BigQueryApi.csproj
COPY backend/ ./
RUN dotnet publish BigQueryApi/BigQueryApi.csproj -c Release -o /publish

# Stage 3: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=backend-build /publish ./
COPY --from=frontend-build /app/frontend/dist/frontend/browser ./wwwroot/

ENV PORT=8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "BigQueryApi.dll"]
