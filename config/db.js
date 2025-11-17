require('dotenv').config();
const env = process.env.NODE_ENV;
const { Sequelize, DataTypes} = require('sequelize');
const config = require('./config')[env];

const initModels = require('../models/init-models');

const sequelize = new Sequelize(config.database, config.username, config.password, config);

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

const models = initModels(sequelize);

Object.keys(models).forEach(modelName => {
    db[modelName] = models[modelName];
});

db.connectAndSync = async () => {
    try {
        await sequelize.authenticate();
        console.log('Koneksi database berhasil dibuat.');
        
        await sequelize.sync({ alter: true });
        console.log('Model database berhasil disinkronkan.');
    } catch (error) {
        console.error('Tidak dapat terhubung atau menyinkronkan ke database', error);
        process.exit(1);
    }
};

module.exports = db;