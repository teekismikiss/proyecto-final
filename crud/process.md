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
  id INT PRIMARY KEY, -- usamos el mismo id de tu array
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