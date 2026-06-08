
mapboxgl.accessToken = 'pk.eyJ1IjoiYW5keWpvc2hlIiwiYSI6ImNtbTE0aWtjMDA1dmsycG9teXQzMWZibXcifQ.Drnhvi94-jznlK03iyBPAQ';

const map = new mapboxgl.Map({
    container: 'mapa',
    style: 'mapbox://styles/mapbox/dark-v11',
    center: [-68.1193, -16.5000],
    zoom: 15
});

const draw = new MapboxDraw({
    displayControlsDefault: false,
    controls: {
        polygon: true,
        trash: true
    }
});

map.addControl(draw, 'top-right');
map.addControl(new mapboxgl.NavigationControl(), 'top-left');

const elNino = document.createElement('div');
elNino.className = 'marcador-nino';

const marcadorNino = new mapboxgl.Marker({ element: elNino })
    .setLngLat([-68.1193, -16.5000])
    .addTo(map);

const elPadre = document.createElement('div');
elPadre.className = 'marcador-padre';

const marcadorPadre = new mapboxgl.Marker({ element: elPadre })
    .setLngLat([-68.1193, -16.5000])
    .addTo(map);

let geofenceActual = null;
let ultimaPosNino = null;
let ultimaPosPadre = null;
let ultimoMensaje = 0;
let ruta = [];
let alertaActiva = false;

const mqttBroker = "ws://broker.emqx.io:8083/mqtt";
const mqttTopic = "pulsera/gps/jose";

const mqttClient = mqtt.connect(mqttBroker, {
    clientId: "ontamiwawa_web_" + Math.random().toString(16).substring(2, 10),
    clean: true,
    connectTimeout: 5000,
    reconnectPeriod: 2000
});

map.on('load', () => {
    cargarGeocercaGuardada();

    map.addSource("ruta-nino", {
        type: "geojson",
        data: {
            type: "Feature",
            geometry: {
                type: "LineString",
                coordinates: []
            }
        }
    });

    map.addLayer({
        id: "ruta-nino-linea",
        type: "line",
        source: "ruta-nino",
        paint: {
            "line-color": "#00ffc8",
            "line-width": 4,
            "line-opacity": 0.8
        }
    });
});

if ("geolocation" in navigator) {
    navigator.geolocation.watchPosition(
        (pos) => {
            ultimaPosPadre = [pos.coords.longitude, pos.coords.latitude];
            marcadorPadre.setLngLat(ultimaPosPadre);
            calcularDistancia();
        },
        (error) => {
            console.log("No se pudo obtener ubicación del padre:", error);
        },
        {
            enableHighAccuracy: true
        }
    );
}

mqttClient.on("connect", () => {
    document.getElementById("mqtt-status").innerText = "MQTT CONECTADO";
    document.getElementById("mqtt-status").style.color = "#4caf50";

    mqttClient.subscribe(mqttTopic, (error) => {
        if (error) console.log("Error al suscribirse:", error);
        else console.log("Suscrito a:", mqttTopic);
    });
});

    mqttClient.on("message", (topic, message) => {
        try {
            const texto = message.toString();
            console.log("Mensaje MQTT recibido:", texto);

            const data = JSON.parse(texto);

            const lat = Number(data.latitud);
            const lng = Number(data.longitud);
            const hora = data.horaLectura || "---";

            if (isNaN(lat) || isNaN(lng)) {
                console.log("Datos GPS inválidos");
                return;
            }

            ultimoMensaje = Date.now();
            ultimaPosNino = [lng, lat];

            marcadorNino.setLngLat(ultimaPosNino);

            // historial
            ruta.push(ultimaPosNino);
            if (ruta.length > 300) ruta.shift();
            actualizarRuta();

            // texto
            document.getElementById("gps-coords").innerText =
                "Lat: " + lat.toFixed(6) +
                " / Lon: " + lng.toFixed(6) +
                " / Hora GPS: " + hora;

            document.getElementById("last-web").innerText =
                "Recepción web: " + new Date().toLocaleTimeString();

            calcularSeguridad();
            calcularDistancia();

        } catch (error) {
            console.log("Error parseando JSON MQTT:", error);
        }
    });

