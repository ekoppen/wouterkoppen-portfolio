const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
    try {
        // Haal token uit Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Geen toegang - token ontbreekt' });
        }

        const token = authHeader.split(' ')[1];

        try {
            // Verifieer token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
            next();
        } catch (error) {
            console.error('Token verificatie error:', error);
            return res.status(401).json({ error: 'Geen toegang - ongeldige token' });
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

module.exports = auth; 