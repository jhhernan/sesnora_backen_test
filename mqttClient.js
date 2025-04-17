const mqtt = require('mqtt');
const { mqttUrl, mqttTopic } = require('./config/config');
const { getConnection } = require('./config/db');
const parsePayload = require('./utils/parsePayload');
const { processTemperatureReading } = require('./modules/alarmManager');

const client = mqtt.connect(mqttUrl, {
  reconnectPeriod: 2000,
  connectTimeout: 10000,
  clean: true
});

client.on('connect', () => {
  console.log('MQTT connected');
  client.subscribe(mqttTopic, (err) => {
    if (err) console.error('MQTT subscribe error:', err);
    else console.log(`Subscribed to topic: ${mqttTopic}`);
  });
});

// When a message is received
client.on('message', async (topic, message) => {
  const topicParts = topic.split('/');
  const sensor_id_from_topic = topicParts[3] || null;

  const data = parsePayload(message);
  if (!data) return;

  const db = getConnection();  // Get the connection from the pool

  if (data.datalog) {
    // Loop through each delayed reading
    for (const entry of data.datalog) {
      const {
        sensor_id,
        TempC_DS,
        TempC_SHT,
        Hum_SHT,
        nsTime
      } = entry;

      const final_sensor_id = sensor_id || sensor_id_from_topic;

      const query = `
        INSERT INTO sensor_readings 
        (sensor_id, TempC_DS, TempC_SHT, Hum_SHT, nsTime)
        VALUES (?, ?, ?, ?, ?)
      `;

      try {
        await db.query(query, [final_sensor_id, TempC_DS, TempC_SHT, Hum_SHT, nsTime]);
        console.log(`Batch data saved for ${final_sensor_id} @ ${nsTime}`);
        //Update the lastReading column
        await db.query(`UPDATE sensors SET last_reading = ? WHERE sensor_id = ?`, [nsTime, final_sensor_id]);
        console.log('Se hizo el update con el last_reading en la tabla sensors');
      } catch (err) {
        console.error(`DB error for ${final_sensor_id}:`, err);
      }
    }
  } else {
    // Handle single entry
    const {
      sensor_id: payload_sensor_id,
      BatV,
      Bat_status,
      TempC_DS,
      TempC_SHT,
      Hum_SHT,
      Ext_sensor,
      nsTime
    } = data;

    const final_sensor_id = payload_sensor_id || sensor_id_from_topic;

    const query = `
      INSERT INTO sensor_readings 
      (sensor_id, BatV, Bat_status, TempC_DS, TempC_SHT, Hum_SHT, Ext_sensor, nsTime)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    try {
      await db.query(
        query,
        [final_sensor_id, BatV, Bat_status, TempC_DS, TempC_SHT, Hum_SHT, Ext_sensor, nsTime]
      );
      console.log(`Data saved for ${final_sensor_id} @ ${nsTime}`);
      processTemperatureReading(final_sensor_id, TempC_SHT, nsTime);

      //Update the lastReading column
      await db.query(`UPDATE sensors SET last_reading = ? WHERE sensor_id = ?`, [nsTime, final_sensor_id]);
      console.log('Se hizo el update con el last_reading en la tabla sensors');
    } catch (err) {
      console.error(`DB error for ${final_sensor_id}:`, err);
    }
  }
});

client.on('reconnect', () => console.log('Reconnecting to MQTT...'));
client.on('offline', () => console.warn('MQTT client offline'));
client.on('error', (err) => console.error('MQTT error:', err));
client.on('close', () => console.warn('MQTT connection closed'));