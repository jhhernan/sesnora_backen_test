module.exports = {
  dbConfig: {
    host: 'localhost',
    user: 'alarmas',
    password: 'alarmas',
    database: 'sensora',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  },
  mqttUrl: 'mqtt://127.0.0.1:1883',
  mqttTopic: 'application/+/device/+/event/up'
};