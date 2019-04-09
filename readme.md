# md2sql markdown to sql

md2sql parses .md-files to identify lines prefixed with '> ' and copy them to .sql/*.sql files

inspired by literate-programming bird-style

```
> select current_timestamp();
```

installation node 10+

```
    > npm install -g .
    > md2sql
```