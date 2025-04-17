module.exports = {
    mqttUrl: 'mqtt://127.0.0.1',
    // Wildcard topic: match all sensors from any application
    mqttTopic: 'application/+/device/+/event/up',
    //mqttTopic: 'application/9761795a-fcbc-4d04-afb4-651eca42b1e6/device/a840419e915b9d4e/event/up',

    dbConfig: {
        host: 'localhost',
        user: 'alarmas',
        password: 'alarmas',
        database: 'sensora'
    }
};