// const db = require('../config/db'); // use your mysql2 connection
const { getConnection } = require('../config/db');

/**
 * Check and update alarms for a given temperature reading.
 * @param {string} sensorId - devEui of the sensor
 * @param {number} temperature - Temperature reading
 * @param {Date} timestamp - Timestamp of the reading
 */
async function processTemperatureReading(sensorId, temperature, timestamp) {
  try {
    const db = getConnection();

    // Get threshold and duration config
    const [thresholdRows] = await db.query(
      'SELECT temp_threshold, duration_minutes FROM sensor_thresholds WHERE sensor_id = ?',
      [sensorId]
    );


    if (thresholdRows.length === 0) return; // no threshold config

    const { temp_threshold, duration_minutes } = thresholdRows[0];

    console.log("temp_threshold:", temp_threshold, "duration_minutes:", duration_minutes);

    // Get the most recent alarm
    const [activeAlarmRows] = await db.query(
      'SELECT * FROM temperature_alarms WHERE sensor_id = ? AND active = TRUE ORDER BY triggered_at DESC LIMIT 1',
      [sensorId]
    );

    const activeAlarm = activeAlarmRows[0];
    console.log('Active alarms:', activeAlarm);
    console.log('La temperature actual es:', temperature);

    if (temperature > temp_threshold) {
      console.log('La temperatura actual es mayor que threshold');
      if (!activeAlarm) {
        // Check if enough time has passed with high temp
        const [nowResult] = await db.query(`SELECT NOW() AS now`);
        const now = nowResult[0].now;
        const fromTime = new Date(now.getTime() - (duration_minutes) * 60 * 1000);
        console.log("Debug--> Now:", now, "fromTime:", fromTime);

        const [readings] = await db.query(`
        SELECT TempC_SHT, nsTime
        FROM sensor_readings
        WHERE sensor_id = ?
          AND nsTime >= ?
        ORDER BY nsTime ASC
      `, [sensorId, fromTime]);

        console.log('Readings:', readings);
        // return;

        const allAboveThreshold = readings.every(r => r.TempC_SHT > temp_threshold);
        console.log('allAboveThreshold:', allAboveThreshold)

        // const since = new Date(timestamp);
        // since.setMinutes(since.getMinutes() - duration_minutes);

        // const [highReadings] = await db.query(
        //   `SELECT COUNT(*) AS count FROM temperature_readings 
        //    WHERE sensor_id = ? AND temperature > ? AND timestamp >= ?`,
        //   [sensorId, temp_threshold, since]
        // );

        // console.log('Las highReadings:', highReadings);
        // return;

        if (allAboveThreshold) {
          // Trigger alarm
          await db.query(
            `INSERT INTO temperature_alarms (sensor_id, triggered_at, max_temperature, active, threshold, duration_minutes)
             VALUES (?, ?, ?, TRUE, ?, ?)`,
            [sensorId, timestamp, temperature, temp_threshold, duration_minutes]
          );
          console.log(`🚨 Alarm triggered for sensor ${sensorId}`);
        }
      } else {
        console.log('Dentro del else 1');
        // Update max temp if needed
        if (temperature > activeAlarm.max_temperature) {
          await db.query(
            'UPDATE temperature_alarms SET max_temperature = ? WHERE id = ?',
            [temperature, activeAlarm.id]
          );
          console.log('Se actualizo max_temeprature porque:', temperature, " > ", activeAlarm.max_temperature )
        }
      }
    } else {
      console.log('Dentro del else 2');
      // Temp is back to normal, clear active alarm
      if (activeAlarm) {
        await db.query(
          `UPDATE temperature_alarms
           SET resolved_at = ?, clear_temperature = ?, active = FALSE
           WHERE id = ?`,
          [timestamp, temperature, activeAlarm.id]
        );
        console.log(`✅ Alarm resolved for sensor ${sensorId}`);
      }
    }
  } catch (err) {
    console.error('❌ Error in processTemperatureReading:', err);
  }
}

async function checkNoDataAlarms() {
//   const TelegramBot = require('node-telegram-bot-api');
//   const token = '5119489279:AAESAcyQgnKCMgbrtYpDwBRjUsW1ThwOgaI';
//   const bot = new TelegramBot(token, {polling: true});

// bot.sendMessage('5290218900', 'Hello, this is a message from your Telegram bot.');

  console.log('Checking if no data for any sensor');
  const db = getConnection();

  const [sensors] = await db.query(`
    SELECT s.sensor_id, s.name, s.last_reading, st.no_data_minutes
    FROM sensors s
    JOIN sensor_thresholds st ON s.sensor_id = st.sensor_id
  `);

  const now = new Date();

  for (const sensor of sensors) {
    const last = sensor.last_reading ? new Date(sensor.last_reading) : null;
    const minutes = sensor.no_data_minutes;
    const tooOld = !last || (now - last) > minutes * 60 * 1000;

    console.log('tooOld:', tooOld, minutes);

    const [existing] = await db.query(`
      SELECT * FROM temperature_alarms
      WHERE sensor_id = ? AND alarm_type = 'no_data' AND resolved_at IS NULL
    `, [sensor.sensor_id]);

    if (tooOld && existing.length === 0) {
      console.warn(`⚠️  No data for sensor ${sensor.name} in ${minutes}+ mins`);
      await db.query(`
        INSERT INTO temperature_alarms (sensor_id, alarm_type, triggered_at)
        VALUES (?, 'no_data', ?)
      `, [sensor.sensor_id, now]);
    } else if (!tooOld && existing.length > 0) {
      console.warn(`Voy a clearear alarma de no Data`);
      await db.query(`
        UPDATE temperature_alarms
        SET resolved_at = ?
        WHERE id = ?
      `, [now, existing[0].id]);
    }
  }


}

module.exports = {
  checkNoDataAlarms,
  processTemperatureReading,
};