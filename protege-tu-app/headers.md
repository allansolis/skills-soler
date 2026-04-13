# Security Headers de Produccion

## Los 6 Headers Esenciales

| Header | Valor | Funcion |
|--------|-------|---------|
| X-Frame-Options | `SAMEORIGIN` | Previene clickjacking (iframe en paginas falsas) |
| Content-Security-Policy | `default-src 'self'...` | Controla de donde cargan scripts, estilos e imagenes |
| X-Content-Type-Options | `nosniff` | Previene que el navegador adivine tipos de archivo |
| Strict-Transport-Security | `max-age=31536000; includeSubDomains` | Fuerza HTTPS por 1 ano |
| Referrer-Policy | `strict-origin-when-cross-origin` | Controla info enviada al salir del sitio |
| Permissions-Policy | `geolocation=(), microphone=(), camera=()` | Desactiva acceso a camara, microfono, ubicacion |

## Prompt para configurar headers

```
Estoy construyendo una aplicacion web con [TU_STACK]. Mi dominio es https://[TU_DOMINIO].

Necesito que agregues TODOS los Security Headers de produccion:

1. X-Frame-Options: SAMEORIGIN
2. Content-Security-Policy:
   - default-src 'self'
   - script-src 'self'
   - img-src 'self' https:
   - style-src 'self' 'unsafe-inline'
   - connect-src 'self' https://api.[TU_DOMINIO]
   - font-src 'self'
   - object-src 'none'
3. X-Content-Type-Options: nosniff
4. Strict-Transport-Security: max-age=31536000; includeSubDomains
5. Referrer-Policy: strict-origin-when-cross-origin
6. Permissions-Policy: geolocation=(), microphone=(), camera=()

Por favor:
- Configura todo en el archivo correcto de mi framework
- Si uso Next.js, ponlo en next.config.js en la seccion headers
- Si uso Express, usa helmet o middleware personalizado
- Si uso Flask, usa flask-talisman o after_request
- Muestrame como verificar que los headers estan funcionando
- Si uso servicios externos (Google Analytics, Stripe, etc.) dime que ajustar en el CSP
```

## Verificacion

1. Visitar https://securityheaders.com e ingresar tu dominio
2. DevTools > Network > Response Headers
3. Revisar consola del navegador por violaciones de CSP

## Nota para servicios externos

Si usas Google Analytics, Stripe, CDNs, etc., necesitas agregar sus dominios al CSP:

```
script-src 'self' https://www.googletagmanager.com https://js.stripe.com;
connect-src 'self' https://api.stripe.com https://www.google-analytics.com;
frame-src https://js.stripe.com;
```
