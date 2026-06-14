# Proceso de elaboración de la app

Esta aplicación nació como una herramienta práctica para gestionar  colecciones personal de bande dessinée y repertorio de tiendas de cómic. La idea inicial fue priorizar la utilidad antes que la complejidad técnica: poder consultar, filtrar, añadir y revisar información de forma rápida desde una interfaz sencilla.

El desarrollo se planteó en varias capas. Primero se construyó el frontend con `HTML`, `CSS` y `JavaScript`, organizando la navegación en páginas claras: inicio, consulta de BD, edición, alta de cómics, alta de tiendas y listado de tiendas. Después se añadió la lógica de interacción en `app.js`, encargada de manejar filtros, renderizado de listados, guardado local y exportación de datos.

En una primera fase, la app funciona con almacenamiento local para simplificar el uso y permitir que la persona usuaria pueda trabajar sin depender siempre de un servidor. Esto resulta especialmente útil en la parte de tiendas, donde las altas y cambios son pequeños y personales. Además, se preparó una capa `PHP` con conexión a `MySQL` para la colección de cómics, de forma que esa parte pueda escalar mejor y mantenerse de forma más estructurada.

También se tuvo en cuenta la experiencia de uso: accesos rápidos por series, botones directos, filtros por estado o disponibilidad, y una estética visual inspirada en los tebeos. La app se fue afinando corrigiendo comportamientos concretos, como respetar las búsquedas al abrir los listados o separar mejor qué información debe verse en cada página.

## Escalar la app

Si en un futuro se amplía mucho la colección o se necesita una gestión más robusta, puede utilizarse una base de datos `MySQL` para estructurar la información de series, autores, editoriales, estados y álbumes. El siguiente esquema es una propuesta de organización de tablas, no un archivo `.sql` ya incluido en el proyecto.

```sqlCREATE DATABASE db_bande_dessinee;
USE db_bande_dessinee;
```


```sql
CREATE TABLE series (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE
);
CREATE TABLE autores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL UNIQUE
);
CREATE TABLE editoriales (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE
);
CREATE TABLE estados (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE
);
CREATE TABLE albumes (
  id INT PRIMARY KEY, -- usar el mismo id de que el array
  titulo VARCHAR(255) NOT NULL,
  
  serie_id INT,
  editorial_id INT,
  estado_id INT,
  
  tieneslu BOOLEAN DEFAULT FALSE,

  FOREIGN KEY (serie_id) REFERENCES series(id),
  FOREIGN KEY (editorial_id) REFERENCES editoriales(id),
  FOREIGN KEY (estado_id) REFERENCES estados(id)
);
CREATE TABLE album_autor (
  album_id INT,
  autor_id INT,
  
  PRIMARY KEY (album_id, autor_id),
  
  FOREIGN KEY (album_id) REFERENCES albumes(id) ON DELETE CASCADE,
  FOREIGN KEY (autor_id) REFERENCES autores(id) ON DELETE CASCADE
);
```
