using TechnoWells.Api.Auth;
using TechnoWells.Api.Configuration;
using TechnoWells.Api.Data;
using TechnoWells.Api.Repositories;

var builder = WebApplication.CreateBuilder(args);

// Settings are read and checked here, before anything starts. A bad value stops the app with a clear message.
var authSettings = AuthSettings.Load(builder.Configuration, builder.Environment);
var corsSettings = CorsSettings.Load(builder.Configuration);

builder.Services.AddControllers();
builder.Services.AddProblemDetails();
builder.Services.AddAppAuthentication(authSettings);
builder.Services.AddAppCors(corsSettings);
builder.Services.AddSqlDatabase();
builder.Services.AddRepositories();

var app = builder.Build();

app.UseExceptionHandler();
app.UseCors(CorsSettings.PolicyName);
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();

// Lets the test project start the API with WebApplicationFactory<Program>.
public partial class Program;
