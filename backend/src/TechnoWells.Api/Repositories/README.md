# Repositories

Each data area has one interface (`IXxxRepository`) and one Dapper class (`XxxRepository`). Register both in `RepositoryServiceCollectionExtensions`.

**Rules**
- **Connections:** get them from `ISqlConnectionFactory.OpenAsync` and dispose them with `await using`.
- **Parameters only:** pass values as Dapper parameters (`new { holeId }`). Never build SQL text from values.
- **SQL text:** keep it in `const string` fields at the top of the class, so it is easy to read and review.
- **Cancellation:** pass the `CancellationToken` through, using `new CommandDefinition(sql, args, cancellationToken: ct)`.
- **Writes:** when one write touches several tables, use a single transaction, so either all of it is saved or none of it is.
- **Errors:** catch only the exceptions you can handle (e.g. `SqlException`). Log them, and never return their raw text to the client.

`HealthRepository` is the smallest example.
