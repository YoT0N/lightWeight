require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const connectDB = require('./config/db');
const userRoutes = require('./routes/user.routes');
const errorHandler = require('./middlewares/errorHandler');
const setupSwagger = require('./swagger');

const app = express();
const PORT = process.env.PORT || 3000;

connectDB();

app.use(morgan('dev'));
app.use(express.json());

app.use('/users', userRoutes);

setupSwagger(app);

app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`Сервер працює на http://localhost:${PORT}`);
});
