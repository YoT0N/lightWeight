exports.checkAuthToken = (req, res, next) => {
    // const authToken = req.headers['auth-token'];

    // if (!authToken) {
    //     return res.status(401).json({error: 'Auth-Token відсутній'});
    // }

    // // Тут можна додати більш складну логіку перевірки токена
    // if (authToken !== 'secret-token') {
    //     return res.status(403).json({error: 'Невірний Auth-Token'});
    // }

    next();
};
