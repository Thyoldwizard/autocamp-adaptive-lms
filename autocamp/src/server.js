const { PORT, ENABLE_SIGNAL_SWEEP, SIGNAL_SWEEP_INTERVAL_MS } = require('./config/env');
const app = require('./app');
const { loadRules } = require('./config/rules');
const { runSweep } = require('./jobs/signalSweep');
const logger = require('./lib/logger');

loadRules().then(() => {
  app.listen(PORT, () => {
    logger.info(`Server listening on port ${PORT}`);

    if (ENABLE_SIGNAL_SWEEP) {
      logger.info('signalSweep scheduled', { intervalMs: SIGNAL_SWEEP_INTERVAL_MS });
      setInterval(() => {
        runSweep().catch((err) =>
          logger.error('signalSweep failed', { message: err.message, stack: err.stack }),
        );
      }, SIGNAL_SWEEP_INTERVAL_MS);
    }
  });
});
