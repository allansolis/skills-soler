# CORS - Cross-Origin Resource Sharing

## Que es

Mecanismo que controla que dominios pueden hacer requests a tu API. Sin CORS, cualquier sitio podria llamar tu backend.

## Reglas criticas

- NUNCA usar `Access-Control-Allow-Origin: *` (wildcard)
- NUNCA copiar el header Origin del request al response (inseguro)
- SOLO permitir HTTPS, nunca HTTP
- Si usas `credentials: true`, el origin TIENE que ser exacto (no wildcard)
- Manejar correctamente preflight requests (OPTIONS)

## Prompt para configurar CORS

```
Estoy construyendo una aplicacion web. Mi frontend esta en https://[TU_DOMINIO]
y mi backend/API esta en https://api.[TU_DOMINIO].

Necesito que configures CORS correctamente para que:
1. SOLO acepte requests de mi dominio exacto - NUNCA uses Access-Control-Allow-Origin: *
2. Permita los metodos GET, POST, PUT, DELETE
3. Permita los headers estandar mas Authorization y Content-Type
4. Soporte cookies y tokens de autenticacion (credentials)
5. Maneje correctamente los preflight requests (OPTIONS)

Reglas importantes:
- NO uses wildcards (*) en ningun header de CORS
- NO copies el header Origin del request al response
- SOLO permite HTTPS, nunca HTTP
- Si usas credentials: true, el origin TIENE que ser exacto

Mi stack es: [Next.js / Express / Flask / otro]
```

## Verificacion

1. Abrir DevTools > Network tab
2. Buscar request a la API > revisar header `Access-Control-Allow-Origin`
3. Verificar que muestra tu dominio exacto (NO `*`)
4. Buscar request OPTIONS antes del request real (preflight)
