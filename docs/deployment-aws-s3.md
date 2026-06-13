# Despliegue barato en AWS S3

La app es estatica: `npm run build` genera `dist/`.

Opcion de bajo costo:

1. Crear bucket S3 privado.
2. Subir contenido de `dist/`.
3. Crear CloudFront apuntando al bucket.
4. Configurar error document para SPA: responder `index.html` en 403/404.
5. Crear AWS Budget con alerta en `1 USD`.

S3 y CloudFront pueden costar centavos segun trafico. Para riesgo casi cero, Cloudflare Pages o Netlify free tier son mejores.