mqttClient.on("reconnect", () => {
    document.getElementById("mqtt-status").innerText = "RECONECTANDO MQTT...";
    document.getElementById("mqtt-status").style.color = "#ffc107";
});

mqttClient.on("error", (error) => {
    console.log("Error MQTT:", error);
    document.getElementById("mqtt-status").innerText = "ERROR MQTT";
    document.getElementById("mqtt-status").style.color = "#ff5252";
});

mqttClient.on("close", () => {
    document.getElementById("mqtt-status").innerText = "MQTT DESCONECTADO";
    document.getElementById("mqtt-status").style.color = "#ff5252";
});

map.on('draw.create', actualizarGeocerca);
map.on('draw.update', actualizarGeocerca);

map.on('draw.delete', () => {
    geofenceActual = null;
    localStorage.removeItem("ontamiwawa_geocerca");
    calcularSeguridad();
});

function actualizarGeocerca(e) {
    const feature = e.features[0];

    if (!feature || !feature.geometry || feature.geometry.type !== "Polygon") return;

    draw.deleteAll();
    draw.add(feature);

    const coordenadas = feature.geometry.coordinates;

    geofenceActual = turf.polygon(coordenadas);

    localStorage.setItem("ontamiwawa_geocerca", JSON.stringify(feature));

    calcularSeguridad();
}

function cargarGeocercaGuardada() {
    const guardada = localStorage.getItem("ontamiwawa_geocerca");

    if (!guardada) return;

    try {
        const feature = JSON.parse(guardada);
        draw.add(feature);
        geofenceActual = turf.polygon(feature.geometry.coordinates);
        calcularSeguridad();
    } catch (e) {
        console.log("No se pudo cargar geocerca guardada:", e);
    }
}

function calcularSeguridad() {
    const pill = document.getElementById('status-pill');

    if (ultimoMensaje > 0 && Date.now() - ultimoMensaje > 10000) {
        pill.innerText = "SIN SEÑAL DEL DISPOSITIVO";
        pill.className = "sin-senal";
        ocultarAlerta();
        return;
    }

    if (!geofenceActual) {
        pill.innerText = "SIN ÁREA DEFINIDA";
        pill.className = "";
        ocultarAlerta();
        return;
    }

    if (!ultimaPosNino) {
        pill.innerText = "ESPERANDO GPS...";
        pill.className = "";
        ocultarAlerta();
        return;
    }

    const puntoNino = turf.point(ultimaPosNino);
    const estaDentro = turf.booleanPointInPolygon(puntoNino, geofenceActual);

    if (estaDentro) {
        pill.innerText = "DENTRO DEL PERÍMETRO";
        pill.className = "dentro";
        ocultarAlerta();
    } else {
        pill.innerText = "FUERA DE RANGO";
        pill.className = "fuera";
        mostrarAlerta();
    }
}

function calcularDistancia() {
    if (!ultimaPosNino || !ultimaPosPadre) {
        document.getElementById("distancia").innerText = "Distancia padre-niño: ---";
        return;
    }

    const desde = turf.point(ultimaPosPadre);
    const hasta = turf.point(ultimaPosNino);

    const distanciaKm = turf.distance(desde, hasta, { units: "kilometers" });
    const metros = distanciaKm * 1000;

    document.getElementById("distancia").innerText =
        "Distancia padre-niño: " + metros.toFixed(1) + " m";
}

function actualizarRuta() {
    if (!map.getSource("ruta-nino")) return;

    map.getSource("ruta-nino").setData({
        type: "Feature",
        geometry: {
            type: "LineString",
            coordinates: ruta
        }
    });
}

function centrarNino() {
    if (!ultimaPosNino) {
        alert("Aún no hay ubicación del niño.");
        return;
    }

    map.easeTo({
        center: ultimaPosNino,
        zoom: 17,
        duration: 800
    });
}

function mostrarAlerta() {
    const alerta = document.getElementById("alerta");
    alerta.style.display = "block";

    if (!alertaActiva) {
        alertaActiva = true;

        if (navigator.vibrate) {
            navigator.vibrate([250, 150, 250]);
        }
    }
}

function ocultarAlerta() {
    document.getElementById("alerta").style.display = "none";
    alertaActiva = false;
}

setInterval(() => {
    if (ultimoMensaje > 0) {
        calcularSeguridad();
    }
}, 2000);
