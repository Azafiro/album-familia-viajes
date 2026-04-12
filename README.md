# Álbum Familiar de Viajes

Este proyecto es una página web estática para que tu familia pueda ingresar con un código y subir fotos de viajes, títulos, fechas y emojis.

## Características

- Acceso por nombre/código: `Neizan`, `Laura`, `Sheyla`, `Víctor`, `María José`
- Interfaz azul amigable para móvil y escritorio
- Creación de álbumes de viaje
- Subida de fotos con título, fecha, texto y emojis
- Visualización de imágenes con autor y fecha
- Datos guardados en `localStorage` del navegador

## Cómo usarlo

1. Abre `index.html` en tu navegador.
2. Ingresa tu nombre o código familiar.
3. Crea un álbum y agrega fotos.
4. Cada imagen mostrará tu nombre abajo a la izquierda y la fecha abajo a la derecha.

## Cómo publicar en internet

### Opción 1: GitHub Pages

1. Crea un repositorio en GitHub.
2. Copia estos archivos al repositorio.
3. Activa GitHub Pages desde la configuración del repositorio.
4. Tu página quedará disponible desde la URL que GitHub Pages asigne.

### Opción 2: Netlify

1. Ve a https://app.netlify.com/
2. Crea una cuenta gratuita.
3. Arrastra la carpeta `AlbumFamilia` al área de despliegue.
4. Netlify te dará un enlace público.

### Opción 3: Vercel

1. Ve a https://vercel.com/
2. Crea una cuenta gratuita.
3. Sube el proyecto o conéctalo desde GitHub.
4. Vercel publicará la página y te entregará un enlace.

## Nota importante

Los datos de fotos y álbumes se guardan en el navegador usando `localStorage`. Si quieres que los álbumes se sincronicen entre dispositivos, sería necesario agregar un servicio en la nube o un backend.
