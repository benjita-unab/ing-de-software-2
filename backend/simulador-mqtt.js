#!/usr/bin/env node

const mqtt = require("mqtt");

// Get route ID from CLI arguments
const routeId = process.argv[2];

if (!routeId) {
  console.error("❌ Error: Debe proporcionar el ID de la ruta como argumento");
  console.error("Uso: node simulador-mqtt.js <ROUTE_ID>");
  console.error("Ejemplo: node simulador-mqtt.js 12345abcde");
  process.exit(1);
}

console.log(`🚀 Iniciando simulador MQTT para ruta: ${routeId}`);

// Connect to MQTT broker (TCP, not WebSocket)
const client = mqtt.connect("mqtt://localhost:1883", {
  reconnectPeriod: 5000,
});

const topicEstado = `logitrack/rutas/${routeId}/estado`;
const topicGps = `logitrack/rutas/${routeId}/gps`;

// Base coordinates (Santiago, Chile - La Dehesa area)
const baseLatitud = -33.3712;
const baseLongitud = -70.5537;

// Counter for dynamic GPS updates
let gpsUpdateCount = 0;

client.on("connect", () => {
  console.log("✅ Conectado al broker MQTT");

  // Publish initial state
  const statePayload = JSON.stringify({ estado: "EN_TRANSITO", timestamp: new Date().toISOString() });
  client.publish(topicEstado, statePayload, { qos: 1 }, (err) => {
    if (err) {
      console.error("❌ Error al publicar estado:", err);
    } else {
      console.log(`📤 Estado publicado en ${topicEstado}: ${statePayload}`);
    }
  });

  // Start publishing GPS updates every 2 seconds
  console.log(`📍 Iniciando publicación de GPS cada 2 segundos en ${topicGps}\n`);

  const gpsInterval = setInterval(() => {
    // Increment coordinates slightly for dynamic movement
    const latitud = baseLatitud + gpsUpdateCount * 0.001;
    const longitud = baseLongitud + gpsUpdateCount * 0.0015;

    const gpsPayload = JSON.stringify({
      latitud,
      longitud,
      lat: latitud,
      lng: longitud,
      timestamp_evento: new Date().toISOString(),
      velocidad: Math.random() * 60 + 20, // Random speed between 20-80 km/h
      precision: Math.random() * 5 + 5, // Random accuracy 5-10 meters
    });

    client.publish(topicGps, gpsPayload, { qos: 1 }, (err) => {
      if (err) {
        console.error("❌ Error al publicar GPS:", err);
      } else {
        gpsUpdateCount++;
        console.log(
          `📍 [#${gpsUpdateCount}] GPS publicado: lat=${latitud.toFixed(6)}, lng=${longitud.toFixed(6)}`
        );
      }
    });
  }, 2000); // 2 seconds

  // Graceful shutdown handlers
  process.on("SIGINT", () => {
    console.log("\n\n🛑 Deteniendo simulador...");
    clearInterval(gpsInterval);
    client.end(true, () => {
      console.log("✅ Conexión MQTT cerrada");
      process.exit(0);
    });
  });

  process.on("SIGTERM", () => {
    console.log("\n\n🛑 Deteniendo simulador (SIGTERM)...");
    clearInterval(gpsInterval);
    client.end(true, () => {
      console.log("✅ Conexión MQTT cerrada");
      process.exit(0);
    });
  });
});

client.on("reconnect", () => {
  console.log("🔄 Reconectando al broker MQTT...");
});

client.on("error", (err) => {
  console.error("❌ Error MQTT:", err);
});

client.on("offline", () => {
  console.warn("⚠️  Cliente MQTT desconectado");
});

// Error handling for uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("❌ Error no capturado:", err);
  process.exit(1);
});
