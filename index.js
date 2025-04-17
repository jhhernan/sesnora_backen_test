// require('./db');         // MySQL setup (handles reconnection)
require('./mqttClient'); // MQTT setup (handles messages)
const { checkNoDataAlarms } = require('./modules/alarmManager');

setInterval(checkNoDataAlarms, 1 * 60 * 1000); // every 1 minutes