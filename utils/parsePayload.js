// module.exports = function parsePayload(message) {
//     try {
//       const payload = JSON.parse(message.toString());
//       const sensor_id = payload?.deviceInfo?.devEui;
//       const {
//         BatV,
//         Bat_status,
//         TempC_DS,
//         TempC_SHT,
//         Hum_SHT,
//         Ext_sensor
//       } = payload?.object || {};
  
//       const nsTimeRaw = payload?.rxInfo?.[0]?.nsTime;
//       const nsTime = nsTimeRaw ? new Date(nsTimeRaw) : null;
  
//       if (!sensor_id) {
//         console.warn('Missing devEui in payload');
//         return null;
//       }
  
//       return {
//         sensor_id,
//         BatV,
//         Bat_status,
//         TempC_DS,
//         TempC_SHT,
//         Hum_SHT,
//         Ext_sensor,
//         nsTime
//       };
//     } catch (err) {
//       console.error('Error parsing payload:', err);
//       return null;
//     }
//   };
  

module.exports = function parsePayload(message) {
  try {
    const payload = JSON.parse(message.toString());
    const { object, deviceInfo } = payload;

    const sensor_id = deviceInfo?.devEui;
    const nsTime = payload.rxInfo?.[0]?.nsTime;

    //Debemos conservar el Datalog o solo retransmission?
    if (object?.DATALOG) {
      // Parse DATALOG string
      const datalog = object.DATALOG.match(/\[.*?\]/g)?.map(entry => {
        const [TempC_DS, TempC_SHT, Hum_SHT, timestamp] = entry
          .replace(/[\[\]\"]/g, '')
          .split(',');

        return {
          sensor_id,
          TempC_DS: parseFloat(TempC_DS),
          TempC_SHT: parseFloat(TempC_SHT),
          Hum_SHT: parseFloat(Hum_SHT),
          nsTime: timestamp.trim()
        };
      });

      return { datalog };
    }

    if (object?.retransmission_message) {
      console.log('Es un retransmission message')
      const retransmissionLog = object.retransmission_message.match(/\[.*?\]/g)?.map(entry => {
        const [TempC_DS, TempC_SHT, Hum_SHT, timestamp] = entry
          .replace(/[\[\]\"]/g, '')
          .split(',');

        return {
          sensor_id,
          TempC_DS: parseFloat(TempC_DS),
          TempC_SHT: parseFloat(TempC_SHT),
          Hum_SHT: parseFloat(Hum_SHT),
          nsTime: timestamp.trim()
        };
      });

      return { datalog: retransmissionLog };
    }

    // Standard message with single reading
    return {
      sensor_id,
      BatV: object?.BatV,
      Bat_status: object?.Bat_status,
      TempC_DS: object?.TempC_DS,
      TempC_SHT: object?.TempC_SHT,
      Hum_SHT: object?.Hum_SHT,
      Ext_sensor: object?.Ext_sensor,
      nsTime
    };
  } catch (err) {
    console.error('Failed to parse payload:', err);
    return null;
  }
};