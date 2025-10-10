import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { responseWrapper } from './utils/http';
import { requestContext } from './middlewares/requestContext';
import { errorHandler } from './middlewares/error';
import { httpLogger } from './middlewares/logger';
import logger from './utils/logger/logger';
import router from './routes';

const app = express();
app.use(helmet());
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());

app.use(httpLogger);

app.use(requestContext);
app.use(responseWrapper);

app.use('/api', router);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () =>
  logger.info(`Cinema API listening on http://localhost:${PORT}`),
);
