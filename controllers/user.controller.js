const User = require('../models/User');

exports.getAllUsers = async (req, res, next) => {
    try {
        const users = await User.find();
        res.json(users);
    } catch (error) {
        next(error);
    }
};

exports.getUserById = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({error: 'Користувач не знайдений'});
        }
        res.json(user);
    } catch (error) {
        next(error);
    }
};

exports.createUser = async (req, res, next) => {
    try {
        const newUser = new User(req.body);
        await newUser.save();
        res.status(201).json(newUser);
    } catch (error) {
        if (error.code === 11000) {
            error.message = 'Користувач з таким email вже існує';
        }
        next(error);
    }
};

exports.updateUser = async (req, res, next) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });
        if (!user) {
            return res.status(404).json({error: 'Користувач не знайдений'});
        }
        res.json(user);
    } catch (error) {
        next(error);
    }
};

exports.deleteUser = async (req, res, next) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({error: 'Користувач не знайдений'});
        }
        res.json({message: 'Користувач успішно видалений'});
    } catch (error) {
        next(error);
    }
};

exports.searchUsers = async (req, res, next) => {
    try {
        const {name, minAge, maxAge} = req.query;
        const query = {};

        if (name) query.name = {$regex: name, $options: 'i'};
        if (minAge) query.age = {...query.age, $gte: parseInt(minAge)};
        if (maxAge) query.age = {...query.age, $lte: parseInt(maxAge)};

        const users = await User.find(query);
        res.json(users);
    } catch (error) {
        next(error);
    }
};
