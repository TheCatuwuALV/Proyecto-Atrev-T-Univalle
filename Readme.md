# OntamiWawa | Centro de Monitoreo GPS Infantil

![Estado](https://img.shields.io/badge/Estado-Prototipo_Activo-success)
![Hardware](https://img.shields.io/badge/Hardware-ESP32--S3-orange)
![Tech](https://img.shields.io/badge/Tech_Stack-MQTT_%7C_Mapbox_%7C_Vanilla_JS-yellow)

Este proyecto fue desarrollado como un prototipo funcional de Hardware y Software. Es un sistema integral diseñado para el monitoreo y la seguridad infantil mediante el rastreo GPS en tiempo real.

La base de su funcionamiento es una conexión WebSockets mediante **MQTT** que actúa como puente entre la pulsera física (microcontrolador ESP32-S3) y la interfaz web. El sistema grafica en tiempo real la ubicación del niño, traza su ruta y permite trazar áreas seguras, para que al momento de salir del perímetro se generen alertas visuales de forma 100% automática.

---

## Características Principales

* **Monitoreo en Tiempo Real:** Dashboard interactivo basado en Mapbox que muestra la ubicación exacta del niño al instante.
* **Integración de IoT:** Cliente MQTT en el navegador preparado para recibir telemetría (coordenadas GPS) emitidas por el hardware.
* **Geocercas (Geofencing):** Permite dibujar manualmente polígonos de "zonas seguras" en el mapa para delimitar el área permitida.
* **Control de Alertas Automático:** Despliega advertencias visuales (Modo: Dentro, Fuera de rango, Sin señal) calculando dinámicamente si la coordenada actual rompe el perímetro.
* **Ficha de Identificación:** Panel de consulta rápida con la información vital del niño, alergias, tipo de sangre y contactos de emergencia.
* **Registro de Actividad (Ruta):** Historial visual en pantalla que dibuja una línea verde siguiendo los últimos movimientos reportados por el dispositivo.

---

# Arquitectura y tecnologías

El proyecto sigue una arquitectura distribuida enfocada en el Internet de las Cosas (IoT):

* **Backend / Broker:** Utiliza un broker MQTT (`broker.emqx.io`) que maneja la mensajería en tiempo real sin necesidad de un servidor Node.js intermedio.
* **Frontend:** HTML5, CSS3 puro (con un diseño Dark Mode moderno) y Vanilla JavaScript. Utiliza **Mapbox GL JS** para el mapa y **Turf.js** para el cálculo espacial de distancias y polígonos.
* **Hardware (Mock):** Preparado para microcontroladores (ESP32-S3 + Módulo GPS) que publiquen un JSON con latitud y longitud en el tópico `pulsera/gps/jose`.

---

# Instalación y uso

Si deseas correr este proyecto de forma local sigue estos pasos:

### 1. Clonar el repositorio

Abre tu terminal en la carpeta donde desees guardar el proyecto:

```bash
git clone [https://github.com/TU-USUARIO/ontamiwawa.git](https://github.com/TU-USUARIO/ontamiwawa.git)
```

### 2. abrir el dashboard

Dado que toda la lógica corre del lado del cliente, no necesitas instalar dependencias de Node. Simplemente abre el archivo index.html en tu navegador favorito (o usa la extensión Live Server en VS Code) para ver la interfaz de control.

### 3. Usar el simulador de Hardware (Opcional)

Si no se tiene la pulsera conectada y se requiere simular que el niño se mueve (para ver cómo funciona el sistema de alertas visuales), abre un cliente como MQTT Explorer, conéctate a broker.emqx.io:8083 (vía WebSockets) y publica este mensaje en el tópico pulsera/gps/jose:

```json
{
  "latitud": -16.5000,
  "longitud": -68.1193,
  "horaLectura": "14:30"
}
```
El mapa recibirá el JSON y moverá el marcador rojo exactamente como lo haría con el microcontrolador real.

## Autor

**Jose Andres Callisaya Choque**
*Estudiante de Ingeniería en Sistemas Informáticos | Universidad Privada del Valle | UNIVALLE*