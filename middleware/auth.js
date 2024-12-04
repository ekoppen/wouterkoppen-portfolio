function auth(req, res, next) {
    // Check of gebruiker is ingelogd via sessie
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ error: 'Niet geautoriseerd' });
    }
    next();
}

module.exports = auth; 