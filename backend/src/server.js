const app = require('./app');
const env = require('./config/env');

const PORT = env.port;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Production server is live and listening on 0.0.0.0:${PORT}`);
});
