-- ============================================================
--  BASE DE DATOS: Bocatería "Qué Bueno"
--  Motor: MariaDB 10.5+
--  Orden de creación respetando las claves foráneas
-- ============================================================

CREATE DATABASE IF NOT EXISTS bocateria
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_spanish_ci;

USE bocateria;

-- ------------------------------------------------------------
-- 1. CATEGORIA
--    Clasifica los productos sueltos (bebidas, patatas, etc.)
-- ------------------------------------------------------------
CREATE TABLE categoria (
    id_categoria  INT          NOT NULL AUTO_INCREMENT,
    nombre        VARCHAR(60)  NOT NULL,
    descripcion   VARCHAR(200),
    PRIMARY KEY (id_categoria),
    UNIQUE KEY uq_categoria_nombre (nombre)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 2. CLIENTE
--    Recoge tanto clientes registrados como anónimos.
--    Si es_registrado = FALSE los campos de acceso son NULL.
-- ------------------------------------------------------------
CREATE TABLE cliente (
    id_cliente     INT          NOT NULL AUTO_INCREMENT,
    nombre         VARCHAR(100) NOT NULL,
    telefono       VARCHAR(15)  NOT NULL,
    contrasena     VARCHAR(255),               -- hash bcrypt/argon2, nunca texto plano
    es_registrado  BOOLEAN      NOT NULL DEFAULT FALSE,
    fecha_registro DATETIME,
    PRIMARY KEY (id_cliente),
    UNIQUE KEY uq_cliente_telefono (telefono),
    CONSTRAINT chk_cliente_registro CHECK (
        es_registrado = FALSE
        OR (es_registrado = TRUE AND contrasena IS NOT NULL AND fecha_registro IS NOT NULL)
    )
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 3. BOCADILLO
--    Menú completo (nº 1 – 86).
--    precio_frio es NULL cuando el bocadillo sólo tiene
--    versión caliente (nº 1, 5, 6, 8, 9, 10, 11, 12, etc.)
-- ------------------------------------------------------------
CREATE TABLE bocadillo (
    id_bocadillo     INT           NOT NULL AUTO_INCREMENT,
    numero_menu      SMALLINT      NOT NULL,
    nombre           VARCHAR(150)  NOT NULL,
    num_ingredientes TINYINT       NOT NULL,
    precio_frio      DECIMAL(5,2)  DEFAULT NULL,
    precio_caliente  DECIMAL(5,2)  NOT NULL,
    disponible       BOOLEAN       NOT NULL DEFAULT TRUE,
    PRIMARY KEY (id_bocadillo),
    UNIQUE KEY uq_bocadillo_numero (numero_menu),
    CONSTRAINT chk_bocadillo_num_ing  CHECK (num_ingredientes BETWEEN 1 AND 10),
    CONSTRAINT chk_bocadillo_p_frio   CHECK (precio_frio IS NULL OR precio_frio > 0),
    CONSTRAINT chk_bocadillo_p_cal    CHECK (precio_caliente > 0)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 4. INGREDIENTE
--    Lista maestra de ingredientes usados en los bocadillos.
-- ------------------------------------------------------------
CREATE TABLE ingrediente (
    id_ingrediente INT          NOT NULL AUTO_INCREMENT,
    nombre         VARCHAR(100) NOT NULL,
    PRIMARY KEY (id_ingrediente),
    UNIQUE KEY uq_ingrediente_nombre (nombre)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 5. BOCADILLO_INGREDIENTE  (tabla puente M:N)
--    Relaciona cada bocadillo con sus ingredientes.
--    'orden' controla el orden de presentación en la web.
-- ------------------------------------------------------------
CREATE TABLE bocadillo_ingrediente (
    id_bocadillo   INT     NOT NULL,
    id_ingrediente INT     NOT NULL,
    orden          TINYINT NOT NULL DEFAULT 1,
    PRIMARY KEY (id_bocadillo, id_ingrediente),
    CONSTRAINT fk_bi_bocadillo   FOREIGN KEY (id_bocadillo)
        REFERENCES bocadillo   (id_bocadillo)
        ON DELETE CASCADE  ON UPDATE CASCADE,
    CONSTRAINT fk_bi_ingrediente FOREIGN KEY (id_ingrediente)
        REFERENCES ingrediente (id_ingrediente)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 6. PRODUCTO
--    Bebidas, patatas y demás artículos del establecimiento.
-- ------------------------------------------------------------
CREATE TABLE producto (
    id_producto  INT           NOT NULL AUTO_INCREMENT,
    nombre       VARCHAR(100)  NOT NULL,
    precio       DECIMAL(5,2)  NOT NULL,
    id_categoria INT           NOT NULL,
    disponible   BOOLEAN       NOT NULL DEFAULT TRUE,
    PRIMARY KEY (id_producto),
    CONSTRAINT fk_producto_categoria FOREIGN KEY (id_categoria)
        REFERENCES categoria (id_categoria)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_producto_precio CHECK (precio > 0)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 7. PEDIDO
--    Cabecera de cada compra.
--    id_cliente puede ser NULL para pedidos anónimos.
-- ------------------------------------------------------------
CREATE TABLE pedido (
    id_pedido  INT          NOT NULL AUTO_INCREMENT,
    id_cliente INT          DEFAULT NULL,
    fecha_hora DATETIME     NOT NULL DEFAULT NOW(),
    estado     ENUM(
                   'pendiente',
                   'preparando',
                   'listo',
                   'entregado',
                   'cancelado'
               )            NOT NULL DEFAULT 'pendiente',
    tipo       ENUM('local', 'para_llevar') NOT NULL,
    total      DECIMAL(7,2) NOT NULL DEFAULT 0.00,
    notas      VARCHAR(300) DEFAULT NULL,
    metodo_pago  ENUM('online', 'en_tienda') NOT NULL,
    PRIMARY KEY (id_pedido),
    KEY idx_pedido_cliente (id_cliente),
    KEY idx_pedido_fecha   (fecha_hora),
    KEY idx_pedido_estado  (estado),
    CONSTRAINT fk_pedido_cliente FOREIGN KEY (id_cliente)
        REFERENCES cliente (id_cliente)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT chk_pedido_total CHECK (total >= 0)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 8. LINEA_PEDIDO
--    Detalle de cada artículo dentro de un pedido.
--    tipo_item indica si la línea es un bocadillo o un producto.
--    Exactamente uno de los dos FK estará relleno según el tipo.
--
--    Extras del bocadillo según el menú:
--      · pan_obrador  +0,30 €
--      · con_salsa    +0,60 €
--    Deben estar ya sumados en precio_unitario y en subtotal.
-- ------------------------------------------------------------
CREATE TABLE linea_pedido (
    id_linea        INT          NOT NULL AUTO_INCREMENT,
    id_pedido       INT          NOT NULL,
    tipo_item       ENUM('bocadillo', 'producto') NOT NULL,
    id_bocadillo    INT          DEFAULT NULL,
    id_producto     INT          DEFAULT NULL,
    cantidad        TINYINT      NOT NULL DEFAULT 1,
    precio_unitario DECIMAL(5,2) NOT NULL,
    subtotal        DECIMAL(7,2) NOT NULL,
    -- Campos exclusivos de bocadillos:
    temperatura     ENUM('frio', 'caliente') DEFAULT NULL,
    pan_obrador     BOOLEAN      NOT NULL DEFAULT FALSE,
    con_salsa       BOOLEAN      NOT NULL DEFAULT FALSE,
    PRIMARY KEY (id_linea),
    KEY idx_lp_pedido (id_pedido),
    CONSTRAINT fk_lp_pedido    FOREIGN KEY (id_pedido)
        REFERENCES pedido    (id_pedido)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_lp_bocadillo FOREIGN KEY (id_bocadillo)
        REFERENCES bocadillo (id_bocadillo)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_lp_producto  FOREIGN KEY (id_producto)
        REFERENCES producto  (id_producto)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    -- Coherencia entre tipo_item y los FK
    CONSTRAINT chk_lp_tipo CHECK (
        (tipo_item = 'bocadillo' AND id_bocadillo IS NOT NULL AND id_producto  IS NULL)
        OR
        (tipo_item = 'producto'  AND id_producto  IS NOT NULL AND id_bocadillo IS NULL)
    ),
    -- Temperatura obligatoria para bocadillos
    CONSTRAINT chk_lp_temperatura CHECK (
        tipo_item = 'producto'
        OR (tipo_item = 'bocadillo' AND temperatura IS NOT NULL)
    ),
    CONSTRAINT chk_lp_cantidad CHECK (cantidad > 0),
    CONSTRAINT chk_lp_subtotal CHECK (subtotal >= 0)
) ENGINE=InnoDB;

CREATE TABLE pago (
    id_pago            INT           NOT NULL AUTO_INCREMENT,
    id_pedido          INT           NOT NULL,
    metodo             ENUM('tarjeta', 'bizum', 'efectivo') NOT NULL,
    estado             ENUM('pendiente', 'completado', 'fallido', 'reembolsado') NOT NULL DEFAULT 'pendiente',
    importe            DECIMAL(7,2)  NOT NULL,
    -- Lo que te devuelve la pasarela de pago:
    referencia_externa VARCHAR(100),  -- ID de la transacción en Stripe/Redsys/etc.
    fecha_pago         DATETIME,
    PRIMARY KEY (id_pago),
    CONSTRAINT fk_pago_pedido FOREIGN KEY (id_pedido)
        REFERENCES pedido (id_pedido)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;
-- ============================================================
--  DATOS INICIALES
-- ============================================================

-- Categorías de producto
INSERT INTO categoria (nombre, descripcion) VALUES
    ('Bebidas',  'Refrescos, zumos, agua y bebidas calientes'),
    ('Patatas',  'Bolsas de patatas fritas y snacks salados'),
    ('Dulces',   'Bollería, pasteles y postres'),
    ('Otros',    'Artículos varios');

-- Ingredientes del menú
INSERT INTO ingrediente (nombre) VALUES
    ('Pollo empanado'),
    ('Salchichón ibérico'),
    ('Jamón serrano'),
    ('Queso curado'),
    ('Carne mechada'),
    ('Pollo relleno'),
    ('Salchichón turón'),
    ('Tortilla de papas'),
    ('Lomo adobado'),
    ('Cochinito'),
    ('Salchichas'),
    ('Bacón'),
    ('Pechuga de pavo'),
    ('Jamón york'),
    ('Chorizo'),
    ('Salami'),
    ('Salchichón'),
    ('Mortadela'),
    ('Chóped'),
    ('Queso'),
    ('Queso cheddar'),
    ('Rulo de cabra'),
    ('Roquefort'),
    ('Tortilla francesa'),
    ('Pollo asado'),
    ('Kebab de pollo'),
    ('Tomate natural'),
    ('Patatas paja'),
    ('Mojo picón'),
    ('Salsa whisky'),
    ('Salsa gaucha'),
    ('Salsa hot'),
    ('Salsa yogurt'),
    ('Miel');

-- Bocadillos de 1 ingrediente
INSERT INTO bocadillo (numero_menu, nombre, num_ingredientes, precio_frio, precio_caliente) VALUES
    ( 1, 'Pollo empanao',      1,   NULL, 3.00),
    ( 2, 'Salchichón ibérico', 1,   2.70, 2.90),
    ( 3, 'Jamón serrano',      1,   2.70, 2.90),
    ( 4, 'Queso curado',       1,   2.60, 2.80),
    ( 5, 'Carne mechada',      1,   NULL, 2.80),
    ( 6, 'Pollo relleno',      1,   NULL, 2.70),
    ( 7, 'Salchichón turón',   1,   2.50, 2.70),
    ( 8, 'Tortilla de papas',  1,   NULL, 2.50),
    ( 9, 'Lomo adobao',        1,   NULL, 2.20),
    (10, 'Cochinito',          1,   NULL, 2.20),
    (11, 'Salchichas',         1,   NULL, 2.00),
    (12, 'Bacón',              1,   NULL, 2.00),
    (13, 'Pechuga de pavo',    1,   2.20, 2.40),
    (14, 'Jamón york',         1,   2.20, 2.40),
    (15, 'Chorizo',            1,   1.90, 2.10),
    (16, 'Salami',             1,   1.90, 2.10),
    (17, 'Salchichón',         1,   1.90, 2.10),
    (18, 'Mortadela',          1,   1.80, 2.00),
    (19, 'Chóped',             1,   1.60, 1.80);

-- Bocadillos de 2 ingredientes
INSERT INTO bocadillo (numero_menu, nombre, num_ingredientes, precio_frio, precio_caliente) VALUES
    (20, 'Pollo empanao + queso curado',   2, NULL, 4.40),
    (21, 'Pollo empanao + bacón',          2, NULL, 4.20),
    (22, 'Pollo empanao + queso',          2, NULL, 3.90),
    (23, 'Jamón serrano + queso curado',   2, 3.70, 3.90),
    (24, 'Pollo relleno + queso curado',   2, 3.70, 3.90),
    (25, 'Jamón serrano + mecha',          2, 3.70, 3.90),
    (26, 'Pollo asado + queso',            2, NULL, 3.60),
    (27, 'Pollo relleno + J. serrano',     2, 3.40, 3.60),
    (28, 'Mecha + queso',                  2, 3.20, 3.40),
    (29, 'Tortilla de papas + J. serrano', 2, NULL, 3.30),
    (30, 'Tortilla francesa + bacón',      2, NULL, 3.00),
    (31, 'Tortilla de papas + queso',      2, NULL, 2.80),
    (32, 'Pavo + queso',                   2, 2.60, 2.80),
    (33, 'Jamón york + queso',             2, 2.60, 2.80),
    (34, 'Cochinito + queso',              2, NULL, 2.80),
    (35, 'Tortilla francesa + queso',      2, NULL, 2.70),
    (36, 'Cochinito + lomo adobao',        2, NULL, 2.70),
    (37, 'Lomo adobao + queso',            2, NULL, 2.70),
    (38, 'Bacón + queso',                  2, NULL, 2.60),
    (39, 'Salchicha + queso',              2, NULL, 2.60),
    (40, 'Kíron (Chorizo + queso)',        2, 2.40, 2.60),
    (41, 'Salchichón + queso',             2, 2.40, 2.60),
    (42, 'Mortadela + queso',              2, 2.40, 2.60),
    (43, 'Chóped + chorizo',               2, 2.40, 2.60);

-- Bocadillos de 3 ingredientes
INSERT INTO bocadillo (numero_menu, nombre, num_ingredientes, precio_frio, precio_caliente) VALUES
    (44, 'Pollo empanao + adobao + queso',                         3, NULL, 4.95),
    (45, 'Pollo empanao + T. francesa + queso cheddar',            3, NULL, 4.95),
    (46, 'Pollo empanao + bacón + queso',                          3, NULL, 4.90),
    (47, 'Al-Andalus (Kebab de pollo + rulo de cabra + s. yogurt)',3, NULL, 4.80),
    (48, 'Penitente (Mecha + rulo de cabra + whisky)',             3, NULL, 4.80),
    (49, 'Kebab de pollo + bacón + queso cheddar',                 3, NULL, 4.60),
    (50, 'Pollo asado + queso cheddar + bacón',                    3, NULL, 4.60),
    (51, 'Kebab de pollo + queso cheddar + salsa hot',             3, NULL, 4.50),
    (52, 'Pollo empanao + queso + gaucha',                         3, NULL, 4.20),
    (53, 'Tortilla papas + rulo de cabra + whisky',                3, NULL, 4.20),
    (54, 'Mecha + jamón + queso',                                  3, NULL, 4.20),
    (55, 'Pollo asado + queso + mojo picón',                       3, NULL, 4.00),
    (56, 'Mecha + cochinito + queso',                              3, NULL, 4.00),
    (57, 'Adobado + bacón + rulo de cabra',                        3, NULL, 4.00),
    (58, 'Tortilla papas + bacón + queso',                         3, NULL, 3.90),
    (59, 'Tortilla papas + chorizo + queso',                       3, NULL, 3.80),
    (60, 'Mecha + queso + whisky',                                 3, NULL, 3.80),
    (61, 'T. francesa + adobao + patatas paja',                    3, NULL, 3.50),
    (62, 'Alan (Salchichas + bacón + queso)',                      3, NULL, 3.40),
    (63, 'Ñiripi (Bacón + queso cheddar + adobado)',               3, NULL, 3.40),
    (64, 'Tortilla francesa + bacón + queso',                      3, NULL, 3.40),
    (65, 'Mantecaito (Adobao + papas pajas + whisky)',             3, NULL, 3.20),
    (66, 'Daniela (Adobao + queso + salsa)',                       3, NULL, 3.00),
    (67, 'Seguritas (Bacón + queso + salsa)',                      3, NULL, 2.80);

-- Bocadillos de 4 o más ingredientes
INSERT INTO bocadillo (numero_menu, nombre, num_ingredientes, precio_frio, precio_caliente) VALUES
    (68, 'Serrano de emp. (Pollo emp. + tomate + jamón + queso + salsa)',         5, NULL, 5.90),
    (69, 'Serranito asado (Pollo asado + tomate + T. francesa + jamón + queso)', 5, NULL, 5.90),
    (70, 'Pollo asado + roquefort + queso curado + rulo de cabra',               4, NULL, 5.90),
    (71, 'El pollazo (Pollo asado + rulo + T. francesa + salsa)',                4, NULL, 5.80),
    (72, 'El pio pio (Pollo asado + queso + bacón + T. francesa + salsa)',       5, NULL, 5.80),
    (73, 'De la casa (Pollo emp. + rulo + T. francesa + salsa)',                 4, NULL, 5.80),
    (74, 'Pollo emp. + mecha + T. francesa + queso',                             4, NULL, 5.80),
    (75, 'Adobao + tortilla papas + queso curado + mojo picón',                  4, NULL, 5.60),
    (76, 'Pelotazo (Adobao + T. francesa + tomate + queso cheddar + whisky)',    5, NULL, 5.60),
    (77, 'Pollo emp. + queso + bacón + salsa',                                   4, NULL, 5.30),
    (78, 'El Gordo (Salchichas + bacón + cochinito + queso + salsa)',            5, NULL, 5.00),
    (79, 'Machado (Tortilla papas + rulo + bacón + salsa whisky)',               4, NULL, 4.80),
    (80, 'El 3 leches (Rulo de cabra + queso curado + roquefort + miel)',        4, NULL, 4.80),
    (81, 'Arroyo (Mecha + tomate natural + queso curado + salsa)',               4, NULL, 4.80),
    (82, 'Adobao + bacón + cochinito + queso + salsa',                           5, NULL, 4.80),
    (83, 'Mecha + bacón + queso + papas paja + mojo picón',                      5, NULL, 4.60),
    (84, 'Cochinito + bacón + queso + papas paja + whisky',                      5, NULL, 3.90),
    (85, 'Daniela plus (Adobao + queso + tortilla f. + salsa)',                  4, NULL, 4.00),
    (86, 'Alan plus (Salchichas + bacón + queso + salsa)',                       4, NULL, 3.90);
