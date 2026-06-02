
## PARTE 1: Copias de Seguridad (Backups) en Google Drive

Las copias de seguridad son vitales para no perder la información de los clientes, pedidos y pagos en caso de cualquier problema. La forma más sencilla de hacerlo es exportando los datos a archivos de Excel (CSV) y guardándolos en una carpeta de tu Google Drive.

### 1. ¿Qué tablas debo copiar?

No todas las tablas necesitan copiarse con la misma frecuencia. Las dividimos en dos grupos:

**A. Datos Diarios (¡Muy Importante!):**
Estas tablas guardan las ventas y los clientes. Si se pierden, pierdes el registro de lo que has vendido.
*   `pedido` (Los pedidos generales)
*   `linea_pedido` (Qué bocadillos/productos van en cada pedido)
*   `pago` (El registro de los cobros)
*   `cliente` (Los datos de tus clientes registrados)

**B. Datos del Menú (Menos frecuente):**
Estas tablas solo cambian si añades un bocadillo nuevo, cambias un precio o subes una promoción nueva.
*   `bocadillo`
*   `producto`
*   `promocion`
*   `categoria`, `ingrediente`, `bocadillo_ingrediente`

### 2. ¿Cada cuánto tiempo debo hacer las copias?

*   **Datos Diarios (A):** Lo ideal es hacerlo **1 vez a la semana** (por ejemplo, los lunes por la mañana o los domingos al cerrar). Si tienes muchísimo volumen de ventas, hazlo a diario al final del turno.
*   **Datos del Menú (B):** **Solo cuando hagas cambios**. Si modificas los precios para el nuevo año o añades un bocadillo nuevo a la carta, haz una copia de seguridad ese mismo día.

### 3. Pasos para descargar los datos y subirlos a Drive

1.  Abre tu navegador y entra en [Supabase](https://supabase.com/dashboard) e inicia sesión.
2.  Entra a tu proyecto de la bocatería.
3.  En el menú de la izquierda, busca el icono de una tabla (dice **"Table Editor"**). Haz clic ahí.
4.  En la lista de la izquierda, verás todas tus tablas (pedido, cliente, etc.).
5.  Haz clic, por ejemplo, en la tabla `pedido`. Verás que a la derecha cargan todos los datos.
6.  Arriba a la derecha de esa tabla, verás un botón que dice **"Export"** o un icono de descarga. Haz clic en él y selecciona **"Export to CSV"**.
7.  El archivo se descargará en tu ordenador (en la carpeta Descargas). El archivo se llamará algo parecido a `pedido_datos.csv`.
8.  Repite el paso 5, 6 y 7 con las tablas `linea_pedido`, `pago` y `cliente`.
9.  Abre otra pestaña en tu navegador y ve a tu **Google Drive**.
10. Crea una carpeta llamada "Copias Seguridad Bocateria" y dentro crea una carpeta con la fecha de hoy (ej. "Copia_28_Mayo_2026").
11. Arrastra los archivos `.csv` que acabas de descargar desde tu ordenador hacia esa carpeta de Google Drive.
12. ¡Listo! Ya tienes tus datos a salvo en la nube.

---

## PARTE 2: Subir Fotos y Pegarlas en la página de Admin

Para que las imágenes de los bocadillos, productos o promociones se vean en tu web, primero debes guardarlas en el "almacén" (Bucket) de Supabase, copiar su enlace, y pegar ese enlace en tu panel de administración.

### Pasos para subir una foto a Supabase:

1.  En tu panel de Supabase, mira el menú de la izquierda y haz clic en **"Storage"** (icono de una caja o cajón).
2.  Verás una sección llamada **"Buckets"**. Deberías tener uno creado ('imagenes_Web'). Haz clic en él y asegúrate de marcar la opción "Public bucket" antes de guardar).*
3.  Dentro del bucket, haz clic en el botón verde arriba a la derecha que dice **"Upload file"** (Subir archivo).
4.  Busca la foto del bocadillo en tu ordenador y súbela. **Importante:** Intenta que el nombre de la foto sea sencillo y sin espacios (por ejemplo: `bocadillo-pollo.jpg` en lugar de `foto bocadillo pollo bueno final.jpg`).
5.  Una vez subida, la verás en la lista.

### Pasos para copiar el enlace (URL) y usarlo:

1.  Busca la foto que acabas de subir en la lista de Storage.
2.  Si pasas el ratón por encima de la foto (o haces clic en los tres puntitos `...` al lado del nombre del archivo), verás una opción que dice **"Get URL"** o **"Copy URL"**.
3.  Haz clic ahí. Esto copiará el enlace de la foto (algo como `https://[tusupabase].supabase.co/storage/v1/object/public/...`). Te saldrá un mensajito diciendo que se ha copiado al portapapeles.
4.  Ve a tu página web de administración de la bocatería (donde añades los productos).
5.  En el formulario para crear un nuevo producto o editar uno existente, busca la casilla que dice **"URL de la Imagen"** o "Imagen".
6.  Haz clic derecho dentro de esa casilla y dale a **"Pegar"** (o presiona `Ctrl + V` en tu teclado).
7.  Guarda los cambios en tu panel de administrador.
8.  ¡Listo! La foto aparecerá automáticamente en la carta de tu página web.
