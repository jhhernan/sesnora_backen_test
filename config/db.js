// const mysql = require('mysql2');
// const { dbConfig } = require('./config');

// let db;

// function handleDisconnect() {
//   db = mysql.createConnection(dbConfig);

//   db.connect((err) => {
//     if (err) {
//       console.error('MySQL connect error:', err);
//       setTimeout(handleDisconnect, 2000);
//     } else {
//       console.log('MySQL connected');
//     }
//   });

//   db.on('error', (err) => {
//     console.error('MySQL error:', err);
//     if (err.code === 'PROTOCOL_CONNECTION_LOST') {
//       handleDisconnect();
//     } else {
//       throw err;
//     }
//   });
// }

// handleDisconnect();

// module.exports = {
//   getConnection: () => db
// };

const mysql = require('mysql2/promise');
const { dbConfig } = require('./config');

// // MySQL connection configuration
// const dbConfig = {
//   host: 'localhost',
//   user: 'alarmas',
//   password: 'alarmas',
//   database: 'sensora',
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0
// };

const pool = mysql.createPool(dbConfig);


module.exports = {
  getConnection: () => pool
};