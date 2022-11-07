// module.exports = ({ env }) => ({
//   defaultConnection: 'default',
//   connections: {
//     default: {
//       connector: 'bookshelf',
//       settings: {
//         client: 'mysql',
//         host: env('DATABASE_HOST', '127.0.0.1'),
//         port: env.int('DATABASE_PORT', 3306),
//         database: env('DATABASE_NAME', 'ecommerce'),
//         username: env('DATABASE_USERNAME', 'root'),
//         password: env('DATABASE_PASSWORD', '123456789'),
//         ssl: env.bool('DATABASE_SSL', false),
//       },
//       options: {

//       }
//     },
//   },
// });
module.exports = ({ env }) => ({
  defaultConnection: 'default',
  connections: {
    default: {
      connector: 'bookshelf',
      settings: {
        client: 'mysql',
        socketPath: `/cloudsql/${env('INSTANCE_CONNECTION_NAME')}`,
        database: env('DATABASE_NAME'),
        username: env('DATABASE_USERNAME'),
        password: env('DATABASE_PASSWORD'),
      },
      options: {
        strict: 'true'
      },
    },
  },
});
