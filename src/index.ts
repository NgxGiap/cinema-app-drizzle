import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { responseWrapper } from './utils/http';
import { requestContext } from './middlewares/requestContext';
import { errorHandler } from './middlewares/error';
import router from './routes';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.use(requestContext);
app.use(responseWrapper);

app.use('/api', router);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Cinema API listening on http://localhost:${PORT}`),
);
