import pinoHttp from 'pino-http';
import pino from 'pino';
import logger from '../utils/logger/logger';

export const httpLogger = pinoHttp({
  logger,
  customLogLevel: (req, res, err) => {
    const statusCode = res.statusCode ?? 500;

    if (err || statusCode >= 500) return 'error';
    if (statusCode >= 400) return 'warn';
    return 'info';
  },
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
});
