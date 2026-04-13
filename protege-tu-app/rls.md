# Row-Level Security (RLS) - Supabase/PostgreSQL

## Que es

Control de acceso a nivel de fila en la base de datos. Cada usuario solo ve/modifica sus propios datos, sin importar que consulta ejecute.

## Reglas criticas

- Activar RLS en TODAS las tablas con `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
- Crear politicas SEPARADAS para SELECT, INSERT, UPDATE y DELETE (no usar FOR ALL)
- Usar `auth.uid()` para referenciar al usuario autenticado
- NUNCA usar `user_metadata` en las politicas (los usuarios pueden modificarlo)
- Agregar indices en las columnas `user_id` para rendimiento

## Prompt para generar RLS

```
Estoy usando Supabase con PostgreSQL. Tengo las siguientes tablas en mi base de datos:

- [TABLA_1] (columnas...)
- [TABLA_2] (columnas...)

Necesito que configures Row-Level Security (RLS) para que:
1. Cada usuario solo pueda VER sus propios registros
2. Cada usuario solo pueda CREAR registros con su propio user_id
3. Cada usuario solo pueda EDITAR sus propios registros
4. Cada usuario solo pueda BORRAR sus propios registros

Por favor:
- Activa RLS en TODAS las tablas con ALTER TABLE ... ENABLE ROW LEVEL SECURITY
- Crea politicas SEPARADAS para SELECT, INSERT, UPDATE y DELETE (no uses FOR ALL)
- Usa auth.uid() para referenciar al usuario autenticado
- NUNCA uses user_metadata en las politicas
- Agrega indices en las columnas user_id para rendimiento
- Dame el SQL completo para copiar y pegar en el SQL Editor de Supabase
```

## Verificacion

1. Crear dos usuarios de prueba
2. Login como Usuario A, crear datos
3. Cambiar a Usuario B, verificar que NO ve datos de A
4. Siempre probar desde JavaScript SDK, NO desde SQL Editor (el editor tiene permisos de admin)
